
import React from 'react';

export enum AppLanguage {
  ENGLISH = 'en',
  SPANISH = 'es',
  FRENCH = 'fr',
  GERMAN = 'de',
  JAPANESE = 'ja',
  CHINESE = 'zh',
  HINDI = 'hi',
  ARABIC = 'ar',
  PORTUGUESE = 'pt',
  RUSSIAN = 'ru',
  BENGALI = 'bn',
  URDU = 'ur',
  INDONESIAN = 'id',
  TURKISH = 'tr',
  ITALIAN = 'it',
  KOREAN = 'ko',
  VIETNAMESE = 'vi',
  THAI = 'th',
  DUTCH = 'nl',
  POLISH = 'pl',
  FILIPINO = 'tl',
  MALAY = 'ms',
  PERSIAN = 'fa',
  SWAHILI = 'sw',
  TAMIL = 'ta',
  TELUGU = 'te',
  MARATHI = 'mr',
  GUJARATI = 'gu',
  PUNJABI = 'pa',
  UKRAINIAN = 'uk',
  ROMANIAN = 'ro',
  GREEK = 'el',
  CZECH = 'cs',
  HUNGARIAN = 'hu',
  SWEDISH = 'sv',
  NORWEGIAN = 'no',
  DANISH = 'da',
  FINNISH = 'fi',
  HEBREW = 'he'
}

