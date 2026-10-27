/**
 * Canonical Firestore schema for Bizora multi-tenant SaaS.
 *
 * Root collections = platform scope.
 * businesses/{businessId}/{sub} = tenant (shop) scope.
 *
 * Field convention:
 * - API / JWT often use camelCase (businessId).
 * - Stored tenant docs also write business_id for list filters / exports.
 */

export type SchemaCollection = {
  name: string;
  scope: 'platform' | 'tenant';
  description: string;
  /** Important document fields (documentation only) */
  fields?: string[];
};

/** Top-level platform collections */
export const PLATFORM_COLLECTIONS: SchemaCollection[] = [
  {
    name: 'businesses',
    scope: 'platform',
    description: 'Shop owner tenants (one doc per business). ID = shop owner user id.',
    fields: [
      'name',
      'businessName',
      'email',
      'mobile',
      'passwordHash',
      'role=SHOP_OWNER',
      'accountStatus',
      'plan',
      'subscriptionStatus',
      'subscriptionRenewsAt',
      'subscriptionEnforce',
      'trialLimits',
      'trialUsage',
      'employeeLimit',
      'branchLimit',
      'features',
      'createdAt',
      'updatedAt',
    ],
  },
  { name: 'saasAdmins', scope: 'platform', description: 'Additional SaaS staff (bcrypt passwordHash)' },
  { name: 'saasOwnerConfig', scope: 'platform', description: 'Owner 2FA config (doc id: owner)' },
  { name: 'saasTickets', scope: 'platform', description: 'Platform support tickets from tenants' },
  { name: 'saasAlerts', scope: 'platform', description: 'Admin alert feed' },
  { name: 'announcements', scope: 'platform', description: 'Global / business-scoped announcements' },
  { name: 'auditLogs', scope: 'platform', description: 'Platform audit trail' },
  { name: 'revenuePayments', scope: 'platform', description: 'SaaS subscription payment records' },
  { name: 'mrrSnapshots', scope: 'platform', description: 'Monthly MRR snapshots (doc id = YYYY-MM)' },
  { name: 'platformConfig', scope: 'platform', description: 'settings + feature flags (doc: settings)' },
  { name: 'refreshTokens', scope: 'platform', description: 'Refresh token jti store for rotation' },
  { name: 'phoneVerifications', scope: 'platform', description: 'OTP challenges' },
  { name: 'globalCustomers', scope: 'platform', description: 'Cross-tenant customer index (optional)' },
  { name: 'globalEmployees', scope: 'platform', description: 'Employee identities + employments[]' },
  { name: 'globalSuppliers', scope: 'platform', description: 'Supplier portal identities' },
  { name: 'paymentIntents', scope: 'platform', description: 'Checkout / billing intents' },
  { name: 'platformPaymentIntents', scope: 'platform', description: 'Platform billing intents' },
  { name: 'paymentExternalIndex', scope: 'platform', description: 'Stripe/etc external id → business map' },
  { name: 'consolidationGroups', scope: 'platform', description: 'Multi-company consolidation groups' },
  { name: 'backups', scope: 'platform', description: 'Backup metadata (encrypted payloads elsewhere)' },
  { name: 'notifications', scope: 'platform', description: 'Platform notification feed and system broadcast alerts' },
];

