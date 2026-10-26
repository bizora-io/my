/**
 * Frontend Navigation Configuration & Lucide Icon Resolver
 */
import React from 'react';
import {
  LayoutDashboard, ShoppingBag, ShoppingCart, Zap, RotateCcw, FileText,
  ChefHat, ClipboardList, Package, CalendarClock, Box, Tags, Grid,
  AlertTriangle, ArrowRightLeft, Factory, Wallet, BookOpen, DollarSign,
  Landmark, PiggyBank, CreditCard, FileSpreadsheet, Briefcase, Users,
  Building, ShieldCheck, Hotel, Truck, UserCheck, FolderGit2, Award,
  Globe, MessageSquare, Megaphone, HeadphonesIcon, ScanText, Bot, Settings,
  Store, Crown, Printer, Trash2, HelpCircle
} from 'lucide-react';

export * from '@shared/config/navigation';

export const ICON_MAP: Record<string, React.ComponentType<any>> = {
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  Zap,
  RotateCcw,
  FileText,
  ChefHat,
  ClipboardList,
  Package,
  CalendarClock,
  Box,
  Tags,
  Grid,
  AlertTriangle,
  ArrowRightLeft,
  Factory,
  Wallet,
  BookOpen,
  DollarSign,
  Landmark,
  PiggyBank,
  CreditCard,
  FileSpreadsheet,
  Briefcase,
  Users,
  Building,
  ShieldCheck,
  Hotel,
  Truck,
  UserCheck,
  FolderGit2,
  Award,
  Globe,
  MessageSquare,
  Megaphone,
  HeadphonesIcon,
  ScanText,
  Bot,
  Settings,
  Store,
  Crown,
  Printer,
  Trash2
};

export function getNavIcon(iconName: string): React.ComponentType<any> {
  return ICON_MAP[iconName] || HelpCircle;
}

