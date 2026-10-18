import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const DATA_DIR = path.resolve(process.cwd(), "data");
const SNAPSHOT_FILE = path.join(DATA_DIR, "local_db_snapshot.json");

// In-memory store
type StoreData = Record<string, Record<string, any>>;

// Initial seed data so platform is immediately fully populated
const DEFAULT_SEED_DATA: StoreData = {
  businesses: {
    biz_001: {
      id: "biz_001",
      name: "Apex Fashion Mart",
      businessName: "Apex Fashion Mart",
      ownerName: "Rafiqul Islam",
      email: "apex@bizora.com",
      mobile: "+8801711122233",
      role: "SHOP_OWNER",
      plan: "Enterprise",
      isPremium: true,
      accountStatus: "Active",
      subscriptionStatus: "Active",
      subscriptionRenewsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      monthlyFee: 12000,
      currency: "BDT",
      branchLimit: 10,
      employeeLimit: 50,
      storageLimit: 10240,
      features: ["inventory", "pos", "hrm", "reports", "accounting", "manufacturing", "ecommerce", "multi_branch"],
      enabledFeatures: ["inventory", "pos", "hrm", "reports", "accounting", "manufacturing", "ecommerce", "multi_branch"],
      createdAt: "2026-01-10T08:00:00.000Z",
      updatedAt: new Date().toISOString(),
      loginCount: 142,
      lastLogin: new Date().toISOString(),
    },
    biz_002: {
      id: "biz_002",
      name: "Dhaka Supermart",
      businessName: "Dhaka Supermart",
      ownerName: "Tanvir Ahmed",
      email: "dhaka.supermart@bizora.com",
      mobile: "+8801822233344",
      role: "SHOP_OWNER",
      plan: "Pro",
      isPremium: true,
      accountStatus: "Active",
      subscriptionStatus: "Active",
      subscriptionRenewsAt: new Date(Date.now() + 22 * 86400000).toISOString(),
      monthlyFee: 6000,
      currency: "BDT",
      branchLimit: 3,
      employeeLimit: 15,
      storageLimit: 5120,
      features: ["inventory", "pos", "hrm", "reports", "accounting"],
      enabledFeatures: ["inventory", "pos", "hrm", "reports", "accounting"],
      createdAt: "2026-02-15T09:30:00.000Z",
      updatedAt: new Date().toISOString(),
      loginCount: 88,
      lastLogin: new Date(Date.now() - 3600000).toISOString(),
    },
    biz_003: {
      id: "biz_003",
      name: "Sylhet Electronics",
      businessName: "Sylhet Electronics",
      ownerName: "Mahmudul Hasan",
      email: "sylhet.elec@bizora.com",
      mobile: "+8801933344455",
      role: "SHOP_OWNER",
      plan: "Basic",
      isPremium: false,
      accountStatus: "Active",
      subscriptionStatus: "Active",
      subscriptionRenewsAt: new Date(Date.now() + 15 * 86400000).toISOString(),
      monthlyFee: 2500,
      currency: "BDT",
      branchLimit: 1,
      employeeLimit: 5,
      storageLimit: 2048,
      features: ["inventory", "pos", "reports"],
      enabledFeatures: ["inventory", "pos", "reports"],
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: new Date().toISOString(),
      loginCount: 45,
      lastLogin: new Date(Date.now() - 7200000).toISOString(),
    },
    biz_004: {
      id: "biz_004",
      name: "Chittagong Fabrics",
      businessName: "Chittagong Fabrics",
      ownerName: "Kamrul Zaman",
      email: "ctg.fabrics@bizora.com",
      mobile: "+8801644455566",
      role: "SHOP_OWNER",
      plan: "Pro",
      isPremium: true,
      accountStatus: "Active",
      subscriptionStatus: "PastDue",
      subscriptionRenewsAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      monthlyFee: 6000,
      currency: "BDT",
      branchLimit: 3,
      employeeLimit: 15,
      storageLimit: 5120,
      features: ["inventory", "pos", "hrm", "reports"],
      enabledFeatures: ["inventory", "pos", "hrm", "reports"],
      createdAt: "2026-03-20T14:15:00.000Z",
      updatedAt: new Date().toISOString(),
      loginCount: 31,
      lastLogin: new Date(Date.now() - 86400000).toISOString(),
    },
    biz_005: {
      id: "biz_005",
      name: "Rajshahi Agro Products",
      businessName: "Rajshahi Agro Products",
      ownerName: "Farid Uddin",
      email: "rajshahi.agro@bizora.com",
      mobile: "+8801555667788",
      role: "SHOP_OWNER",
      plan: "Enterprise",
      isPremium: true,
      accountStatus: "Active",
      subscriptionStatus: "Active",
      subscriptionRenewsAt: new Date(Date.now() + 45 * 86400000).toISOString(),
      monthlyFee: 12000,
      currency: "BDT",
      branchLimit: 8,
      employeeLimit: 40,
      storageLimit: 10240,
      features: ["inventory", "pos", "hrm", "reports", "accounting", "manufacturing"],
      enabledFeatures: ["inventory", "pos", "hrm", "reports", "accounting", "manufacturing"],
      createdAt: "2026-04-05T11:00:00.000Z",
      updatedAt: new Date().toISOString(),
      loginCount: 72,
      lastLogin: new Date().toISOString(),
    },
  },
  saasTickets: {
    "tkt-1001": {
      id: "tkt-1001",
      ticket_number: "#TKT-2026-001001",
      business_id: "biz_001",
      business_name: "Apex Fashion Mart",
      created_by: "Rafiqul Islam",
      subject: "Need help configuring multi-branch stock transfer",
      category: "Technical Issue",
      priority: "High",
      status: "In Progress",
      description: "We recently opened our second branch in Uttara and need help configuring automated inter-branch stock transfers and real-time inventory reconciliation.",
      created_at: new Date(Date.now() - 36 * 3600000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 3600000).toISOString(),
      messages: [
        {
          id: "msg-101",
          ticket_id: "tkt-1001",
          sender_id: "biz_001",
          sender_name: "Rafiqul Islam",
          message: "We recently opened our second branch in Uttara and need help configuring automated inter-branch stock transfers and real-time inventory reconciliation.",
          created_at: new Date(Date.now() - 36 * 3600000).toISOString(),
          is_admin: false,
        },
        {
          id: "msg-102",
          ticket_id: "tkt-1001",
          sender_id: "saas-owner",
          sender_name: "Bizora Support Team",
          message: "Hello Rafiqul! We have enabled multi-branch routing for your Enterprise account. You can now use the 'Product Transfer' screen under Inventory to create inter-branch requisitions.",
          created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
          is_admin: true,
        },
        {
          id: "msg-103",
          ticket_id: "tkt-1001",
          sender_id: "biz_001",
          sender_name: "Rafiqul Islam",
          message: "Thank you! Tested from the Uttara branch and stock is updating seamlessly now. One quick question: how do we set default warehouses per branch?",
          created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
          is_admin: false,
        },
      ],
      replies: [
        {
          id: "r102",
          by: "Bizora Support Team",
          text: "Hello Rafiqul! We have enabled multi-branch routing for your Enterprise account. You can now use the 'Product Transfer' screen under Inventory to create inter-branch requisitions.",
          at: new Date(Date.now() - 24 * 3600000).toISOString(),
        },
      ],
      notes: [],
    },
    "tkt-1002": {
      id: "tkt-1002",
      ticket_number: "#TKT-2026-001002",
      business_id: "biz_002",
      business_name: "Dhaka Supermart",
      created_by: "Tanvir Ahmed",
      subject: "Request to upgrade to Enterprise Plan",
      category: "Subscription",
      priority: "Medium",
      status: "Open",
      description: "We are expanding from 3 to 6 branches and would like to upgrade from Pro to Enterprise plan. Please let us know the invoice details and payment method options.",
      created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
      updated_at: new Date(Date.now() - 12 * 3600000).toISOString(),
      messages: [
        {
          id: "msg-201",
          ticket_id: "tkt-1002",
          sender_id: "biz_002",
          sender_name: "Tanvir Ahmed",
          message: "We are expanding from 3 to 6 branches and would like to upgrade from Pro to Enterprise plan. Please let us know the invoice details and payment method options.",
          created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
          is_admin: false,
        },
      ],
      replies: [],
      notes: [],
    },
    "tkt-1003": {
      id: "tkt-1003",
      ticket_number: "#TKT-2026-001003",
      business_id: "biz_003",
      business_name: "Sylhet Electronics",
      created_by: "Mahmudul Hasan",
      subject: "Thermal barcode printer ESC/POS alignment",
      category: "Technical Issue",
      priority: "Low",
      status: "Resolved",
      description: "Barcode labels were cutting off slightly on our 58mm thermal printer. Resolved by adjusting the label width in Printer Settings.",
      created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
      updated_at: new Date(Date.now() - 20 * 3600000).toISOString(),
      messages: [
        {
          id: "msg-301",
          ticket_id: "tkt-1003",
          sender_id: "biz_003",
          sender_name: "Mahmudul Hasan",
          message: "Barcode labels were cutting off slightly on our 58mm thermal printer.",
          created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
          is_admin: false,
        },
        {
          id: "msg-302",
          ticket_id: "tkt-1003",
          sender_id: "saas-owner",
          sender_name: "Bizora Support Team",
          message: "Please open Settings > Printer Config and set the page width to 58mm with 2mm margin.",
          created_at: new Date(Date.now() - 30 * 3600000).toISOString(),
          is_admin: true,
        },
        {
          id: "msg-303",
          ticket_id: "tkt-1003",
          sender_id: "biz_003",
          sender_name: "Mahmudul Hasan",
          message: "Worked perfectly! Thanks a lot.",
          created_at: new Date(Date.now() - 20 * 3600000).toISOString(),
          is_admin: false,
        },
      ],
      replies: [
        {
          id: "r302",
          by: "Bizora Support Team",
          text: "Please open Settings > Printer Config and set the page width to 58mm with 2mm margin.",
          at: new Date(Date.now() - 30 * 3600000).toISOString(),
        },
      ],
      notes: [],
    },
  },
  announcements: {
    "ann-01": {
      id: "ann-01",
      title: "Platform Upgrade: Real-Time Multi-Branch Live Sync",
      content: "All shops can now monitor transactions, inventories, and support conversations in real-time across branches with zero delay.",
      category: "Feature Update",
      targetAudience: "All",
      status: "Active",
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    "ann-02": {
      id: "ann-02",
      title: "Scheduled Cloud Backup Window",
      content: "Regular weekly maintenance and database snapshots scheduled for Sunday at 03:00 AM BST. No downtime is expected.",
      category: "Maintenance",
      targetAudience: "All",
      status: "Active",
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
  },
  saasAlerts: {
    "alt-01": {
      id: "alt-01",
      title: "Chittagong Fabrics Subscription Past Due",
      description: "Grace period expires in 5 days. Automated notification sent.",
      severity: "warning",
      status: "Open",
      createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    },
    "alt-02": {
      id: "alt-02",
      title: "System Performance Optimal",
      description: "Database latency at 12ms, 99.99% uptime maintained.",
      severity: "info",
      status: "Resolved",
      createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    },
  },
  auditLogs: {
    "aud-01": {
      id: "aud-01",
      timestamp: new Date(Date.now() - 300000).toISOString(),
      actorId: "saas-owner",
      actorRole: "SAAS_OWNER",
      actorName: "Md Ishtiak Ahammad",
      action: "Admin Dashboard Live Sync Initialized",
      targetType: "platform",
      targetId: "global",
      details: "Real-time socket channels and resilient persistence connected.",
    },
    "aud-02": {
      id: "aud-02",
      timestamp: new Date(Date.now() - 1200000).toISOString(),
      actorId: "biz_001",
      actorRole: "SHOP_OWNER",
      actorName: "Rafiqul Islam",
      action: "Updated Stock Transfer Settings",
      targetType: "inventory",
      targetId: "biz_001",
      details: "Branch transfer policy enabled for Uttara Branch.",
    },
    "aud-03": {
      id: "aud-03",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      actorId: "saas-owner",
      actorRole: "SAAS_OWNER",
      actorName: "Md Ishtiak Ahammad",
      action: "Approved Plan Upgrade Request",
      targetType: "business",
      targetId: "biz_001",
      details: "Apex Fashion Mart upgraded to Enterprise.",
    },
  },
  saasOwnerConfig: {
    owner: {
      id: "owner",
      twoFactorEnabled: false,
      twoFactorSecret: null,
      updatedAt: new Date().toISOString(),
    },
  },
  platformConfig: {
    settings: {
      alertEmails: "bizora.app.io@gmail.com",
      vatRate: 5,
      currency: "BDT",
    },
  },
  revenuePayments: {
    "rev-01": {
      id: "rev-01",
      businessId: "biz_001",
      businessName: "Apex Fashion Mart",
      amount: 12000,
      currency: "BDT",
      plan: "Enterprise",
      billingCycle: "monthly",
      type: "subscription",
      status: "Paid",
      method: "bKash Merchant",
      paymentMethod: "bKash Merchant",
      paymentReference: "TXN-BK992811",
      invoiceNumber: "INV-2026-0081",
      note: "Monthly Enterprise Subscription",
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      verifiedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
    "rev-02": {
      id: "rev-02",
      businessId: "biz_002",
      businessName: "Dhaka Supermart",
      amount: 6000,
      currency: "BDT",
      plan: "Pro",
      billingCycle: "monthly",
      type: "subscription",
      status: "Paid",
      method: "Nagad",
      paymentMethod: "Nagad",
      paymentReference: "TXN-NG381920",
      invoiceNumber: "INV-2026-0082",
      note: "Monthly Pro Subscription",
      createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
      verifiedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    },
    "rev-03": {
      id: "rev-03",
      businessId: "biz_005",
      businessName: "Rajshahi Agro Products",
      amount: 12000,
      currency: "BDT",
      plan: "Enterprise",
      billingCycle: "monthly",
      type: "subscription",
      status: "Paid",
      method: "Bank Transfer",
      paymentMethod: "Bank Transfer",
      paymentReference: "TXN-BT100293",
      invoiceNumber: "INV-2026-0083",
      note: "Monthly Enterprise Subscription",
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      verifiedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
  },
  mrrSnapshots: {
    "mrr-2026-08": {
      id: "mrr-2026-08",
      month: "2026-08",
      totalMrr: 26500,
      activeBusinesses: 4,
      paidBusinesses: 3,
      createdAt: "2026-08-31T23:59:59.000Z",
      tenants: [
        { id: "biz_001", plan: "Enterprise", mrr: 12000, paying: true },
        { id: "biz_002", plan: "Pro", mrr: 6000, paying: true },
        { id: "biz_003", plan: "Basic", mrr: 2500, paying: true },
        { id: "biz_004", plan: "Pro", mrr: 6000, paying: false },
      ],
    },
    "mrr-2026-09": {
      id: "mrr-2026-09",
      month: "2026-09",
      totalMrr: 32500,
      activeBusinesses: 5,
      paidBusinesses: 4,
      createdAt: "2026-09-30T23:59:59.000Z",
      tenants: [
        { id: "biz_001", plan: "Enterprise", mrr: 12000, paying: true },
        { id: "biz_002", plan: "Pro", mrr: 6000, paying: true },
        { id: "biz_003", plan: "Basic", mrr: 2500, paying: true },
        { id: "biz_004", plan: "Pro", mrr: 6000, paying: false },
        { id: "biz_005", plan: "Enterprise", mrr: 12000, paying: true },
      ],
    },
    "mrr-2026-10": {
      id: "mrr-2026-10",
      month: "2026-10",
      totalMrr: 38500,
      activeBusinesses: 5,
      paidBusinesses: 4,
      createdAt: new Date().toISOString(),
      tenants: [
        { id: "biz_001", plan: "Enterprise", mrr: 12000, paying: true },
        { id: "biz_002", plan: "Pro", mrr: 6000, paying: true },
        { id: "biz_003", plan: "Basic", mrr: 2500, paying: true },
        { id: "biz_004", plan: "Pro", mrr: 6000, paying: false },
        { id: "biz_005", plan: "Enterprise", mrr: 12000, paying: true },
      ],
    },
  },
  subscriptionMigrations: {
    "mig-01": {
      id: "mig-01",
      businessId: "biz_001",
      businessName: "Apex Fashion Mart",
      previousPlan: "Pro",
      newPlan: "Enterprise",
      previousFee: 6000,
      newFee: 12000,
      previousRenewsAt: new Date(Date.now() + 10 * 86400000).toISOString(),
      newRenewsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      billingAdjustment: 6000,
      reason: "Multi-branch retail expansion across 10 locations",
      migratedBy: "Md Ishtiak Ahammad",
      migratedById: "saas-owner",
      effectiveImmediately: true,
      effectiveDate: new Date(Date.now() - 10 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    },
    "mig-02": {
      id: "mig-02",
      businessId: "biz_002",
      businessName: "Dhaka Supermart",
      previousPlan: "Basic",
      newPlan: "Pro",
      previousFee: 2500,
      newFee: 6000,
      previousRenewsAt: new Date(Date.now() + 5 * 86400000).toISOString(),
      newRenewsAt: new Date(Date.now() + 22 * 86400000).toISOString(),
      billingAdjustment: 3500,
      reason: "Upgraded for e-commerce shop and automated SMS receipts",
      migratedBy: "Md Ishtiak Ahammad",
      migratedById: "saas-owner",
      effectiveImmediately: true,
      effectiveDate: new Date(Date.now() - 8 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    },
  },
  planRequests: {
    "req-01": {
      id: "req-01",
      userId: "biz_003",
      businessId: "biz_003",
      userName: "Mahmudul Hasan",
      businessName: "Sylhet Electronics",
      type: "subscription",
      planId: "pro",
      plan: "Pro",
      amount: 2499,
      price: 2499,
      currency: "BDT",
      billingCycle: "monthly",
      paymentMethod: "bKash Merchant",
      paymentReference: "BK-882910",
      paymentStatus: "PendingVerification",
      status: "pending",
      note: "Upgrading to Pro for multi-branch operations and advanced reports",
      details: {
        plan: "Pro",
        planId: "pro",
        billingCycle: "monthly",
        amount: 2499,
        currency: "BDT",
        paymentMethod: "bKash Merchant",
        paymentReference: "BK-882910",
      },
      createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    },
    "req-02": {
      id: "req-02",
      userId: "biz_004",
      businessId: "biz_004",
      userName: "Kamrul Zaman",
      businessName: "Chittagong Fabrics",
      type: "subscription",
      planId: "enterprise",
      plan: "Enterprise",
      amount: 49990,
      price: 49990,
      currency: "BDT",
      billingCycle: "yearly",
      paymentMethod: "Bank Transfer",
      paymentReference: "BT-992182",
      paymentStatus: "PendingVerification",
      status: "pending",
      note: "Annual Enterprise subscription with API access & 20 branches",
      details: {
        plan: "Enterprise",
        planId: "enterprise",
        billingCycle: "yearly",
        amount: 49990,
        currency: "BDT",
        paymentMethod: "Bank Transfer",
        paymentReference: "BT-992182",
      },
      createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    },
  },
  invoiceTemplates: {
    "tpl-01": {
      id: "tpl-01",
      numericId: 1,
      name: "Classic Simple",
      description: "Standard clean black & white layout with high readability. Best for daily grocery and general retail sales.",
      layout: "classic",
      price: 0,
      status: "active",
      availability: "all",
      requiredPlan: "all",
      config: {
        primaryColor: "#0f172a",
        accentColor: "#64748b",
        fontFamily: "sans",
        paperSize: "A4",
        showLogo: true,
        showWatermark: false,
        showQrCode: true,
        showTerms: true,
        termsText: "Thank you for your business. Returns accepted within 7 days with original invoice.",
        footerNote: "Powered by Bizora ERP",
      },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    "tpl-02": {
      id: "tpl-02",
      numericId: 2,
      name: "Modern Indigo",
      description: "Contemporary design with bold indigo header banner and structured summary cards. Perfect for fashion & lifestyle stores.",
      layout: "modern",
      price: 999,
      status: "active",
      availability: "subscription",
      requiredPlan: "pro",
      config: {
        primaryColor: "#4f46e5",
        accentColor: "#818cf8",
        fontFamily: "sans",
        paperSize: "A4",
        showLogo: true,
        showWatermark: true,
        showQrCode: true,
        showTerms: true,
        termsText: "Payment is due upon receipt. For warranty claims, preserve serial number records.",
        footerNote: "Thank you for shopping with us!",
      },
      createdAt: "2026-01-05T00:00:00.000Z",
      updatedAt: "2026-01-05T00:00:00.000Z",
    },
    "tpl-03": {
      id: "tpl-03",
      numericId: 3,
      name: "Dark Professional",
      description: "High-contrast executive slate header with bold product grid and highlighted tax subtotals. Ideal for electronics & B2B distributors.",
      layout: "dark",
      price: 1499,
      status: "active",
      availability: "subscription",
      requiredPlan: "pro",
      config: {
        primaryColor: "#0f172a",
        accentColor: "#334155",
        fontFamily: "sans",
        paperSize: "A4",
        showLogo: true,
        showWatermark: false,
        showQrCode: true,
        showTerms: true,
        termsText: "Goods sold under manufacturer warranty. Computer generated tax invoice.",
        footerNote: "Visit our website for support and documentation.",
      },
      createdAt: "2026-01-10T00:00:00.000Z",
      updatedAt: "2026-01-10T00:00:00.000Z",
    },
    "tpl-04": {
      id: "tpl-04",
      numericId: 4,
      name: "Creative Amber",
      description: "Warm amber accents with prominent installment ledger and customer due tracking tables. Best for furniture, appliances, and installments.",
      layout: "creative",
      price: 1299,
      status: "active",
      availability: "paid",
      requiredPlan: "enterprise",
      config: {
        primaryColor: "#d97706",
        accentColor: "#f59e0b",
        fontFamily: "sans",
        paperSize: "A4",
        showLogo: true,
        showWatermark: false,
        showQrCode: true,
        showTerms: true,
        termsText: "Installment payments must be settled by the agreed scheduled due dates.",
        footerNote: "Customer satisfaction is our highest priority.",
      },
      createdAt: "2026-01-15T00:00:00.000Z",
      updatedAt: "2026-01-15T00:00:00.000Z",
    },
    "tpl-05": {
      id: "tpl-05",
      numericId: 5,
      name: "Formal Serif",
      description: "Classic double-bordered formal typography with serif styling. Designed for jewelry, luxury goods, and corporate contracts.",
      layout: "formal",
      price: 1999,
      status: "active",
      availability: "paid",
      requiredPlan: "enterprise",
      config: {
        primaryColor: "#1e293b",
        accentColor: "#475569",
        fontFamily: "serif",
        paperSize: "A4",
        showLogo: true,
        showWatermark: true,
        showQrCode: true,
        showTerms: true,
        termsText: "Authenticity certified. Certified appraisal upon customer request.",
        footerNote: "Authorized Signature & Stamp",
      },
      createdAt: "2026-01-20T00:00:00.000Z",
      updatedAt: "2026-01-20T00:00:00.000Z",
    },
    "tpl-06": {
      id: "tpl-06",
      numericId: 6,
      name: "Minimalist Thermal POS",
      description: "Compact roll-style 80mm / 58mm thermal receipt layout with zero wasteful margins. Fast printing on POS receipt hardware.",
      layout: "minimal",
      price: 0,
      status: "active",
      availability: "all",
      requiredPlan: "all",
      config: {
        primaryColor: "#000000",
        accentColor: "#333333",
        fontFamily: "mono",
        paperSize: "80mm",
        showLogo: false,
        showWatermark: false,
        showQrCode: true,
        showTerms: false,
        termsText: "",
        footerNote: "*** PLEASE KEEP THIS RECEIPT ***",
      },
      createdAt: "2026-01-25T00:00:00.000Z",
      updatedAt: "2026-01-25T00:00:00.000Z",
    },
  },
  templatePurchases: {
    "tp-01": {
      id: "tp-01",
      businessId: "biz_001",
      businessName: "Apex Fashion Mart",
      templateId: "tpl-02",
      templateNumericId: 2,
      templateName: "Modern Indigo",
      amount: 999,
      currency: "BDT",
      paymentMethod: "bKash Merchant",
      paymentReference: "BK-99120",
      status: "completed",
      purchasedBy: "Rafiqul Islam",
      purchasedById: "biz_001",
      purchasedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
    "tp-02": {
      id: "tp-02",
      businessId: "biz_002",
      businessName: "Dhaka Supermart",
      templateId: "tpl-03",
      templateNumericId: 3,
      templateName: "Dark Professional",
      amount: 1499,
      currency: "BDT",
      paymentMethod: "Nagad",
      paymentReference: "NG-88310",
      status: "completed",
      purchasedBy: "Tanvir Ahmed",
      purchasedById: "biz_002",
      purchasedAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    },
  },
  refreshTokens: {},
};

class ResilientStore {
  private data: StoreData = {};
  private quotaExhausted = false;
  private quotaCooldownUntil = 0;
  private saveTimeout: NodeJS.Timeout | null = null;
  private cache: Map<string, { expires: number; data: any }> = new Map();

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(SNAPSHOT_FILE)) {
        const raw = fs.readFileSync(SNAPSHOT_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        this.data = { ...DEFAULT_SEED_DATA, ...parsed };
        // Deep merge collections
        for (const [col, docs] of Object.entries(DEFAULT_SEED_DATA)) {
          if (!this.data[col]) {
            this.data[col] = { ...docs };
          } else {
            this.data[col] = { ...docs, ...this.data[col] };
          }
        }
      } else {
        this.data = JSON.parse(JSON.stringify(DEFAULT_SEED_DATA));
        this.saveToDiskSync();
      }

      // Ensure businesses have a valid passwordHash for development login (password123)
      if (this.data.businesses) {
        for (const biz of Object.values(this.data.businesses)) {
          if (!biz.passwordHash) {
            biz.passwordHash = "$2a$10$PEbyAmMxVgswiIZ5Vqt9e.9ISzerhHrCyn38Jyal6Tl5DL19dSEpe";
          }
        }
      }
    } catch (e) {
      console.warn("[resilientDb] Error loading snapshot, using default seed:", e);
      this.data = JSON.parse(JSON.stringify(DEFAULT_SEED_DATA));
    }
  }

  public saveToDiskSync() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (e) {
      console.warn("[resilientDb] Failed to save snapshot to disk:", e);
    }
  }

  public scheduleSave() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this.saveToDiskSync();
    }, 1000);
  }

  public isQuotaLimited(): boolean {
    if (this.quotaExhausted) {
      if (Date.now() < this.quotaCooldownUntil) return true;
      // Cooldown expired, re-try
      this.quotaExhausted = false;
    }
    return false;
  }

  public markQuotaExhausted(minutes = 15) {
    this.quotaExhausted = true;
    this.quotaCooldownUntil = Date.now() + minutes * 60 * 1000;
    console.warn(`[resilientDb] Google Cloud Firestore quota exhausted. Operating seamlessly in local resilient mode for ${minutes}m.`);
  }

  public getCollection(name: string): Record<string, any> {
    if (!this.data[name]) {
      this.data[name] = {};
    }
    return this.data[name];
  }

  public getDoc(col: string, id: string): any {
    const c = this.getCollection(col);
    return c[id] ? JSON.parse(JSON.stringify(c[id])) : null;
  }

  public setDoc(col: string, id: string, data: any, options?: { merge?: boolean }) {
    const c = this.getCollection(col);
    const existing = c[id] || {};
    c[id] = options?.merge ? { ...existing, ...data } : { ...data, id };
    if (!c[id].id) c[id].id = id;
    this.invalidateCache(col);
    this.scheduleSave();
  }

  public deleteDoc(col: string, id: string) {
    const c = this.getCollection(col);
    delete c[id];
    this.invalidateCache(col);
    this.scheduleSave();
  }

  public getCached(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  public setCache(key: string, data: any, ttlSec = 30) {
    this.cache.set(key, { expires: Date.now() + ttlSec * 1000, data });
  }

  public invalidateCache(col: string) {
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(col)) this.cache.delete(key);
    }
  }
}

export const store = new ResilientStore();

function isFirestoreQuotaError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || err.details || err.code || err);
  return (
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("Quota exceeded") ||
    msg.includes("quota") ||
    err.code === 8
  );
}