/** Subcollections under businesses/{businessId}/ */
export const TENANT_SUBCOLLECTIONS: SchemaCollection[] = [
  { name: 'products', scope: 'tenant', description: 'SKU / inventory products' },
  { name: 'transactions', scope: 'tenant', description: 'Sales, buys, expenses, ledger entries' },
  { name: 'entities', scope: 'tenant', description: 'Customers + suppliers (type field)' },
  { name: 'staff', scope: 'tenant', description: 'Shop staff roster (may mirror globalEmployees)' },
  { name: 'warehouses', scope: 'tenant', description: 'Stores / warehouses / bins' },
  { name: 'supportTickets', scope: 'tenant', description: 'In-app shop support tickets' },
  { name: 'feedbacks', scope: 'tenant', description: 'Customer feedback' },
  { name: 'marketingCampaigns', scope: 'tenant', description: 'Shop marketing campaigns' },
  { name: 'financialAccounts', scope: 'tenant', description: 'Cash / bank accounts' },
  { name: 'onlineOrders', scope: 'tenant', description: 'E-commerce / online orders' },
  { name: 'customerGroups', scope: 'tenant', description: 'CRM groups' },
  { name: 'quotations', scope: 'tenant', description: 'Sales quotations' },
  { name: 'kitchenOrders', scope: 'tenant', description: 'Restaurant kitchen tickets' },
  { name: 'kitchenTickets', scope: 'tenant', description: 'Restaurant Kitchen Order Tickets (KOT) & KDS records' },
  { name: 'kitchenSettings', scope: 'tenant', description: 'Kitchen station definitions, prep targets, and KOT printer layout' },
  { name: 'purchaseOrders', scope: 'tenant', description: 'PO to suppliers' },
  { name: 'stockTransfers', scope: 'tenant', description: 'Inter-warehouse transfers' },
  { name: 'giftCards', scope: 'tenant', description: 'Gift card ledger' },
  { name: 'bankStatements', scope: 'tenant', description: 'Bank statement lines for reconcile' },
  { name: 'journalEntries', scope: 'tenant', description: 'Double-entry journals' },
  { name: 'leaveRequests', scope: 'tenant', description: 'HR leave' },
  { name: 'payrollRuns', scope: 'tenant', description: 'Payroll batches' },
  { name: 'rawMaterials', scope: 'tenant', description: 'Manufacturing materials' },
  { name: 'boms', scope: 'tenant', description: 'Bills of materials' },
  { name: 'productionBatches', scope: 'tenant', description: 'Production runs / FEFO batches' },
  { name: 'departments', scope: 'tenant', description: 'HR departments' },
  { name: 'designations', scope: 'tenant', description: 'HR designations' },
  { name: 'workShifts', scope: 'tenant', description: 'Shifts' },
  { name: 'holidays', scope: 'tenant', description: 'Holiday calendar' },
  { name: 'backups', scope: 'tenant', description: 'Online cloud backup snapshots (encrypted payload)' },
  { name: 'settings', scope: 'tenant', description: 'Optional split settings docs (or fields on business)' },
  { name: 'catalogCategories', scope: 'tenant', description: 'Product category catalog master' },
  { name: 'catalogBrands', scope: 'tenant', description: 'Product brand catalog master' },
  { name: 'wastage', scope: 'tenant', description: 'Wastage, damage, scrap, and expired stock records' },
  { name: 'lettersOfCredit', scope: 'tenant', description: 'Letter of credit (L/C) import/export lifecycle records' },
  { name: 'loans', scope: 'tenant', description: 'Loans receivable and payable records with schedules' },
  { name: 'hotelRooms', scope: 'tenant', description: 'Hotel room inventory and occupancy status' },
  { name: 'hotelReservations', scope: 'tenant', description: 'Hotel room reservations and guest folios' },
  { name: 'providentFund', scope: 'tenant', description: 'Provident Fund (PF) accounts and contribution ledger' },
  { name: 'eprocurement', scope: 'tenant', description: 'E-Procurement tenders, RFQs, and vendor bids' },
  { name: 'vehicles', scope: 'tenant', description: 'Fleet vehicle registry' },
  { name: 'vehicleLogs', scope: 'tenant', description: 'Vehicle fuel, toll, and maintenance logs' },
  { name: 'visitors', scope: 'tenant', description: 'Visitor pre-registration, badge check-ins and check-outs' },
  { name: 'projects', scope: 'tenant', description: 'Projects, milestones, and budget tracking' },
  { name: 'projectTasks', scope: 'tenant', description: 'Project task management and completion tracking' },
  { name: 'dealerTargets', scope: 'tenant', description: 'Dealer sales targets and performance metrics' },
  { name: 'documentAiJobs', scope: 'tenant', description: 'Document AI scan jobs, extracted receipt and invoice data' },
  { name: 'notifications', scope: 'tenant', description: 'Tenant notification alerts, transaction notifications, and operational activity' },
];

/** Default limits written on new shop registration */
export const DEFAULT_BUSINESS_LIMITS = {
  employeeLimit: 3,
  branchLimit: 1,
  productLimit: 500,
  locationCount: 1,
};

/** Normalize / complete a business document payload for create or admin map */
export function withBusinessDefaults<T extends Record<string, any>>(data: T): T & Record<string, unknown> {
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 14);
  return {
    role: 'SHOP_OWNER',
    isPremium: false,
    accountStatus: 'Active',
    plan: 'Trial',
    subscriptionStatus: 'Trial',
    subscriptionRenewsAt: trialEnds.toISOString(),
    subscriptionEnforce: true,
    unlockedTemplates: [1],
    twoFactorEnabled: false,
    pinEnabled: true,
    passwordEnabled: true,
    features: ['Single Store', 'Basic Reports'],
    trialLimits: {
      products: 5,
      customers: 3,
      buys: 5,
      sells: 10,
      expenses: 5,
      quickSales: 20,
    },
    trialUsage: {
      products: 0,
      customers: 0,
      buys: 0,
      sells: 0,
      expenses: 0,
      quickSales: 0,
    },
    ...DEFAULT_BUSINESS_LIMITS,
    ...data,
    updatedAt: new Date().toISOString(),
    createdAt: data.createdAt || new Date().toISOString(),
  };
}

export function getSchemaSummary() {
  return {
    engine: 'Firestore',
    multiTenant: 'businesses/{businessId}/*',
    platform: PLATFORM_COLLECTIONS.map((c) => c.name),
    tenantSubcollections: TENANT_SUBCOLLECTIONS.map((c) => c.name),
    collections: [...PLATFORM_COLLECTIONS, ...TENANT_SUBCOLLECTIONS],
    conventions: {
      tenantPath: 'businesses/{businessId}/{collection}/{docId}',
      businessIdSource: 'JWT id for SHOP_OWNER; JWT.businessId for EMPLOYEE',
      legacyUsersCollection: 'Deprecated — use businesses only',
    },
  };
}
