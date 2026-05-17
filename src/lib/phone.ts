import type { CountryKey } from '@/types';

const COUNTRY_DIAL_CODES: Record<CountryKey, string> = {
  kenya: '254',
  tanzania: '255',
  uganda: '256',
  rwanda: '250',
  ethiopia: '251',
  united_states: '1',
};

const COUNTRY_SUBSCRIBER_LENGTHS: Record<CountryKey, number> = {
  kenya: 9,
  tanzania: 9,
  uganda: 9,
  rwanda: 9,
  ethiopia: 9,
  united_states: 10,
};

const SUPPORTED_DIAL_CODES = Object.values(COUNTRY_DIAL_CODES);

function getSubscriberLengthForDialCode(dialCode: string): number | null {
  const country = (Object.keys(COUNTRY_DIAL_CODES) as CountryKey[]).find(
    (candidate) => COUNTRY_DIAL_CODES[candidate] === dialCode
  );

  return country ? COUNTRY_SUBSCRIBER_LENGTHS[country] : null;
}

function findDialCode(value: string): string | null {
  return (
    SUPPORTED_DIAL_CODES.find((dialCode) => {
      const subscriberLength = getSubscriberLengthForDialCode(dialCode);
      return Boolean(subscriberLength && value.length === dialCode.length + subscriberLength);
    }) ?? null
  );
}

function normalizeLocalPhoneNumber(value: string): string {
  if (value.startsWith('0') && value.length === 10) {
    return value;
  }

  if (value.length === 9) {
    return `0${value}`;
  }

  return value;
}

function getSubscriberNumber(value: string): string | null {
  const dialCode = findDialCode(value);
  if (!dialCode) {
    return null;
  }

  const subscriberNumber = value.slice(dialCode.length);
  return subscriberNumber.length === getSubscriberLengthForDialCode(dialCode)
    ? subscriberNumber
    : null;
}

export function getCountryDialCode(country: CountryKey | null | undefined): string | null {
  if (!country) {
    return null;
  }

  return COUNTRY_DIAL_CODES[country] ?? null;
}

export function normalizePhoneNumber(
  value: string,
  country?: CountryKey | null
): string {
  const digits = value.replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  const supportedDialCode = findDialCode(digits);
  if (supportedDialCode) {
    return digits;
  }

  const dialCode = getCountryDialCode(country ?? null);
  const subscriberLength = country ? COUNTRY_SUBSCRIBER_LENGTHS[country] : 9;
  if (dialCode) {
    if (country === 'united_states' && digits.length === subscriberLength) {
      return `${dialCode}${digits}`;
    }

    if (digits.startsWith('0') && digits.length === subscriberLength + 1) {
      return `${dialCode}${digits.slice(1)}`;
    }

    if (digits.length === subscriberLength) {
      return `${dialCode}${digits}`;
    }
  }

  return normalizeLocalPhoneNumber(digits);
}

export function isValidPhoneNumber(
  value: string,
  country?: CountryKey | null
): boolean {
  const normalized = normalizePhoneNumber(value, country);

  if (/^0\d{9}$/.test(normalized)) {
    return true;
  }

  const dialCode = findDialCode(normalized);
  return Boolean(
    dialCode && normalized.length === dialCode.length + (getSubscriberLengthForDialCode(dialCode) ?? 9)
  );
}

export function getPhoneLookupVariants(
  value: string,
  country?: CountryKey | null
): string[] {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  const normalized = normalizePhoneNumber(trimmed, country);
  const variants = new Set<string>();

  if (trimmed) {
    variants.add(trimmed);
  }

  if (digits) {
    variants.add(digits);
  }

  if (normalized) {
    variants.add(normalized);

    const subscriberNumber = getSubscriberNumber(normalized);
    if (subscriberNumber) {
      variants.add(`+${normalized}`);
      variants.add(`0${subscriberNumber}`);
    } else if (/^0\d{9}$/.test(normalized)) {
      const localSubscriber = normalized.slice(1);
      const dialCodes = country
        ? ([getCountryDialCode(country)].filter(Boolean) as string[])
        : SUPPORTED_DIAL_CODES;

      for (const candidateDialCode of dialCodes) {
        variants.add(`${candidateDialCode}${localSubscriber}`);
        variants.add(`+${candidateDialCode}${localSubscriber}`);
      }

      variants.add(`${normalized.slice(0, 4)} ${normalized.slice(4, 7)} ${normalized.slice(7)}`);
    }
  }

  return [...variants];
}