// Helpers for Firestore snapshot simulation
function makeDocSnapshot(id: string, data: any | null, colName?: string, realDoc?: any) {
  return {
    id,
    exists: data !== null && data !== undefined,
    data: () => (data ? JSON.parse(JSON.stringify(data)) : undefined),
    get: (field: string) => (data ? data[field] : undefined),
    get ref() {
      return new ResilientDocRef(colName || '', id, realDoc);
    },
  };
}

function makeQuerySnapshot(docs: any[], colName?: string) {
  const docSnaps = docs.map((d) => makeDocSnapshot(d.id, d, colName));
  return {
    empty: docSnaps.length === 0,
    size: docSnaps.length,
    docs: docSnaps,
    forEach: (fn: (d: any) => void) => docSnaps.forEach(fn),
  };
}

class ResilientQuery {
  protected colName: string;
  protected filters: Array<{ field: string; op: string; val: any }> = [];
  protected sortField: string | null = null;
  protected sortDirection: "asc" | "desc" = "asc";
  protected limitCount: number | null = null;
  protected realTarget: any = null;

  constructor(colName: string, realTarget?: any) {
    this.colName = colName;
    this.realTarget = realTarget;
  }

  public where(field: string, op: string, val: any): ResilientQuery {
    const q = new ResilientQuery(this.colName, this.realTarget ? this.realTarget.where(field, op, val) : null);
    q.filters = [...this.filters, { field, op, val }];
    q.sortField = this.sortField;
    q.sortDirection = this.sortDirection;
    q.limitCount = this.limitCount;
    return q;
  }

