
import { subscribeTicketUpdate, ensureRealtimeSocket } from '../lib/realtimeSocket';
import { buildSplitAccountPostings, isCreditMethod, roundMoney, resolveAccountForTender } from '../lib/partialPayments';
export { resolveAccountForTender, buildSplitAccountPostings, isCreditMethod, roundMoney };
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useStores } from './StoreContext';
import { useAuth, User } from './AuthContext';
import { isTrialPlan, canUseTrialAction, bumpTrialUsage, isTrialExhausted, type TrialLimitKey } from '../lib/trialLimits';
import { trackUsageEvent, writeSessionTrialUsage, readSessionUser, deriveUsageFromData, mergeUsageMax } from '../lib/trialUsageTrack';
import { Staff, AppLog } from '../types';
import { migrateDataToFirestore } from '../lib/firebaseMigration';
import { authFetch, hasAuthToken } from '../lib/apiClient';
import { enqueueOfflineOp, wireOfflineQueueAutoFlush, isProbablyOffline, flushOfflineQueue, subscribeOfflineQueue, getOfflineQueueCount } from '../lib/offlineQueue';
import { buildAutoJournalEntry } from '../lib/journalAutoPost';
import { subscribeBusinessProducts } from '../lib/productsRealtime';
import { useChatSocket } from '../lib/chatSocket';

import { allocateFefo, applyFefoDeduction, upsertLot } from '../lib/fefo';

export interface ProductVariant {
  id: string;
  name: string; // e.g., "Red / XL"
  sku?: string;
  barcode?: string;
  price?: number; // Override base price if needed
  stock: number;
  attributes: { name: string; value: string }[]; // e.g., [{name: 'Color', value: 'Red'}, {name: 'Size', value: 'XL'}]
  /** FEFO lots scoped to this variant (size/color) */
  lots?: { lotNumber: string; qty: number; expiryDate?: string; receivedAt?: string; warehouseId?: string }[];
  expiryDate?: string;
  batchNumber?: string;
}

export interface DiscountRule {
  id: string;
  type: 'percentage' | 'fixed';
  value: number;
  minQty?: number;
  startDate?: string;
  endDate?: string;
}

export interface Product {
  id: string;
  storeId?: string; // Multi-store support
  warehouseId?: string; // Optional warehouse within a store
  business_id?: string;
  name: string;
  stock: number;
  purchasePrice: number;
  salePrice: number;
  category: string;
  subCategory?: string;
  kitchenStation?: string; // e.g. "Grill", "Bar", "Dessert", "Main Kitchen" - routes KOT items to the right station
  brand?: string; // New field
  sku?: string; // New field
  barcode?: string; // New field
  qrCode?: string; // New field
  description?: string;
  unit?: string;
  expiryDate?: string; // YYYY-MM-DD
  batchNumber?: string; // New Batch Number field
  /** FEFO lot register */
  lots?: { lotNumber: string; qty: number; expiryDate?: string; receivedAt?: string }[];
  serialNumbers?: string[]; // Legacy list of available serials
  serialUnits?: { serial: string; lotNumber?: string; status?: string; soldAt?: string; saleId?: string }[];
  image?: string; // Base64 string (Main image)
  images?: string[]; // New field for gallery
  isDeleted?: boolean;
  isArchived?: boolean; // New field
  warranty?: boolean; // Existing flag
  warrantyPeriod?: string; // e.g., "1 Year"
  sellOnline?: boolean; // New flag for e-commerce sync
  isFeatured?: boolean; // New flag for Featured Products
  bomId?: string; // Link to Bill of Materials
  minStockLevel?: number; // Alert threshold
  variants?: ProductVariant[]; // New field
  supplierId?: string; // New field
  discountRules?: DiscountRule[]; // New field
  tags?: string[]; // New field
  isBundle?: boolean; // New field
  bundleItems?: { productId: string; qty: number }[]; // New field
  isDigital?: boolean; // New field
  downloadUrl?: string; // New field for digital products
  notes?: string; // New field
  returnEligible?: boolean; // New field
  weight?: number; // New field
  dimensions?: { length: number; width: number; height: number }; // New field
  customFields?: Record<string, string>; // New field
}

export interface Entity {
  id: string;
  business_id?: string;
  name: string;
  mobile?: string;
  email?: string;
  company?: string;
  address?: string;
  type: 'Customer' | 'Supplier';
  loyaltyPoints?: number;
  reminderDate?: string; // ISO DateTime
  isDeleted?: boolean;
  // Extended Customer Fields
  groups?: string[];
  tags?: string[];
  notes?: string;
  walletBalance?: number;
  birthday?: string; // YYYY-MM-DD
  customFields?: Record<string, string>;
  isBlacklisted?: boolean;
  referralCode?: string;
  referredBy?: string;
  engagementScore?: number;
  lifetimeValue?: number;
  socialLinks?: { facebook?: string; twitter?: string; linkedin?: string; instagram?: string };
  preferences?: { smsMarketing: boolean; emailMarketing: boolean };
  assignedStaffId?: string;
  status?: 'Active' | 'Inactive' | 'Lead' | 'Prospect';
  source?: string; // e.g., 'Walk-in', 'Online', 'Referral'
  lastPurchaseDate?: string;
  totalOrders?: number;
  averageOrderValue?: number;
  // Business-wise Supplier Fields
  supplierCode?: string;
  openingBalance?: number;
  creditLimit?: number;
  paymentTerms?: string;
  currentDue?: number;
  totalPurchase?: number;
  totalPaid?: number;
  lastPaymentDate?: string;
}

export interface GlobalSupplier {
  mobile: string; // Global Supplier ID (globally unique)
  pin?: string; // Added for login
  name: string;
  companyName?: string;
  contactPerson?: string;
  email?: string;
  tradeLicense?: string;
  binVat?: string;
  nid?: string;
  address?: string;
  city?: string;
  district?: string;
  country?: string;
  logo?: string;
  bankDetails?: {
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    routingNumber?: string;
    branchName?: string;
  };
  mobileBankingDetails?: {
    bKash?: string;
    Rocket?: string;
    Nagad?: string;
  };
  website?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  businesses: {
    businessId: string;
    businessName: string;
    connectedAt: string;
  }[];
}

export interface CustomerGroup {
  id: string;
  name: string;
  description?: string;
  color?: string;
  criteria?: Record<string, any>; // For auto-segmentation
}

export interface SupportTicket {
  id: string;
  customerId: string;
  subject: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  messages: { sender: string; message: string; timestamp: string }[];
}

export interface CustomerFeedback {
  id: string;
  customerId: string;
  rating: number;
  comment?: string;
  date: string;
  source?: string; // e.g., 'Email', 'SMS', 'In-Store'
}

export interface Quotation {
  id: string;
  business_id?: string;
  storeId?: string;
  quoteNumber: string;
  date: string;
  validUntil: string;
  entityId?: string;
  entityName: string;
  entityMobile?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Converted' | 'Expired';
  notes?: string;
  convertedToSaleId?: string;
}

export interface KitchenOrderItem {
  productId: string;
  name: string;
  qty: number;
  notes?: string;
}

export interface KitchenOrder {
  id: string;
  business_id?: string;
  storeId?: string;
  saleId?: string; // linked Sale transaction, once checked out
  groupId?: string; // shared across every station-ticket generated from the same cart/table, so they can be shown together
  station: string; // e.g. "Grill", "Bar", "Dessert", "Main Kitchen"
  tableNumber?: string;
  orderType: 'Dine-In' | 'Takeaway' | 'Delivery';
  items: KitchenOrderItem[];
  status: 'Pending' | 'Preparing' | 'Ready' | 'Served' | 'Cancelled';
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface StockTransferRequest {
  id: string;
  business_id?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  sourceStoreId: string;
  destStoreId: string;
  sourceWarehouseId?: string;
  destWarehouseId?: string;
  items: { productId: string; productName: string; quantity: number }[];
  notes?: string;
  requestedBy?: string;
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  transferTxnId?: string;
}

export interface PurchaseOrder {
  id: string;
  business_id?: string;
  storeId?: string;
  poNumber: string;
  date: string;
  expectedDate: string;
  supplierId?: string;
  supplierName: string;
  supplierMobile?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'Ordered' | 'Partial' | 'Received' | 'Cancelled';
  notes?: string;
  receivedTransactionId?: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
}

export interface JournalAccount {
  id: string;
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
}

export interface JournalLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  memo: string;
  reference?: string;
  lines: JournalLine[];
  createdAt: string;
  createdBy?: string;
  isPosted: boolean;
}

export interface LeavePolicy {
  year: number;
  annualDays: number;
  sickDays: number;
  casualDays: number;
  otherDays?: number;
  excludeWeekends?: boolean;
  carryForwardEnabled?: boolean;
  carryForwardMaxAnnual?: number;
  carryForwardSick?: boolean;
  carryForwardCasual?: boolean;
  accrualEnabled?: boolean;
  accrualAsOf?: string;
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  leaveType: 'Annual' | 'Sick' | 'Unpaid' | 'Casual' | 'Other';
  reason?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  requestedAt: string;
  reviewedAt?: string;
  reviewerNote?: string;
}

export interface PayrollRun {
  id: string;
  staffId: string;
  staffName: string;
  period: string; // YYYY-MM
  basicSalary: number;
  bonus: number;
  commission: number;
  advances: number;
  absentDays: number;
  absentDeduction: number;
  fine: number;
  netPay: number;
  transactionId?: string;
  status: 'Paid' | 'Void';
  paidAt: string;
  notes?: string;
}

export interface WorkShift {
  id: string;
  name: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  breakMinutes?: number;
  color?: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  recurring?: boolean; // repeat every year on same month-day
  paid?: boolean;
}

export interface Designation {
  id: string;
  name: string;
  departmentId?: string;
  description?: string;
}

export interface SaasSupportTicket {
  id: string;
  ticket_number: string;
  business_id: string;
  business_name: string;
  created_by: string;
  subject: string;
  category: 'Technical Issue' | 'Billing Issue' | 'Subscription' | 'Feature Request' | 'Bug Report' | 'Account Issue' | 'General Support';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Waiting For Customer' | 'Resolved' | 'Closed' | 'Escalated' | 'On Hold' | 'Reopened' | 'Archived';
  description: string;
  assigned_to?: string;
  attachment?: { name: string; size: number; type: string; content?: string } | null;
  created_at: string;
  updated_at: string;
  messages: SaasTicketMessage[];
  feedback?: SaasTicketFeedback | null;
  notes?: SaasInternalNote[];
}

export interface SaasTicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  attachment?: { name: string; size: number; type: string; content?: string } | null;
  created_at: string;
}

export interface SaasTicketFeedback {
  id: string;
  ticket_id: string;
  rating: number;
  feedback: string;
  created_at: string;
}

export interface SaasInternalNote {
  id: string;
  ticket_id: string;
  sender_name: string;
  note: string;
  created_at: string;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  type: 'SMS' | 'Email';
  status: 'Draft' | 'Scheduled' | 'Sent' | 'Cancelled';
  targetAudience: { type: 'All' | 'Group' | 'Segment'; value?: string };
  content: string;
  scheduledDate?: string;
  sentDate?: string;
  stats?: { sent: number; delivered: number; opened: number; clicked: number };
}

export interface InvoiceItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
  total: number;
  serialNumbers?: string[]; // Array of SNs
  warranty?: string; // Specific warranty text for this item
  batchNumber?: string;
  expiryDate?: string;
  /** FEFO pick lines for this sale qty */
  lots?: { lotNumber: string; qty: number; expiryDate?: string }[];
}

export interface TimelineEvent {
  status: string;
  date: string;
  note?: string;
  user?: string;
}

export interface Installment {
  id: string;
  dueDate: string;
  amount: number;
  status: 'Pending' | 'Paid' | 'Overdue';
  paidDate?: string;
}

export interface LedgerEntry {
  id: string;
  business_id?: string;
  storeId?: string; // Multi-store support
  date: string;
  entityId?: string; // Link to Entity ID
  entityName: string;
  entityMobile?: string; // Snapshot of mobile
  entityAddress?: string; // Snapshot of address
  type: 'Purchase' | 'Sale' | 'Expense' | 'Income' | 'Due' | 'Sales Return' | 'Purchase Return' | 'Stock Adjustment' | 'Salary' | 'Transfer' | 'Supplier Payment';
  amount: number;
  paymentMethod: 'Cash' | 'Due' | 'Card' | 'Bank' | 'Adjustment' | 'Mobile' | 'Transfer' | 'Gift Card' | 'Partial' | 'Installment';
  amountPaid?: number; // For partial payments
  dueAmount?: number; // For partial payments
  previousDue?: number; // Snapshot of previous due at time of sale
  accountId?: string; // Linked Financial Account ID
  reference?: string; 
  items?: InvoiceItem[]; 
  details?: {
      subtotal: number;
      tax: number;
      discount: number;
      delivery: number;
  };
  timeline?: TimelineEvent[];
  installments?: Installment[]; // New field for installment tracking
  transferType?: 'In' | 'Out'; // For fund transfers
  createdBy?: string; // Admin/User ID
  salesperson?: string; // Salesperson tracking
  tags?: string[]; // Order tagging
  notes?: string; // Order notes
  deliveryInstructions?: string; // Delivery instructions
  originalSaleId?: string;
  originalPurchaseId?: string;
  isDeleted?: boolean;
  
  // Expense Specifics
  category?: string;
  isRecurring?: boolean;
  recurringInterval?: 'Monthly' | 'Weekly' | 'Yearly';
  splitDetails?: { category: string; amount: number }[];

  // Profit / Cost Specifics
  profit?: number;
  cost?: number;
  cogs?: number;
  profitMargin?: number;
  markupPercent?: number;
  manualProfit?: boolean | number;
  manualProfitAdjustment?: {
    type: 'amount' | 'margin' | 'markup' | 'cost';
    profitAmount: number;
    profitMargin: number;
    markupPercent?: number;
    costAmount: number;
    note?: string;
  };
}

export interface FinancialAccount {
    id: string;
    storeId?: string;
    name: string;
    type: 'Cash' | 'Bank' | 'Mobile Wallet';
    balance: number;
    openingBalance?: number; // Starting balance of the account
    accountNumber?: string;
    bankName?: string;
    isDefault?: boolean;
}

export interface OnlineOrder {
  id: string;
  storeId?: string;
  customerName: string;
  address: string;
  items: { productId: string; name: string; qty: number; price: number }[];
  total: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  date: string;
  courier?: string;
  trackingNumber?: string;
  platform: 'WooCommerce' | 'Shopify' | 'Custom';
  paymentMethod?: string;
  paymentStatus?: string;
  fulfilledTransactionId?: string;
  deliveryStatus?: string;
  deliveryTimeline?: { status: string; at?: string; note?: string; by?: string }[];
  shippedAt?: string;
  deliveredAt?: string;
}

export interface CourierConfig {
    provider: 'Manual' | 'Pathao' | 'Steadfast' | 'Paperfly' | 'RedX' | 'Sundarban';
    apiKey: string;
    apiSecret: string;
    enabled: boolean;
    storeId?: string;
    areaId?: string;
    username?: string;
    password?: string;
    baseUrl?: string;
}

export interface DomainConfig {
    subdomain: string;
    customDomain: string;
    status: 'Not Connected' | 'Pending' | 'Active';
}

export interface PromoCode {
    id: string;
    code: string;
    discount: number;
    type: 'fixed' | 'percentage';
    status: 'active' | 'expired';
    minPurchase?: number;
    maxDiscount?: number; // caps the discount amount for percentage-type coupons
    usageLimit?: number; // total number of times this code can ever be used
    usedCount?: number;
    validUntil?: string;
}

export interface GiftCard {
  id: string;
  code: string;
  initialBalance: number;
  balance: number;
  currency?: string;
  status: 'active' | 'redeemed' | 'disabled' | 'expired';
  issuedToCustomerId?: string;
  issuedToName?: string;
  expiresAt?: string; // YYYY-MM-DD
  createdAt: string;
  lastRedeemedAt?: string;
  notes?: string;
}

export interface ReferralConfig {
  enabled: boolean;
  referrerRewardPoints: number; // points given to referrer when referee completes first sale
  refereeRewardPoints: number;  // points given to new customer on signup with code
  minSaleForReferrerReward: number; // min sale amount to trigger referrer reward
}

export interface LoyaltyConfig {

    enabled: boolean;
    pointsPerCurrency: number; // e.g. 100 means "1 point earned per 100 spent"
    redemptionRate: number; // e.g. 1 means "1 point = 1 currency unit" when redeeming
    minPointsToRedeem: number;
}

export interface ShopPolicies {
    terms: string;
    refund: string;
    shipping: string;
}

export interface Category {
    id: string;
    name: string;
    subCategories: string[];
}

export interface ExpenseCategory {
    id: string;
    name: string;
    isDefault?: boolean;
    /** Monthly budget in shop currency (0 = no limit) */
    monthlyBudget?: number;
}

export interface Brand {
    id: string;
    name: string;
}

export interface Unit {
    id: string;
    name: string; // e.g. Pcs, Kg, Ltr, Box
}

export interface Warehouse {
    id: string;
    name: string;
    storeId?: string;
    address?: string;
    isDefault?: boolean;
}

// --- Production Interfaces ---
export interface RawMaterial {
    id: string;
    name: string;
    stock: number;
    unit: string;
    cost: number; // Cost per unit
    minLevel: number;
}

export interface BillOfMaterial {
    id: string;
    productId: string; // ID of the finished product from 'products'
    productName: string;
    /** Alternate recipe label */
    name?: string;
    code?: string;
    isDefault?: boolean;
    revision?: string;
    materials: { materialId: string; name: string; qty: number; componentType?: 'raw' | 'subassembly' | 'phantom'; productId?: string }[]; // multi-level: subassembly refs another product BOM
    yield: number; // usually 1
}

export interface ProductionBatch {
    id: string;
    bomId: string;
    productName: string;
    productId: string; // Added productId
    quantity: number;
    status: 'Planned' | 'In Progress' | 'Completed' | 'Cancelled';
    startDate: string;
    endDate?: string;
    /** FG / lot expiry (YYYY-MM-DD) */
    expiryDate?: string;
    /** Optional lot / batch number for finished goods */
    lotNumber?: string;
    /** Days from completion (or start) used when expiryDate not set */
    shelfLifeDays?: number;
    workCenter?: string;
    actualQty?: number;
    scrapQty?: number;
    materialCost?: number;
    laborCost?: number;
    totalCost?: number;
    unitCost?: number;
    notes?: string;
    operations?: {
        seq: number;
        name: string;
        workCenterId?: string | null;
        standardHours?: number;
        actualHours?: number;
        hoursVariance?: number;
        status?: 'Pending' | 'Done' | string;
        completedAt?: string | null;
    }[];
    totalActualHours?: number;
    totalStandardHours?: number;
    suggestedLaborCost?: number;
}

interface DataContextType {
  products: Product[];
  customers: Entity[];
  suppliers: Entity[];
  transactions: LedgerEntry[];
  financialAccounts: FinancialAccount[];
  onlineOrders: OnlineOrder[];
  staff: Staff[];
  appLogs: AppLog[];
  courierSettings: CourierConfig[];
  domainSettings: DomainConfig;
  promoCodes: PromoCode[];
  shopPolicies: ShopPolicies;
  categories: Category[];
  brands: Brand[];
  units: Unit[];
  warehouses: Warehouse[];
  expenseCategories: ExpenseCategory[];
  // Customer CRM State
  customerGroups: CustomerGroup[];
  supportTickets: SupportTicket[];
  feedbacks: CustomerFeedback[];
  marketingCampaigns: MarketingCampaign[];
  saasTickets: SaasSupportTicket[];
  
  // Global Supplier Registry State
  globalSuppliers: GlobalSupplier[];
  
  // Production State
  rawMaterials: RawMaterial[];
  boms: BillOfMaterial[];
  productionBatches: ProductionBatch[];
  
  addProduct: (product: Product) => void;
  updateProduct: (id: string, data: Partial<Product>) => void;
  updateProductStock: (id: string, qty: number, type: 'increase' | 'decrease', variantId?: string, opts?: { lots?: { lotNumber: string; qty: number; expiryDate?: string; warehouseId?: string }[]; lotNumber?: string; expiryDate?: string; warehouseId?: string }) => { lotNumber: string; qty: number; expiryDate?: string; warehouseId?: string }[] | void;
  refreshProducts: () => Promise<any[] | void>;
  lastProductsSyncAt: string | null;
  productsRealtimeActive: boolean;
  lowStockProducts: Product[];
  processPurchase: (productId: string, newQty: number, newUnitPrice: number, opts?: { lotNumber?: string; expiryDate?: string; receivedAt?: string; variantId?: string }) => void;
  addEntity: (entity: Entity) => void;
  updateEntity: (id: string, data: Partial<Entity>) => void;
  registerSupplier: (globalData: Partial<GlobalSupplier> & { name: string; mobile: string }, businessData: Partial<Entity>) => void;
  updateSupplierProfile: (mobile: string, globalData: Partial<GlobalSupplier>, businessData?: Partial<Entity>) => void;
  addTransaction: (entry: LedgerEntry) => void;
  updateTransaction: (id: string, data: Partial<LedgerEntry>) => void;
  deleteItem: (type: 'product' | 'entity' | 'transaction', id: string) => void;
  restoreItem: (type: 'product' | 'entity' | 'transaction', id: string) => void;
  updateLoyaltyPoints: (customerId: string, amountSpent: number) => void;
  redeemLoyaltyPoints: (customerId: string, pointsToRedeem: number) => number;
  loyaltyConfig: LoyaltyConfig;
  setLoyaltyConfig: (config: LoyaltyConfig) => void;
  referralConfig: ReferralConfig;
  setReferralConfig: (config: ReferralConfig) => void;
  giftCards: GiftCard[];
  issueGiftCard: (card: Omit<GiftCard, 'id' | 'createdAt' | 'balance' | 'status'> & { initialBalance: number; code?: string }) => GiftCard;
  disableGiftCard: (id: string) => void;
  redeemGiftCard: (code: string, amount: number) => { ok: boolean; amount: number; remaining: number; error?: string };
  ensureCustomerReferralCode: (customerId: string) => string;
  applyReferralCode: (customerId: string, code: string) => { ok: boolean; error?: string };
  processReferralRewardsOnSale: (customerId: string, saleAmount: number) => void;
  updatePromoCode: (id: string, data: Partial<PromoCode>) => void;
  validateCoupon: (code: string, purchaseAmount: number) => { valid: boolean; discount: number; promoId?: string; error?: string };
  recordCouponUsage: (promoId: string) => void;
  
