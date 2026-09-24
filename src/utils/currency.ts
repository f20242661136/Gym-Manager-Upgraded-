import type { CurrencyCode } from '../types';

const currencyConfig: Record<CurrencyCode, { locale: string; symbol: string }> = {
  PKR: { locale: 'en-PK', symbol: 'Rs.' },
  INR: { locale: 'en-IN', symbol: 'â‚¹' },
};

export function formatMoney(amount: number, currency: CurrencyCode = 'PKR'): string {
  const config = currencyConfig[currency] ?? currencyConfig.PKR;
  const value = Number.isFinite(amount) ? amount : 0;

  return `${config.symbol} ${value.toLocaleString(config.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}