  public orderBy(field: string, direction: "asc" | "desc" = "asc"): ResilientQuery {
    const q = new ResilientQuery(this.colName, this.realTarget ? this.realTarget.orderBy(field, direction) : null);
    q.filters = [...this.filters];
    q.sortField = field;
    q.sortDirection = direction;
    q.limitCount = this.limitCount;
    return q;
  }

  public limit(count: number): ResilientQuery {
    const q = new ResilientQuery(this.colName, this.realTarget ? this.realTarget.limit(count) : null);
    q.filters = [...this.filters];
    q.sortField = this.sortField;
    q.sortDirection = this.sortDirection;
    q.limitCount = count;
    return q;
  }

  public async get(): Promise<any> {
    const cacheKey = `${this.colName}_query_${JSON.stringify(this.filters)}_${this.sortField}_${this.limitCount}`;

    // 1. Try real Firestore if available and not quota-exhausted
    if (this.realTarget && !store.isQuotaLimited()) {
      try {
        const snap = await this.realTarget.get();
        // Update local store with live docs
        if (snap?.docs) {
          for (const d of snap.docs) {
            store.setDoc(this.colName, d.id, d.data());
          }
        }
        return snap;
      } catch (err: any) {
        if (isFirestoreQuotaError(err)) {
          store.markQuotaExhausted();
        } else {
          console.warn(`[resilientDb] Firestore query failed for ${this.colName}, falling back to local:`, err.message);
        }
      }
    }

    // 2. Check local memory cache
    const cached = store.getCached(cacheKey);
    if (cached) return cached;

    // 3. Filter and sort locally
    const colDocs = Object.values(store.getCollection(this.colName));
    let matched = colDocs.filter((doc: any) => {
      for (const f of this.filters) {
        const val = doc[f.field];
        if (f.op === "==" && val !== f.val) return false;
        if (f.op === "!=" && val === f.val) return false;
        if (f.op === ">" && !(val > f.val)) return false;
        if (f.op === ">=" && !(val >= f.val)) return false;
        if (f.op === "<" && !(val < f.val)) return false;
        if (f.op === "<=" && !(val <= f.val)) return false;
        if (f.op === "in" && (!Array.isArray(f.val) || !f.val.includes(val))) return false;
        if (f.op === "array-contains" && (!Array.isArray(val) || !val.includes(f.val))) return false;
      }
      return true;
    });

    if (this.sortField) {
      const sf = this.sortField;
      const mul = this.sortDirection === "desc" ? -1 : 1;
      matched.sort((a: any, b: any) => {
        const va = a[sf] ?? "";
        const vb = b[sf] ?? "";
        return va < vb ? -1 * mul : va > vb ? 1 * mul : 0;
      });
    }

    if (this.limitCount !== null && this.limitCount >= 0) {
      matched = matched.slice(0, this.limitCount);
    }

    const snap = makeQuerySnapshot(matched, this.colName);
    store.setCache(cacheKey, snap, 15);
    return snap;
  }
}

