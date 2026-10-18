/**
 * Bizora ERP Capability Registry
 * 
 * Authoritative registry of all real modules, operations, permissions, data sources,
 * and supported workflow assistance in the Bizora SaaS ERP monorepo.
 */

export interface ErpCapability {
  id: string;
  module: string;
  name: string;
  description: string;
  requiredPermission?: string;
  requiredRole?: "SHOP_OWNER" | "SAAS_ADMIN" | "SAAS_OWNER" | "EMPLOYEE" | "ANY";
  dataSources: string[];
  isReadOnly: boolean;
  isDestructive: boolean;
  requiresConfirmation: boolean;
  keywordsEn: string[];
  keywordsBn: string[];
  workflowHelpEn?: string;
  workflowHelpBn?: string;
}

export const ERP_CAPABILITY_REGISTRY: ErpCapability[] = [
  {
    id: "sales_live_summary",
    module: "pos",
    name: "Live Sales & Revenue Metrics",
    description: "Queries today's and month-to-date sales totals, order count, and revenue directly from verified transactions.",
    requiredPermission: "pos.view_sales",
    dataSources: ["businesses/{businessId}/transactions"],
    isReadOnly: true,
    isDestructive: false,
    requiresConfirmation: false,
    keywordsEn: ["today sales", "today's sale", "sales summary", "daily sales", "revenue today", "how much sold today", "current sales", "this month sales"],
    keywordsBn: ["আজকের বিক্রয়", "আজকের বিক্রি", "আজকে কত বিক্রি", "বিক্রয় রিপোর্ট", "আজকের সেল", "এই মাসের বিক্রি", "মোট বিক্রয়"],
    workflowHelpEn: "To make a sale, navigate to Sell (POS) from the sidebar, pick items, set discounts or customer due, and tap Checkout. Sales immediately sync to your sales summary and accounting ledger.",
    workflowHelpBn: "বিক্রয় করতে সাইডবার থেকে 'Sell (POS)'-এ যান, কার্টে প্রোডাক্ট যোগ করুন, পেমেন্ট মেথড বা বকেয়া সিলেক্ট করুন এবং 'Checkout' বাটনে ট্যাপ করুন। সাথে সাথে বিক্রয় রিপোর্ট ও লেজারে আপডেট হবে।",
  },
  {
    id: "inventory_low_stock",
    module: "inventory",
    name: "Low Stock & Out of Stock Alerts",
    description: "Fetches actual products where current stock is below reorder level or out of stock.",
    requiredPermission: "inventory.view_stock",
    dataSources: ["businesses/{businessId}/products"],
    isReadOnly: true,
    isDestructive: false,
    requiresConfirmation: false,
    keywordsEn: ["low stock", "low on stock", "out of stock", "stock alert", "reorder product", "stock status", "inventory alert", "stock level", "items running out", "which products are low"],
    keywordsBn: ["স্টক কম", "কোন পণ্যের স্টক কম", "মজুদ শেষ", "আউট অব স্টক", "স্টক অ্যালার্ট", "রিঅর্ডার", "পণ্যের মজুদ", "স্টক ফুরিয়ে"],
    workflowHelpEn: "To replenish stock, go to Inventory > Products or Purchases > Buy. You can adjust stock or set reorder alert thresholds per product in the product edit screen.",
    workflowHelpBn: "স্টক বাড়াতে 'Purchases > Buy' থেকে ক্রয় করুন অথবা 'Inventory > Product List'-এ গিয়ে স্টক অ্যাডজাস্ট করুন। প্রতিটি প্রোডাক্টের এডিট স্ক্রিনে রিঅর্ডার লেভেল সেট করা যায়।",
  },
  {
    id: "customer_dues_receivables",
    module: "customers",
    name: "Customer Dues & Accounts Receivable",
    description: "Queries customer ledger balances and sales with due status to summarize outstanding receivables.",
    requiredPermission: "customers.view",
    dataSources: ["businesses/{businessId}/entities", "businesses/{businessId}/transactions"],
    isReadOnly: true,
    isDestructive: false,
    requiresConfirmation: false,
    keywordsEn: ["customer due", "customer balance", "outstanding dues", "who owes money", "receivables", "credit customers", "customer unpaid", "dues", "due amount"],
    keywordsBn: ["কাস্টমার বকেয়া", "কার কত বকেয়া", "কোন কাস্টমারের বকেয়া", "বকেয়া টাকা", "পাওনা টাকা", "কাস্টমার বাকি", "বকেয়া", "customer বকেয়া", "customer-এর কত বকেয়া", "customer due"],
    workflowHelpEn: "To collect customer dues, open Customers > Customer Profile > Receive Payment, or record an incoming payment in POS by selecting the customer.",
    workflowHelpBn: "কাস্টমার বকেয়া আদায় করতে 'Customers' পেজে গিয়ে সংশ্লিষ্ট কাস্টমারের প্রোফাইল থেকে 'Receive Payment' এন্ট্রি দিন অথবা POS-এ কাস্টমার সিলেক্ট করে বাকি পরিশোধ করুন।",
  },
  {
    id: "supplier_payables",
    module: "purchases",
    name: "Supplier Payables & Purchase Summary",
    description: "Summarizes outstanding payables to suppliers and recent purchase orders.",
    requiredPermission: "suppliers.view",
    dataSources: ["businesses/{businessId}/entities", "businesses/{businessId}/transactions"],
    isReadOnly: true,
    isDestructive: false,
    requiresConfirmation: false,
    keywordsEn: ["supplier payable", "supplier dues", "payables", "supplier debt", "purchase report", "vendor balance", "how much we owe suppliers"],
    keywordsBn: ["সাপ্লায়ার পাওনা", "সাপ্লায়ার বকেয়া", "পারচেজ রিপোর্ট", "কাকে কত দিতে হবে", "সাপ্লায়ার দেনা", "ক্রয় বকেয়া"],
    workflowHelpEn: "To pay a supplier, go to Purchases > Suppliers, select the vendor, and record a payment against their outstanding balance.",
    workflowHelpBn: "সাপ্লায়ার দেনা পরিশোধ করতে 'Purchases > Suppliers' পেজে গিয়ে সংশ্লিষ্ট ভেন্ডরের প্রোফাইল থেকে পেমেন্ট এন্ট্রি দিন।",
  },
  {
    id: "finance_cashbox_balance",
    module: "finance",
    name: "Cashbox & Liquid Financial Position",
    description: "Retrieves current cash drawer status, cash inflows, and recorded operational expenses.",
    requiredPermission: "finance.ledgers",
    dataSources: ["businesses/{businessId}/transactions"],
    isReadOnly: true,
    isDestructive: false,
    requiresConfirmation: false,
    keywordsEn: ["cashbox", "cash balance", "cash drawer", "cash in hand", "how much cash", "today expense", "income vs expense"],
    keywordsBn: ["ক্যাশ ক্যাশিয়ার", "ক্যাশ ব্যালেন্স", "ক্যাশ ড্রয়ার", "হাতে নগদ কত", "ক্যাশ কত আছে", "আজকের খরচ", "ব্যয় কত"],
    workflowHelpEn: "Open Cashbox from the sidebar to review day open balance, cash sales, paid expenses, and reconcile register differences at closing.",
    workflowHelpBn: "ক্যাশ দেখতে সাইডবার থেকে 'Cashbox'-এ যান। সেখানে দিনের ওপেনিং ব্যালেন্স, নগদ বিক্রয়, নগদ খরচ ও দিন শেষের ব্যালেন্স মিলিয়ে ক্লোজিং করা যায়।",
  },
  {
    id: "subscription_feature_check",
    module: "subscription",
    name: "Subscription Package & Feature Entitlements",
    description: "Checks active business plan, feature catalog access, store/user limits, and renewal dates.",
    requiredRole: "ANY",
    dataSources: ["businesses/{businessId}", "platformConfig/subscriptionPlans"],
    isReadOnly: true,
    isDestructive: false,
    requiresConfirmation: false,
    keywordsEn: ["subscription", "current plan", "package limit", "features enabled", "what plan am i on", "upgrade plan", "plan pricing"],
    keywordsBn: ["সাবস্ক্রিপশন", "আমার প্ল্যান", "প্যাকেজ লিমিট", "ফিচার লিস্ট", "কোন ফিচার আছে", "প্ল্যান আপগ্রেড"],
    workflowHelpEn: "To view or upgrade your plan, open the Subscription page from the sidebar. You can inspect all 11 ERP module features and upgrade using bKash, Nagad, card, or bank transfer.",
    workflowHelpBn: "আপনার প্ল্যান দেখতে বা আপগ্রেড করতে সাইডবার থেকে 'Subscription' পেজে যান। সেখানে ১১টি মডিউলের সব ফিচার দেখতে পারবেন এবং বিকাশ, নগদ বা কার্ড দিয়ে আপগ্রেড করতে পারবেন।",
  },
  {
    id: "hr_staff_permissions",
    module: "hr",
    name: "Staff Roster & Permissions",
    description: "Lists active team members, assigned roles, and granted permissions without exposing confidential payroll.",
    requiredPermission: "hr.view",
    dataSources: ["businesses/{businessId}/staff", "globalEmployees"],
    isReadOnly: true,
    isDestructive: false,
    requiresConfirmation: false,
    keywordsEn: ["employee permission", "staff list", "who has permission", "staff roles", "how many employees", "team roster"],
    keywordsBn: ["কর্মচারী পারমিশন", "স্টাফ তালিকা", "এমপ্লয়ি পারমিশন", "কে কী কাজ করতে পারে", "স্টাফ রোল", "স্টাফ লিস্ট"],
    workflowHelpEn: "To manage staff and assign granular permissions, open Staff Management from the sidebar. You can set role templates or customize specific module permissions.",
    workflowHelpBn: "স্টাফদের পারমিশন কনফিগার করতে 'Staff Management'-এ যান। সেখানে প্রতিটি স্টাফের রোল ও নির্দিষ্ট মডিউল অ্যাক্সেস নির্ধারণ করা যায়।",
  },
  {
    id: "quotation_to_invoice_workflow",
    module: "pos",
    name: "Quotation to Invoice Workflow",
    description: "Step-by-step guidance on creating a formal price quotation and converting it to a bill/invoice upon customer approval.",
    requiredRole: "ANY",
    dataSources: [],
    isReadOnly: true,
    isDestructive: false,
    requiresConfirmation: false,
    keywordsEn: ["quotation to invoice", "convert quotation", "make quotation", "how to quote", "convert quote to bill"],
    keywordsBn: ["কোটেশন থেকে ইনভয়েস", "কোটেশন কীভাবে করব", "কোটেশন রূপান্তর", "কোটেশন তৈরি", "কোটেশন বিল"],
    workflowHelpEn: "1. Go to Quotations from sidebar.\n2. Tap 'Create Quotation', select items, pricing, and customer, then Save/Send.\n3. When approved, open the quotation and click 'Convert to Sale/Invoice'. Items load into checkout with one click.",
    workflowHelpBn: "১. সাইডবার থেকে 'Quotations'-এ যান।\n২. 'Create Quotation'-এ ক্লিক করে আইটেম, কাস্টমার ও দর দিয়ে সেভ করুন।\n৩. কাস্টমার অনুমোদন দিলে কোটেশনটি খুলে 'Convert to Invoice'-এ ট্যাপ করুন, সাথে সাথে তা বিক্রয়ে রূপান্তরিত হবে।",
  },
  {
    id: "sales_return_workflow",
    module: "pos",
    name: "Sales Return & Refund Workflow",
    description: "Guidance on processing partial or full sales returns with automatic stock restoration and double-entry ledger adjustment.",
    requiredRole: "ANY",
    dataSources: [],
    isReadOnly: true,
    isDestructive: false,
    requiresConfirmation: false,
    keywordsEn: ["sales return", "return product", "customer refund", "exchange item", "how to return sale"],
    keywordsBn: ["পণ্য ফেরত", "সেলস রিটার্ন", "রিটার্ন কীভাবে করব", "টাকা ফেরত", "মাল ফেরত"],
    workflowHelpEn: "1. Open Sell History or Business Reports.\n2. Locate the invoice and click 'Return'.\n3. Enter the returned item quantities and refund method (Cash, Bank, or Store Credit). Stock is restored automatically.",
    workflowHelpBn: "১. 'Sell History' বা 'Reports'-এ যান।\n২. নির্দিষ্ট ইনভয়েস খুঁজে 'Return' বাটনে ক্লিক করুন।\n৩. ফেরতের পরিমাণ ও রিফান্ড মেথড (ক্যাশ বা স্টোর ক্রেডিট) সিলেক্ট করে সাবমিট করুন। স্টক স্বয়ংক্রিয়ভাবে রিস্টোর হবে।",
  },
  {
    id: "stock_transfer_workflow",
    module: "inventory",
    name: "Multi-Store Stock Transfer Workflow",
    description: "Guidance on transferring stock between different warehouses or store branches.",
    requiredRole: "ANY",
    dataSources: [],
    isReadOnly: true,
    isDestructive: false,
    requiresConfirmation: false,
    keywordsEn: ["transfer stock", "move inventory", "branch transfer", "store to store", "warehouse transfer"],
    keywordsBn: ["স্টক ট্রান্সফার", "ব্রাঞ্চে মাল পাঠানো", "দোকান থেকে দোকানে স্টক", "শাখা বদল"],
    workflowHelpEn: "1. Open Product Transfer from the sidebar.\n2. Select Source Store and Destination Store.\n3. Add products and quantities, then tap 'Transfer Stock'. Quantities update across both branches instantly.",
    workflowHelpBn: "১. সাইডবার থেকে 'Product Transfer'-এ যান।\n২. উৎস দোকান (Source) এবং গন্তব্য দোকান (Destination) নির্বাচন করুন।\n৩. পণ্যের সংখ্যা দিয়ে 'Transfer Stock'-এ ক্লিক করুন। উভয় শাখায় তাৎক্ষণিক ব্যালেন্স সমন্বয় হবে।",
  },
];
