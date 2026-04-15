export function normalizePhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (digits.startsWith('254') && digits.length === 12) {
    return `0${digits.slice(3)}`;
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return digits;
  }

  if (digits.length === 9) {
    return `0${digits}`;
  }

  return digits;
}

export function isValidPhoneNumber(value: string): boolean {
  return /^0\d{9}$/.test(normalizePhoneNumber(value));
}

export function getPhoneLookupVariants(value: string): string[] {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  const normalized = normalizePhoneNumber(trimmed);
  const variants = new Set<string>();

  if (trimmed) {
    variants.add(trimmed);
  }

  if (digits) {
    variants.add(digits);
  }

  if (normalized) {
    variants.add(normalized);

    if (/^0\d{9}$/.test(normalized)) {
      const subscriberNumber = normalized.slice(1);
      variants.add(`254${subscriberNumber}`);
      variants.add(`+254${subscriberNumber}`);
      variants.add(`${normalized.slice(0, 4)} ${normalized.slice(4, 7)} ${normalized.slice(7)}`);
    }
  }

  return [...variants];
}