class ResilientDocRef {
  public id: string;
  private colName: string;
  private realDoc: any = null;

  constructor(colName: string, id: string, realDoc?: any) {
    this.colName = colName;
    this.id = id;
    this.realDoc = realDoc;
  }

  public async get(): Promise<any> {
    if (this.realDoc && !store.isQuotaLimited()) {
      try {
        const snap = await this.realDoc.get();
        if (snap.exists) {
          store.setDoc(this.colName, this.id, snap.data());
        }
        return snap;
      } catch (err: any) {
        if (isFirestoreQuotaError(err)) {
          store.markQuotaExhausted();
        } else {
          console.warn(`[resilientDb] Firestore doc get failed for ${this.colName}/${this.id}:`, err.message);
        }
      }
    }

    const localData = store.getDoc(this.colName, this.id);
    return makeDocSnapshot(this.id, localData, this.colName, this.realDoc);
  }

  public async set(data: any, options?: { merge?: boolean }): Promise<any> {
    store.setDoc(this.colName, this.id, data, options);

    if (this.realDoc && !store.isQuotaLimited()) {
      try {
        await this.realDoc.set(data, options);
      } catch (err: any) {
        if (isFirestoreQuotaError(err)) {
          store.markQuotaExhausted();
        } else {
          console.warn(`[resilientDb] Real Firestore doc.set failed for ${this.colName}/${this.id}:`, err.message);
        }
      }
    }
    return { writeTime: new Date() };
  }

