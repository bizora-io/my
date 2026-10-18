/**
 * SaaS Admin sidebar — clean labels, no numbered prefixes, no duplicates.
 */
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  TrendingUp,
  Award,
  Star,
  FileText,
  Store,
  Search,
  Briefcase,
  Users,
  Crown,
  Smartphone,
  CreditCard,
  DollarSign,
  Megaphone,
  Globe,
  Package,
  Database,
  Server,
  Key,
  HeadphonesIcon,
  Bell,
  ShieldAlert,
  Shield,
  ClipboardList,
  Mail,
  UserPlus,
  Lock,
  Bot,
  Settings,
} from 'lucide-react';

export type AdminNavModule = {
  id: string;
  label: string;
  icon: LucideIcon;
  desc: string;
};

export type AdminNavCategory = {
  name: string;
  modules: AdminNavModule[];
};

export const ADMIN_NAV_CATEGORIES: AdminNavCategory[] = [
  {
    name: 'Overview',
    modules: [
      { id: 'dashboard', label: 'Dashboard', icon: Activity, desc: 'Platform overview & live stats' },
    ],
  },
  {
    name: 'Business',
    modules: [
      { id: 'businesses', label: 'Businesses', icon: Store, desc: 'All shops, limits & status' },
      { id: 'customer-search', label: 'Customers', icon: Search, desc: 'Global customer registry' },
      { id: 'employees', label: 'Employees', icon: Briefcase, desc: 'Global employee registry' },
      { id: 'suppliers', label: 'Suppliers', icon: Users, desc: 'Global supplier registry' },
    ],
  },
  {
    name: 'Billing',
    modules: [
      { id: 'subscriptions', label: 'Subscriptions', icon: Crown, desc: 'Plans, trials & renewals' },
      { id: 'templates', label: 'Invoice Templates', icon: FileText, desc: 'Receipt & invoice templates' },
      { id: 'requests', label: 'Plan requests', icon: ClipboardList, desc: 'Upgrade / change queue' },
      { id: 'revenue-center', label: 'Revenue', icon: DollarSign, desc: 'Platform revenue summary' },
      { id: 'payment-gateway', label: 'Payments', icon: CreditCard, desc: 'Gateway credentials & logs' },
    ],
  },
  {
    name: 'Support',
    modules: [
      { id: 'support', label: 'Tickets', icon: HeadphonesIcon, desc: 'Support tickets' },
      { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Broadcast SMS / email / push' },
      { id: 'announcements-center', label: 'Announcements', icon: Megaphone, desc: 'System announcements' },
    ],
  },
  {
    name: 'Growth',
    modules: [
      { id: 'finance-analytics', label: 'Finance', icon: TrendingUp, desc: 'Revenue analytics' },
      { id: 'analytics-center', label: 'Churn & retention', icon: Star, desc: 'Churn, NRR, cohorts' },
      { id: 'ai-center', label: 'AI insights', icon: Bot, desc: 'Business & ticket insights' },
      { id: 'reports-center', label: 'Reports', icon: FileText, desc: 'Export reports' },
      { id: 'marketing-center', label: 'Marketing', icon: Mail, desc: 'Campaigns & referrals' },
      { id: 'website-cms', label: 'Website CMS', icon: Globe, desc: 'Landing & content' },
    ],
  },
  {
    name: 'Portals',
    modules: [
      { id: 'customer-portal', label: 'Customer portal', icon: Smartphone, desc: 'Customer logins' },
      { id: 'supplier-portal', label: 'Supplier portal', icon: Package, desc: 'Supplier logins' },
      { id: 'enterprise-features', label: 'Enterprise', icon: Award, desc: 'Isolation & edge settings' },
    ],
  },
  {
    name: 'System',
    modules: [
      { id: 'system-settings', label: 'Settings', icon: Settings, desc: 'Branding, SMTP, SMS' },
      { id: 'security', label: 'Security', icon: Lock, desc: 'Sessions & backups' },
      { id: 'feature-manager', label: 'Features', icon: Shield, desc: 'Feature flags' },
      { id: 'database-manager', label: 'Database', icon: Database, desc: 'Backup & optimize' },
      { id: 'api-manager', label: 'API keys', icon: Key, desc: 'Keys & webhooks' },
      { id: 'monitoring-center', label: 'Monitoring', icon: Activity, desc: 'Server health' },
      { id: 'audit', label: 'Audit log', icon: ShieldAlert, desc: 'Activity trail' },
      { id: 'logs', label: 'System logs', icon: Server, desc: 'Platform logs' },
      { id: 'developer-center', label: 'Developer', icon: Bot, desc: 'Flags & sandbox' },
      { id: 'global-search', label: 'Search', icon: Search, desc: 'Global search' },
      { id: 'users', label: 'Admin users', icon: UserPlus, desc: 'SaaS staff roles' },
      { id: 'owner-profile', label: 'Owner profile', icon: Shield, desc: 'Password & MFA' },
    ],
  },
];

export function getAdminModulesForRole(
  role: string,
  categories: AdminNavCategory[] = ADMIN_NAV_CATEGORIES
): AdminNavCategory[] {
  // SUPER_ADMIN + ADMIN (SaaS staff): full navigation
  if (
    role === 'SUPER_ADMIN' ||
    role === 'ADMIN' ||
    role === 'SAAS_OWNER' ||
    role === 'SAAS_ADMIN' ||
    role === 'OWNER'
  ) {
    return categories;
  }

  // SUPPORT
  const allow = new Set([
    'dashboard',
    'businesses',
    'customer-search',
    'employees',
    'suppliers',
    'support',
    'notifications',
    'global-search',
    'customer-portal',
    'supplier-portal',
  ]);
  return categories
    .map((cat) => ({ ...cat, modules: cat.modules.filter((m) => allow.has(m.id)) }))
    .filter((cat) => cat.modules.length > 0);
}