export enum Currency {
  USD = 'USD', // United States Dollar (BASE)
  EUR = 'EUR', // Euro
  GBP = 'GBP', // British Pound Sterling
  JPY = 'JPY', // Japanese Yen
  CAD = 'CAD', // Canadian Dollar
  AUD = 'AUD', // Australian Dollar
  CNY = 'CNY', // Chinese Yuan
  INR = 'INR', // Indian Rupee
  BDT = 'BDT', // Bangladeshi Taka
  PKR = 'PKR', // Pakistani Rupee
  SAR = 'SAR', // Saudi Riyal
  AED = 'AED', // United Arab Emirates Dirham
  RUB = 'RUB', // Russian Ruble
  BRL = 'BRL', // Brazilian Real
  MXN = 'MXN', // Mexican Peso
  TRY = 'TRY', // Turkish Lira
  IDR = 'IDR', // Indonesian Rupiah
  KRW = 'KRW', // South Korean Won
  VND = 'VND', // Vietnamese Dong
  THB = 'THB', // Thai Baht
  ZAR = 'ZAR', // South African Rand
  NGN = 'NGN', // Nigerian Naira
  PHP = 'PHP', // Philippine Peso
  MYR = 'MYR', // Malaysian Ringgit
  SGD = 'SGD', // Singapore Dollar
  HKD = 'HKD', // Hong Kong Dollar
  NZD = 'NZD', // New Zealand Dollar
  CHF = 'CHF', // Swiss Franc
  SEK = 'SEK', // Swedish Krona
  NOK = 'NOK', // Norwegian Krone
  DKK = 'DKK', // Danish Krone
  PLN = 'PLN', // Polish Zloty
  HUF = 'HUF', // Hungarian Forint
  CZK = 'CZK', // Czech Koruna
  ILS = 'ILS', // Israeli New Shekel
  EGP = 'EGP', // Egyptian Pound
  KWD = 'KWD', // Kuwaiti Dinar
  QAR = 'QAR', // Qatari Riyal
  OMR = 'OMR', // Omani Rial
  LKR = 'LKR', // Sri Lankan Rupee
  NPR = 'NPR', // Nepalese Rupee
  KES = 'KES', // Kenyan Shilling
  // Additional
  AFN = 'AFN', // Afghan Afghani
  ALL = 'ALL', // Albanian Lek
  AMD = 'AMD', // Armenian Dram
  ANG = 'ANG', // Netherlands Antillean Guilder
  AOA = 'AOA', // Angolan Kwanza
  ARS = 'ARS', // Argentine Peso
  AWG = 'AWG', // Aruban Florin
  AZN = 'AZN', // Azerbaijani Manat
  BAM = 'BAM', // Bosnia-Herzegovina Convertible Mark
  BBD = 'BBD', // Barbadian Dollar
  BGN = 'BGN', // Bulgarian Lev
  BHD = 'BHD', // Bahraini Dinar
  BIF = 'BIF', // Burundian Franc
  BMD = 'BMD', // Bermudian Dollar
  BND = 'BND', // Brunei Dollar
  BOB = 'BOB', // Bolivian Boliviano
  BSD = 'BSD', // Bahamian Dollar
  BTN = 'BTN', // Bhutanese Ngultrum
  BWP = 'BWP', // Botswanan Pula
  BYN = 'BYN', // Belarusian Ruble
  BZD = 'BZD', // Belize Dollar
  CDF = 'CDF', // Congolese Franc
  CLP = 'CLP', // Chilean Peso
  COP = 'COP', // Colombian Peso
  CRC = 'CRC', // Costa Rican Colón
  CUP = 'CUP', // Cuban Peso
  CVE = 'CVE', // Cape Verdean Escudo
  DJF = 'DJF', // Djiboutian Franc
  DOP = 'DOP', // Dominican Peso
  DZD = 'DZD', // Algerian Dinar
  ERN = 'ERN', // Eritrean Nakfa
  ETB = 'ETB', // Ethiopian Birr
  FJD = 'FJD', // Fijian Dollar
  GEL = 'GEL', // Georgian Lari
  GHS = 'GHS', // Ghanaian Cedi
  GMD = 'GMD', // Gambian Dalasi
  GNF = 'GNF', // Guinean Franc
  GTQ = 'GTQ', // Guatemalan Quetzal
  GYD = 'GYD', // Guyanaese Dollar
  HNL = 'HNL', // Honduran Lempira
  HRK = 'HRK', // Croatian Kuna
  HTG = 'HTG', // Haitian Gourde
  IQD = 'IQD', // Iraqi Dinar
  IRR = 'IRR', // Iranian Rial
  ISK = 'ISK', // Icelandic Króna
  JMD = 'JMD', // Jamaican Dollar
  JOD = 'JOD', // Jordanian Dinar
  KGS = 'KGS', // Kyrgystani Som
  KHR = 'KHR', // Cambodian Riel
  KMF = 'KMF', // Comorian Franc
  KPW = 'KPW', // North Korean Won
  KYD = 'KYD', // Cayman Islands Dollar
  KZT = 'KZT', // Kazakhstani Tenge
  LAK = 'LAK', // Laotian Kip
  LBP = 'LBP', // Lebanese Pound
  LRD = 'LRD', // Liberian Dollar
  LSL = 'LSL', // Lesotho Loti
  LYD = 'LYD', // Libyan Dinar
  MAD = 'MAD', // Moroccan Dirham
  MDL = 'MDL', // Moldovan Leu
  MGA = 'MGA', // Malagasy Ariary
  MKD = 'MKD', // Macedonian Denar
  MMK = 'MMK', // Myanmar Kyat
  MNT = 'MNT', // Mongolian Tugrik
  MOP = 'MOP', // Macanese Pataca
  MUR = 'MUR', // Mauritian Rupee
  MVR = 'MVR', // Maldivian Rufiyaa
  MWK = 'MWK', // Malawian Kwacha
  MZN = 'MZN', // Mozambican Metical
  NAD = 'NAD', // Namibian Dollar
  NIO = 'NIO', // Nicaraguan Córdoba
  PAB = 'PAB', // Panamanian Balboa
  PEN = 'PEN', // Peruvian Sol
  PGK = 'PGK', // Papua New Guinean Kina
  PYG = 'PYG', // Paraguayan Guarani
  RON = 'RON', // Romanian Leu
  RSD = 'RSD', // Serbian Dinar
  RWF = 'RWF', // Rwandan Franc
  SBD = 'SBD', // Solomon Islands Dollar
  SCR = 'SCR', // Seychellois Rupee
  SDG = 'SDG', // Sudanese Pound
  SOS = 'SOS', // Somali Shilling
  SRD = 'SRD', // Surinamese Dollar
  SSP = 'SSP', // South Sudanese Pound
  SYP = 'SYP', // Syrian Pound
  SZL = 'SZL', // Swazi Lilangeni
  TJS = 'TJS', // Tajikistani Somoni
  TMT = 'TMT', // Turkmenistani Manat
  TND = 'TND', // Tunisian Dinar
  TOP = 'TOP', // Tongan Paʻanga
  TTD = 'TTD', // Trinidad and Tobago Dollar
  TWD = 'TWD', // New Taiwan Dollar
  TZS = 'TZS', // Tanzanian Shilling
  UAH = 'UAH', // Ukrainian Hryvnia
  UGX = 'UGX', // Ugandan Shilling
  UYU = 'UYU', // Uruguayan Peso
  UZS = 'UZS', // Uzbekistan Som
  VES = 'VES', // Venezuelan Bolívar
  XAF = 'XAF', // CFA Franc BEAC
  XCD = 'XCD', // East Caribbean Dollar
  XOF = 'XOF', // CFA Franc BCEAO
  XPF = 'XPF', // CFP Franc
  YER = 'YER', // Yemeni Rial
  ZMW = 'ZMW', // Zambian Kwacha
  ZWL = 'ZWL', // Zimbabwean Dollar
}

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

export enum UserRole {
  // SaaS Level
  SAAS_OWNER = 'SAAS_OWNER',
  SAAS_ADMIN = 'SAAS_ADMIN',
  
