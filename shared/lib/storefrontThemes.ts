/** Ready website templates for Bizora storefront */
export type StorefrontThemeId = 'minimal' | 'fashion' | 'grocery' | 'tech' | 'classic';

export interface StorefrontTheme {
  id: StorefrontThemeId;
  name: string;
  nameBn: string;
  description: string;
  primary: string;
  accent: string;
  heroStyle: 'centered' | 'split' | 'banner';
  previewLabel: string;
}

export const STOREFRONT_THEMES: StorefrontTheme[] = [
  {
    id: 'minimal',
    name: 'Minimal',
    nameBn: 'মিনিমাল',
    description: 'Clean white shop — fashion & lifestyle',
    primary: '#0f172a',
    accent: '#6366f1',
    heroStyle: 'centered',
    previewLabel: 'Clean · Fashion',
  },
  {
    id: 'fashion',
    name: 'Boutique',
    nameBn: 'বুটিক',
    description: 'Bold typography, lookbook grid',
    primary: '#831843',
    accent: '#f43f5e',
    heroStyle: 'split',
    previewLabel: 'Fashion · Bold',
  },
  {
    id: 'grocery',
    name: 'Fresh Mart',
    nameBn: 'ফ্রেশ মার্ট',
    description: 'Green accents for grocery & daily needs',
    primary: '#14532d',
    accent: '#22c55e',
    heroStyle: 'banner',
    previewLabel: 'Grocery · Green',
  },
  {
    id: 'tech',
    name: 'Tech Hub',
    nameBn: 'টেক হাব',
    description: 'Dark modern store for electronics',
    primary: '#020617',
    accent: '#06b6d4',
    heroStyle: 'centered',
    previewLabel: 'Electronics · Dark',
  },
  {
    id: 'classic',
    name: 'Classic Store',
    nameBn: 'ক্লাসিক স্টোর',
    description: 'Traditional retail layout, trust-focused',
    primary: '#1e3a5f',
    accent: '#d97706',
    heroStyle: 'banner',
    previewLabel: 'Retail · Classic',
  },
];

export function getTheme(id?: string | null): StorefrontTheme {
  return STOREFRONT_THEMES.find((t) => t.id === id) || STOREFRONT_THEMES[0];
}