  // Account Methods
  addFinancialAccount: (account: FinancialAccount) => void;
  transferFunds: (fromAccountId: string, toAccountId: string, amount: number, note?: string) => void;

  // Online Order Methods
  addOnlineOrder: (order: OnlineOrder) => void;
  updateOnlineOrder: (id: string, data: Partial<OnlineOrder>) => void;
  // Staff Methods
  addStaff: (staff: Staff) => void;
  updateStaff: (id: string, data: Partial<Staff>) => void;
  deleteStaff: (id: string) => void;
  markAttendance: (staffId: string, date: string, status: 'Present' | 'Absent' | 'Leave' | 'Half Day', time?: string) => void;
  updatePerformance: (staffId: string, rating: number, comment: string) => void;
  updateLocation: (staffId: string, location: { lat: number, lng: number, address: string }) => void;
  logAction: (module: string, action: string, details?: string) => void;
  // Settings
  updateCourierSettings: (provider: string, data: Partial<CourierConfig>) => void;
  updateDomainSettings: (data: Partial<DomainConfig>) => void;
  // Promo & Policy
  addPromoCode: (code: PromoCode) => void;
  deletePromoCode: (id: string) => void;
  updateShopPolicy: (data: Partial<ShopPolicies>) => void;
  toggleFeaturedProduct: (productId: string) => void;
  // Category / Brand / Unit / Warehouse Management
  addCategory: (name: string) => void;
  addBrand: (name: string) => void;
  deleteBrand: (id: string) => void;
  addUnit: (name: string) => void;
  deleteUnit: (id: string) => void;
  addWarehouse: (w: Omit<Warehouse, 'id'> & { id?: string }) => Promise<void>;
  updateWarehouse: (w: Warehouse) => Promise<void>;
  deleteWarehouse: (id: string) => Promise<void>;
  refreshWarehouses: () => Promise<void>;
  addSubCategory: (categoryId: string, subCategoryName: string) => void;
  deleteCategory: (id: string) => void;
  deleteSubCategory: (categoryId: string, subCategoryName: string) => void;
  // Expense Category Management
  addExpenseCategory: (name: string, monthlyBudget?: number) => void;
  updateExpenseCategory: (id: string, data: Partial<ExpenseCategory>) => void;
  deleteExpenseCategory: (id: string) => void;
  
  // Customer CRM Methods
  addCustomerGroup: (group: CustomerGroup) => void;
  updateCustomerGroup: (id: string, data: Partial<CustomerGroup>) => void;
  deleteCustomerGroup: (id: string) => void;
  addSupportTicket: (ticket: SupportTicket) => void;
  updateSupportTicket: (id: string, data: Partial<SupportTicket>) => void;
  addFeedback: (feedback: CustomerFeedback) => void;
  addMarketingCampaign: (campaign: MarketingCampaign) => void;
  updateMarketingCampaign: (id: string, data: Partial<MarketingCampaign>) => void;
  addSaasTicket: (ticket: SaasSupportTicket) => void;
  refreshSaasTickets: () => Promise<void>;
  updateSaasTicket: (id: string, data: Partial<SaasSupportTicket>) => void;
  quotations: Quotation[];
  addQuotation: (quote: Quotation) => void;
  updateQuotation: (id: string, data: Partial<Quotation>) => void;
  deleteQuotation: (id: string) => void;
  convertQuotationToSale: (quoteId: string, paymentMethod?: LedgerEntry['paymentMethod']) => { ok: boolean; saleId?: string; error?: string };
  kitchenOrders: KitchenOrder[];
  addKitchenOrder: (order: KitchenOrder) => void;
  updateKitchenOrderStatus: (id: string, status: KitchenOrder['status']) => void;
  purchaseOrders: PurchaseOrder[];
  stockTransferRequests: StockTransferRequest[];
  createStockTransferRequest: (req: Omit<StockTransferRequest, 'status' | 'requestedAt'> & { status?: StockTransferRequest['status'] }) => void;
  approveStockTransfer: (id: string, reviewer?: string) => { ok: boolean; error?: string };
  rejectStockTransfer: (id: string, note?: string, reviewer?: string) => void;
  cancelStockTransfer: (id: string) => void;
  addPurchaseOrder: (po: PurchaseOrder) => void;
  updatePurchaseOrder: (id: string, data: Partial<PurchaseOrder>) => void;
  deletePurchaseOrder: (id: string) => void;
  receivePurchaseOrder: (poId: string, receivedQtys?: Record<string, number>) => void;
  departments: Department[];
  addDepartment: (dept: Department) => void;
  deleteDepartment: (id: string) => void;
  designations: Designation[];
  addDesignation: (designation: Designation) => void;
  deleteDesignation: (id: string) => void;
  workShifts: WorkShift[];
  addWorkShift: (shift: WorkShift) => void;
  deleteWorkShift: (id: string) => void;
  payrollRuns: PayrollRun[];
  addPayrollRun: (run: PayrollRun) => void;
  voidPayrollRun: (id: string) => void;
  getPayrollRunsForPeriod: (period: string) => PayrollRun[];
  journalEntries: JournalEntry[];
  addJournalEntry: (entry: JournalEntry) => { ok: boolean; error?: string };
  deleteJournalEntry: (id: string) => void;
  journalTrialBalance: () => { accountId: string; code: string; name: string; debit: number; credit: number }[];
  journalPeriodClosedThrough: string | null;
  setJournalPeriodClosedThrough: (date: string | null) => void;

  leaveRequests: LeaveRequest[];
  leavePolicy: LeavePolicy;
  setLeavePolicy: (p: LeavePolicy) => void;
  addLeaveRequest: (req: LeaveRequest) => void;
  reviewLeaveRequest: (id: string, status: 'Approved' | 'Rejected', note?: string) => void;
  cancelLeaveRequest: (id: string) => void;
  holidays: Holiday[];
  addHoliday: (holiday: Holiday) => void;
  deleteHoliday: (id: string) => void;
  isHolidayDate: (date: string) => Holiday | undefined;

  // Production Methods
  addRawMaterial: (mat: RawMaterial) => void;
  updateRawMaterial: (id: string, data: Partial<RawMaterial>) => void;
  restockMaterial: (id: string, qty: number, cost: number) => void; // Adds stock and creates expense tx
  addBOM: (bom: BillOfMaterial) => void;
  deleteBOM: (id: string) => void;
  addBatch: (batch: ProductionBatch) => void;
  updateBatchStatus: (id: string, status: ProductionBatch['status']) => void;
  completeProductionBatch: (batchId: string, opts?: { actualQty?: number; scrapQty?: number; laborCost?: number; notes?: string; force?: boolean; scrapReason?: string; expiryDate?: string; lotNumber?: string; shelfLifeDays?: number }) => Promise<void>;
  recalculateBalances: () => void;
  resetData: (password: string) => Promise<boolean>;
  // Scalability Methods
  archiveTransactions: (beforeDate: string) => Promise<number>;
  importData: (jsonData: string) => void;
  getAllData: () => any;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helper for initial data with store ID
const withStore = (data: any[], storeId = '1') => data.map(item => ({ ...item, storeId }));

const INITIAL_PRODUCTS: Product[] = [];

const INITIAL_STAFF: Staff[] = [];

const INITIAL_LOGS: AppLog[] = [];

export const DEFAULT_FINANCIAL_ACCOUNTS: FinancialAccount[] = [
  {
    id: 'acc_cash_default',
    name: 'Cash in Hand',
    type: 'Cash',
    balance: 0,
    openingBalance: 0,
    isDefault: true,
  },
  {
    id: 'acc_bank_default',
    name: 'Main Bank Account',
    type: 'Bank',
    balance: 0,
    openingBalance: 0,
    isDefault: false,
  },
  {
    id: 'acc_wallet_default',
    name: 'bKash / Mobile Wallet',
    type: 'Mobile Wallet',
    balance: 0,
    openingBalance: 0,
    isDefault: false,
  },
];

const INITIAL_ACCOUNTS: FinancialAccount[] = DEFAULT_FINANCIAL_ACCOUNTS;

const INITIAL_ONLINE_ORDERS: OnlineOrder[] = [];

const INITIAL_CATEGORIES: Category[] = [];

const INITIAL_EXPENSE_CATEGORIES: ExpenseCategory[] = [];

const INITIAL_SAAS_TICKETS: SaasSupportTicket[] = [];

function isSaasUserRole(role: unknown): boolean {
  const r = String(role || '').toUpperCase();
  return r === 'SAAS_OWNER' || r === 'SAAS_ADMIN';
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Replay offline mutation queue when connectivity returns
  React.useEffect(() => {
    wireOfflineQueueAutoFlush(authFetch);
  }, []);

  const { activeStore } = useStores();
  const { user, verifyPassword, updateUser } = useAuth();

  const assertTrialOrThrow = (key: TrialLimitKey, increment = 1): boolean => {
    const session = readSessionUser() || user;
    if (!session || !isTrialPlan(session)) return true;
    const check = canUseTrialAction(key, session.trialLimits, session.trialUsage, increment);
    if (!check.ok) {
      const msg = check.messageBn || check.messageEn;
      try { alert(msg); } catch { /* ignore */ }
      return false;
    }
    return true;
  };

  const recordTrialUsage = (key: TrialLimitKey, by = 1) => {
    const session = readSessionUser() || user;
    if (!session || !isTrialPlan(session) || !updateUser) return;
    const eventMap: Record<TrialLimitKey, Parameters<typeof trackUsageEvent>[1]> = {
      products: { type: 'product_created', count: by },
      customers: { type: 'customer_created', count: by },
      buys: { type: 'purchase_completed', count: by },
      sells: { type: 'sale_completed', count: by, quick: false },
      expenses: { type: 'expense_created', count: by },
      quickSales: { type: 'sale_completed', count: by, quick: true },
    };
    const result = trackUsageEvent(session, eventMap[key], true);
    if (!result.allowed) return;
    const patch: Partial<User> = { trialUsage: result.usage };
    if (result.exhausted) {
      patch.subscriptionStatus = 'Expired';
      patch.subscriptionEnforce = true;
    }
    writeSessionTrialUsage(result.usage, result.exhausted ? { subscriptionStatus: 'Expired', subscriptionEnforce: true } : undefined);
    updateUser(patch as any);
  };

  /** Reconcile counters from live data (max of stored vs derived). */
  const reconcileTrialUsageFromData = () => {
    const session = readSessionUser() || user;
    if (!session || !isTrialPlan(session) || !updateUser) return;
    const derived = deriveUsageFromData({ products, customers, transactions });
    const merged = mergeUsageMax(session.trialUsage, derived);
    const exhausted = isTrialExhausted(session.trialLimits, merged);
    const patch: Partial<User> = { trialUsage: merged };
    if (exhausted) {
      patch.subscriptionStatus = 'Expired';
      patch.subscriptionEnforce = true;
    }
    writeSessionTrialUsage(merged, exhausted ? { subscriptionStatus: 'Expired', subscriptionEnforce: true } : undefined);
    updateUser(patch as any);
  };

  const userId = user ? user.id : '';
  const loadedUserIdRef = React.useRef<string>("");
  const settingsLoadedRef = React.useRef<boolean>(false);
  
  // RAW Data States (Contain all stores data)
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [customers, setCustomers] = useState<Entity[]>([]);
  const [suppliers, setSuppliers] = useState<Entity[]>([]);
  const [globalSuppliers, setGlobalSuppliers] = useState<GlobalSupplier[]>(() => {
    const saved = localStorage.getItem('bizora_global_supplier_registry');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((s: any) => !['Sardar Agro-Tech Ltd', 'Dhaka Apparel Sourcing', 'Chittagong Packaging World'].includes(s?.name));
        }
      } catch (e) {
        console.error("Error parsing bizora_global_supplier_registry:", e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('bizora_global_supplier_registry', JSON.stringify(globalSuppliers));
  }, [globalSuppliers]);
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>(INITIAL_ACCOUNTS);
  const [onlineOrders, setOnlineOrders] = useState<OnlineOrder[]>(INITIAL_ONLINE_ORDERS);
  const [staff, setStaffState] = useState<Staff[]>(INITIAL_STAFF);
  const [appLogs, setAppLogs] = useState<AppLog[]>(INITIAL_LOGS);
  
  // Settings
  const [courierSettings, setCourierSettings] = useState<CourierConfig[]>([
      { provider: 'Manual', apiKey: '', apiSecret: '', enabled: true },
      { provider: 'Pathao', apiKey: '', apiSecret: '', enabled: false },
      { provider: 'Steadfast', apiKey: '', apiSecret: '', enabled: false },
      { provider: 'Paperfly', apiKey: '', apiSecret: '', enabled: false },
      { provider: 'RedX', apiKey: '', apiSecret: '', enabled: false },
      { provider: 'Sundarban', apiKey: '', apiSecret: '', enabled: false },
  ]);
  const [domainSettings, setDomainSettings] = useState<DomainConfig>({
      subdomain: '',
      customDomain: '',
      status: 'Not Connected'
  });
  
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);

  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [referralConfig, setReferralConfig] = useState<ReferralConfig>({
    enabled: true,
    referrerRewardPoints: 50,
    refereeRewardPoints: 25,
    minSaleForReferrerReward: 0,
  });
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig>({
      enabled: false,
      pointsPerCurrency: 100,
      redemptionRate: 1,
      minPointsToRedeem: 100,
  });
  
  const [shopPolicies, setShopPolicies] = useState<ShopPolicies>({
      terms: '',
      refund: '',
      shipping: ''
  });

  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([
    { id: 'u1', name: 'Pcs' },
    { id: 'u2', name: 'Kg' },
    { id: 'u3', name: 'Ltr' },
    { id: 'u4', name: 'Box' },
    { id: 'u5', name: 'Dozen' },
  ]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [lastProductsSyncAt, setLastProductsSyncAt] = useState<string | null>(null);
  const [productsRealtimeActive, setProductsRealtimeActive] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(INITIAL_EXPENSE_CATEGORIES);

  // CRM States
  const [customerGroups, setCustomerGroups] = useState<CustomerGroup[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [saasTickets, setSaasTickets] = useState<SaasSupportTicket[]>(() => {
    const saved = localStorage.getItem('saasTickets');
    return saved ? JSON.parse(saved) : INITIAL_SAAS_TICKETS;
  });

  // Real-time chat (backend/src/lib/chatSocket.ts): merges a ticket the
  // instant it's created/updated on either side, instead of waiting for
  // the next page load. Purely additive - the REST-based load/refresh
  // above still runs as the source of truth and offline fallback.
  useChatSocket((ticket: SaasSupportTicket) => {
    setSaasTickets(prev => {
      const idx = prev.findIndex(t => t.id === ticket.id);
      if (idx === -1) return [...prev, ticket];
      const next = [...prev];
      next[idx] = ticket;
      return next;
    });
  });
  const [feedbacks, setFeedbacks] = useState<CustomerFeedback[]>([]);
  const [marketingCampaigns, setMarketingCampaigns] = useState<MarketingCampaign[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrder[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [stockTransferRequests, setStockTransferRequests] = useState<StockTransferRequest[]>([]);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [workShifts, setWorkShifts] = useState<WorkShift[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [journalPeriodClosedThrough, setJournalPeriodClosedThroughState] = useState<string | null>(() => {
    try {
      return localStorage.getItem('bizora_journal_closed_through') || null;
    } catch {
      return null;
    }
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leavePolicy, setLeavePolicyState] = useState<LeavePolicy>({
    year: new Date().getFullYear(),
    annualDays: 14,
    sickDays: 10,
    casualDays: 5,
    otherDays: 0,
    excludeWeekends: true,
    carryForwardEnabled: true,
    carryForwardMaxAnnual: 5,
    carryForwardSick: false,
    carryForwardCasual: false,
    accrualEnabled: true,
  });


  // Production State
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [boms, setBoms] = useState<BillOfMaterial[]>([]);
  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>([]);

  // 1. Reactive database loading when userId/user changes (e.g. login, logout, impersonation switch)
  useEffect(() => {
    if (!userId) {
      setProducts(INITIAL_PRODUCTS);
      setCustomers([]);
      setSuppliers([]);
      setTransactions([]);
      setFinancialAccounts(INITIAL_ACCOUNTS);
      setOnlineOrders(INITIAL_ONLINE_ORDERS);
      setStaffState(INITIAL_STAFF);
      setAppLogs(INITIAL_LOGS);
      setCourierSettings([
          { provider: 'Pathao', apiKey: '', apiSecret: '', enabled: false },
          { provider: 'Steadfast', apiKey: '', apiSecret: '', enabled: false },
          { provider: 'Paperfly', apiKey: '', apiSecret: '', enabled: false },
          { provider: 'RedX', apiKey: '', apiSecret: '', enabled: false },
      ]);
      setDomainSettings({
          subdomain: '',
          customDomain: '',
          status: 'Not Connected'
      });
      setPromoCodes([]);
      setShopPolicies({
          terms: '',
          refund: '',
          shipping: ''
      });
      setCategories(INITIAL_CATEGORIES);
      setBrands([]);
      setUnits([
        { id: 'u1', name: 'Pcs' },
        { id: 'u2', name: 'Kg' },
        { id: 'u3', name: 'Ltr' },
        { id: 'u4', name: 'Box' },
        { id: 'u5', name: 'Dozen' },
      ]);
      setWarehouses([]);
      setExpenseCategories(INITIAL_EXPENSE_CATEGORIES);
      setCustomerGroups([]);
      setSupportTickets([]);
      setFeedbacks([]);
      setMarketingCampaigns([]);
      setRawMaterials([]);
      setBoms([]);
      setProductionBatches([]);
      loadedUserIdRef.current = "";
      return;
    }
    
    // Assuming business_id is available in user object
    const businessId = user?.business_id || 'default_business';
    migrateDataToFirestore(userId, businessId).then(() => console.log('Migration complete'));

    try {
      const savedProducts = localStorage.getItem(`nexus_products_${userId}`);
      let products: Product[] = INITIAL_PRODUCTS;
      try {
        if (savedProducts) products = JSON.parse(savedProducts);
      } catch (e) {
        console.error("Error parsing products:", e);
      }
      setProducts(products.filter(p => !p.business_id || p.business_id === businessId));

      const savedCustomers = localStorage.getItem(`nexus_customers_${userId}`);
      let customers: Entity[] = [];
      try {
        if (savedCustomers) customers = JSON.parse(savedCustomers);
      } catch (e) {
        console.error("Error parsing customers:", e);
      }
      setCustomers(customers.filter(c => !c.business_id || c.business_id === businessId));

      const savedSuppliers = localStorage.getItem(`nexus_suppliers_${userId}`);
      let suppliers: Entity[] = [];
      try {
        if (savedSuppliers) suppliers = JSON.parse(savedSuppliers);
      } catch (e) {
        console.error("Error parsing suppliers:", e);
      }
      setSuppliers(suppliers.filter(s => !s.business_id || s.business_id === businessId));

      const savedTransactions = localStorage.getItem(`nexus_transactions_${userId}`);
      let transactions: LedgerEntry[] = [];
      try {
        if (savedTransactions) transactions = JSON.parse(savedTransactions);
      } catch (e) {
        console.error("Error parsing transactions:", e);
      }
      setTransactions(transactions.filter(t => !t.business_id || t.business_id === businessId));

      const savedAccounts = localStorage.getItem(`nexus_accounts_${userId}`);
      try {
        const parsed = savedAccounts ? JSON.parse(savedAccounts) : [];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFinancialAccounts(parsed);
        } else {
          setFinancialAccounts(DEFAULT_FINANCIAL_ACCOUNTS);
        }
      } catch (e) {
        setFinancialAccounts(DEFAULT_FINANCIAL_ACCOUNTS);
        console.error("Error parsing accounts:", e);
      }

      const savedOnlineOrders = localStorage.getItem(`nexus_onlineOrders_${userId}`);
      try {
        setOnlineOrders(savedOnlineOrders ? JSON.parse(savedOnlineOrders) : INITIAL_ONLINE_ORDERS);
      } catch (e) {
        setOnlineOrders(INITIAL_ONLINE_ORDERS);
        console.error("Error parsing online orders:", e);
      }

      // Load from Global Employee Registry first
      const savedGlobalRegistry = localStorage.getItem('bizora_global_employee_registry');
      let globalList: any[] = [];
      if (savedGlobalRegistry) {
        try {
          globalList = JSON.parse(savedGlobalRegistry);
        } catch (e) {
          console.error("Error parsing global employee registry:", e);
        }
      }
      
      // Filter those who have an employment for this business owner
      const businessStaff = globalList
        .filter(emp => emp.employments && emp.employments.some((e: any) => e.businessId === userId))
        .map(emp => {
          const currentEmployment = emp.employments.find((e: any) => e.businessId === userId)!;
          return {
            id: emp.mobile, // ID is the mobile number
            storeId: '1',
            name: emp.name,
            role: currentEmployment.role,
            pin: emp.pin,
            mobile: emp.mobile,
            status: currentEmployment.status,
            joiningDate: currentEmployment.joiningDate,
            basicSalary: currentEmployment.basicSalary,
            salesTarget: currentEmployment.salesTarget || 0,
            commissionRate: currentEmployment.commissionRate || 0,
            attendance: currentEmployment.attendance || {},
            performance: currentEmployment.performance || { rating: 5, reviews: [] }
          };
        });

      if (businessStaff.length > 0) {
        setStaffState(businessStaff);
      } else {
        const savedStaff = localStorage.getItem(`nexus_staff_${userId}`);
        try {
          setStaffState(savedStaff ? JSON.parse(savedStaff) : INITIAL_STAFF);
        } catch (e) {
          setStaffState(INITIAL_STAFF);
          console.error("Error parsing staff:", e);
        }
      }

      const savedLogs = localStorage.getItem(`nexus_appLogs_${userId}`);
      try {
        setAppLogs(savedLogs ? JSON.parse(savedLogs) : INITIAL_LOGS);
      } catch (e) {
        setAppLogs(INITIAL_LOGS);
        console.error("Error parsing app logs:", e);
      }

      const savedCourier = localStorage.getItem(`nexus_courierSettings_${userId}`);
      try {
        setCourierSettings(savedCourier ? JSON.parse(savedCourier) : [
            { provider: 'Manual', apiKey: '', apiSecret: '', enabled: true },
            { provider: 'Pathao', apiKey: '', apiSecret: '', enabled: false },
            { provider: 'Steadfast', apiKey: '', apiSecret: '', enabled: false },
            { provider: 'Paperfly', apiKey: '', apiSecret: '', enabled: false },
            { provider: 'RedX', apiKey: '', apiSecret: '', enabled: false },
            { provider: 'Sundarban', apiKey: '', apiSecret: '', enabled: false },
        ]);
      } catch (e) {
        console.error("Error parsing courier settings:", e);
      }

      const savedDomain = localStorage.getItem(`nexus_domainSettings_${userId}`);
      try {
        setDomainSettings(savedDomain ? JSON.parse(savedDomain) : {
            subdomain: user && user.businessName ? `${user.businessName.toLowerCase().replace(/\s+/g, '-')}.bizora.com` : 'ishas-fashion.bizora.com',
            customDomain: '',
            status: 'Not Connected'
        });
      } catch (e) {
        console.error("Error parsing domain settings:", e);
      }

      const savedPromoCodes = localStorage.getItem(`nexus_promoCodes_${userId}`);
      try {
        setPromoCodes(savedPromoCodes ? JSON.parse(savedPromoCodes) : [
            { id: '1', code: 'WELCOME10', discount: 10, type: 'percentage', status: 'active' }
        ]);
      } catch (e) {
        console.error("Error parsing promo codes:", e);
      }

      const savedPolicies = localStorage.getItem(`nexus_shopPolicies_${userId}`);
      try {
        setShopPolicies(savedPolicies ? JSON.parse(savedPolicies) : {
            terms: 'All sales are final unless item is defective.',
            refund: 'Refunds processed within 7 days of return receipt.',
            shipping: 'Standard delivery takes 3-5 business days.'
        });
      } catch (e) {
        console.error("Error parsing shop policies:", e);
      }

      const savedCategories = localStorage.getItem(`nexus_categories_${userId}`);
      try {
        setCategories(savedCategories ? JSON.parse(savedCategories) : INITIAL_CATEGORIES);
      } catch (e) {
        console.error("Error parsing categories:", e);
      }

      const savedExpenseCategories = localStorage.getItem(`nexus_expenseCategories_${userId}`);
      try {
        setExpenseCategories(savedExpenseCategories ? JSON.parse(savedExpenseCategories) : INITIAL_EXPENSE_CATEGORIES);
      } catch (e) {
        console.error("Error parsing expense categories:", e);
      }

      const savedGroups = localStorage.getItem(`nexus_customerGroups_${userId}`);
      try {
        setCustomerGroups(savedGroups ? JSON.parse(savedGroups) : [
            { id: 'vip', name: 'VIP', color: '#8b5cf6', description: 'High value customers' },
            { id: 'new', name: 'New', color: '#10b981', description: 'Joined in last 30 days' }
        ]);
      } catch (e) {
        console.error("Error parsing customer groups:", e);
      }

      const savedTickets = localStorage.getItem(`nexus_supportTickets_${userId}`);
      try {
        setSupportTickets(savedTickets ? JSON.parse(savedTickets) : []);
      } catch (e) {
        console.error("Error parsing support tickets:", e);
      }

      const savedFeedbacks = localStorage.getItem(`nexus_feedbacks_${userId}`);
      try {
        setFeedbacks(savedFeedbacks ? JSON.parse(savedFeedbacks) : []);
      } catch (e) {
        console.error("Error parsing feedbacks:", e);
      }

      const savedCampaigns = localStorage.getItem(`nexus_marketingCampaigns_${userId}`);
      try {
        setMarketingCampaigns(savedCampaigns ? JSON.parse(savedCampaigns) : []);
      } catch (e) {
        console.error("Error parsing campaigns:", e);
      }

      const savedMaterials = localStorage.getItem(`nexus_rawMaterials_${userId}`);
      try {
        setRawMaterials(savedMaterials ? JSON.parse(savedMaterials) : [
            { id: 'm1', name: 'Cotton Fabric', stock: 500, unit: 'Meters', cost: 50, minLevel: 100 },
            { id: 'm2', name: 'Thread Spool', stock: 200, unit: 'Pcs', cost: 10, minLevel: 50 },
            { id: 'm3', name: 'Buttons', stock: 1000, unit: 'Pcs', cost: 1, minLevel: 200 },
        ]);
      } catch (e) {
        console.error("Error parsing raw materials:", e);
      }

      const savedBoms = localStorage.getItem(`nexus_boms_${userId}`);
      try {
        setBoms(savedBoms ? JSON.parse(savedBoms) : []);
      } catch (e) {
        console.error("Error parsing BOMs:", e);
      }

      const savedBatches = localStorage.getItem(`nexus_productionBatches_${userId}`);
      try {
        setProductionBatches(savedBatches ? JSON.parse(savedBatches) : []);
      } catch (e) {
        console.error("Error parsing batches:", e);
      }

      loadedUserIdRef.current = userId;

      // Backend sync (Stage 2b): if this session has a real Shop Owner
      // token, the backend is the source of truth for products - refresh
      // from there (falls back silently to the localStorage data loaded
      // above for other login types or if the backend is unreachable).
      if (hasAuthToken() && !isSaasUserRole(user?.role)) {
        authFetch('/api/products')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.products) {
              setProducts(body.products);
              setLastProductsSyncAt(new Date().toISOString());
            }
          })
          .catch(err => console.warn('Product backend refresh failed, using local data:', err));

        authFetch('/api/warehouses')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.warehouses) setWarehouses(body.warehouses);
            else if (Array.isArray(body)) setWarehouses(body);
          })
          .catch(err => console.warn('Warehouse backend refresh failed, using local data:', err));

        authFetch('/api/transactions')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.transactions) setTransactions(body.transactions);
          })
          .catch(err => console.warn('Transaction backend refresh failed, using local data:', err));