  public async update(data: any): Promise<any> {
    return this.set(data, { merge: true });
  }

  public async delete(): Promise<any> {
    store.deleteDoc(this.colName, this.id);

    if (this.realDoc && !store.isQuotaLimited()) {
      try {
        await this.realDoc.delete();
      } catch (err: any) {
        if (isFirestoreQuotaError(err)) {
          store.markQuotaExhausted();
        } else {
          console.warn(`[resilientDb] Real Firestore doc.delete failed for ${this.colName}/${this.id}:`, err.message);
        }
      }
    }
    return { writeTime: new Date() };
  }

  public collection(subCol: string): ResilientCollectionRef {
    const pathKey = `${this.colName}/${this.id}/${subCol}`;
    const realSub = this.realDoc?.collection ? this.realDoc.collection(subCol) : null;
    return new ResilientCollectionRef(pathKey, realSub);
  }
}

class ResilientCollectionRef extends ResilientQuery {
  constructor(colName: string, realCol?: any) {
    super(colName, realCol);
  }

  public doc(id?: string): ResilientDocRef {
    const docId = id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const realDoc = this.realTarget?.doc ? this.realTarget.doc(docId) : null;
    return new ResilientDocRef(this.colName, docId, realDoc);
  }

  public async add(data: any): Promise<ResilientDocRef> {
    const docRef = this.doc();
    await docRef.set(data);
    return docRef;
  }
}

