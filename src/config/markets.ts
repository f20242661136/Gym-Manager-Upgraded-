import type { CountryCode, CurrencyCode, PaymentMethod } from '../types';

export interface MarketConfig {
  country: CountryCode;
  countryName: string;
  currency: CurrencyCode;
  currencySymbol: string;
  callingCode: string;
  timezone: string;
  locale: string;
  paymentMethods: Array<{
    value: PaymentMethod;
    label: string;
  }>;
}

export const MARKET_CONFIG: Record<CountryCode, MarketConfig> = {
  PK: {
    country: 'PK',
    countryName: 'Pakistan',
    currency: 'PKR',
    currencySymbol: 'Rs.',
    callingCode: '+92',
    timezone: 'Asia/Karachi',
    locale: 'en-PK',
    paymentMethods: [
      { value: 'cash', label: 'Cash' },
      { value: 'raast', label: 'Raast' },
      { value: 'easypaisa', label: 'Easypaisa' },
      { value: 'jazzcash', label: 'JazzCash' },
      { value: 'bank_transfer', label: 'Bank Transfer' },
      { value: 'card', label: 'Card' },
      { value: 'other', label: 'Other' },
    ],
  },
  IN: {
    country: 'IN',
    countryName: 'India',
    currency: 'INR',
    currencySymbol: 'â‚¹',
    callingCode: '+91',
    timezone: 'Asia/Kolkata',
    locale: 'en-IN',
    paymentMethods: [
      { value: 'cash', label: 'Cash' },
      { value: 'upi', label: 'UPI' },
      { value: 'bank_transfer', label: 'Bank Transfer' },
      { value: 'card', label: 'Card' },
      { value: 'other', label: 'Other' },
    ],
  },
};

export const getMarketConfig = (country: CountryCode = 'PK'): MarketConfig =>
  MARKET_CONFIG[country];