  // Business Level
  SHOP_OWNER = 'SHOP_OWNER', // Previously OWNER
  OWNER = 'OWNER', // Kept for backward compatibility
  
  // Staff
  ADMIN = 'ADMIN', // Shop Admin
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  SALES = 'SALES',
  STOCK_MANAGER = 'STOCK_MANAGER',

  // Customer
  CUSTOMER = 'CUSTOMER',

  // Employee Portal Role
  EMPLOYEE = 'EMPLOYEE',

  // Supplier
  SUPPLIER = 'SUPPLIER'
}

export interface EmploymentRecord {
  businessId: string;
  businessName: string;
  role: string;
  joiningDate: string;
  resignationDate?: string;
  basicSalary: number;
  salesTarget?: number;
  commissionRate?: number;
  status: 'Active' | 'Inactive';
  permissions?: string[];
  attendance?: Record<string, { status: 'Present' | 'Absent' | 'Leave' | 'Half Day', checkIn?: string, checkOut?: string }>;
  performance?: {
      rating: number; // 1-5
      reviews: { date: string, comment: string, rating: number }[];
  };
}

export interface GlobalEmployee {
  mobile: string; // GLOBAL UNIQUE ID (Phone number)
  name: string;
  pin: string;
  status: 'Active' | 'Inactive';
  employments: EmploymentRecord[];
}

export enum Permission {
  VIEW_DASHBOARD = 'VIEW_DASHBOARD',
  MANAGE_PRODUCTS = 'MANAGE_PRODUCTS',
  MAKE_SALES = 'MAKE_SALES',
  MAKE_PURCHASES = 'MAKE_PURCHASES',
  VIEW_REPORTS = 'VIEW_REPORTS',
  MANAGE_STORES = 'MANAGE_STORES',
  MANAGE_USERS = 'MANAGE_USERS',
  MANAGE_SETTINGS = 'MANAGE_SETTINGS',
  DELETE_RECORDS = 'DELETE_RECORDS',
  VIEW_LEDGERS = 'VIEW_LEDGERS'
}

export interface UserSession {
  id: string;
  userId: string;
  device: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface LoginHistoryEntry {
  id: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED';
  method: 'PASSWORD' | 'PIN' | 'OTP' | 'SOCIAL';
  device: string;
  ip: string;
}

export interface Staff {
  id: string;
  storeId?: string;
  name: string;
  role: string;
  roleTemplateId?: string; // e.g., 'Manager', 'Sales', 'Stock'
  pin: string;
  password?: string;
  email?: string;
  mobile?: string;
  permissions: string[]; // List of permission keys e.g., 'sale.create', 'stock.view'
  status: 'Active' | 'Inactive';
  lastLogin?: string;
  // HR Fields
  joiningDate?: string;
  basicSalary?: number;
  salesTarget?: number; // Monthly sales target
  commissionRate?: number; // Commission percentage (e.g., 5 for 5%)
  designationId?: string; // job title, distinct from the system permission `role` above
  departmentId?: string;
  shiftId?: string; // WorkShift id
  attendance?: Record<string, { status: 'Present' | 'Absent' | 'Leave' | 'Half Day', checkIn?: string, checkOut?: string }>; // Key: YYYY-MM-DD
  performance?: {
      rating: number; // 1-5
      reviews: { date: string, comment: string, rating: number }[];
  };
  lastLocation?: { lat: number, lng: number, address: string, timestamp: string };
  locationHistory?: { lat: number, lng: number, address: string, timestamp: string }[];
}

export interface AppLog {
  id: string;
  staffName: string;
  action: string;
  module: string;
  timestamp: string;
  details?: string;
}

export interface ActivityLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  timestamp: string;
  details?: string;
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'MOBILE' | 'DESKTOP' | 'TABLET';
  lastUsed: string;
  isTrusted: boolean;
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
  maps?: {
    uri?: string;
    title?: string;
    placeAnswerSources?: {
      reviewSnippets?: {
        reviewText?: string;
        authorAttribution?: {
          displayName?: string;
        }
      }[]
    }
  }
}

export interface User {
  id: string;
  businessName: string;
  owner: string;
  mobile: string;
  email: string;
  plan: string;
  status: string;
  expiry: string;
  totalSell: number;
  totalBuy: number;
  address: string;
  businessType: string;
  signupDate: string;
  password?: string;
  loginCount: number;
  lastActive: string;
  lastIp: string;
  totalStores: number;
  totalBusiness: number;
  assignedAdminId: string | null;
  features: string[];
  temporaryFeatures: {
    feature: string;
    expiry: string;
    status: 'pending' | 'approved' | 'rejected';
  }[];
  isImpersonated?: boolean;
  storageLimit?: number;
  employeeLimit?: number;
  branchLimit?: number;
  employeeCount?: number;
  branchCount?: number;
  enabledFeatures?: string[];
}
