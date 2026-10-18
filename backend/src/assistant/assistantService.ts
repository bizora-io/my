import { ERP_CAPABILITY_REGISTRY, type ErpCapability } from "./capabilityRegistry.ts";
import {
  getTenantProfile,
  getLiveSalesMetrics,
  getLiveInventoryMetrics,
  getLiveCustomerDues,
  getLiveSupplierPayables,
  getLiveCashboxStatus,
  getLiveStaffRoster,
  getLiveSubscriptionContext,
} from "./bizoraContext.ts";

export interface AssistantUserContext {
  id: string;
  name?: string;
  email?: string;
  role: string;
  permissions?: string[];
  businessId?: string;
}

export interface AssistantRequest {
  message: string;
  user?: AssistantUserContext;
  businessId?: string;
}

export interface AssistantResponse {
  text: string;
  intent: string;
  category: string;
  source: "live_database" | "erp_guide" | "access_denied" | "unsupported";
  dataSummary?: {
    metricTitle?: string;
    primaryValue?: string | number;
    secondaryValue?: string;
    currency?: string;
    asOf?: string;
    table?: { headers: string[]; rows: (string | number)[][] };
  };
  suggestedActions?: Array<{ label: string; prompt?: string; route?: string }>;
}

function normalize(text: string): string {
  return (text || "").toLowerCase().trim();
}

function isBengaliText(text: string): boolean {
  return /[\u0980-\u09FF]/.test(text);
}

function hasPermission(user: AssistantUserContext | undefined, requiredPermission?: string): boolean {
  if (!requiredPermission) return true;
  if (!user) return false;
  if (user.role === "SHOP_OWNER" || user.role === "SAAS_OWNER" || user.role === "SAAS_ADMIN") {
    return true;
  }
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes("all") || perms.includes(requiredPermission);
}

/**
 * Score a capability based on keyword overlap and semantic tokens
 */
function matchCapability(message: string): { capability: ErpCapability; score: number } | null {
  const norm = normalize(message);
  let best: { capability: ErpCapability; score: number } | null = null;

  for (const cap of ERP_CAPABILITY_REGISTRY) {
    let score = 0;

    for (const kw of cap.keywordsEn) {
      const kwNorm = kw.toLowerCase();
      if (norm.includes(kwNorm)) {
        score += kwNorm.split(/\s+/).length * 5;
      } else {
        const words = kwNorm.split(/\s+/).filter((w) => w.length > 2 && !["the", "and", "for", "are"].includes(w));
        if (words.length > 1 && words.every((w) => norm.includes(w))) {
          score += words.length * 3;
        }
      }
    }

    for (const kw of cap.keywordsBn) {
      const kwNorm = kw.toLowerCase();
      if (norm.includes(kwNorm)) {
        score += kwNorm.split(/\s+/).length * 6;
      } else {
        const words = kwNorm.split(/\s+/).filter((w) => w.length > 2);
        if (words.length > 1 && words.every((w) => norm.includes(w))) {
          score += words.length * 4;
        }
      }
    }

    if (score > 0 && (!best || score > best.score)) {
      best = { capability: cap, score };
    }
  }

  return best;
}

/**
 * Main query processor for Bizora ERP Assistant
 */