class ResilientBatch {
  private ops: Array<() => Promise<any>> = [];
  private realBatch: any = null;

  constructor(realBatch?: any) {
    this.realBatch = realBatch;
  }

  public set(docRef: any, data: any, options?: any) {
    this.ops.push(() => docRef.set(data, options));
    if (this.realBatch && docRef.realDoc) {
      try { this.realBatch.set(docRef.realDoc, data, options); } catch { /* */ }
    }
    return this;
  }

  public update(docRef: any, data: any) {
    this.ops.push(() => docRef.update(data));
    if (this.realBatch && docRef.realDoc) {
      try { this.realBatch.update(docRef.realDoc, data); } catch { /* */ }
    }
    return this;
  }

  public delete(docRef: any) {
    this.ops.push(() => docRef.delete());
    if (this.realBatch && docRef.realDoc) {
      try { this.realBatch.delete(docRef.realDoc); } catch { /* */ }
    }
    return this;
  }

  public async commit(): Promise<any> {
    for (const op of this.ops) {
      await op();
    }
    if (this.realBatch && !store.isQuotaLimited()) {
      try {
        await this.realBatch.commit();
      } catch (err: any) {
        if (isFirestoreQuotaError(err)) store.markQuotaExhausted();
      }
    }
    return [];
  }
}

export class ResilientFirestore {
  private realDb: any = null;

  constructor(realDb?: any) {
    this.realDb = realDb;
  }

  public collection(name: string): ResilientCollectionRef {
    const realCol = this.realDb?.collection ? this.realDb.collection(name) : null;
    return new ResilientCollectionRef(name, realCol);
  }

  public doc(path: string): ResilientDocRef {
    const parts = path.split("/");
    const col = parts.slice(0, -1).join("/");
    const id = parts[parts.length - 1];
    return this.collection(col).doc(id);
  }

  public batch(): ResilientBatch {
    const rb = this.realDb?.batch ? this.realDb.batch() : null;
    return new ResilientBatch(rb);
  }
}
