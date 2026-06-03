import { getCountryCurrency } from '@/lib/location';
import type { CountryKey } from '@/types';

const KES_TO_LOCAL_RATE: Partial<Record<CountryKey, number>> = {
  kenya: 1,
  tanzania: 18,
  uganda: 27,
  rwanda: 10,
  ethiopia: 1.7,
  ghana: 0.12,
  nigeria: 12,
  south_africa: 0.14,
  zambia: 0.2,
  botswana: 0.11,
  egypt: 0.38,
  morocco: 0.077,
};

export function getApproximateLocalAmount(params: {
  amountKes: number;
  country: CountryKey | null | undefined;
}) {
  const rate = params.country ? KES_TO_LOCAL_RATE[params.country] : null;
  if (!rate) {
    return null;
  }

  const currency = getCountryCurrency(params.country);
  const amount = Math.max(0, Math.round(params.amountKes * rate));

  return {
    amount,
    code: currency.code,
    label: `${currency.symbol} ${amount.toLocaleString()}`,
  };
}

export function getPaymentCurrencyCopy(country: CountryKey | null | undefined) {
  const currency = getCountryCurrency(country ?? null);
  return {
    currencyCode: currency.code,
    methodCopy:
      country === 'kenya'
        ? 'Pay securely by card through Paystack. M-Pesa support is being added.'
        : 'Pay securely by card through Paystack.',
  };
}