export async function processAssistantQuery(req: AssistantRequest): Promise<AssistantResponse> {
  const message = (req.message || "").trim();
  const isBn = isBengaliText(message);
  const user = req.user;
  const businessId = req.businessId || user?.businessId;

  // Handle empty or greeting queries
  const lowerMsg = normalize(message);
  const greetings = ["hi", "hello", "hey", "salam", "assalamu", "হাই", "হ্যালো", "সালাম"];
  if (!lowerMsg || greetings.some((g) => lowerMsg.startsWith(g) && lowerMsg.length < 15)) {
    return {
      text: isBn
        ? "আসসালামু আলাইকুম! আমি বিজোরা ইআরপি সহকারী। আজকের বিক্রয়, স্টক রিপোর্ট, বকেয়া বা সিস্টেমের যেকোনো ফিচার সম্পর্কে প্রশ্ন করুন।"
        : "Hello! I am your Bizora ERP Assistant. You can ask me about today's sales, low stock alerts, customer dues, supplier payables, or system workflows.",
      intent: "greeting",
      category: "general",
      source: "erp_guide",
      suggestedActions: [
        { label: isBn ? "আজকের বিক্রয় কত?" : "Today's Sales", prompt: isBn ? "আজকের বিক্রয় কত?" : "Today's sales summary" },
        { label: isBn ? "কোন পণ্যের স্টক কম?" : "Low Stock Items", prompt: isBn ? "কোন পণ্যের স্টক কম?" : "Which products are low on stock?" },
        { label: isBn ? "কাস্টমার বকেয়া কত?" : "Customer Dues", prompt: isBn ? "কোন customer-এর কত বকেয়া?" : "Customer dues summary" },
        { label: isBn ? "সাপ্লায়ার পাওনা কত?" : "Supplier Payables", prompt: isBn ? "Supplier payable summary তৈরি করো" : "Supplier payables summary" },
      ],
    };
  }

  // Match against capability registry
  const match = matchCapability(message);
  if (!match) {
    return {
      text: isBn
        ? "দুঃখিত, এই বিষয়ে আমার সরাসরি উত্তর জানা নেই। আপনি সাইডবার থেকে প্রাসঙ্গিক মেনু দেখতে পারেন অথবা উপরের 'Talk to an Agent' বাটনে ট্যাপ করে সাপোর্ট টিকেট খুলতে পারেন।"
        : "I couldn't find a direct ERP capability matching that question. You can explore the relevant module from the sidebar or click 'Talk to an Agent' above to contact live support.",
      intent: "unknown",
      category: "general",
      source: "unsupported",
      suggestedActions: [
        { label: isBn ? "বিক্রয় রিপোর্ট" : "Sales Report", prompt: isBn ? "আজকের বিক্রয় কত?" : "Today's sales" },
        { label: isBn ? "স্টক অ্যালার্ট" : "Stock Alert", prompt: isBn ? "কোন পণ্যের স্টক কম?" : "Which items are low on stock?" },
        { label: isBn ? "কোটেশন গাইড" : "Quotation Guide", prompt: isBn ? "Quotation থেকে invoice কীভাবে তৈরি করব?" : "How to create invoice from quotation?" },
      ],
    };
  }

  const cap = match.capability;

  // Enforce tenant boundary
  if (!businessId && cap.dataSources.length > 0) {
    return {
      text: isBn
        ? "লাইভ ডাটা দেখার জন্য অনুগ্রহ করে দোকানে সাইন-ইন করুন।"
        : "Please log in to your shop account to query live database records.",
      intent: cap.id,
      category: cap.module,
      source: "access_denied",
    };
  }

  // Enforce RBAC permission check
  if (!hasPermission(user, cap.requiredPermission)) {
    return {
      text: isBn
        ? `এই তথ্যটি দেখার জন্য আপনার অ্যাকাউন্টে '${cap.requiredPermission}' পারমিশন প্রয়োজন। অনুগ্রহ করে শপ ওনারের সাথে যোগাযোগ করুন।`
        : `Access Denied: You require the '${cap.requiredPermission}' permission to view this data. Please contact your store administrator.`,
      intent: cap.id,
      category: cap.module,
      source: "access_denied",
    };
  }

  // Load business profile for currency & shop name
  const bizProfile = businessId ? await getTenantProfile(businessId) : null;
  const currency = bizProfile?.currency || "BDT";

  // Execute authorized read capability
  switch (cap.id) {
    case "sales_live_summary": {
      const sales = await getLiveSalesMetrics(businessId!, currency);
      const text = isBn
        ? `📊 আজকের বিক্রয় সারাংশ (${sales.currency}):\n` +
          `• মোট বিক্রয়: ${sales.todaySalesTotal.toLocaleString()} ${sales.currency} (${sales.todayOrderCount}টি লেনদেন)\n` +
          `• নগদ আদায়: ${sales.todayCashCollected.toLocaleString()} ${sales.currency}\n` +
          `• আজকের বকেয়া: ${sales.todayDueAmount.toLocaleString()} ${sales.currency}\n` +
          `• চলতি মাসের সর্বমোট বিক্রয়: ${sales.monthSalesTotal.toLocaleString()} ${sales.currency} (${sales.monthOrderCount}টি লেনদেন)`
        : `📊 Live Sales Summary (${sales.currency}):\n` +
          `• Today's Sales: ${sales.todaySalesTotal.toLocaleString()} ${sales.currency} (${sales.todayOrderCount} orders)\n` +
          `• Cash Collected: ${sales.todayCashCollected.toLocaleString()} ${sales.currency}\n` +
          `• Today's Receivables: ${sales.todayDueAmount.toLocaleString()} ${sales.currency}\n` +
          `• Month-to-Date Sales: ${sales.monthSalesTotal.toLocaleString()} ${sales.currency} (${sales.monthOrderCount} orders)`;

      return {
        text,
        intent: cap.id,
        category: cap.module,
        source: "live_database",
        dataSummary: {
          metricTitle: isBn ? "আজকের মোট বিক্রয়" : "Today's Total Sales",
          primaryValue: `${sales.todaySalesTotal.toLocaleString()} ${sales.currency}`,
          secondaryValue: `${sales.todayOrderCount} orders`,
          currency: sales.currency,
          asOf: sales.asOf,
          table: {
            headers: [isBn ? "মেট্রিক" : "Metric", isBn ? "আজকের" : "Today", isBn ? "চলতি মাস" : "This Month"],
            rows: [
              [isBn ? "মোট বিক্রয়" : "Sales Total", `${sales.todaySalesTotal} ${sales.currency}`, `${sales.monthSalesTotal} ${sales.currency}`],
              [isBn ? "অর্ডার সংখ্যা" : "Order Count", sales.todayOrderCount, sales.monthOrderCount],
              [isBn ? "নগদ আদায়" : "Cash Collected", `${sales.todayCashCollected} ${sales.currency}`, "-"],
            ],
          },
        },
        suggestedActions: [
          { label: isBn ? "বিক্রয় হিস্ট্রি" : "Sell History", route: "/reports" },
          { label: isBn ? "নতুন বিক্রয় করুন" : "New Sale", route: "/sell" },
        ],
      };
    }

    case "inventory_low_stock": {
      const inv = await getLiveInventoryMetrics(businessId!, currency);
      if (inv.lowStockCount === 0 && inv.outOfStockCount === 0) {
        return {
          text: isBn
            ? `✅ স্টক রিপোর্ট: বর্তমানে আপনার মোট ${inv.totalProductsCount}টি পণ্যের (${inv.totalStockUnits} ইউনিট) সবগুলোর স্টক পর্যাপ্ত রয়েছে। কোনো ঘাটতি নেই।`
            : `✅ Inventory Health: All ${inv.totalProductsCount} products (${inv.totalStockUnits} units) are currently above their reorder thresholds. No stockouts detected.`,
          intent: cap.id,
          category: cap.module,
          source: "live_database",
          dataSummary: {
            metricTitle: isBn ? "ঘাটতি পণ্য" : "Low Stock Items",
            primaryValue: "0",
            secondaryValue: `${inv.totalProductsCount} total products`,
            asOf: inv.asOf,
          },
        };
      }

      const rows = inv.topLowStockItems.map((item) => [
        item.name,
        item.stock,
        item.minStock,
        item.stock <= 0 ? (isBn ? "স্টক শেষ" : "Out of Stock") : (isBn ? "কম স্টক" : "Low Stock"),
      ]);

      const text = isBn
        ? `⚠️ স্টক সতর্কবার্তা:\n` +
          `মোট ${inv.lowStockCount + inv.outOfStockCount}টি পণ্যে সংকট পাওয়া গেছে (স্টক শেষ: ${inv.outOfStockCount}টি, কম স্টক: ${inv.lowStockCount}টি)।\n` +
          inv.topLowStockItems.map((i) => `• ${i.name}: অবশিষ্ট ${i.stock} ${i.unit || "পিস"} (রিঅর্ডার লেভেল: ${i.minStock})`).join("\n")
        : `⚠️ Low Stock Warning:\n` +
          `Found ${inv.lowStockCount + inv.outOfStockCount} items requiring replenishment (Out of Stock: ${inv.outOfStockCount}, Low Stock: ${inv.lowStockCount}).\n` +
          inv.topLowStockItems.map((i) => `• ${i.name}: ${i.stock} ${i.unit || "units"} left (threshold: ${i.minStock})`).join("\n");

      return {
        text,
        intent: cap.id,
        category: cap.module,
        source: "live_database",
        dataSummary: {
          metricTitle: isBn ? "ঘাটতি পণ্য সংখ্যা" : "Low Stock Alert Count",
          primaryValue: inv.lowStockCount + inv.outOfStockCount,
          secondaryValue: `${inv.outOfStockCount} out of stock`,
          asOf: inv.asOf,
          table: {
            headers: [isBn ? "পণ্যের নাম" : "Product", isBn ? "বর্তমান স্টক" : "Stock", isBn ? "রিঅর্ডার লেভেল" : "Threshold", isBn ? "অবস্থা" : "Status"],
            rows,
          },
        },
        suggestedActions: [
          { label: isBn ? "পণ্য ক্রয় করুন" : "Purchase Items", route: "/buy" },
          { label: isBn ? "স্টক রিপোর্ট" : "Stock Report", route: "/stock-report" },
        ],
      };
    }

    case "customer_dues_receivables": {
      const dues = await getLiveCustomerDues(businessId!, currency);
      const text = isBn
        ? `💰 কাস্টমার বকেয়া রিপোর্ট:\n` +
          `• মোট বকেয়া পাওনা: ${dues.totalReceivables.toLocaleString()} ${dues.currency} (${dues.customersWithDueCount} জন কাস্টমার)\n` +
          (dues.topDueCustomers.length > 0
            ? `সর্বোচ্চ বকেয়া কাস্টমার:\n` + dues.topDueCustomers.map((c) => `• ${c.name}: ${c.due.toLocaleString()} ${dues.currency}`).join("\n")
            : "")
        : `💰 Accounts Receivable:\n` +
          `• Total Outstanding Dues: ${dues.totalReceivables.toLocaleString()} ${dues.currency} across ${dues.customersWithDueCount} customers.\n` +
          (dues.topDueCustomers.length > 0
            ? `Top Receivables:\n` + dues.topDueCustomers.map((c) => `• ${c.name}: ${c.due.toLocaleString()} ${dues.currency}`).join("\n")
            : "");

      return {
        text,
        intent: cap.id,
        category: cap.module,
        source: "live_database",
        dataSummary: {
          metricTitle: isBn ? "মোট কাস্টমার বকেয়া" : "Total Customer Receivables",
          primaryValue: `${dues.totalReceivables.toLocaleString()} ${dues.currency}`,
          secondaryValue: `${dues.customersWithDueCount} customers`,
          currency: dues.currency,
          asOf: dues.asOf,
          table: {
            headers: [isBn ? "কাস্টমার" : "Customer", isBn ? "ফোন" : "Phone", isBn ? "বকেয়া" : "Due"],
            rows: dues.topDueCustomers.map((c) => [c.name, c.phone || "-", `${c.due} ${dues.currency}`]),
          },
        },
        suggestedActions: [
          { label: isBn ? "কাস্টমার তালিকা" : "Customers", route: "/customers" },
        ],
      };
    }

    case "supplier_payables": {
      const payables = await getLiveSupplierPayables(businessId!, currency);
      const text = isBn
        ? `📦 সাপ্লায়ার দেনা সারাংশ:\n` +
          `• মোট পরিশোধযোগ্য দেনা: ${payables.totalPayables.toLocaleString()} ${payables.currency} (${payables.suppliersOwedCount} জন সাপ্লায়ার)\n` +
          (payables.topPayableSuppliers.length > 0
            ? `প্রধান পাওনাদার সাপ্লায়ার:\n` + payables.topPayableSuppliers.map((s) => `• ${s.name}: ${s.payable.toLocaleString()} ${payables.currency}`).join("\n")
            : "")
        : `📦 Supplier Payables Summary:\n` +
          `• Total Payables: ${payables.totalPayables.toLocaleString()} ${payables.currency} across ${payables.suppliersOwedCount} suppliers.\n` +
          (payables.topPayableSuppliers.length > 0
            ? `Top Creditors:\n` + payables.topPayableSuppliers.map((s) => `• ${s.name}: ${s.payable.toLocaleString()} ${payables.currency}`).join("\n")
            : "");

      return {
        text,
        intent: cap.id,
        category: cap.module,
        source: "live_database",
        dataSummary: {
          metricTitle: isBn ? "মোট সাপ্লায়ার দেনা" : "Total Supplier Payables",
          primaryValue: `${payables.totalPayables.toLocaleString()} ${payables.currency}`,
          secondaryValue: `${payables.suppliersOwedCount} suppliers`,
          currency: payables.currency,
          asOf: payables.asOf,
          table: {
            headers: [isBn ? "সাপ্লায়ার" : "Supplier", isBn ? "ফোন" : "Phone", isBn ? "দেনা" : "Payable"],
            rows: payables.topPayableSuppliers.map((s) => [s.name, s.phone || "-", `${s.payable} ${payables.currency}`]),
          },
        },
        suggestedActions: [
          { label: isBn ? "সাপ্লায়ার তালিকা" : "Suppliers", route: "/suppliers" },
          { label: isBn ? "নতুন ক্রয়" : "Buy Stock", route: "/buy" },
        ],
      };
    }

    case "finance_cashbox_balance": {
      const cash = await getLiveCashboxStatus(businessId!, currency);
      const text = isBn
        ? `💵 ক্যাশ ড্রয়ার ও নগদ হিসাব (${cash.currency}):\n` +
          `• আজকের নগদ জমা (Inflow): ${cash.todayCashIn.toLocaleString()} ${cash.currency}\n` +
          `• আজকের নগদ খরচ (Outflow): ${cash.todayCashOut.toLocaleString()} ${cash.currency}\n` +
          `• আজকের নেট ক্যাশ ফ্লো: ${cash.netCashFlowToday.toLocaleString()} ${cash.currency}`
        : `💵 Cashbox Register & Cash Flow (${cash.currency}):\n` +
          `• Today's Cash In: ${cash.todayCashIn.toLocaleString()} ${cash.currency}\n` +
          `• Today's Cash Out: ${cash.todayCashOut.toLocaleString()} ${cash.currency}\n` +
          `• Net Cash Flow: ${cash.netCashFlowToday.toLocaleString()} ${cash.currency}`;

      return {
        text,
        intent: cap.id,
        category: cap.module,
        source: "live_database",
        dataSummary: {
          metricTitle: isBn ? "আজকের নেট ক্যাশ ফ্লো" : "Net Cash Flow Today",
          primaryValue: `${cash.netCashFlowToday.toLocaleString()} ${cash.currency}`,
          currency: cash.currency,
          asOf: cash.asOf,
          table: {
            headers: [isBn ? "বিবরণ" : "Category", isBn ? "পরিমাণ" : "Amount"],
            rows: [
              [isBn ? "নগদ বিক্রয় ও জমা" : "Cash Inflow", `${cash.todayCashIn} ${cash.currency}`],
              [isBn ? "নগদ ক্রয় ও খরচ" : "Cash Outflow", `${cash.todayCashOut} ${cash.currency}`],
              [isBn ? "নেট ক্যাশ ব্যালেন্স" : "Net Flow", `${cash.netCashFlowToday} ${cash.currency}`],
            ],
          },
        },
        suggestedActions: [
          { label: isBn ? "ক্যাশ ড্রয়ার খুলুন" : "Cashbox", route: "/cashbox" },
        ],
      };
    }

    case "subscription_feature_check": {
      const sub = await getLiveSubscriptionContext(businessId!);
      const text = isBn
        ? `🛡️ আপনার সাবস্ক্রিপশন স্ট্যাটাস:\n` +
          `• বিজনেস: ${sub.businessName}\n` +
          `• বর্তমান প্ল্যান: ${sub.plan} (${sub.status})\n` +
          `• মোট এন্টারপ্রাইজ ফিচার: ${sub.totalFeaturesAvailable}টি অন্তর্ভুক্ত\n` +
          `• সক্রিয় মডিউলসমূহ: ${sub.enabledModules.slice(0, 6).join(", ")} ইত্যাদি।`
        : `🛡️ Subscription & Feature Package:\n` +
          `• Business: ${sub.businessName}\n` +
          `• Active Plan: ${sub.plan} (${sub.status})\n` +
          `• Total Supported Features: ${sub.totalFeaturesAvailable} verified catalog features\n` +
          `• Active Modules: ${sub.enabledModules.slice(0, 6).join(", ")}, etc.`;

      return {
        text,
        intent: cap.id,
        category: cap.module,
        source: "live_database",
        suggestedActions: [
          { label: isBn ? "প্ল্যান আপগ্রেড ও ফিচার" : "Manage Subscription", route: "/subscription" },
        ],
      };
    }

    case "hr_staff_permissions": {
      const roster = await getLiveStaffRoster(businessId!);
      const text = isBn
        ? `👥 কর্মী তালিকা (${roster.totalStaffCount} জন সক্রিয় কর্মী):\n` +
          roster.staffList.map((s) => `• ${s.name} — রোল: ${s.role} (${s.permissionsCount}টি পারমিশন)`).join("\n")
        : `👥 Staff & Permissions Roster (${roster.totalStaffCount} active members):\n` +
          roster.staffList.map((s) => `• ${s.name} — Role: ${s.role} (${s.permissionsCount} permissions)`).join("\n");

      return {
        text,
        intent: cap.id,
        category: cap.module,
        source: "live_database",
        suggestedActions: [
          { label: isBn ? "স্টাফ ম্যানেজমেন্ট" : "Staff Management", route: "/staff" },
        ],
      };
    }

    default: {
      // Step-by-step workflow assistance
      const workflowText = isBn ? cap.workflowHelpBn : cap.workflowHelpEn;
      return {
        text: workflowText || cap.description,
        intent: cap.id,
        category: cap.module,
        source: "erp_guide",
      };
    }
  }
}
