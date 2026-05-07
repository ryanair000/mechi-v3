export const MECHI_WEB_URL = 'https://mechi.club';
export const MECHI_PRIVACY_POLICY_URL = `${MECHI_WEB_URL}/privacy-policy`;
export const MECHI_TERMS_URL = `${MECHI_WEB_URL}/terms-of-service`;
export const MECHI_USER_DATA_DELETION_URL = `${MECHI_WEB_URL}/user-data-deletion`;
export const MECHI_SUPPORT_EMAIL = 'support@mechi.club';

export function buildSupportMailto(subject: string, body?: string) {
  const params = new URLSearchParams({
    subject,
  });

  if (body) {
    params.set('body', body);
  }

  return `mailto:${MECHI_SUPPORT_EMAIL}?${params.toString()}`;
}
