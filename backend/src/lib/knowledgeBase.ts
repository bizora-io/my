// Local, self-contained support knowledge base - no external AI API calls.
// Each entry is matched against the user's message by keyword overlap
// (see matchAnswer() in chatBot.ts). Add more entries here as real user
// questions come in; no code changes needed elsewhere.

export interface KnowledgeEntry {
  id: string;
  category: string;
  keywords: string[];
  question: string;
  answer: string;
}

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  {
    id: "pos-sale",
    category: "Sales / POS",
    keywords: ["sell", "sale", "pos", "checkout", "invoice", "receipt", "bill customer"],
    question: "How do I make a sale?",
    answer: "Go to Sell (POS) from the sidebar, add products to the cart by tapping them or scanning a barcode, choose a payment method, and tap Checkout. A receipt/invoice is generated automatically and stock is deducted right away.",
  },
  {
    id: "sale-return",
    category: "Sales / POS",
    keywords: ["return", "refund", "exchange", "sales return"],
    question: "How do I process a return or refund?",
    answer: "Open the transaction in Sell History or Reports, and use the Return option on that sale. This restocks the returned items and records a Sales Return entry in your ledger automatically.",
  },
  {
    id: "add-product",
    category: "Inventory",
    keywords: ["add product", "new product", "create product", "add item"],
    question: "How do I add a new product?",
    answer: "Go to Inventory / Product List and tap Add Product. Fill in the name, price, cost, and opening stock, then save. It'll immediately be available in the Sell (POS) screen.",
  },
  {
    id: "low-stock",
    category: "Inventory",
    keywords: ["low stock", "out of stock", "stock alert", "reorder"],
    question: "How do I see low-stock products?",
    answer: "The Dashboard and the Stock Report both show low-stock and out-of-stock items. You can set a reorder level per product in the product's edit screen to control when it shows up there.",
  },
  {
    id: "stock-transfer",
    category: "Inventory",
    keywords: ["transfer stock", "move stock", "between stores", "store transfer"],
    question: "How do I transfer stock between stores?",
    answer: "Go to Product Transfer, pick a source store and a destination store, add the products and quantities you want to move, then confirm. Stock is deducted from the source and added to the destination immediately, with an audit entry logged automatically.",
  },
  {
    id: "add-customer",
    category: "CRM",
    keywords: ["add customer", "new customer", "customer profile"],
    question: "How do I add a customer?",
    answer: "You can add a customer directly from the Sell screen while checking out, or from the Customers page via Add Customer. You can track their purchase history and any outstanding dues from their profile.",
  },
  {
    id: "add-supplier",
    category: "Suppliers",
    keywords: ["add supplier", "new supplier", "vendor"],
    question: "How do I add a supplier?",
    answer: "Go to Suppliers and tap Add Supplier. Once added, you can record purchases against them and track payments/dues in their profile.",
  },
  {
    id: "staff-pin",
    category: "Staff / HR",
    keywords: ["staff login", "employee login", "staff pin", "forgot pin", "employee pin"],
    question: "How does staff/employee login work?",
    answer: "Each staff member gets a mobile number + PIN when you add them under Staff Management. They can log in with that same mobile number and PIN even across other businesses they work at. If they forget their PIN, they can reset it from the login screen's 'Forgot PIN' option, which sends a verification code to their phone.",
  },
  {
    id: "add-staff",
    category: "Staff / HR",
    keywords: ["add staff", "add employee", "new staff", "hire"],
    question: "How do I add a staff member?",
    answer: "Go to Staff Management and tap Add Staff. Enter their name, mobile number, role, and salary details. They'll be able to log in immediately with that mobile number and the PIN you set (or the default one, which you should ask them to change).",
  },
  {
    id: "reports",
    category: "Reports",
    keywords: ["report", "sales report", "profit", "business report"],
    question: "Where can I see my sales/profit reports?",
    answer: "Business Reports gives you sales, profit, and expense breakdowns by date range. Stock Report focuses specifically on inventory movement and valuation.",
  },
  {
    id: "subscription",
    category: "Billing / Subscription",
    keywords: ["subscription", "plan", "upgrade", "billing", "payment plan", "pricing"],
    question: "How do I upgrade my subscription plan?",
    answer: "Go to Subscription from the sidebar to see available plans and their limits (stores, users, features). Tap Upgrade on the plan you want and follow the payment steps.",
  },
  {
    id: "account-password",
    category: "Account",
    keywords: ["change password", "forgot password", "reset password", "login issue", "can't login", "cannot login"],
    question: "I forgot my password / can't log in.",
    answer: "On the login screen, tap 'Forgot Password'. Enter your registered email or mobile number and we'll send a verification code to reset it. If you're already logged in, you can change your password anytime from Settings > Security.",
  },
  {
    id: "2fa",
    category: "Account",
    keywords: ["two factor", "2fa", "authenticator", "security code"],
    question: "How do I enable Two-Factor Authentication (2FA)?",
    answer: "Go to Settings > Security and turn on Two-Factor Authentication. Scan the QR code with an authenticator app (like Google Authenticator), then enter the 6-digit code it shows to confirm. From then on, you'll need a code from that app to log in.",
  },
  {
    id: "multi-store",
    category: "Account",
    keywords: ["multiple store", "add store", "new branch", "multi store"],
    question: "How do I add another store/branch?",
    answer: "Go to Settings > Store Management to add another store, as long as your subscription plan allows more than one store. Each store can have its own inventory, staff, and reports, or you can view them combined under 'All Stores'.",
  },
];