        authFetch('/api/entities')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.entities) {
              setCustomers(body.entities.filter((e: Entity) => e.type === 'Customer'));
              setSuppliers(body.entities.filter((e: Entity) => e.type === 'Supplier'));
            }
          })
          .catch(err => console.warn('Entity backend refresh failed, using local data:', err));

        authFetch('/api/staff')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.staff) setStaffState(body.staff);
          })
          .catch(err => console.warn('Staff backend refresh failed, using local data:', err));

        authFetch('/api/raw-materials')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.rawMaterials) setRawMaterials(body.rawMaterials);
          })
          .catch(err => console.warn('Raw material backend refresh failed, using local data:', err));

        authFetch('/api/boms')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.boms) setBoms(body.boms);
          })
          .catch(err => console.warn('BOM backend refresh failed, using local data:', err));

        authFetch('/api/production-batches')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.productionBatches) setProductionBatches(body.productionBatches);
          })
          .catch(err => console.warn('Production batch backend refresh failed, using local data:', err));

        authFetch('/api/support-tickets')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.supportTickets) setSupportTickets(body.supportTickets);
          })
          .catch(err => console.warn('Support ticket backend refresh failed, using local data:', err));

        authFetch('/api/feedbacks')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.feedbacks) setFeedbacks(body.feedbacks);
          })
          .catch(err => console.warn('Feedback backend refresh failed, using local data:', err));

        authFetch('/api/marketing-campaigns')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.marketingCampaigns) setMarketingCampaigns(body.marketingCampaigns);
          })
          .catch(err => console.warn('Marketing campaign backend refresh failed, using local data:', err));

        authFetch('/api/saas-tickets')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.tickets) setSaasTickets(body.tickets);
          })
          .catch(err => console.warn('SaaS ticket backend refresh failed, using local data:', err));

        authFetch('/api/quotations')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.quotations) setQuotations(body.quotations);
          })
          .catch(err => console.warn('Quotation backend refresh failed, using local data:', err));

        authFetch('/api/kitchen-orders')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.kitchenOrders) setKitchenOrders(body.kitchenOrders);
          })
          .catch(err => console.warn('Kitchen order backend refresh failed, using local data:', err));

        authFetch('/api/purchase-orders')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.purchaseOrders) setPurchaseOrders(body.purchaseOrders);
          })
          .catch(err => console.warn('Purchase order backend refresh failed, using local data:', err));

        authFetch('/api/departments')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.departments) setDepartments(body.departments);
          })
          .catch(err => console.warn('Department backend refresh failed, using local data:', err));

        authFetch('/api/designations')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.designations) setDesignations(body.designations);
          })
          .catch(err => console.warn('Designation backend refresh failed, using local data:', err));

        authFetch('/api/work-shifts')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.workShifts) setWorkShifts(body.workShifts);
          })
          .catch(err => console.warn('Work shifts backend refresh failed, using local data:', err));

        authFetch('/api/holidays')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.holidays) setHolidays(body.holidays);
          })
          .catch(err => console.warn('Holidays backend refresh failed, using local data:', err));

        authFetch('/api/payroll-runs')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.payrollRuns) setPayrollRuns(body.payrollRuns);
          })
          .catch(err => console.warn('Payroll runs backend refresh failed, using local data:', err));

        authFetch('/api/journal-entries')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.journalEntries) setJournalEntries(body.journalEntries);
          })
          .catch(err => console.warn('Journal entries refresh failed:', err));

        authFetch('/api/leave-requests')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.leaveRequests) setLeaveRequests(body.leaveRequests);
          })
          .catch(err => console.warn('Leave requests refresh failed:', err));

        authFetch('/api/stock-transfers')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            const list = body?.stockTransfers;
            if (Array.isArray(list)) setStockTransferRequests(list);
          })
          .catch(err => console.warn('Stock transfers refresh failed:', err));

        authFetch('/api/gift-cards')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.giftCards) setGiftCards(body.giftCards);
          })
          .catch(err => console.warn('Gift cards backend refresh failed, using local data:', err));

        authFetch('/api/financial-accounts')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.financialAccounts) setFinancialAccounts(body.financialAccounts);
          })
          .catch(err => console.warn('Financial account backend refresh failed, using local data:', err));

        authFetch('/api/online-orders')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.onlineOrders) setOnlineOrders(body.onlineOrders);
          })
          .catch(err => console.warn('Online order backend refresh failed, using local data:', err));

        authFetch('/api/customer-groups')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            if (body?.groups) setCustomerGroups(body.groups);
          })
          .catch(err => console.warn('Customer group backend refresh failed, using local data:', err));

        authFetch('/api/business-settings')
          .then(res => res.ok ? res.json() : null)
          .then(body => {
            const s = body?.settings;
            if (!s) return;
            if (s.courierSettings) setCourierSettings(s.courierSettings);
            if (s.domainSettings) setDomainSettings(s.domainSettings);
            if (s.shopPolicies) setShopPolicies(s.shopPolicies);
            if (s.promoCodes) setPromoCodes(s.promoCodes);
            if (s.categories) setCategories(s.categories);
            if (s.brands) setBrands(s.brands);
            if (s.units) setUnits(s.units);
            if (s.expenseCategories) setExpenseCategories(s.expenseCategories);
            if (s.loyaltyConfig) setLoyaltyConfig(s.loyaltyConfig);
            if (s.referralConfig) setReferralConfig(s.referralConfig);
            settingsLoadedRef.current = true;
          })
          .catch(err => console.warn('Business settings backend refresh failed, using local data:', err));
      }
    } catch (err) {
      console.error("Critical error loading user data:", err);
    }
  }, [userId]);

  // Business settings (courier, domain, shop policies, promo codes,
  // categories, expense categories) are bundled into one PUT instead of
  // syncing each setter individually - they're all small, edited together,
  // and change infrequently. Waits for the initial backend fetch above to
  // finish (settingsLoadedRef) so this doesn't overwrite real backend data
  // with the local defaults a fresh page load starts with.
  useEffect(() => {
    if (!hasAuthToken() || isSaasUserRole(user?.role) || !settingsLoadedRef.current) return;
    authFetch('/api/business-settings', {
      method: 'PUT',
      body: JSON.stringify({ courierSettings, domainSettings, shopPolicies, promoCodes, categories, brands, units, expenseCategories, loyaltyConfig, referralConfig }),
    }).catch(err => console.warn('Business settings backend sync failed, kept locally:', err));
  }, [courierSettings, domainSettings, shopPolicies, promoCodes, categories, brands, units, expenseCategories, loyaltyConfig, referralConfig]);

  // 2. Auto-saving persistence on change
  useEffect(() => {
    if (userId && loadedUserIdRef.current === userId) {
      localStorage.setItem(`nexus_products_${userId}`, JSON.stringify(products));
    }
  }, [products, userId]);

  useEffect(() => {
    if (userId && loadedUserIdRef.current === userId) {
      localStorage.setItem(`nexus_customers_${userId}`, JSON.stringify(customers));
    }
  }, [customers, userId]);

  useEffect(() => {
    if (userId && loadedUserIdRef.current === userId) {
      localStorage.setItem(`nexus_suppliers_${userId}`, JSON.stringify(suppliers));
    }
  }, [suppliers, userId]);

  useEffect(() => {
    if (userId && loadedUserIdRef.current === userId) {
      localStorage.setItem(`nexus_transactions_${userId}`, JSON.stringify(transactions));
    }
  }, [transactions, userId]);

  useEffect(() => {
    if (userId && loadedUserIdRef.current === userId) {
      localStorage.setItem(`nexus_accounts_${userId}`, JSON.stringify(financialAccounts));
    }
  }, [financialAccounts, userId]);

  useEffect(() => {
    if (userId && loadedUserIdRef.current === userId) {
      localStorage.setItem(`nexus_onlineOrders_${userId}`, JSON.stringify(onlineOrders));
    }
  }, [onlineOrders, userId]);

  useEffect(() => {
    if (userId && loadedUserIdRef.current === userId) {
      localStorage.setItem(`nexus_staff_${userId}`, JSON.stringify(staff));
    }
  }, [staff, userId]);

  useEffect(() => {
    if (userId && loadedUserIdRef.current === userId) {
      localStorage.setItem(`nexus_appLogs_${userId}`, JSON.stringify(appLogs));
    }
  }, [appLogs, userId]);

  useEffect(() => {
    if (userId && loadedUserIdRef.current === userId) localStorage.setItem(`nexus_courierSettings_${userId}`, JSON.stringify(courierSettings));
  }, [courierSettings, userId]);

  useEffect(() => {
    if (userId && loadedUserIdRef.current === userId) localStorage.setItem(`nexus_domainSettings_${userId}`, JSON.stringify(domainSettings));
  }, [domainSettings, userId]);

  useEffect(() => {
    if (userId && loadedUserIdRef.current === userId) localStorage.setItem(`nexus_promoCodes_${userId}`, JSON.stringify(promoCodes));
  }, [promoCodes, userId]);

  useEffect(() => {
    if (userId && loadedUserIdRef.current === userId) localStorage.setItem(`nexus_shopPolicies_${userId}`, JSON.stringify(shopPolicies));
  }, [shopPolicies, userId]);

  useEffect(() => {
    if (userId && loadedUserIdRef.current === userId) localStorage.setItem(`nexus_categories_${userId}`, JSON.stringify(categories));
  }, [categories, userId]);

  useEffect(() => {
    if (userId && loadedUserIdRef.current === userId) localStorage.setItem(`nexus_expenseCategories_${userId}`, JSON.stringify(expenseCategories));
  }, [expenseCategories, userId]);

  useEffect(() => {
    if (userId && loadedUserIdRef.current === userId) localStorage.setItem(`nexus_customerGroups_${userId}`, JSON.stringify(customerGroups));
  }, [customerGroups, userId]);

  useEffect(() => {
    if (userId && loadedUserIdRef.current === userId) localStorage.setItem(`nexus_supportTickets_${userId}`, JSON.stringify(supportTickets));
  }, [supportTickets, userId]);

  useEffect(() => {
    if (userId && loadedUserIdRef.current === userId) localStorage.setItem(`nexus_feedbacks_${userId}`, JSON.stringify(feedbacks));
  }, [feedbacks, userId]);

  useEffect(() => {
    if (userId && loadedUserIdRef.current === userId) localStorage.setItem(`nexus_marketingCampaigns_${userId}`, JSON.stringify(marketingCampaigns));
  }, [marketingCampaigns, userId]);

  useEffect(() => {
    if (userId && loadedUserIdRef.current === userId) localStorage.setItem(`nexus_rawMaterials_${userId}`, JSON.stringify(rawMaterials));
  }, [rawMaterials, userId]);

  useEffect(() => {
    if (userId && loadedUserIdRef.current === userId) localStorage.setItem(`nexus_boms_${userId}`, JSON.stringify(boms));
  }, [boms, userId]);

  useEffect(() => {
    if (userId && loadedUserIdRef.current === userId) localStorage.setItem(`nexus_productionBatches_${userId}`, JSON.stringify(productionBatches));
  }, [productionBatches, userId]);

  useEffect(() => {
    localStorage.setItem('saasTickets', JSON.stringify(saasTickets));
  }, [saasTickets]);

  // --- FILTERED DATA (Based on Active Store) ---
  const currentStoreId = activeStore === 'HEAD_OFFICE' ? 'ALL' : activeStore.id;

  const visibleProducts = useMemo(() => 
    currentStoreId === 'ALL' ? products : products.filter(p => p.storeId === currentStoreId || !p.storeId), 
  [products, currentStoreId]);

  const lowStockProducts = useMemo(() => {
    return visibleProducts.filter(p => {
      if ((p as any).isDeleted) return false;
      if (p.type === 'Service') return false;
      const min = Number(p.minStockLevel ?? (p as any).lowStockAlert ?? 5);
      if (p.variants && p.variants.length) {
        const anyVariantLow = p.variants.some(v => (Number(v.stock) || 0) <= min);
        return anyVariantLow || (Number(p.stock) || 0) <= min;
      }
      return (Number(p.stock) || 0) <= min;
    });
  }, [visibleProducts]);

  const visibleTransactions = useMemo(() => 
    currentStoreId === 'ALL' ? transactions : transactions.filter(t => t.storeId === currentStoreId || !t.storeId), 
  [transactions, currentStoreId]);

  const visibleAccounts = useMemo(() => 
    currentStoreId === 'ALL' ? financialAccounts : financialAccounts.filter(a => a.storeId === currentStoreId || !a.storeId), 
  [financialAccounts, currentStoreId]);

  const visibleOrders = useMemo(() => 
    currentStoreId === 'ALL' ? onlineOrders : onlineOrders.filter(o => o.storeId === currentStoreId || !o.storeId), 
  [onlineOrders, currentStoreId]);

  const visibleStaff = useMemo(() => 
    currentStoreId === 'ALL' ? staff : staff.filter(s => s.storeId === currentStoreId || !s.storeId), 
  [staff, currentStoreId]);

  // --- ACTIONS (Inject Store ID) ---

  const addProduct = (product: Product) => {
    if (!assertTrialOrThrow('products')) return;
    // Inject active store ID. If Head Office, default to '1' or prompt (simplified to '1' for now)
    const targetStore = currentStoreId === 'ALL' ? '1' : currentStoreId;
    const newProduct = { ...product, storeId: targetStore, isDeleted: false };
    setProducts(prev => [...prev, newProduct]);
    recordTrialUsage('products');
    logAction('Inventory', 'Add Product', `Added ${product.name}`);

    // Backend sync (Stage 2b) - only runs for accounts with a real Shop
    // Owner session; falls back to local-only for other login types.
    if (hasAuthToken()) {
      authFetch('/api/products', { method: 'POST', body: JSON.stringify(newProduct) })
        .then(res => res.ok ? res.json() : null)
        .then(body => {
          // Reconcile the client-generated id with the backend's id if it differs.
          if (body?.product?.id && body.product.id !== newProduct.id) {
            setProducts(prev => prev.map(p => p.id === newProduct.id ? { ...p, id: body.product.id } : p));
          }
        })
        .catch(err => console.warn('Product backend sync (create) failed, kept locally:', err));
    }
  };

  const updateProduct = (id: string, data: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    logAction('Inventory', 'Update Product', `Updated details for product ID: ${id}`);

    if (hasAuthToken()) {
      authFetch(`/api/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
        .catch(err => console.warn('Product backend sync (update) failed, kept locally:', err));
    }
  };

  const updateProductStock = (
    id: string,
    qty: number,
    type: 'increase' | 'decrease',
    variantId?: string,
    opts?: { lots?: { lotNumber: string; qty: number; expiryDate?: string; warehouseId?: string }[]; lotNumber?: string; expiryDate?: string; warehouseId?: string }
  ) => {
    let fefoLines: any[] | undefined;
    setProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const wh = opts?.warehouseId || (p as any).warehouseId;
      if (variantId && p.variants?.length) {
        const variants = p.variants.map(v => {
          if (v.id !== variantId) return v;
          const wh = opts?.warehouseId || (p as any).warehouseId;
          let lots = Array.isArray(v.lots) ? [...v.lots] : [];
          if (type === 'increase') {
            const restoreLines = Array.isArray(opts?.lots) && opts!.lots!.length
              ? opts!.lots!
              : opts?.lotNumber
                ? [{ lotNumber: opts.lotNumber, qty, expiryDate: opts.expiryDate }]
                : [];
            if (restoreLines.length) {
              for (const line of restoreLines) {
                lots = upsertLot(lots, {
                  lotNumber: line.lotNumber || 'RETURN',
                  qty: Number(line.qty) || 0,
                  expiryDate: line.expiryDate,
                  receivedAt: new Date().toISOString().slice(0, 10),
                  warehouseId: (line as any).warehouseId || wh,
                });
              }
              fefoLines = restoreLines.map(l => ({ lotNumber: l.lotNumber, qty: l.qty, expiryDate: l.expiryDate }));
            } else if (lots.length || v.batchNumber || v.expiryDate) {
              lots = upsertLot(lots, {
                lotNumber: opts?.lotNumber || 'RETURN',
                qty,
                expiryDate: opts?.expiryDate || v.expiryDate,
                receivedAt: new Date().toISOString().slice(0, 10),
                warehouseId: wh,
              });
              fefoLines = [{ lotNumber: opts?.lotNumber || 'RETURN', qty, expiryDate: opts?.expiryDate }];
            }
            const nextStock = (Number(v.stock) || 0) + qty;
            const nextExpiry = lots.filter((l: any) => l.expiryDate).sort((a: any, b: any) => String(a.expiryDate).localeCompare(String(b.expiryDate)))[0]?.expiryDate;
            return {
              ...v,
              stock: nextStock,
              lots: lots.length ? lots : v.lots,
              expiryDate: nextExpiry || v.expiryDate,
              batchNumber: lots[0]?.lotNumber || v.batchNumber,
            };
          }
          // decrease — FEFO on variant lots
          if (!lots.length && (Number(v.stock) || 0) > 0) {
            lots = [{
              lotNumber: v.batchNumber || 'DEFAULT',
              qty: Number(v.stock) || 0,
              expiryDate: v.expiryDate,
              warehouseId: wh,
            }];
          }
          if (lots.length) {
            const allocation = allocateFefo(lots as any, qty, wh ? { warehouseId: String(wh) } : undefined);
            fefoLines = allocation.lines;
            const remainingLots = applyFefoDeduction(lots as any, allocation);
            const nextExpiry = remainingLots
              .filter((l: any) => l.expiryDate)
              .sort((a: any, b: any) => String(a.expiryDate).localeCompare(String(b.expiryDate)))[0]?.expiryDate;
            return {
              ...v,
              stock: Math.max(0, (Number(v.stock) || 0) - allocation.allocated),
              lots: remainingLots as any,
              expiryDate: nextExpiry || v.expiryDate,
              batchNumber: remainingLots[0]?.lotNumber || v.batchNumber,
            };
          }
          return { ...v, stock: Math.max(0, (Number(v.stock) || 0) - qty) };
        });
        const totalStock = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
        return { ...p, variants, stock: totalStock };
      }
      // Sales return / restock: restore FEFO lots when provided
      if (type === 'increase' && !variantId) {
        let lots = Array.isArray((p as any).lots) ? [...(p as any).lots] : [];
        const restoreLines = Array.isArray(opts?.lots) && opts!.lots!.length
          ? opts!.lots!
          : opts?.lotNumber
            ? [{ lotNumber: opts.lotNumber, qty, expiryDate: opts.expiryDate }]
            : [];
        if (restoreLines.length) {
          for (const line of restoreLines) {
            lots = upsertLot(lots, {
              lotNumber: line.lotNumber || 'RETURN',
              qty: Number(line.qty) || 0,
              expiryDate: line.expiryDate,
              receivedAt: new Date().toISOString().slice(0, 10),
              warehouseId: (line as any).warehouseId || wh,
            });
          }
          fefoLines = restoreLines.map(l => ({ lotNumber: l.lotNumber, qty: l.qty, expiryDate: l.expiryDate }));
          const nextExpiry = lots
            .filter((l: any) => l.expiryDate)
            .sort((a: any, b: any) => String(a.expiryDate).localeCompare(String(b.expiryDate)))[0]?.expiryDate;
          return {
            ...p,
            stock: (Number(p.stock) || 0) + qty,
            lots: lots as any,
            expiryDate: nextExpiry || (p as any).expiryDate,
            batchNumber: lots[0]?.lotNumber || (p as any).batchNumber,
          };
        }
        // No lot info: still increase stock; optional RETURN lot bucket
        if (lots.length || (p as any).batchNumber || (p as any).expiryDate) {
          lots = upsertLot(lots.length ? lots : [], {
            lotNumber: opts?.lotNumber || 'RETURN',
            qty,
            expiryDate: opts?.expiryDate || (p as any).expiryDate,
            receivedAt: new Date().toISOString().slice(0, 10),
          });
          fefoLines = [{ lotNumber: opts?.lotNumber || 'RETURN', qty, expiryDate: opts?.expiryDate }];
          return {
            ...p,
            stock: (Number(p.stock) || 0) + qty,
            lots: lots as any,
            batchNumber: lots[0]?.lotNumber || (p as any).batchNumber,
          };
        }
      }
      if (type === 'decrease' && !variantId) {
        const lots = Array.isArray((p as any).lots) && (p as any).lots.length
          ? (p as any).lots
          : (Number(p.stock) > 0
              ? [{ lotNumber: (p as any).batchNumber || 'DEFAULT', qty: Number(p.stock) || 0, expiryDate: (p as any).expiryDate }]
              : []);
        if (lots.length) {
          const allocation = allocateFefo(lots as any, qty, wh ? { warehouseId: String(wh) } : undefined);
          fefoLines = allocation.lines;
          const remainingLots = applyFefoDeduction(lots as any, allocation);
          const nextExpiry = remainingLots
            .filter((l: any) => l.expiryDate)
            .sort((a: any, b: any) => String(a.expiryDate).localeCompare(String(b.expiryDate)))[0]?.expiryDate;
          return {
            ...p,
            stock: Math.max(0, (Number(p.stock) || 0) - allocation.allocated),
            lots: remainingLots as any,
            expiryDate: nextExpiry || (p as any).expiryDate,
            batchNumber: remainingLots[0]?.lotNumber || (p as any).batchNumber,
          };
        }
      }
      if (type === 'increase' && !variantId && (p as any).lots) {
        // plain increase without lot info — keep lots as-is
      }
      return {
        ...p,
        stock: type === 'increase' ? p.stock + qty : Math.max(0, p.stock - qty),
      };
    }));

    if (hasAuthToken()) {
      const current = products.find(p => p.id === id);
      if (current) {
        // Prefer FEFO commit on server for non-variant decreases
        if (type === 'decrease' && !variantId && !isProbablyOffline()) {
          authFetch('/api/fefo/allocate', {
            method: 'POST',
            body: JSON.stringify({
              productId: id,
              qty,
              commit: true,
              warehouseId: opts?.warehouseId || (current as any).warehouseId || undefined,
            }),
          })
            .then(async (res) => {
              if (!res.ok) {
                // fallback to stockDelta below path - fire patch
                const signed = -qty;
                await authFetch(`/api/products/${id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ stockDelta: signed, baseUpdatedAt: (current as any).updatedAt }),
                }).catch(() => null);
                return;
              }
              const body = await res.json().catch(() => null);
              if (body?.lots || body?.stock != null) {
                setProducts(prev => prev.map(p =>
                  p.id === id
                    ? {
                        ...p,
                        stock: body.stock ?? p.stock,
                        lots: body.lots ?? (p as any).lots,
                        expiryDate: body.lots
                          ? (body.lots.find((l: any) => l.expiryDate)?.expiryDate || (p as any).expiryDate)
                          : (p as any).expiryDate,
                      }
                    : p
                ));
              }
            })
            .catch(err => console.warn('FEFO allocate failed, stock may drift:', err));
          return;
        }

        // Relative delta so offline concurrent sales compose on the server
        const signed = type === 'increase' ? qty : -qty;
        const payload: Record<string, any> = {
          baseUpdatedAt: (current as any).updatedAt || undefined,
        };
        if (variantId && current.variants?.length) {
          payload.variantStockDeltas = { [variantId]: signed };
          payload.stockDelta = signed; // server rolls up from variants when deltas present
        } else {
          payload.stockDelta = signed;
        }

        if (isProbablyOffline()) {
          enqueueOfflineOp({
            type: 'PATCH_PRODUCT',
            path: `/api/products/${id}`,
            method: 'PATCH',
            body: payload,
            baseUpdatedAt: payload.baseUpdatedAt,
          });
        } else {
          authFetch(`/api/products/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
            .then(async (res) => {
              if (res.status === 409) {
                // Should not happen for pure deltas; refresh product from server body
                const body = await res.json().catch(() => null);
                if (body?.product) {
                  setProducts(prev => prev.map(p => p.id === id ? { ...p, ...body.product } : p));
                }
                return;
              }
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              const body = await res.json().catch(() => null);
              if (body?.product?.updatedAt) {
                setProducts(prev => prev.map(p => p.id === id ? { ...p, updatedAt: body.product.updatedAt, stock: body.product.stock ?? p.stock, variants: body.product.variants ?? p.variants } : p));
              }
            })
            .catch(err => {
              console.warn('Product stock sync failed — queued:', err);
              enqueueOfflineOp({
                type: 'PATCH_PRODUCT',
                path: `/api/products/${id}`,
                method: 'PATCH',
                body: payload,
                baseUpdatedAt: payload.baseUpdatedAt,
              });
            });
        }
      }
    }
 
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('bizora-inventory');
        bc.postMessage({ type: 'stock_changed', productId: id, at: new Date().toISOString() });
        bc.close();
      }
      localStorage.setItem('bizora_inventory_ping', String(Date.now()));
    } catch { /* ignore */ }
    return (fefoLines || []).map((l: any) => ({
      lotNumber: l.lotNumber,
      qty: l.qty,
      expiryDate: l.expiryDate,
    }));

  };

  const broadcastStockChange = (payload?: { productId?: string }) => {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('bizora-inventory');
        bc.postMessage({ type: 'stock_changed', at: new Date().toISOString(), ...payload });
        bc.close();
      }
      localStorage.setItem('bizora_inventory_ping', String(Date.now()));
    } catch { /* ignore */ }
  };

  const refreshProducts = async () => {
    if (!hasAuthToken()) return;
    try {
      const res = await authFetch('/api/products');
      if (!res.ok) return;
      const body = await res.json();
      if (body?.products) {
        setProducts(body.products);
        setLastProductsSyncAt(new Date().toISOString());
        return body.products as any[];
      }
    } catch (err) {
      console.warn('refreshProducts failed:', err);
    }
  };




  // NEW: Calculate Weighted Average Purchase Price
  const processPurchase = (
    productId: string,
    newQty: number,
    newUnitPrice: number,
    opts?: { lotNumber?: string; expiryDate?: string; receivedAt?: string; variantId?: string }
  ) => {
    const lotNumber = opts?.lotNumber || `PO-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const expiryDate = opts?.expiryDate;
    const receivedAt = opts?.receivedAt || new Date().toISOString().slice(0, 10);
    const variantId = opts?.variantId;
    let nextLots: any[] | undefined;
    let totalQtyOut = 0;

    setProducts(prev => prev.map(p => {
        if (p.id !== productId) return p;
        const prevTotalCost = (Number(p.stock) || 0) * (Number(p.purchasePrice) || 0);
        const newTotalCost = prevTotalCost + (newQty * newUnitPrice);
        const totalQty = (Number(p.stock) || 0) + newQty;
        totalQtyOut = totalQty;
        const avgPrice = totalQty > 0 ? newTotalCost / totalQty : newUnitPrice;

        // Variant-scoped receive
        if (variantId && Array.isArray(p.variants) && p.variants.length) {
          const variants = p.variants.map(v => {
            if (v.id !== variantId) return v;
            const existingLots = Array.isArray(v.lots) ? v.lots : [];
            const vLots = upsertLot(existingLots, {
              lotNumber,
              qty: newQty,
              expiryDate: expiryDate || undefined,
              receivedAt,
            });
            nextLots = vLots;
            const nextExpiry = vLots
              .filter((l: any) => l.expiryDate)
              .sort((a: any, b: any) => String(a.expiryDate).localeCompare(String(b.expiryDate)))[0]?.expiryDate
              || expiryDate
              || v.expiryDate;
            return {
              ...v,
              stock: (Number(v.stock) || 0) + newQty,
              lots: vLots as any,
              batchNumber: lotNumber,
              expiryDate: nextExpiry,
            };
          });
          const sumStock = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);
          return {
            ...p,
            variants,
            stock: sumStock,
            purchasePrice: parseFloat(avgPrice.toFixed(2)),
          };
        }

        const existingLots = Array.isArray((p as any).lots) ? (p as any).lots : [];
        nextLots = upsertLot(existingLots, {
          lotNumber,
          qty: newQty,
          expiryDate: expiryDate || undefined,
          receivedAt,
        });
        const nextExpiry = nextLots
          .filter((l: any) => l.expiryDate)
          .sort((a: any, b: any) => String(a.expiryDate).localeCompare(String(b.expiryDate)))[0]?.expiryDate
          || expiryDate
          || (p as any).expiryDate;

        return {
            ...p,
            stock: totalQty,
            purchasePrice: parseFloat(avgPrice.toFixed(2)),
            lots: nextLots as any,
            batchNumber: lotNumber,
            expiryDate: nextExpiry,
        };
    }));

    if (hasAuthToken() && nextLots) {
      const payload = {
        stock: totalQtyOut,
        lots: nextLots,
        batchNumber: lotNumber,
        expiryDate: expiryDate || undefined,
        purchasePrice: undefined as any,
      };
      // Prefer dedicated receive endpoint if present; else PATCH product
      authFetch(`/api/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          stockDelta: newQty,
          lots: nextLots,
          batchNumber: lotNumber,
          ...(expiryDate ? { expiryDate } : {}),
        }),
      }).catch(err => console.warn('Purchase lot sync failed, kept locally:', err));
    }
  };

  const addEntity = (entity: Entity) => {
    const newEntity = { ...entity, isDeleted: false, loyaltyPoints: 0 };
    // Entities are typically Global in Multi-store (Customers exist across branches)
    if (entity.type === 'Customer') {
      if (!assertTrialOrThrow('customers')) return;
      if (!customers.some(c => c.name.toLowerCase() === entity.name.toLowerCase())) {
        setCustomers(prev => [...prev, newEntity]);
        recordTrialUsage('customers');
        logAction('CRM', 'Add Customer', `Added ${entity.name}`);
      }
    } else {
      if (!suppliers.some(s => s.name.toLowerCase() === entity.name.toLowerCase())) {
        setSuppliers(prev => [...prev, newEntity]);
        logAction('CRM', 'Add Supplier', `Added ${entity.name}`);
      }
    }

    if (hasAuthToken()) {
      authFetch('/api/entities', { method: 'POST', body: JSON.stringify(newEntity) })
        .then(res => res.ok ? res.json() : null)
        .then(body => {
          if (body?.entity?.id && body.entity.id !== newEntity.id) {
            const reconcile = (prev: Entity[]) => prev.map(e => e.id === newEntity.id ? { ...e, id: body.entity.id } : e);
            if (entity.type === 'Customer') setCustomers(reconcile); else setSuppliers(reconcile);
          }
        })
        .catch(err => console.warn('Entity backend sync (create) failed, kept locally:', err));
    }
  };

  const updateEntity = (id: string, data: Partial<Entity>) => {
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
      setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));

      if (hasAuthToken()) {
        authFetch(`/api/entities/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
          .catch(err => console.warn('Entity backend sync (update) failed, kept locally:', err));
      }
  };

  const registerSupplier = (
    globalData: Partial<GlobalSupplier> & { name: string; mobile: string },
    businessData: Partial<Entity>
  ) => {
    const cleanMobile = globalData.mobile.trim();
    const cleanName = globalData.name.trim();

    // Check if supplier already exists in globalSuppliers
    const existingIndex = globalSuppliers.findIndex(gs => gs.mobile === cleanMobile);
    
    // Determine business ID and name for linking
    const activeBusinessId = userId || 'u1';
    const activeBusinessName = user?.businessName || 'Active Business';

    let updatedGlobalList = [...globalSuppliers];
    let finalGlobalProfile: GlobalSupplier;

    if (existingIndex > -1) {
      const oldProfile = globalSuppliers[existingIndex];
      const hasBiz = oldProfile.businesses.some(b => b.businessId === activeBusinessId);
      const updatedBusinesses = hasBiz 
        ? oldProfile.businesses 
        : [...oldProfile.businesses, { businessId: activeBusinessId, businessName: activeBusinessName, connectedAt: new Date().toISOString() }];
      
      finalGlobalProfile = {
        ...oldProfile,
        ...globalData,
        businesses: updatedBusinesses,
        updatedAt: new Date().toISOString()
      };
      updatedGlobalList[existingIndex] = finalGlobalProfile;
    } else {
      finalGlobalProfile = {
        mobile: cleanMobile,
        name: cleanName,
        companyName: globalData.companyName || '',
        contactPerson: globalData.contactPerson || '',
        email: globalData.email || '',
        tradeLicense: globalData.tradeLicense || '',
        binVat: globalData.binVat || '',
        nid: globalData.nid || '',
        address: globalData.address || '',
        city: globalData.city || '',
        district: globalData.district || '',
        country: globalData.country || '',
        logo: globalData.logo || '',
        bankDetails: globalData.bankDetails || { bankName: '', accountName: '', accountNumber: '', routingNumber: '', branchName: '' },
        mobileBankingDetails: globalData.mobileBankingDetails || { bKash: '', Rocket: '', Nagad: '' },
        website: globalData.website || '',
        notes: globalData.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        businesses: [{ businessId: activeBusinessId, businessName: activeBusinessName, connectedAt: new Date().toISOString() }]
      };
      updatedGlobalList.push(finalGlobalProfile);
    }

    setGlobalSuppliers(updatedGlobalList);

    const localExisting = suppliers.find(s => s.id === cleanMobile);
    const newLocalEntity: Entity = {
      id: cleanMobile,
      name: cleanName,
      mobile: cleanMobile,
      company: globalData.companyName || '',
      email: globalData.email || '',
      address: globalData.address || '',
      type: 'Supplier',
      isDeleted: false,
      status: 'Active',
      supplierCode: businessData.supplierCode || `SUP-${Math.floor(1000 + Math.random() * 9000)}`,
      openingBalance: Number(businessData.openingBalance || 0),
      creditLimit: Number(businessData.creditLimit || 0),
      paymentTerms: businessData.paymentTerms || 'Net 30',
      currentDue: Number(businessData.currentDue || 0) + Number(businessData.openingBalance || 0),
      totalPurchase: Number(businessData.totalPurchase || 0),
      totalPaid: Number(businessData.totalPaid || 0),
      lastPurchaseDate: businessData.lastPurchaseDate || '',
      lastPaymentDate: businessData.lastPaymentDate || '',
      notes: businessData.notes || ''
    };

    if (localExisting) {
      setSuppliers(prev => prev.map(s => s.id === cleanMobile ? { ...s, ...newLocalEntity, currentDue: s.currentDue ?? newLocalEntity.currentDue } : s));
    } else {
      setSuppliers(prev => [...prev, newLocalEntity]);
    }

    logAction('Supplier', 'Register Supplier', `Registered supplier ${cleanName} (${cleanMobile})`);

    if (hasAuthToken()) {
      authFetch('/api/suppliers/link', {
        method: 'POST',
        body: JSON.stringify({
          mobile: cleanMobile,
          name: cleanName,
          businessName: activeBusinessName,
          companyName: finalGlobalProfile.companyName,
          contactPerson: finalGlobalProfile.contactPerson,
          email: finalGlobalProfile.email,
          address: finalGlobalProfile.address,
          city: finalGlobalProfile.city,
          district: finalGlobalProfile.district,
          country: finalGlobalProfile.country,
          bankDetails: finalGlobalProfile.bankDetails,
          mobileBankingDetails: finalGlobalProfile.mobileBankingDetails,
        }),
      }).catch(err => console.warn('Supplier backend link failed, kept locally:', err));

      authFetch('/api/entities', { method: 'POST', body: JSON.stringify(newLocalEntity) })
        .catch(err => console.warn('Supplier entity backend sync failed, kept locally:', err));
    }
  };

  const updateSupplierProfile = (
    mobile: string,
    globalData: Partial<GlobalSupplier>,
    businessData?: Partial<Entity>
  ) => {
    setGlobalSuppliers(prev => prev.map(gs => gs.mobile === mobile ? { ...gs, ...globalData, updatedAt: new Date().toISOString() } : gs));
    
    if (businessData) {
      setSuppliers(prev => prev.map(s => {
        if (s.id === mobile) {
          return {
            ...s,
            ...businessData,
            name: globalData.name || s.name,
            company: globalData.companyName || s.company,
            email: globalData.email || s.email,
            address: globalData.address || s.address
          };
        }
        return s;
      }));
    } else if (globalData.name || globalData.companyName || globalData.email || globalData.address) {
      setSuppliers(prev => prev.map(s => {
        if (s.id === mobile) {
          return {
            ...s,
            name: globalData.name || s.name,
            company: globalData.companyName || s.company,
            email: globalData.email || s.email,
            address: globalData.address || s.address
          };
        }
        return s;
      }));
    }
    
    logAction('Supplier', 'Update Profile', `Updated supplier profile for ${mobile}`);

    if (hasAuthToken()) {
      authFetch('/api/suppliers/link', {
        method: 'POST',
        body: JSON.stringify({
          mobile,
          name: globalData.name || suppliers.find(s => s.id === mobile)?.name || 'Supplier',
          businessName: user?.businessName,
          ...globalData,
        }),
      }).catch(err => console.warn('Supplier backend sync (update) failed, kept locally:', err));

      if (businessData) {
        authFetch(`/api/entities/${mobile}`, { method: 'PATCH', body: JSON.stringify(businessData) })
          .catch(err => console.warn('Supplier entity backend sync (update) failed, kept locally:', err));
      }
    }
  };

  const addTransaction = (entry: LedgerEntry) => {
    const rawUser = localStorage.getItem('nexus_user');
    const userName = rawUser ? JSON.parse(rawUser).businessName : 'Staff';
    const targetStore = currentStoreId === 'ALL' ? '1' : currentStoreId;
    
    // Auto-assign account ID if not provided and not 'Due'
    let entryWithAccount = { ...entry };
    if (!entryWithAccount.accountId && entryWithAccount.paymentMethod !== 'Due') {
        const availableAccounts = financialAccounts.length > 0 ? financialAccounts : DEFAULT_FINANCIAL_ACCOUNTS;
        const resolved = resolveAccountForTender(entryWithAccount.paymentMethod, availableAccounts);
        if (resolved) {
            entryWithAccount.accountId = resolved;
        } else {
            entryWithAccount.accountId = availableAccounts.find(a => a.isDefault)?.id || availableAccounts[0]?.id;
        }
    }

    const finalEntry = { ...entryWithAccount, storeId: targetStore, isDeleted: false, createdBy: userName };
    // Trial package counters
    if (isTrialPlan(user)) {
      const t = finalEntry.type;
      const key =
        t === 'Sale' ? 'sells' as const
        : t === 'Purchase' ? 'buys' as const
        : t === 'Expense' ? 'expenses' as const
        : null;
      const isQuick = t === 'Sale' && String(finalEntry.reference || '').startsWith('QS-');
      if (isQuick) {
        if (!assertTrialOrThrow('quickSales')) return;
      } else if (key) {
        if (!assertTrialOrThrow(key)) return;
      }
    }
    setTransactions(prev => [finalEntry, ...prev]);
    if (isTrialPlan(user)) {
      const t = finalEntry.type;
      if (t === 'Sale' && String(finalEntry.reference || '').startsWith('QS-')) {
        recordTrialUsage('quickSales');
      } else if (t === 'Sale') {
        recordTrialUsage('sells');
      } else if (t === 'Purchase') {
        recordTrialUsage('buys');
      } else if (t === 'Expense') {
        recordTrialUsage('expenses');
      }
    }

    // Update Account Balance Logic (supports multi-tender paymentSplits)
    {
        const splits = (entry.details as any)?.paymentSplits as { method: string; amount: number }[] | undefined;
        const sign =
            ['Sale', 'Income', 'Purchase Return'].includes(entry.type) ? 1
            : ['Purchase', 'Expense', 'Sales Return', 'Salary', 'Supplier Payment'].includes(entry.type) ? -1
            : entry.type === 'Transfer' ? (entry.transferType === 'In' ? 1 : -1)
            : 0;

        if (sign !== 0 && splits && Array.isArray(splits) && splits.length > 0) {
            const availableAccounts = financialAccounts.length > 0 ? financialAccounts : DEFAULT_FINANCIAL_ACCOUNTS;
            const postings = buildSplitAccountPostings(splits, availableAccounts, entryWithAccount.accountId);
            if (postings.length) {
                setFinancialAccounts(prev => {
                    const base = prev.length > 0 ? prev : DEFAULT_FINANCIAL_ACCOUNTS;
                    return base.map(acc => {
                        const post = postings.find(p => p.accountId === acc.id);
                        if (!post) return acc;
                        return { ...acc, balance: (acc.balance || 0) + sign * post.amount };
                    });
                });
            }
        } else if (entryWithAccount.accountId && entryWithAccount.paymentMethod !== 'Due' && !isCreditMethod(entryWithAccount.paymentMethod || '')) {
            const amount = entry.amountPaid ?? entry.amount;
            let balanceChange = 0;
            if (['Sale', 'Income', 'Purchase Return'].includes(entry.type)) {
                balanceChange = amount;
            } else if (['Purchase', 'Expense', 'Sales Return', 'Salary', 'Supplier Payment'].includes(entry.type)) {
                balanceChange = -amount;
            } else if (entry.type === 'Transfer') {
                balanceChange = entry.transferType === 'In' ? amount : -amount;
            }
            if (balanceChange !== 0) {
                setFinancialAccounts(prev => {
                    const base = prev.length > 0 ? prev : DEFAULT_FINANCIAL_ACCOUNTS;
                    const exists = base.some(acc => acc.id === entryWithAccount.accountId);
                    if (exists) {
                        return base.map(acc =>
                            acc.id === entryWithAccount.accountId
                                ? { ...acc, balance: (acc.balance || 0) + balanceChange }
                                : acc
                        );
                    }
                    const fallbackId = resolveAccountForTender(entryWithAccount.paymentMethod, base) || base[0].id;
                    return base.map(acc =>
                        acc.id === fallbackId
                            ? { ...acc, balance: (acc.balance || 0) + balanceChange }
                            : acc
                    );
                });
            }
        }
    }

    // Update Loyalty if Sale
    if (entry.type === 'Sale') {
        const customer = customers.find(c => c.name === entry.entityName);
        if (customer) {
            updateLoyaltyPoints(customer.id, entry.amount);
            processReferralRewardsOnSale(customer.id, entry.amount);
        }
    }

    // Update Supplier Metrics if Purchase or Supplier Payment
    if (entry.type === 'Purchase') {
        const sup = suppliers.find(s => s.id === entry.entityMobile || s.mobile === entry.entityMobile || s.name === entry.entityName);
        if (sup) {
            const purchaseAmt = entry.amount;
            const paidAmt = entry.paymentMethod === 'Due' ? 0 : purchaseAmt;
            const dueAmt = purchaseAmt - paidAmt;

            setSuppliers(prev => prev.map(s => s.id === sup.id ? {
                ...s,
                totalPurchase: (s.totalPurchase || 0) + purchaseAmt,
                totalPaid: (s.totalPaid || 0) + paidAmt,
                currentDue: (s.currentDue || 0) + dueAmt,
                lastPurchaseDate: entry.date || new Date().toISOString().split('T')[0]
            } : s));
        }
    } else if (entry.type === 'Supplier Payment') {
        const sup = suppliers.find(s => s.id === entry.entityMobile || s.mobile === entry.entityMobile || s.name === entry.entityName);
        if (sup) {
            const paidAmt = entry.amount;
            setSuppliers(prev => prev.map(s => s.id === sup.id ? {
                ...s,
                totalPaid: (s.totalPaid || 0) + paidAmt,
                currentDue: Math.max(0, (s.currentDue || 0) - paidAmt),
                lastPaymentDate: entry.date || new Date().toISOString().split('T')[0]
            } : s));
        }
    }

    // Double-entry auto-post (Sale, Purchase, Expense, etc.)
    try {
      let forJournal: any = finalEntry;
      if (finalEntry.type === 'Sale' || finalEntry.type === 'Sales Return') {
        // Attach purchase cost on lines for COGS when available
        const items = (finalEntry.items || []).map((it: any) => {
          const prod = products.find((p) => p.id === it.productId);
          return {
            ...it,
            purchasePrice: it.purchasePrice ?? prod?.purchasePrice ?? 0,
          };
        });
        forJournal = { ...finalEntry, items };
      }
      const autoJe = buildAutoJournalEntry(forJournal, { createdBy: userName });
      if (autoJe) {
        const exists = journalEntries.some(j => (j as any).sourceTransactionId === finalEntry.id || j.id === autoJe.id);
        if (!exists) {
          addJournalEntry(autoJe as any);
        }
      }
    } catch (e) {
      console.warn('Auto journal post failed:', e);
    }

    logAction('Transaction', `New ${entry.type}`, `Amount: ${entry.amount}`);

    if (hasAuthToken()) {
      if (isProbablyOffline()) {
        enqueueOfflineOp({
          type: 'CREATE_TRANSACTION',
          path: '/api/transactions',
          method: 'POST',
          body: finalEntry,
        });
      } else {
        authFetch('/api/transactions', { method: 'POST', body: JSON.stringify(finalEntry) })
          .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          })
          .then(body => {
            if (body?.transaction?.id && body.transaction.id !== finalEntry.id) {
              setTransactions(prev => prev.map(t => t.id === finalEntry.id ? { ...t, id: body.transaction.id } : t));
            }
          })
          .catch(err => {
            console.warn('Transaction backend sync (create) failed — queued for offline sync:', err);
            enqueueOfflineOp({
              type: 'CREATE_TRANSACTION',
              path: '/api/transactions',
              method: 'POST',
              body: finalEntry,
            });
          });
      }
    }
  };

  const updateTransaction = (id: string, data: Partial<LedgerEntry>) => {
      const oldTx = transactions.find(t => t.id === id);
      if (oldTx && !oldTx.isDeleted && oldTx.accountId && oldTx.paymentMethod !== 'Due' && (data.amount !== undefined || data.amountPaid !== undefined)) {
          // Revert old effect
          let revertChange = 0;
          const oldAmount = oldTx.amountPaid ?? oldTx.amount;
          if (['Sale', 'Income', 'Purchase Return'].includes(oldTx.type)) revertChange = -oldAmount;
          else if (['Purchase', 'Expense', 'Sales Return', 'Salary'].includes(oldTx.type)) revertChange = oldAmount;
          
          // Apply new effect
          let applyChange = 0;
          const newAmount = data.amountPaid ?? data.amount ?? oldTx.amountPaid ?? oldTx.amount;
          const newType = data.type || oldTx.type;
          const newTransferType = data.transferType || oldTx.transferType;
          
          if (['Sale', 'Income', 'Purchase Return'].includes(newType)) applyChange = newAmount;
          else if (['Purchase', 'Expense', 'Sales Return', 'Salary'].includes(newType)) applyChange = -newAmount;
          else if (newType === 'Transfer') applyChange = newTransferType === 'In' ? newAmount : -newAmount;

          const totalChange = revertChange + applyChange;
          if (totalChange !== 0) {
              setFinancialAccounts(prev => prev.map(acc => 
                  acc.id === oldTx.accountId ? { ...acc, balance: acc.balance + totalChange } : acc
              ));
          }
      }
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
      logAction('Transaction', 'Update Transaction', `Updated transaction ID: ${id}`);

      if (hasAuthToken()) {
        authFetch(`/api/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
          .catch(err => console.warn('Transaction backend sync (update) failed, kept locally:', err));
      }
  };

  const addFinancialAccount = (account: FinancialAccount) => {
      const targetStore = currentStoreId === 'ALL' ? '1' : currentStoreId;
      const accountWithOpeningSize = { 
          ...account, 
          storeId: targetStore,
          openingBalance: account.openingBalance ?? account.balance 
      };
      setFinancialAccounts(prev => [...prev, accountWithOpeningSize]);
      logAction('Accounts', 'Add Account', `Created ${account.name}`);

      if (hasAuthToken()) {
        authFetch('/api/financial-accounts', { method: 'POST', body: JSON.stringify(accountWithOpeningSize) })
          .catch(err => console.warn('Financial account backend sync (create) failed, kept locally:', err));
      }
  };

  const transferFunds = (fromAccountId: string, toAccountId: string, amount: number, note?: string) => {
      const targetStore = currentStoreId === 'ALL' ? '1' : currentStoreId;
      // Fund Transfers now handled via addTransaction to ensure balance updates are consistent
      
      const fromAcc = financialAccounts.find(a => a.id === fromAccountId);
      const toAcc = financialAccounts.find(a => a.id === toAccountId);

      const transactionId = Date.now().toString();
      const date = new Date().toISOString().split('T')[0];

      addTransaction({
          id: transactionId,
          storeId: targetStore,
          date,
          entityName: toAcc?.name || 'Internal Transfer',
          type: 'Transfer',
          transferType: 'Out',
          amount,
          paymentMethod: 'Transfer',
          accountId: fromAccountId,
          reference: `Transfer Out to ${toAcc?.name}` + (note ? `: ${note}` : ''),
          details: { subtotal: amount, tax: 0, discount: 0, delivery: 0 }
      });

      addTransaction({
          id: transactionId + '_in',
          storeId: targetStore,
          date,
          entityName: fromAcc?.name || 'Internal Transfer',
          type: 'Transfer',
          transferType: 'In',
          amount, 
          paymentMethod: 'Transfer',
          accountId: toAccountId,
          reference: `Transfer In from ${fromAcc?.name}` + (note ? `: ${note}` : ''),
          details: { subtotal: amount, tax: 0, discount: 0, delivery: 0 }
      });

      logAction('Accounts', 'Fund Transfer', `Transferred ${amount} from ${fromAcc?.name} to ${toAcc?.name}`);
  };

  const updateLoyaltyPoints = (customerId: string, amountSpent: number) => {
      if (!loyaltyConfig.enabled) return;
      const points = Math.floor(amountSpent / (loyaltyConfig.pointsPerCurrency || 100));
      if (points > 0) {
          const customer = customers.find(c => c.id === customerId);
          const newTotal = (customer?.loyaltyPoints || 0) + points;
          // updateEntity (not a raw setCustomers) so this actually persists
          // to the backend - previously this wrote to local state only and
          // silently reset on the next reload/refetch.
          updateEntity(customerId, { loyaltyPoints: newTotal });
      }
  };

  // Redeeming converts points into a real checkout discount, capped by
  // what the customer actually has and by loyaltyConfig.minPointsToRedeem.
  // Returns the discount amount to apply; 0 if the redemption isn't valid.
  const redeemLoyaltyPoints = (customerId: string, pointsToRedeem: number): number => {
      if (!loyaltyConfig.enabled || pointsToRedeem <= 0) return 0;
      const customer = customers.find(c => c.id === customerId);
      const available = customer?.loyaltyPoints || 0;
      if (pointsToRedeem > available) return 0;
      if (loyaltyConfig.minPointsToRedeem && pointsToRedeem < loyaltyConfig.minPointsToRedeem) return 0;

      updateEntity(customerId, { loyaltyPoints: available - pointsToRedeem });
      return pointsToRedeem * (loyaltyConfig.redemptionRate || 1);
  };

  // Online Orders
  const addOnlineOrder = (order: OnlineOrder) => {
      const targetStore = currentStoreId === 'ALL' ? '1' : currentStoreId;
      const newOrder = {...order, storeId: targetStore};
      setOnlineOrders(prev => [newOrder, ...prev]);
      logAction('E-commerce', 'New Order', `Order ${order.id} received`);

      if (hasAuthToken()) {
        authFetch('/api/online-orders', { method: 'POST', body: JSON.stringify(newOrder) })
          .catch(err => console.warn('Online order backend sync (create) failed, kept locally:', err));
      }
  };

  const updateOnlineOrder = (id: string, data: Partial<OnlineOrder>) => {
      setOnlineOrders(prev => prev.map(o => o.id === id ? { ...o, ...data } : o));
      logAction('E-commerce', 'Update Order', `Updated status for ${id}`);

      if (hasAuthToken()) {
        authFetch(`/api/online-orders/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
          .catch(err => console.warn('Online order backend sync (update) failed, kept locally:', err));
      }
  };

  const deleteItem = (type: 'product' | 'entity' | 'transaction', id: string) => {
      if (type === 'product') setProducts(prev => prev.map(p => p.id === id ? { ...p, isDeleted: true } : p));
      if (type === 'entity') {
          setCustomers(prev => prev.map(c => c.id === id ? { ...c, isDeleted: true } : c));
          setSuppliers(prev => prev.map(s => s.id === id ? { ...s, isDeleted: true } : s));
      }
      if (type === 'transaction') {
          const tx = transactions.find(t => t.id === id);
          if (tx && !tx.isDeleted && tx.accountId && tx.paymentMethod !== 'Due') {
              let balanceChange = 0;
              const amount = tx.amountPaid ?? tx.amount;
              if (['Sale', 'Income', 'Purchase Return'].includes(tx.type)) balanceChange = -amount;
              else if (['Purchase', 'Expense', 'Sales Return', 'Salary'].includes(tx.type)) balanceChange = amount;
              else if (tx.type === 'Transfer') balanceChange = tx.transferType === 'In' ? -amount : amount;
              
              if (balanceChange !== 0) {
                  setFinancialAccounts(prev => prev.map(acc => 
                      acc.id === tx.accountId ? { ...acc, balance: acc.balance + balanceChange } : acc
                  ));
              }
          }
          setTransactions(prev => prev.map(t => t.id === id ? { ...t, isDeleted: true } : t));
      }
      logAction('System', 'Delete Item', `Deleted ${type} ID: ${id}`);
  };

  const restoreItem = (type: 'product' | 'entity' | 'transaction', id: string) => {
      if (type === 'product') setProducts(prev => prev.map(p => p.id === id ? { ...p, isDeleted: false } : p));
      if (type === 'entity') {
          setCustomers(prev => prev.map(c => c.id === id ? { ...c, isDeleted: false } : c));
          setSuppliers(prev => prev.map(s => s.id === id ? { ...s, isDeleted: false } : s));
      }
      if (type === 'transaction') {
          const tx = transactions.find(t => t.id === id);
          if (tx && tx.isDeleted && tx.accountId && tx.paymentMethod !== 'Due') {
            let balanceChange = 0;
            const amount = tx.amountPaid ?? tx.amount;
            if (['Sale', 'Income', 'Purchase Return'].includes(tx.type)) balanceChange = amount;
            else if (['Purchase', 'Expense', 'Sales Return', 'Salary'].includes(tx.type)) balanceChange = -amount;
            else if (tx.type === 'Transfer') balanceChange = tx.transferType === 'In' ? amount : -amount;
            
            if (balanceChange !== 0) {
                setFinancialAccounts(prev => prev.map(acc => 
                    acc.id === tx.accountId ? { ...acc, balance: acc.balance + balanceChange } : acc
                ));
            }
          }
          setTransactions(prev => prev.map(t => t.id === id ? { ...t, isDeleted: false } : t));
      }
      logAction('System', 'Restore Item', `Restored ${type} ID: ${id}`);
  };

  // Staff Management
  const addStaff = (newStaff: Staff) => {
      const targetStore = currentStoreId === 'ALL' ? '1' : currentStoreId;
      const staffWithStore = { ...newStaff, storeId: targetStore };
      
      const savedGlobalRegistry = localStorage.getItem('bizora_global_employee_registry');
      let globalList: any[] = [];
      if (savedGlobalRegistry) {
        try {
          globalList = JSON.parse(savedGlobalRegistry);
        } catch (e) {
          console.error(e);
        }
      }

      const cleanMobile = newStaff.mobile || newStaff.id;
      const existingIndex = globalList.findIndex(e => e.mobile === cleanMobile);

      if (existingIndex > -1) {
        const existingEmp = globalList[existingIndex];
        const hasEmployment = existingEmp.employments.some((e: any) => e.businessId === userId);
        if (!hasEmployment) {
          existingEmp.employments.push({
            businessId: userId,
            businessName: user?.businessName || 'Business',
            role: newStaff.role,
            joiningDate: newStaff.joiningDate || new Date().toISOString().split('T')[0],
            basicSalary: newStaff.basicSalary || 0,
            salesTarget: newStaff.salesTarget || 0,
            commissionRate: newStaff.commissionRate || 0,
            status: 'Active',
            attendance: {},
            performance: { rating: 5, reviews: [] }
          });
          existingEmp.status = 'Active';
          localStorage.setItem('bizora_global_employee_registry', JSON.stringify(globalList));
        }
      } else {
        const newGlobalEmp = {
          mobile: cleanMobile,
          name: newStaff.name,
          pin: newStaff.pin || '1234',
          status: 'Active',
          employments: [
            {
              businessId: userId,
              businessName: user?.businessName || 'Business',
              role: newStaff.role,
              joiningDate: newStaff.joiningDate || new Date().toISOString().split('T')[0],
              basicSalary: newStaff.basicSalary || 0,
              salesTarget: newStaff.salesTarget || 0,
              commissionRate: newStaff.commissionRate || 0,
              status: 'Active',
              attendance: {},
              performance: { rating: 5, reviews: [] }
            }
          ]
        };
        globalList.push(newGlobalEmp);
        localStorage.setItem('bizora_global_employee_registry', JSON.stringify(globalList));
      }

      setStaffState(prev => {
        const filtered = prev.filter(s => s.id !== cleanMobile);
        return [...filtered, { ...staffWithStore, id: cleanMobile, mobile: cleanMobile }];
      });
      logAction('Staff', 'Add Staff', `Added/Linked employee ${newStaff.name} with Global ID: ${cleanMobile}`);

      if (hasAuthToken()) {
        authFetch('/api/staff', { method: 'POST', body: JSON.stringify({ ...staffWithStore, id: cleanMobile, mobile: cleanMobile }) })
          .catch(err => console.warn('Staff backend sync (create) failed, kept locally:', err));

        authFetch('/api/employees/link', {
          method: 'POST',
          body: JSON.stringify({
            mobile: cleanMobile,
            name: newStaff.name,
            pin: newStaff.pin || undefined,
            businessName: user?.businessName,
            role: newStaff.role,
            joiningDate: newStaff.joiningDate || new Date().toISOString().split('T')[0],
            basicSalary: newStaff.basicSalary || 0,
            salesTarget: newStaff.salesTarget || 0,
            commissionRate: newStaff.commissionRate || 0,
          }),
        }).catch(err => console.warn('Employee backend link failed, kept locally:', err));
      }
  };

  const updateStaff = (id: string, data: Partial<Staff>) => {
      setStaffState(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
      logAction('Staff', 'Update Staff', `Updated staff ID: ${id}`);

      if (hasAuthToken()) {
        authFetch(`/api/staff/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
          .catch(err => console.warn('Staff backend sync (update) failed, kept locally:', err));

        const { name, pin, ...employmentFields } = data as any;
        authFetch(`/api/employees/${id}`, { method: 'PATCH', body: JSON.stringify({ name, pin, ...employmentFields }) })
          .catch(err => console.warn('Employee backend sync (update) failed, kept locally:', err));
      }

      const savedGlobalRegistry = localStorage.getItem('bizora_global_employee_registry');
      if (savedGlobalRegistry) {
        try {
          let globalList: any[] = JSON.parse(savedGlobalRegistry);
          const empIndex = globalList.findIndex(e => e.mobile === id);
          if (empIndex > -1) {
            const emp = globalList[empIndex];
            if (data.name) emp.name = data.name;
            if (data.pin) emp.pin = data.pin;
            
            const employment = emp.employments.find((e: any) => e.businessId === userId);
            if (employment) {
              if (data.role) employment.role = data.role;
              if (data.basicSalary !== undefined) employment.basicSalary = data.basicSalary;
              if (data.joiningDate) employment.joiningDate = data.joiningDate;
              if (data.salesTarget !== undefined) employment.salesTarget = data.salesTarget;
              if (data.commissionRate !== undefined) employment.commissionRate = data.commissionRate;
              if (data.status) employment.status = data.status;
            }
            localStorage.setItem('bizora_global_employee_registry', JSON.stringify(globalList));
          }
        } catch (e) {
          console.error(e);
        }
      }
      
      if (user && user.id === id) {
          const updatedData: Partial<User> = {};
          if (data.name) updatedData.name = data.name;
          if (data.role) updatedData.role = data.role as any;
          updateUser(updatedData);
      }
  };

  const deleteStaff = (id: string) => {
      setStaffState(prev => prev.filter(s => s.id !== id));
      logAction('Staff', 'Delete Staff', `Removed staff ID: ${id}`);

      if (hasAuthToken()) {
        authFetch(`/api/staff/${id}`, { method: 'DELETE' })
          .catch(err => console.warn('Staff backend sync (delete) failed, kept locally:', err));
        authFetch(`/api/employees/${id}`, { method: 'DELETE' })
          .catch(err => console.warn('Employee backend deactivation failed, kept locally:', err));
      }

      const savedGlobalRegistry = localStorage.getItem('bizora_global_employee_registry');
      if (savedGlobalRegistry) {
        try {
          let globalList: any[] = JSON.parse(savedGlobalRegistry);
          const empIndex = globalList.findIndex(e => e.mobile === id);
          if (empIndex > -1) {
            const emp = globalList[empIndex];
            const employment = emp.employments.find((e: any) => e.businessId === userId);
            if (employment) {
              employment.status = 'Inactive';
              employment.resignationDate = new Date().toISOString().split('T')[0];
            }
            localStorage.setItem('bizora_global_employee_registry', JSON.stringify(globalList));
          }
        } catch (e) {
          console.error(e);
        }
      }
  };

  const markAttendance = (staffId: string, date: string, status: 'Present' | 'Absent' | 'Leave' | 'Half Day', time?: string) => {
      setStaffState(prev => prev.map(s => {
          if (s.id === staffId) {
              const currentRecord = s.attendance?.[date];
              
              let update: any = { status };
              if (status === 'Present') {
                  if (!currentRecord?.checkIn) {
                      update.checkIn = time || new Date().toLocaleTimeString();
                  } else if (!currentRecord?.checkOut) {
                      update.checkIn = currentRecord.checkIn;
                      update.checkOut = time || new Date().toLocaleTimeString();
                  } else {
                      update.checkIn = currentRecord.checkIn;
                      update.checkOut = currentRecord.checkOut;
                  }
              }
              
              return {
                  ...s,
                  attendance: {
                      ...s.attendance,
                      [date]: { ...currentRecord, ...update }
                  }
              };
          }
          return s;
      }));

      const savedGlobalRegistry = localStorage.getItem('bizora_global_employee_registry');
      if (savedGlobalRegistry) {
        try {
          let globalList: any[] = JSON.parse(savedGlobalRegistry);
          const empIndex = globalList.findIndex(e => e.mobile === staffId);
          if (empIndex > -1) {
            const emp = globalList[empIndex];
            const employment = emp.employments.find((e: any) => e.businessId === userId);
            if (employment) {
              if (!employment.attendance) employment.attendance = {};
              const currentRecord = employment.attendance[date];
              let update: any = { status };
              if (status === 'Present') {
                  if (!currentRecord?.checkIn) {
                      update.checkIn = time || new Date().toLocaleTimeString();
                  } else if (!currentRecord?.checkOut) {
                      update.checkIn = currentRecord.checkIn;
                      update.checkOut = time || new Date().toLocaleTimeString();
                  } else {
                      update.checkIn = currentRecord.checkIn;
                      update.checkOut = currentRecord.checkOut;
                  }
              }
              employment.attendance[date] = { ...currentRecord, ...update };
            }
            localStorage.setItem('bizora_global_employee_registry', JSON.stringify(globalList));
          }
        } catch (e) {
          console.error(e);
        }
      }
  };

  const updatePerformance = (staffId: string, rating: number, comment: string) => {
      setStaffState(prev => prev.map(s => {
          if (s.id === staffId) {
              const currentReviews = s.performance?.reviews || [];
              const newReviews = [{ date: new Date().toLocaleDateString(), rating, comment }, ...currentReviews];
              const avgRating = newReviews.reduce((acc, r) => acc + r.rating, 0) / newReviews.length;
              
              return {
                  ...s,
                  performance: {
                      rating: parseFloat(avgRating.toFixed(1)),
                      reviews: newReviews
                  }
              };
          }
          return s;
      }));

      const savedGlobalRegistry = localStorage.getItem('bizora_global_employee_registry');
      if (savedGlobalRegistry) {
        try {
          let globalList: any[] = JSON.parse(savedGlobalRegistry);
          const empIndex = globalList.findIndex(e => e.mobile === staffId);
          if (empIndex > -1) {
            const emp = globalList[empIndex];
            const employment = emp.employments.find((e: any) => e.businessId === userId);
            if (employment) {
              if (!employment.performance) employment.performance = { rating: 5, reviews: [] };
              const currentReviews = employment.performance.reviews || [];
              const newReviews = [{ date: new Date().toLocaleDateString(), rating, comment }, ...currentReviews];
              const avgRating = newReviews.reduce((acc, r) => acc + r.rating, 0) / newReviews.length;
              employment.performance.reviews = newReviews;
              employment.performance.rating = parseFloat(avgRating.toFixed(1));
            }
            localStorage.setItem('bizora_global_employee_registry', JSON.stringify(globalList));
          }
        } catch (e) {
          console.error(e);
        }
      }
      logAction('Staff', 'Update Performance', `Added review for staff ID: ${staffId}`);
  };

  const updateLocation = (staffId: string, location: { lat: number, lng: number, address: string }) => {
      setStaffState(prev => prev.map(s => {
          if (s.id === staffId) {
              const timestamp = new Date().toLocaleString();
              const newLoc = { ...location, timestamp };
              const history = s.locationHistory || [];
              return {
                  ...s,
                  lastLocation: newLoc,
                  locationHistory: [newLoc, ...history].slice(0, 50) // Keep last 50 locations
              };
          }
          return s;
      }));
  };

  // --- Production Logic ---
  const addRawMaterial = (mat: RawMaterial) => {
      setRawMaterials(prev => [...prev, mat]);
      logAction('Production', 'Add Material', `Added ${mat.name}`);

      if (hasAuthToken()) {
        authFetch('/api/raw-materials', { method: 'POST', body: JSON.stringify(mat) })
          .catch(err => console.warn('Raw material backend sync (create) failed, kept locally:', err));
      }
  };

  const updateRawMaterial = (id: string, data: Partial<RawMaterial>) => {
      setRawMaterials(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));

      if (hasAuthToken()) {
        authFetch(`/api/raw-materials/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
          .catch(err => console.warn('Raw material backend sync (update) failed, kept locally:', err));
      }
  };

  const restockMaterial = (id: string, qty: number, cost: number) => {
      setRawMaterials(prev => prev.map(m => m.id === id ? { ...m, stock: m.stock + qty } : m));
      const targetStore = currentStoreId === 'ALL' ? '1' : currentStoreId;
      // Log Expense
      const mat = rawMaterials.find(m => m.id === id);

      if (hasAuthToken() && mat) {
        authFetch(`/api/raw-materials/${id}`, { method: 'PATCH', body: JSON.stringify({ stock: mat.stock + qty }) })
          .catch(err => console.warn('Raw material backend sync (restock) failed, kept locally:', err));
      }

      addTransaction({
          id: Date.now().toString(),
          storeId: targetStore,
          date: new Date().toISOString().split('T')[0],
          entityName: 'Raw Material Supplier',
          type: 'Expense',
          amount: cost,
          paymentMethod: 'Cash',
          details: { subtotal: cost, tax: 0, discount: 0, delivery: 0 },
          reference: `MAT-${mat?.name}`
      });
      logAction('Production', 'Restock Material', `Added ${qty} ${mat?.unit} to ${mat?.name}`);
  };

  const addBOM = (bom: BillOfMaterial) => {
      setBoms(prev => [...prev, bom]);
      logAction('Production', 'Create BOM', `Recipe for ${bom.productName}`);

      if (hasAuthToken()) {
        authFetch('/api/boms', { method: 'POST', body: JSON.stringify(bom) })
          .catch(err => console.warn('BOM backend sync (create) failed, kept locally:', err));
      }
  };

  const deleteBOM = (id: string) => {
      setBoms(prev => prev.filter(b => b.id !== id));

      if (hasAuthToken()) {
        authFetch(`/api/boms/${id}`, { method: 'DELETE' })
          .catch(err => console.warn('BOM backend sync (delete) failed, kept locally:', err));
      }
  };

  const addBatch = (batch: ProductionBatch) => {
      setProductionBatches(prev => [batch, ...prev]);
      logAction('Production', 'Start Batch', `Started batch for ${batch.productName}`);

      if (hasAuthToken()) {
        authFetch('/api/production-batches', { method: 'POST', body: JSON.stringify(batch) })
          .catch(err => console.warn('Production batch backend sync (create) failed, kept locally:', err));
      }
  };

  const updateBatchStatus = (id: string, status: ProductionBatch['status']) => {
      setProductionBatches(prev => prev.map(b => b.id === id ? { ...b, status } : b));

      if (hasAuthToken()) {
        authFetch(`/api/production-batches/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
          .catch(err => console.warn('Production batch backend sync (update) failed, kept locally:', err));
      }
  };

  const recalculateBalances = () => {
    setFinancialAccounts(prevAccounts => {
        const baseAccounts = prevAccounts.length > 0 ? prevAccounts : DEFAULT_FINANCIAL_ACCOUNTS;
        return baseAccounts.map(account => {
            let netMovement = 0;

            // Iterate over all transactions for the business, respecting store scoping:
            // - If account has a storeId, only transactions from that store affect it
            // - If account has no storeId, all business transactions posting to it affect it
            transactions.forEach(tx => {
                if (tx.isDeleted) return;
                if (account.storeId && tx.storeId && tx.storeId !== account.storeId) return;

                const splits = (tx.details as any)?.paymentSplits as { method: string; amount: number; accountId?: string }[] | undefined;
                const sign =
                    ['Sale', 'Income', 'Purchase Return'].includes(tx.type) ? 1
                    : ['Purchase', 'Expense', 'Sales Return', 'Salary', 'Supplier Payment'].includes(tx.type) ? -1
                    : tx.type === 'Transfer' ? (tx.transferType === 'In' ? 1 : -1)
                    : 0;
                if (sign === 0) return;

                if (splits && Array.isArray(splits) && splits.length > 0) {
                    const postings = buildSplitAccountPostings(splits, baseAccounts, tx.accountId);
                    const post = postings.find(p => p.accountId === account.id);
                    if (post) {
                        netMovement += sign * post.amount;
                    }
                } else {
                    const resolvedAccId = tx.accountId || resolveAccountForTender(tx.paymentMethod, baseAccounts);
                    if (resolvedAccId === account.id && tx.paymentMethod !== 'Due' && !isCreditMethod(tx.paymentMethod || '')) {
                        let amount = tx.amountPaid ?? tx.amount;
                        if (tx.paymentMethod === 'Due' && tx.type !== 'Income' && tx.type !== 'Expense') {
                            amount = 0;
                        }
                        netMovement += sign * amount;
                    }
                }
            });

            return {
                ...account,
                balance: roundMoney((account.openingBalance || 0) + netMovement)
            };
        });
    });
    logAction('Accounts', 'Recalculate Balances', 'Syncing accounts with ledger');
  };

  const completeProductionBatch = async (
      batchId: string,
      opts?: { actualQty?: number; scrapQty?: number; laborCost?: number; notes?: string; force?: boolean; scrapReason?: string; expiryDate?: string; lotNumber?: string; shelfLifeDays?: number }
  ) => {
      const batch = productionBatches.find(b => b.id === batchId);
      if (!batch || batch.status === 'Completed') return;

      const bom = boms.find(b => b.id === batch.bomId);
      if (!bom) return;

      const goodQty = opts?.actualQty != null ? Number(opts.actualQty) : batch.quantity;
      const scrap = Number(opts?.scrapQty) || 0;

      // Prefer atomic backend completion when authenticated
      if (hasAuthToken()) {
        try {
          const res = await authFetch('/api/production/complete', {
            method: 'POST',
            body: JSON.stringify({
              batchId,
              actualQty: goodQty,
              scrapQty: scrap,
              laborCost: opts?.laborCost,
              notes: opts?.notes,
              force: opts?.force,
              scrapReason: opts?.scrapReason,
              expiryDate: opts?.expiryDate,
              lotNumber: opts?.lotNumber,
              shelfLifeDays: opts?.shelfLifeDays,
            }),
          });
          if (res.status === 409) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || 'Insufficient raw material');
          }
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Complete failed (${res.status})`);
          }
          const body = await res.json();
          // Refresh local state from server result
          if (Array.isArray(body.consumptions)) {
            setRawMaterials(prev => prev.map(m => {
              const c = body.consumptions.find((x: any) => x.materialId === m.id);
              return c ? { ...m, stock: c.newStock } : m;
            }));
          }
          if (body.product?.id) {
            setProducts(prev => prev.map(p => p.id === body.product.id ? { ...p, stock: body.product.stock } : p));
          }
          setProductionBatches(prev => prev.map(b => b.id === batchId ? { ...b, ...body.batch, status: 'Completed' as const } : b));
          logAction('Production', 'Complete Batch', `Produced ${goodQty} units of ${batch.productName} (server)`);
          return;
        } catch (err: any) {
          console.warn('Production complete API failed, falling back locally:', err);
          if (err?.message?.includes('Insufficient')) throw err;
        }
      }

      // Local fallback
      let totalCost = 0;
      const consumeQty = Math.max(batch.quantity, goodQty + scrap);
      const consumedUpdates: { id: string; stock: number }[] = [];
      setRawMaterials(prev => prev.map(m => {
          const req = bom.materials.find(rm => rm.materialId === m.id);
          if (req) {
              const consumed = req.qty * consumeQty;
              totalCost += (m.cost * consumed);
              const newStock = Math.max(0, m.stock - consumed);
              consumedUpdates.push({ id: m.id, stock: newStock });
              return { ...m, stock: newStock };
          }
          return m;
      }));

      if (goodQty > 0) updateProductStock(batch.productId, goodQty, 'increase');

      const targetStore = currentStoreId === 'ALL' ? '1' : currentStoreId;
      const transaction: LedgerEntry = {
          id: Date.now().toString(),
          storeId: targetStore,
          date: new Date().toISOString().split('T')[0],
          entityName: 'Production Line',
          type: 'Stock Adjustment',
          amount: 0,
          paymentMethod: 'Adjustment',
          reference: `Production Batch ${batch.id.slice(-4)}`,
          items: [{
              productId: batch.productId,
              name: batch.productName,
              qty: goodQty,
              price: goodQty > 0 ? totalCost / goodQty : 0,
              total: totalCost
          }],
          details: { subtotal: 0, tax: 0, discount: 0, delivery: 0 }
      };
      addTransaction(transaction);
      updateBatchStatus(batchId, 'Completed');
      logAction('Production', 'Complete Batch', `Produced ${goodQty} units of ${batch.productName}`);
  };

  // --- Category Management ---
  const addCategory = (name: string) => {
      if (!categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
          setCategories(prev => [...prev, { id: Date.now().toString(), name, subCategories: [] }]);
          logAction('System', 'Add Category', `Created category: ${name}`);
      }
  };

  const addBrand = (name: string) => {
      if (!name.trim()) return;
      if (brands.some(b => b.name.toLowerCase() === name.trim().toLowerCase())) return;
      setBrands(prev => [...prev, { id: `brand-${Date.now()}`, name: name.trim() }]);
      logAction('System', 'Add Brand', `Created brand: ${name}`);
  };
  const deleteBrand = (id: string) => {
      setBrands(prev => prev.filter(b => b.id !== id));
      logAction('System', 'Delete Brand', `Deleted brand ID: ${id}`);
  };
  const addUnit = (name: string) => {
      if (!name.trim()) return;
      if (units.some(u => u.name.toLowerCase() === name.trim().toLowerCase())) return;
      setUnits(prev => [...prev, { id: `unit-${Date.now()}`, name: name.trim() }]);
      logAction('System', 'Add Unit', `Created unit: ${name}`);
  };
  const deleteUnit = (id: string) => {
      setUnits(prev => prev.filter(u => u.id !== id));
      logAction('System', 'Delete Unit', `Deleted unit ID: ${id}`);
  };
  const refreshWarehouses = async () => {
      if (!hasAuthToken()) return;
      try {
          const res = await authFetch('/api/warehouses');
          if (res.ok) {
              const data = await res.json();
              setWarehouses(Array.isArray(data) ? data : (data.warehouses || []));
          }
      } catch (e) {
          console.warn('Failed to refresh warehouses', e);
      }
  };
  const addWarehouse = async (w: Omit<Warehouse, 'id'> & { id?: string }) => {
      const warehouse: Warehouse = {
          id: w.id || `wh-${Date.now()}`,
          name: w.name,
          storeId: w.storeId,
          address: w.address,
          isDefault: w.isDefault,
      };
      setWarehouses(prev => [...prev, warehouse]);
      if (hasAuthToken()) {
          try {
              await authFetch('/api/warehouses', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(warehouse),
              });
          } catch (e) {
              console.warn('Failed to persist warehouse', e);
          }
      }
      logAction('System', 'Add Warehouse', `Created warehouse: ${w.name}`);
  };
  const updateWarehouse = async (w: Warehouse) => {
      setWarehouses(prev => prev.map(x => x.id === w.id ? w : x));
      if (hasAuthToken()) {
          try {
              await authFetch(`/api/warehouses/${w.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(w),
              });
          } catch (e) {
              console.warn('Failed to update warehouse', e);
          }
      }
  };
  const deleteWarehouse = async (id: string) => {
      setWarehouses(prev => prev.filter(x => x.id !== id));
      if (hasAuthToken()) {
          try {
              await authFetch(`/api/warehouses/${id}`, { method: 'DELETE' });
          } catch (e) {
              console.warn('Failed to delete warehouse', e);
          }
      }
      logAction('System', 'Delete Warehouse', `Deleted warehouse ID: ${id}`);
  };

  const addSubCategory = (categoryId: string, subCategoryName: string) => {
      setCategories(prev => prev.map(c => {
          const subs = c.subCategories || [];
          if (c.id === categoryId && !subs.includes(subCategoryName)) {
              return { ...c, subCategories: [...subs, subCategoryName] };
          }
          return c;
      }));
      logAction('System', 'Add SubCategory', `Added ${subCategoryName} to category`);
  };

  const deleteCategory = (id: string) => {
      setCategories(prev => prev.filter(c => c.id !== id));
      logAction('System', 'Delete Category', `Deleted category ID: ${id}`);
  };

  const deleteSubCategory = (categoryId: string, subCategoryName: string) => {
      setCategories(prev => prev.map(c => {
          if (c.id === categoryId) {
              const subs = c.subCategories || [];
              return { ...c, subCategories: subs.filter(s => s !== subCategoryName) };
          }
          return c;
      }));
      logAction('System', 'Delete SubCategory', `Deleted sub-category ${subCategoryName}`);
  };

  // --- Expense Category Management ---
  const updateExpenseCategory = (id: string, data: Partial<ExpenseCategory>) => {
      setExpenseCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const addExpenseCategory = (name: string, monthlyBudget?: number) => {
      if (!expenseCategories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
          setExpenseCategories(prev => [...prev, { id: Date.now().toString(), name, monthlyBudget: monthlyBudget || 0 }]);
          logAction('System', 'Add Expense Category', `Added ${name}`);
      }
  };

  const deleteExpenseCategory = (id: string) => {
      setExpenseCategories(prev => prev.filter(c => c.id !== id));
      logAction('System', 'Delete Expense Category', `Removed category ID: ${id}`);
  };

  // CRM Methods
  const addCustomerGroup = (group: CustomerGroup) => {
    setCustomerGroups(prev => [...prev, group]);
    if (hasAuthToken()) {
      authFetch('/api/customer-groups', { method: 'POST', body: JSON.stringify(group) })
        .catch(err => console.warn('Customer group backend sync (create) failed, kept locally:', err));
    }
  };
  const updateCustomerGroup = (id: string, data: Partial<CustomerGroup>) => {
    setCustomerGroups(prev => prev.map(g => g.id === id ? { ...g, ...data } : g));
    if (hasAuthToken()) {
      authFetch(`/api/customer-groups/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
        .catch(err => console.warn('Customer group backend sync (update) failed, kept locally:', err));
    }
  };
  const deleteCustomerGroup = (id: string) => {
    setCustomerGroups(prev => prev.filter(g => g.id !== id));
    if (hasAuthToken()) {
      authFetch(`/api/customer-groups/${id}`, { method: 'DELETE' })
        .catch(err => console.warn('Customer group backend sync (delete) failed, kept locally:', err));
    }
  };

  const addSupportTicket = (ticket: SupportTicket) => {
    setSupportTickets(prev => [...prev, ticket]);
    if (hasAuthToken()) {
      authFetch('/api/support-tickets', { method: 'POST', body: JSON.stringify(ticket) })
        .catch(err => console.warn('Support ticket backend sync (create) failed, kept locally:', err));
    }
  };
  const updateSupportTicket = (id: string, data: Partial<SupportTicket>) => {
    setSupportTickets(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    if (hasAuthToken()) {
      authFetch(`/api/support-tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
        .catch(err => console.warn('Support ticket backend sync (update) failed, kept locally:', err));
    }
  };

  const addFeedback = (feedback: CustomerFeedback) => {
    setFeedbacks(prev => [...prev, feedback]);
    if (hasAuthToken()) {
      authFetch('/api/feedbacks', { method: 'POST', body: JSON.stringify(feedback) })
        .catch(err => console.warn('Feedback backend sync (create) failed, kept locally:', err));
    }
  };

  const addMarketingCampaign = (campaign: MarketingCampaign) => {
    setMarketingCampaigns(prev => [...prev, campaign]);
    if (hasAuthToken()) {
      authFetch('/api/marketing-campaigns', { method: 'POST', body: JSON.stringify(campaign) })
        .catch(err => console.warn('Marketing campaign backend sync (create) failed, kept locally:', err));
    }
  };
  const updateMarketingCampaign = (id: string, data: Partial<MarketingCampaign>) => {
    setMarketingCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    if (hasAuthToken()) {
      authFetch(`/api/marketing-campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
        .catch(err => console.warn('Marketing campaign backend sync (update) failed, kept locally:', err));
    }
  };

  // saasTickets (cross-tenant business <-> SaaS platform support) are not
  // migrated yet - they need a different authorization model (both the
  // business and SaaS Owner/Admin need access to the same ticket), unlike
  // everything else above which is scoped to one business.
  const addQuotation = (quote: Quotation) => {
    setQuotations(prev => [quote, ...prev]);
    logAction('Sales', 'Create Quotation', `Quotation ${quote.quoteNumber} for ${quote.entityName}`);
    if (hasAuthToken()) {
      authFetch('/api/quotations', { method: 'POST', body: JSON.stringify(quote) })
        .catch(err => console.warn('Quotation backend sync (create) failed, kept locally:', err));
    }
  };

  const updateQuotation = (id: string, data: Partial<Quotation>) => {
    setQuotations(prev => prev.map(q => q.id === id ? { ...q, ...data } : q));
    if (hasAuthToken()) {
      authFetch(`/api/quotations/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
        .catch(err => console.warn('Quotation backend sync (update) failed, kept locally:', err));
    }
  };

  const deleteQuotation = (id: string) => {
    setQuotations(prev => prev.filter(q => q.id !== id));
    if (hasAuthToken()) {
      authFetch(`/api/quotations/${id}`, { method: 'DELETE' })
        .catch(err => console.warn('Quotation backend sync (delete) failed, kept locally:', err));
    }
  };

  // Converts an accepted quotation straight into a real Sale transaction,
  // reusing the same addTransaction()/updateProductStock() path POS uses -
  // so it deducts stock and hits the ledger exactly like a normal sale.
  const convertQuotationToSale = (quoteId: string, paymentMethod: LedgerEntry['paymentMethod'] = 'Cash') => {
    const quote = quotations.find(q => q.id === quoteId);
    if (!quote) return { ok: false as const, error: 'Quotation not found' };
    if (quote.status === 'Converted') return { ok: false as const, error: 'Already converted' };
    if (quote.status === 'Rejected' || quote.status === 'Expired' || quote.status === 'Cancelled' as any) {
      return { ok: false as const, error: `Cannot convert ${quote.status} quotation` };
    }

    // Stock check (skip services)
    for (const item of quote.items) {
      const product = products.find(p => p.id === item.productId);
      if (!product || product.type === 'Service') continue;
      if ((Number(product.stock) || 0) < (Number(item.qty) || 0)) {
        return {
          ok: false as const,
          error: `Insufficient stock for ${item.name}: need ${item.qty}, have ${product.stock}`,
        };
      }
    }

    const saleId = `sale-from-quote-${Date.now()}`;
    const saleItems = quote.items.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (product && product.type === 'Service') return { ...item };
      const lotLines = updateProductStock(item.productId, item.qty, 'decrease') || [];
      const primary = lotLines[0];
      return {
        ...item,
        lots: lotLines.length ? lotLines : item.lots,
        batchNumber: primary?.lotNumber || item.batchNumber,
        expiryDate: primary?.expiryDate || item.expiryDate,
      };
    });

    addTransaction({
      id: saleId,
      date: new Date().toISOString(),
      entityId: quote.entityId,
      entityName: quote.entityName,
      entityMobile: quote.entityMobile,
      type: 'Sale',
      amount: quote.total,
      amountPaid: paymentMethod === 'Due' ? 0 : quote.total,
      paymentMethod,
      items: saleItems,
      details: { subtotal: quote.subtotal, tax: quote.tax, discount: quote.discount, delivery: 0 },
      reference: `Converted from quotation ${quote.quoteNumber}`,
      notes: quote.notes,
    } as LedgerEntry);

    updateQuotation(quoteId, { status: 'Converted', convertedToSaleId: saleId });
    return { ok: true as const, saleId };
  };

  const addKitchenOrder = (order: KitchenOrder) => {
    setKitchenOrders(prev => [order, ...prev]);
    logAction('Kitchen', 'New KOT', `Order for ${order.tableNumber || order.orderType}`);
    if (hasAuthToken()) {
      authFetch('/api/kitchen-orders', { method: 'POST', body: JSON.stringify(order) })
        .catch(err => console.warn('Kitchen order backend sync (create) failed, kept locally:', err));
    }
  };

  const updateKitchenOrderStatus = (id: string, status: KitchenOrder['status']) => {
    setKitchenOrders(prev => prev.map(o => o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o));
    if (hasAuthToken()) {
      authFetch(`/api/kitchen-orders/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
        .catch(err => console.warn('Kitchen order backend sync (status) failed, kept locally:', err));
    }
  };


  const createStockTransferRequest = (req: Omit<StockTransferRequest, 'status' | 'requestedAt'> & { status?: StockTransferRequest['status'] }) => {
    const full: StockTransferRequest = {
      ...req,
      id: req.id || `st-${Date.now()}`,
      status: req.status || 'Pending',
      requestedAt: new Date().toISOString(),
    };
    setStockTransferRequests(prev => [full, ...prev]);
    if (hasAuthToken()) {
      authFetch('/api/stock-transfers', { method: 'POST', body: JSON.stringify(full) })
        .catch(err => console.warn('Stock transfer sync failed:', err));
    }
  };

  const approveStockTransfer = (id: string, reviewer?: string): { ok: boolean; error?: string } => {
    const req = stockTransferRequests.find(r => r.id === id);
    if (!req) return { ok: false, error: 'Transfer not found' };
    if (req.status !== 'Pending') return { ok: false, error: `Cannot approve ${req.status} transfer` };
    if (!req.items?.length) return { ok: false, error: 'No items' };

    for (const item of req.items) {
      const p = products.find(x => x.id === item.productId);
      const variantId = (item as any).variantId as string | undefined;
      let have = Number(p?.stock) || 0;
      if (variantId && p?.variants) {
        const v = p.variants.find(x => x.id === variantId);
        have = Number(v?.stock) || 0;
      }
      if (!p || have < item.quantity) {
        return {
          ok: false,
          error: `Insufficient stock for ${item.productName}: need ${item.quantity}, have ${have}`,
        };
      }
    }

    const transferTxnId = `txn-transfer-${Date.now()}`;
    const transferLines: { productId: string; name: string; qty: number; price: number; total: number; lots?: any[]; batchNumber?: string; expiryDate?: string }[] = [];

    req.items.forEach(item => {
      const sourceProduct = products.find(p => p.id === item.productId);
      if (!sourceProduct) return;
      const variantId = (item as any).variantId as string | undefined;
      // FEFO decrease at source — variant-scoped when provided
      const lotLines = updateProductStock(sourceProduct.id, item.quantity, 'decrease', variantId) || [];
      const primary = lotLines[0];
      transferLines.push({
        productId: item.productId,
        name: item.productName,
        qty: item.quantity,
        price: 0,
        total: 0,
        lots: lotLines.length ? lotLines : undefined,
        batchNumber: primary?.lotNumber,
        expiryDate: primary?.expiryDate,
        variantId,
        variantName: (item as any).variantName,
      } as any);

      const destProduct = products.find(p =>
        p.storeId === req.destStoreId &&
        (!req.destWarehouseId || p.warehouseId === req.destWarehouseId || !p.warehouseId) &&
        (sourceProduct.sku ? p.sku === sourceProduct.sku : p.name === sourceProduct.name)
      );
      if (destProduct) {
        // Restore same lots at destination
        updateProductStock(destProduct.id, item.quantity, 'increase', undefined, {
          lots: lotLines.length ? lotLines : undefined,
          lotNumber: primary?.lotNumber,
          expiryDate: primary?.expiryDate,
        });
      } else {
        addProduct({
          ...sourceProduct,
          id: `${sourceProduct.id}-${req.destStoreId}-${Date.now()}`,
          storeId: req.destStoreId,
          warehouseId: req.destWarehouseId || sourceProduct.warehouseId,
          stock: item.quantity,
          lots: lotLines.length
            ? lotLines.map((l) => ({
                lotNumber: l.lotNumber,
                qty: l.qty,
                expiryDate: l.expiryDate,
                receivedAt: new Date().toISOString().slice(0, 10),
              }))
            : undefined,
          batchNumber: primary?.lotNumber || sourceProduct.batchNumber,
          expiryDate: primary?.expiryDate || sourceProduct.expiryDate,
        } as any);
      }
    });

    addTransaction({
      id: transferTxnId,
      date: new Date().toISOString(),
      entityName: `${req.sourceStoreId} → ${req.destStoreId}`,
      type: 'Transfer',
      amount: 0,
      paymentMethod: 'Adjustment',
      reference: `Approved transfer ${req.id}: ${req.items.map(i => `${i.productName} x${i.quantity}`).join(', ')}`,
      notes: req.notes,
      storeId: req.sourceStoreId,
      items: transferLines,
    } as LedgerEntry);

    const updated: StockTransferRequest = {
      ...req,
      status: 'Approved',
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewer,
      transferTxnId,
    };
    setStockTransferRequests(prev => prev.map(r => r.id === id ? updated : r));
    if (hasAuthToken()) {
      authFetch(`/api/stock-transfers/${id}`, { method: 'PATCH', body: JSON.stringify(updated) })
        .catch(err => console.warn('Stock transfer approve sync failed:', err));
    }
    return { ok: true };
  };

  const rejectStockTransfer = (id: string, note?: string, reviewer?: string) => {
    const req = stockTransferRequests.find(r => r.id === id);
    if (!req || req.status !== 'Pending') return;
    const updated: StockTransferRequest = {
      ...req,
      status: 'Rejected',
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewer,
      reviewNote: note,
    };
    setStockTransferRequests(prev => prev.map(r => r.id === id ? updated : r));
    if (hasAuthToken()) {
      authFetch(`/api/stock-transfers/${id}`, { method: 'PATCH', body: JSON.stringify(updated) })
        .catch(err => console.warn('Stock transfer reject sync failed:', err));
    }
  };

  const cancelStockTransfer = (id: string) => {
    const req = stockTransferRequests.find(r => r.id === id);
    if (!req || req.status !== 'Pending') return;
    const updated: StockTransferRequest = { ...req, status: 'Cancelled' };
    setStockTransferRequests(prev => prev.map(r => r.id === id ? updated : r));
    if (hasAuthToken()) {
      authFetch(`/api/stock-transfers/${id}`, { method: 'PATCH', body: JSON.stringify(updated) })
        .catch(err => console.warn('Stock transfer cancel sync failed:', err));
    }
  };

  const addPurchaseOrder = (po: PurchaseOrder) => {
    setPurchaseOrders(prev => [po, ...prev]);
    logAction('Purchase', 'Create Purchase Order', `PO ${po.poNumber} for ${po.supplierName}`);
    if (hasAuthToken()) {
      authFetch('/api/purchase-orders', { method: 'POST', body: JSON.stringify(po) })
        .catch(err => console.warn('Purchase order backend sync (create) failed, kept locally:', err));
    }
  };

  const updatePurchaseOrder = (id: string, data: Partial<PurchaseOrder>) => {
    setPurchaseOrders(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    if (hasAuthToken()) {
      authFetch(`/api/purchase-orders/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
        .catch(err => console.warn('Purchase order backend sync (update) failed, kept locally:', err));
    }
  };

  const deletePurchaseOrder = (id: string) => {
    setPurchaseOrders(prev => prev.filter(p => p.id !== id));
    if (hasAuthToken()) {
      authFetch(`/api/purchase-orders/${id}`, { method: 'DELETE' })
        .catch(err => console.warn('Purchase order backend sync (delete) failed, kept locally:', err));
    }
  };

  // Receiving a PO turns it into a real Purchase transaction, reusing the
  // same addTransaction()/updateProductStock() path Buy.tsx uses - stock
  // goes up and the ledger gets a real Purchase entry, exactly as if it
  // had been entered directly in Buy.tsx.
  const receivePurchaseOrder = (poId: string, receivedQtys?: Record<string, number>) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po || po.status === 'Received' || po.status === 'Cancelled') return;

    // receivedQtys: productId -> qty to receive this time (defaults to remaining)
    const nextItems = po.items.map(item => {
      const already = Number((item as any).receivedQty) || 0;
      const ordered = Number(item.qty) || 0;
      const remaining = Math.max(0, ordered - already);
      let take = receivedQtys && receivedQtys[item.productId] != null
        ? Number(receivedQtys[item.productId])
        : remaining;
      if (Number.isNaN(take) || take < 0) take = 0;
      take = Math.min(take, remaining);
      return { item, take, already, ordered };
    });

    const receiving = nextItems.filter(x => x.take > 0);
    if (!receiving.length) return;

    const purchaseId = `purchase-from-po-${Date.now()}`;
    receiving.forEach(({ item, take }) => {
      processPurchase(
        item.productId,
        take,
        Number(item.price) || 0,
        {
          lotNumber: (item as any).batchNumber || `PO-${po.poNumber}-${item.productId}`.slice(0, 24),
          expiryDate: (item as any).expiryDate,
          receivedAt: new Date().toISOString().slice(0, 10),
        }
      );
    });

    const lineItems = receiving.map(({ item, take }) => ({
      ...item,
      qty: take,
      total: take * (Number(item.price) || 0),
    }));
    const subtotal = lineItems.reduce((s, i) => s + i.total, 0);

    addTransaction({
      id: purchaseId,
      date: new Date().toISOString(),
      entityId: po.supplierId,
      entityName: po.supplierName,
      entityMobile: po.supplierMobile,
      type: 'Purchase',
      amount: subtotal,
      paymentMethod: 'Due',
      items: lineItems,
      details: { subtotal, tax: 0, discount: 0, delivery: 0 },
      reference: `Received from PO ${po.poNumber}`,
    } as LedgerEntry);

    const updatedItems = nextItems.map(({ item, take, already }) => ({
      ...item,
      receivedQty: already + take,
    }));
    const allDone = updatedItems.every(i => (Number((i as any).receivedQty) || 0) >= (Number(i.qty) || 0));
    const anyReceived = updatedItems.some(i => (Number((i as any).receivedQty) || 0) > 0);

    updatePurchaseOrder(poId, {
      items: updatedItems as any,
      status: allDone ? 'Received' : anyReceived ? 'Partial' : po.status,
      receivedTransactionId: purchaseId,
    });
  };

  const addDepartment = (dept: Department) => {
    setDepartments(prev => [...prev, dept]);
    if (hasAuthToken()) {
      authFetch('/api/departments', { method: 'POST', body: JSON.stringify(dept) })
        .catch(err => console.warn('Department backend sync (create) failed, kept locally:', err));
    }
  };

  const deleteDepartment = (id: string) => {
    setDepartments(prev => prev.filter(d => d.id !== id));
    if (hasAuthToken()) {
      authFetch(`/api/departments/${id}`, { method: 'DELETE' })
        .catch(err => console.warn('Department backend sync (delete) failed, kept locally:', err));
    }
  };

  const addDesignation = (designation: Designation) => {
    setDesignations(prev => [...prev, designation]);
    if (hasAuthToken()) {
      authFetch('/api/designations', { method: 'POST', body: JSON.stringify(designation) })
        .catch(err => console.warn('Designation backend sync (create) failed, kept locally:', err));
    }
  };

  const deleteDesignation = (id: string) => {
    setDesignations(prev => prev.filter(d => d.id !== id));
    if (hasAuthToken()) {
      authFetch(`/api/designations/${id}`, { method: 'DELETE' })
        .catch(err => console.warn('Designation backend sync (delete) failed, kept locally:', err));
    }
  };

  const addWorkShift = (shift: WorkShift) => {
    setWorkShifts(prev => [...prev, shift]);
    if (hasAuthToken()) {
      authFetch('/api/work-shifts', { method: 'POST', body: JSON.stringify(shift) })
        .catch(err => console.warn('Work shift backend sync (create) failed, kept locally:', err));
    }
  };
  const deleteWorkShift = (id: string) => {
    setWorkShifts(prev => prev.filter(s => s.id !== id));
    if (hasAuthToken()) {
      authFetch(`/api/work-shifts/${id}`, { method: 'DELETE' })
        .catch(err => console.warn('Work shift backend sync (delete) failed, kept locally:', err));
    }
  };
  const addHoliday = (holiday: Holiday) => {
    setHolidays(prev => [...prev, holiday]);
    if (hasAuthToken()) {
      authFetch('/api/holidays', { method: 'POST', body: JSON.stringify(holiday) })
        .catch(err => console.warn('Holiday backend sync (create) failed, kept locally:', err));
    }
  };
  const deleteHoliday = (id: string) => {
    setHolidays(prev => prev.filter(h => h.id !== id));
    if (hasAuthToken()) {
      authFetch(`/api/holidays/${id}`, { method: 'DELETE' })
        .catch(err => console.warn('Holiday backend sync (delete) failed, kept locally:', err));
    }
  };
  const isHolidayDate = (date: string): Holiday | undefined => {
    const md = date.slice(5); // MM-DD
    return holidays.find(h => h.date === date || (h.recurring && h.date.slice(5) === md));
  };

  const addPayrollRun = (run: PayrollRun) => {
    setPayrollRuns(prev => [...prev, run]);
    if (hasAuthToken()) {
      authFetch('/api/payroll-runs', { method: 'POST', body: JSON.stringify(run) })
        .catch(err => console.warn('Payroll run create sync failed:', err));
    }
  };

  const voidPayrollRun = (id: string) => {
    const run = payrollRuns.find(r => r.id === id) as any;
    if (!run || run.status === 'Void' || run.reversalTransactionId) return;

    // Prevent double-reversal if ledger already has a matching reversal
    const alreadyReversed = transactions.some(
      (tx: any) =>
        tx.category === 'Payroll Reversal' &&
        (String(tx.notes || '').includes(run.id) || String(tx.reference || '').includes(run.id))
    );
    if (alreadyReversed) {
      setPayrollRuns(prev => prev.map(r => r.id === id ? { ...r, status: 'Void' as const } : r));
      return;
    }

    const voidedAt = new Date().toISOString();
    let revId: string | undefined;

    // Auto-reverse salary expense as Income so cash/P&L stay consistent
    if (Number(run.netPay) > 0) {
      revId = `rev-pay-${Date.now()}`;
      addTransaction({
        id: revId,
        date: new Date().toISOString().split('T')[0],
        entityName: run.staffName,
        type: 'Income',
        amount: Number(run.netPay),
        paymentMethod: run.paymentMethod || 'Cash',
        reference: `Payroll void reversal ${run.period} (was ${run.transactionId || 'n/a'})`,
        notes: `Auto-reversal of voided payroll run ${run.id}`,
        details: { subtotal: Number(run.netPay), tax: 0, discount: 0, delivery: 0 },
        category: 'Payroll Reversal',
      } as LedgerEntry);
    }

    const patch = {
      status: 'Void' as const,
      voidedAt,
      ...(revId ? { reversalTransactionId: revId } : {}),
    };
    setPayrollRuns(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    if (hasAuthToken()) {
      authFetch(`/api/payroll-runs/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
        .catch(err => console.warn('Payroll run void sync failed:', err));
    }
  };

  const setJournalPeriodClosedThrough = (date: string | null) => {
    const v = date && date.trim() ? date.trim().slice(0, 10) : null;
    setJournalPeriodClosedThroughState(v);
    try {
      if (v) localStorage.setItem('bizora_journal_closed_through', v);
      else localStorage.removeItem('bizora_journal_closed_through');
    } catch { /* ignore */ }
  };

  const addJournalEntry = (entry: JournalEntry): { ok: boolean; error?: string } => {
    const debit = entry.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const credit = entry.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    if (entry.lines.length < 2) return { ok: false, error: 'At least two lines required.' };
    if (Math.abs(debit - credit) > 0.009) return { ok: false, error: `Debits (${debit}) must equal credits (${credit}).` };
    if (debit <= 0) return { ok: false, error: 'Entry amount must be greater than zero.' };
    const entryDate = String(entry.date || '').slice(0, 10);
    if (journalPeriodClosedThrough && entryDate && entryDate <= journalPeriodClosedThrough) {
      return {
        ok: false,
        error: `Period closed through ${journalPeriodClosedThrough}. Cannot post on ${entryDate}.`,
      };
    }
    const final = { ...entry, isPosted: true };
    setJournalEntries(prev => [final, ...prev]);
    if (hasAuthToken()) {
      authFetch('/api/journal-entries', { method: 'POST', body: JSON.stringify(final) })
        .catch(err => console.warn('Journal entry sync failed:', err));
    }
    return { ok: true };
  };

  const deleteJournalEntry = (id: string) => {
    setJournalEntries(prev => prev.filter(e => e.id !== id));
    if (hasAuthToken()) {
      authFetch(`/api/journal-entries/${id}`, { method: 'DELETE' })
        .catch(err => console.warn('Journal delete sync failed:', err));
    }
  };

  const journalTrialBalance = () => {
    const map = new Map<string, { accountId: string; code: string; name: string; debit: number; credit: number }>();
    for (const entry of journalEntries) {
      if (!entry.isPosted) continue;
      for (const line of entry.lines || []) {
        const key = line.accountId || line.accountCode;
        const cur = map.get(key) || { accountId: line.accountId, code: line.accountCode, name: line.accountName, debit: 0, credit: 0 };
        cur.debit += Number(line.debit) || 0;
        cur.credit += Number(line.credit) || 0;
        map.set(key, cur);
      }
    }
    return Array.from(map.values()).map(r => {
      const net = r.debit - r.credit;
      if (net >= 0) return { ...r, debit: net, credit: 0 };
      return { ...r, debit: 0, credit: -net };
    }).filter(r => r.debit > 0 || r.credit > 0);
  };

  const setLeavePolicy = (p: LeavePolicy) => {
    setLeavePolicyState(p);
    // Persist with business settings blob when possible
    if (hasAuthToken()) {
      authFetch('/api/business-settings', {
        method: 'PUT',
        body: JSON.stringify({ leavePolicy: p }),
      }).catch(err => console.warn('Leave policy sync failed:', err));
    }
    try {
      localStorage.setItem('bizora_leave_policy', JSON.stringify(p));
    } catch { /* ignore */ }
  };

  const addLeaveRequest = (req: LeaveRequest) => {

    setLeaveRequests(prev => [req, ...prev]);
    if (hasAuthToken()) {
      authFetch('/api/leave-requests', { method: 'POST', body: JSON.stringify(req) })
        .catch(err => console.warn('Leave request sync failed:', err));
    }
  };

  const reviewLeaveRequest = (id: string, status: 'Approved' | 'Rejected', note?: string) => {
    const req = leaveRequests.find(r => r.id === id);
    if (!req || req.status !== 'Pending') return;

    const updated: LeaveRequest = {
      ...req,
      status,
      reviewedAt: new Date().toISOString(),
      reviewerNote: note,
    };
    setLeaveRequests(prev => prev.map(r => r.id === id ? updated : r));
    if (hasAuthToken()) {
      authFetch(`/api/leave-requests/${id}`, { method: 'PATCH', body: JSON.stringify(updated) })
        .catch(err => console.warn('Leave review sync failed:', err));
    }

    // On approve, mark attendance Leave for each day in range
    if (status === 'Approved') {
      const start = new Date(req.startDate + 'T00:00:00');
      const end = new Date(req.endDate + 'T00:00:00');
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        markAttendance(req.staffId, key, 'Leave');
      }
    }
  };

  const cancelLeaveRequest = (id: string) => {
    setLeaveRequests(prev => prev.map(r => r.id === id && r.status === 'Pending' ? { ...r, status: 'Cancelled' as const } : r));
    if (hasAuthToken()) {
      authFetch(`/api/leave-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'Cancelled' }) })
        .catch(err => console.warn('Leave cancel sync failed:', err));
    }
  };


  const getPayrollRunsForPeriod = (period: string) =>
    payrollRuns.filter(r => r.period === period && r.status === 'Paid');

  const genGiftCode = () => {
    const part = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    return `GC-${part()}-${part()}`;
  };

  const issueGiftCard = (input: Omit<GiftCard, 'id' | 'createdAt' | 'balance' | 'status'> & { initialBalance: number; code?: string }): GiftCard => {
    const card: GiftCard = {
      id: `gc-${Date.now()}`,
      code: (input.code || genGiftCode()).toUpperCase().trim(),
      initialBalance: input.initialBalance,
      balance: input.initialBalance,
      status: 'active',
      issuedToCustomerId: input.issuedToCustomerId,
      issuedToName: input.issuedToName,
      expiresAt: input.expiresAt,
      notes: input.notes,
      createdAt: new Date().toISOString(),
    };
    setGiftCards(prev => [...prev, card]);
    if (hasAuthToken()) {
      authFetch('/api/gift-cards', { method: 'POST', body: JSON.stringify(card) })
        .catch(err => console.warn('Gift card create sync failed:', err));
    }
    return card;
  };

  const disableGiftCard = (id: string) => {
    setGiftCards(prev => prev.map(c => c.id === id ? { ...c, status: 'disabled' as const } : c));
    if (hasAuthToken()) {
      authFetch(`/api/gift-cards/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'disabled' }) })
        .catch(err => console.warn('Gift card disable sync failed:', err));
    }
  };

  const redeemGiftCard = (code: string, amount: number): { ok: boolean; amount: number; remaining: number; error?: string } => {
    const c = code.trim().toUpperCase();
    const card = giftCards.find(g => g.code.toUpperCase() === c);
    if (!card) return { ok: false, amount: 0, remaining: 0, error: 'Gift card not found.' };
    if (card.status !== 'active') return { ok: false, amount: 0, remaining: card.balance, error: `Card is ${card.status}.` };
    if (card.expiresAt && card.expiresAt < new Date().toISOString().slice(0, 10)) {
      setGiftCards(prev => prev.map(g => g.id === card.id ? { ...g, status: 'expired' as const } : g));
      return { ok: false, amount: 0, remaining: card.balance, error: 'Gift card has expired.' };
    }
    if (amount <= 0) return { ok: false, amount: 0, remaining: card.balance, error: 'Invalid amount.' };
    if (card.balance <= 0) return { ok: false, amount: 0, remaining: 0, error: 'Gift card has no remaining balance.' };
    const applied = Math.min(amount, card.balance);
    const remaining = Math.round((card.balance - applied) * 100) / 100;
    const nextStatus = remaining <= 0 ? 'redeemed' as const : 'active' as const;
    setGiftCards(prev => prev.map(g => g.id === card.id ? {
      ...g,
      balance: remaining,
      status: nextStatus,
      lastRedeemedAt: new Date().toISOString(),
    } : g));
    if (hasAuthToken()) {
      authFetch(`/api/gift-cards/${card.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ balance: remaining, status: nextStatus, lastRedeemedAt: new Date().toISOString() }),
      }).catch(err => console.warn('Gift card redeem sync failed:', err));
    }
    return { ok: true, amount: applied, remaining };
  };

  const ensureCustomerReferralCode = (customerId: string): string => {
    const cust = customers.find(c => c.id === customerId);
    if (!cust) return '';
    if (cust.referralCode) return cust.referralCode;
    const code = `REF-${(cust.name || 'C').replace(/\s+/g, '').slice(0, 4).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    updateEntity(customerId, { referralCode: code });
    return code;
  };

  const applyReferralCode = (customerId: string, code: string): { ok: boolean; error?: string } => {
    if (!referralConfig.enabled) return { ok: false, error: 'Referral program is disabled.' };
    const normalized = code.trim().toUpperCase();
    if (!normalized) return { ok: false, error: 'Enter a referral code.' };
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return { ok: false, error: 'Customer not found.' };
    if (customer.referredBy) return { ok: false, error: 'This customer already has a referrer.' };
    const referrer = customers.find(c => (c.referralCode || '').toUpperCase() === normalized && c.id !== customerId);
    if (!referrer) return { ok: false, error: 'Invalid referral code.' };
    updateEntity(customerId, { referredBy: referrer.id, source: customer.source || 'Referral' });
    if (referralConfig.refereeRewardPoints > 0) {
      updateEntity(customerId, {
        loyaltyPoints: (customer.loyaltyPoints || 0) + referralConfig.refereeRewardPoints,
      });
    }
    return { ok: true };
  };

  const processReferralRewardsOnSale = (customerId: string, saleAmount: number) => {
    if (!referralConfig.enabled || !customerId) return;
    const customer = customers.find(c => c.id === customerId);
    if (!customer?.referredBy) return;
    if (saleAmount < (referralConfig.minSaleForReferrerReward || 0)) return;
    // Award referrer only once: use a soft flag via notes or check first sale
    // Heuristic: if customer has totalOrders > 1 after this sale path, skip
    // Callers typically fire after recording the sale.
    const referrer = customers.find(c => c.id === customer.referredBy);
    if (!referrer) return;
    const priorSales = transactions.filter(tx =>
      tx.type === 'Sale' && (tx.entityId === customerId) && !tx.isDeleted
    ).length;
    // priorSales is count before current sale is visible in state; allow 0 for first sale reward
    if (priorSales > 0) return;
    if (referralConfig.referrerRewardPoints > 0) {
      updateEntity(referrer.id, {
        loyaltyPoints: (referrer.loyaltyPoints || 0) + referralConfig.referrerRewardPoints,
      });
    }
  };

  const addSaasTicket = (ticket: SaasSupportTicket) => {
    setSaasTickets(prev => [...prev, ticket]);
    if (hasAuthToken()) {
      authFetch('/api/saas-tickets', { method: 'POST', body: JSON.stringify(ticket) })
        .catch(err => console.warn('SaaS ticket backend sync (create) failed, kept locally:', err));
    }
  };
  const refreshSaasTickets = async () => {
    try {
      const res = await authFetch('/api/saas-tickets');
      if (res.ok) {
        const body = await res.json();
        if (Array.isArray(body?.tickets)) {
          setSaasTickets(body.tickets);
          return;
        }
      }
    } catch (e) {
      console.warn('refreshSaasTickets failed', e);
    }
  };

  const upsertSaasTicketLocal = (ticket: any) => {
    if (!ticket?.id) return;
    setSaasTickets((prev) => {
      const i = prev.findIndex((t) => t.id === ticket.id);
      if (i >= 0) {
        const next = prev.slice();
        next[i] = { ...next[i], ...ticket };
        return next;
      }
      return [ticket, ...prev];
    });
  };

  const updateSaasTicket = (id: string, data: Partial<SaasSupportTicket>) => {
    setSaasTickets(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    if (hasAuthToken()) {
      authFetch(`/api/saas-tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
        .catch(err => console.warn('SaaS ticket backend sync (update) failed, kept locally:', err));
    }
  };

  // Live tickets: socket upsert + 15s poll fallback
  React.useEffect(() => {
    if (!userId && !user) return;
    ensureRealtimeSocket();
    const unsub = subscribeTicketUpdate((ticket: any) => {
      upsertSaasTicketLocal(ticket);
    });
    const poll = window.setInterval(() => { void refreshSaasTickets(); }, 45000);
    void refreshSaasTickets();
    return () => {
      unsub();
      window.clearInterval(poll);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, user?.id]);

  // --- Scalability & Import/Export ---
  const archiveTransactions = async (beforeDate: string) => {
      const limitDate = new Date(beforeDate);
      if (isNaN(limitDate.getTime())) {
          console.error("Invalid archive date provided");
          return 0;
      }
      const limit = limitDate.getTime();
      
      const toArchive = transactions.filter(t => {
          if (!t.date) return false;
          const tDate = new Date(t.date);
          return !isNaN(tDate.getTime()) && tDate.getTime() < limit;
      });
      
      if (toArchive.length === 0) return 0;

      // Export to file
      const dataStr = JSON.stringify(toArchive, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `nexus_archive_${beforeDate}_${toArchive.length}tx.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Remove from state
      setTransactions(prev => prev.filter(t => new Date(t.date).getTime() >= limit));
      
      logAction('System', 'Data Archive', `Archived ${toArchive.length} transactions older than ${beforeDate}`);
      return toArchive.length;
  };

  const resetData = async (password: string) => {
      if (!userId) return false;
      
      const isVerified = await verifyPassword(password);
      if (!isVerified) {
          return false;
      }
      
      // Clear all keys for this user
      const keys = [
          `nexus_products_${userId}`,
          `nexus_customers_${userId}`,
          `nexus_suppliers_${userId}`,
          `nexus_transactions_${userId}`,
          `nexus_accounts_${userId}`,
          `nexus_onlineOrders_${userId}`,
          `nexus_staff_${userId}`,
          `nexus_appLogs_${userId}`,
          `nexus_courierSettings_${userId}`,
          `nexus_domainSettings_${userId}`,
          `nexus_promoCodes_${userId}`,
          `nexus_shopPolicies_${userId}`,
          `nexus_categories_${userId}`,
          `nexus_expenseCategories_${userId}`,
          `nexus_customerGroups_${userId}`,
          `nexus_supportTickets_${userId}`,
          `nexus_feedbacks_${userId}`,
          `nexus_marketingCampaigns_${userId}`,
          `nexus_rawMaterials_${userId}`,
          `nexus_boms_${userId}`,
          `nexus_productionBatches_${userId}`
      ];
      
      keys.forEach(key => localStorage.removeItem(key));
      
      logAction('System', 'Data Reset', 'All user data has been cleared');
      return true;
  };

  const getAllData = () => {
      return {
          version: 2,
          exportedAt: new Date().toISOString(),
          products, customers, suppliers, transactions, financialAccounts, onlineOrders,
          staff, appLogs, courierSettings, domainSettings, promoCodes,
          shopPolicies, rawMaterials, boms, productionBatches, categories, brands, units,
          expenseCategories, customerGroups, supportTickets, feedbacks, marketingCampaigns,
          giftCards, warehouses, departments, designations, workShifts, holidays, payrollRuns, journalEntries, leaveRequests,
          loyaltyConfig, referralConfig, quotations, purchaseOrders, stockTransferRequests, kitchenOrders,
      };
  };

  const importData = (jsonData: string) => {
      console.log("Import data called");
      try {
          const data = JSON.parse(jsonData);                
          console.log("Importing data:", data);
          console.log("Products to import:", data.products);
          if (!userId) {
              alert("Import failed: User ID not found.");
              return;
          }

          // Helper to save if exists
          const save = (key: string, value: any) => {
              if (value !== undefined) {
                  localStorage.setItem(`nexus_${key}_${userId}`, JSON.stringify(value));
              }
          };

          save('products', data.products);
          setProducts(data.products || []);
          save('customers', data.customers);
          setCustomers(data.customers || []);
          save('suppliers', data.suppliers);
          setSuppliers(data.suppliers || []);
          save('transactions', data.transactions);
          setTransactions(data.transactions || []);
          save('accounts', data.financialAccounts);
          setFinancialAccounts(data.financialAccounts || []);
          save('onlineOrders', data.onlineOrders);
          setOnlineOrders(data.onlineOrders || []);
          save('staff', data.staff);
          setStaffState(data.staff || []);
          save('appLogs', data.appLogs);
          setAppLogs(data.appLogs || []);
          save('courierSettings', data.courierSettings);
          setCourierSettings(data.courierSettings || []);
          save('domainSettings', data.domainSettings);
          setDomainSettings(data.domainSettings || {});
          save('promoCodes', data.promoCodes);
          setPromoCodes(data.promoCodes || []);
          save('shopPolicies', data.shopPolicies);
          setShopPolicies(data.shopPolicies || {});
          save('categories', data.categories);
          setCategories(data.categories || []);
          save('expenseCategories', data.expenseCategories);
          setExpenseCategories(data.expenseCategories || []);
          save('customerGroups', data.customerGroups);
          setCustomerGroups(data.customerGroups || []);
          save('supportTickets', data.supportTickets);
          setSupportTickets(data.supportTickets || []);
          save('feedbacks', data.feedbacks);
          setFeedbacks(data.feedbacks || []);
          save('marketingCampaigns', data.marketingCampaigns);
          setMarketingCampaigns(data.marketingCampaigns || []);
          save('rawMaterials', data.rawMaterials);
          setRawMaterials(data.rawMaterials || []);
          save('boms', data.boms);
          setBoms(data.boms || []);
          save('productionBatches', data.productionBatches);
          setProductionBatches(data.productionBatches || []);

          logAction('System', 'Data Import', 'Full system data restore performed');
          alert('Data restored successfully! The page will refresh.');
          window.location.reload();
      } catch (e) {
          console.error("Import failed", e);
          alert("Invalid data file format.");
      }
  };

  const logAction = (module: string, action: string, details?: string) => {
      const user = localStorage.getItem('nexus_user');
      const staffName = user ? JSON.parse(user).businessName : 'System';
      
      const newLog: AppLog = {
          id: Date.now().toString(),
          staffName,
          module,
          action,
          details,
          timestamp: new Date().toLocaleString()
      };
      setAppLogs(prev => [newLog, ...prev]);
  };

  // Settings Updates
  const updateCourierSettings = (provider: string, data: Partial<CourierConfig>) => {
      setCourierSettings(prev => prev.map(c => c.provider === provider ? { ...c, ...data } : c));
  };

  const updateDomainSettings = (data: Partial<DomainConfig>) => {
      setDomainSettings(prev => ({ ...prev, ...data }));
  };

  // Promo & Policy
  const addPromoCode = (code: PromoCode) => {
      setPromoCodes(prev => [...prev, { usedCount: 0, ...code }]);
  };

  const updatePromoCode = (id: string, data: Partial<PromoCode>) => {
      setPromoCodes(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const deletePromoCode = (id: string) => {
      setPromoCodes(prev => prev.filter(c => c.id !== id));
  };

  // Real coupon validation - checks everything a coupon should actually
  // enforce (active, not expired, minimum purchase met, usage limit not
  // exceeded), not just "does a code with this text exist". Returns the
  // real discount amount to apply (already capped by maxDiscount), or an
  // error explaining why it can't be used.
  const validateCoupon = (code: string, purchaseAmount: number): { valid: boolean; discount: number; promoId?: string; error?: string } => {
      const promo = promoCodes.find(p => p.code.toUpperCase() === code.toUpperCase());
      if (!promo) return { valid: false, discount: 0, error: 'Coupon code not found.' };
      if (promo.status !== 'active') return { valid: false, discount: 0, error: 'This coupon is no longer active.' };
      if (promo.validUntil && new Date(promo.validUntil) < new Date()) {
          return { valid: false, discount: 0, error: 'This coupon has expired.' };
      }
      if (promo.usageLimit && (promo.usedCount || 0) >= promo.usageLimit) {
          return { valid: false, discount: 0, error: 'This coupon has reached its usage limit.' };
      }
      if (promo.minPurchase && purchaseAmount < promo.minPurchase) {
          return { valid: false, discount: 0, error: `Minimum purchase of ${promo.minPurchase} required for this coupon.` };
      }

      let discount = promo.type === 'percentage' ? (purchaseAmount * promo.discount / 100) : promo.discount;
      if (promo.maxDiscount) discount = Math.min(discount, promo.maxDiscount);
      discount = Math.min(discount, purchaseAmount);

      return { valid: true, discount, promoId: promo.id };
  };

  // Called after a sale actually completes with a coupon applied - keeps
  // the usage count real instead of letting the same code be reused past
  // its limit.
  const recordCouponUsage = (promoId: string) => {
      setPromoCodes(prev => prev.map(c => c.id === promoId ? { ...c, usedCount: (c.usedCount || 0) + 1 } : c));
  };

  const updateShopPolicy = (data: Partial<ShopPolicies>) => {
      setShopPolicies(prev => ({ ...prev, ...data }));
  };

  const toggleFeaturedProduct = (productId: string) => {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, isFeatured: !p.isFeatured } : p));
  };

  return (
    <DataContext.Provider value={{ 
      products: visibleProducts, 
      customers, 
      suppliers, 
      transactions: visibleTransactions, 
      financialAccounts: visibleAccounts,
      onlineOrders: visibleOrders,
      staff: visibleStaff,
      appLogs,
      courierSettings,
      domainSettings,
      promoCodes,
      shopPolicies,
      categories,
      brands,
      units,
      warehouses,
      expenseCategories,
      // Customer CRM
      customerGroups,
      supportTickets,
      feedbacks,
      marketingCampaigns,
      saasTickets,
      // Global Supplier Registry
      globalSuppliers,
      // Production
      rawMaterials,
      boms,
      productionBatches,
      addProduct, 
      updateProduct,
      updateProductStock,
      refreshProducts,
      lastProductsSyncAt,
      productsRealtimeActive,
      lowStockProducts,
      processPurchase, // Exposed here
      addEntity, 
      updateEntity,
      registerSupplier,
      updateSupplierProfile,
      addTransaction,
      updateTransaction,
      deleteItem, 
      restoreItem,
      updateLoyaltyPoints,
      redeemLoyaltyPoints,
      loyaltyConfig,
      setLoyaltyConfig,
      referralConfig,
      setReferralConfig,
      giftCards,
      issueGiftCard,
      disableGiftCard,
      redeemGiftCard,
      ensureCustomerReferralCode,
      applyReferralCode,
      processReferralRewardsOnSale,
      updatePromoCode,
      validateCoupon,
      recordCouponUsage,
      addFinancialAccount,
      transferFunds,
      addOnlineOrder,
      updateOnlineOrder,
      addStaff,
      updateStaff,
      deleteStaff,
      markAttendance,
      updatePerformance,
      updateLocation,
      logAction,
      updateCourierSettings,
      updateDomainSettings,
      addPromoCode,
      deletePromoCode,
      updateShopPolicy,
      toggleFeaturedProduct,
      addCategory,
      addBrand,
      deleteBrand,
      addUnit,
      deleteUnit,
      addWarehouse,
      updateWarehouse,
      deleteWarehouse,
      refreshWarehouses,
      addSubCategory,
      deleteCategory,
      deleteSubCategory,
      addExpenseCategory,
      updateExpenseCategory,
      deleteExpenseCategory,
      // Customer CRM
      addCustomerGroup,
      updateCustomerGroup,
      deleteCustomerGroup,
      addSupportTicket,
      updateSupportTicket,
      addFeedback,
      addMarketingCampaign,
      updateMarketingCampaign,
      addSaasTicket,
      refreshSaasTickets,
      updateSaasTicket,
      quotations,
      addQuotation,
      updateQuotation,
      deleteQuotation,
      convertQuotationToSale,
      kitchenOrders,
      addKitchenOrder,
      updateKitchenOrderStatus,
      purchaseOrders,
      stockTransferRequests,
      createStockTransferRequest,
      approveStockTransfer,
      rejectStockTransfer,
      cancelStockTransfer,
      addPurchaseOrder,
      updatePurchaseOrder,
      deletePurchaseOrder,
      receivePurchaseOrder,
      departments,
      addDepartment,
      deleteDepartment,
      workShifts,
      addWorkShift,
      deleteWorkShift,
      payrollRuns,
      addPayrollRun,
      voidPayrollRun,
      getPayrollRunsForPeriod,
      journalEntries,
      addJournalEntry,
      deleteJournalEntry,
      journalTrialBalance,
      leaveRequests,
      addLeaveRequest,
      reviewLeaveRequest,
      cancelLeaveRequest,
      holidays,
      addHoliday,
      deleteHoliday,
      isHolidayDate,
      designations,
      addDesignation,
      deleteDesignation,
      // Production Methods
      addRawMaterial,
      updateRawMaterial,
      restockMaterial,
      addBOM,
      deleteBOM,
      addBatch,
      updateBatchStatus,
      completeProductionBatch,
      recalculateBalances,
      resetData,
      // Scalability
      archiveTransactions,
      getAllData,
      importData
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
