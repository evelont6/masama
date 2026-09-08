// IDR retains whole-rupiah settlement for existing bills.
export const CURRENCIES = ['IDR', 'USD', 'EUR', 'GBP', 'SGD', 'MYR', 'AUD', 'CAD', 'JPY', 'KRW', 'CNY', 'HKD', 'THB', 'INR', 'PHP', 'VND', 'AED', 'SAR', 'CHF', 'NZD', 'KWD', 'BHD'];

export function currencyDigits(currency = 'IDR') {
  if (currency === 'IDR') return 0;
  return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
}

export function formatMoney(value, currency = 'IDR', language = 'id') {
  const digits = currencyDigits(currency);
  return new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
    style: 'currency', currency, currencyDisplay: 'code',
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
}
