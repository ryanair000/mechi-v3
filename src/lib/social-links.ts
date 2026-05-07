export const PLAYMECHI_SOCIAL_HANDLE = 'playmechi';

export const PLAYMECHI_WHATSAPP_GROUP_URL =
  'https://chat.whatsapp.com/GRquLpTxzQ35er85N33Ec7?mode=gi_t';

export const CUSTOMER_WHATSAPP_SUPPORT_NUMBER = '+254733638841';
export const CUSTOMER_WHATSAPP_SUPPORT_NUMBER_LABEL = '+254 733 638 841';
export const CUSTOMER_WHATSAPP_SUPPORT_URL = 'https://wa.me/254733638841';

export function getCustomerWhatsAppSupportUrl(message?: string) {
  if (!message) {
    return CUSTOMER_WHATSAPP_SUPPORT_URL;
  }

  return `${CUSTOMER_WHATSAPP_SUPPORT_URL}?text=${encodeURIComponent(message)}`;
}
