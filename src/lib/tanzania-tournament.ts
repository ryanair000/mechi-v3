export const TZ_TOURNAMENT = {
  slug: 'days-esports-tanzania-efootball-mobile-2026',
  title: 'Days Esports Tanzania eFootball Mobile Tournament',
  swahiliTitle: 'Days Esports Tanzania eFootball Mobile Tournament',
  organizer: 'Days Esports / Tanzania Esports News',
  game: 'eFootball Mobile',
  entryFeeLabel: 'TSH 5,000',
  currency: 'TSH',
  entryFee: 5000,
  paymentMethod: 'Airtel Money',
  paymentNumber: '+255687698141',
  supportNumber: '+255687698141',
  whatsappNumber: '255687698141',
  eventPath: '/tz/esportsday',
  registrationPath: '/tz/esportsday/register',
  moderatorPath: '/moderators/tz',
} as const;

export type TanzaniaTournamentPaymentStatus =
  | 'pending_payment'
  | 'paid'
  | 'manual_review'
  | 'rejected';

export type TanzaniaTournamentRegistration = {
  id: string;
  event_slug: string;
  full_name: string;
  phone: string;
  whatsapp_number: string | null;
  email: string | null;
  in_game_username: string;
  konami_id: string | null;
  city: string | null;
  payment_status: TanzaniaTournamentPaymentStatus;
  payment_reference: string | null;
  payment_note: string | null;
  admin_note: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  created_at: string;
  updated_at: string;
};

export const TZ_TOURNAMENT_PAYMENT_STATUSES: TanzaniaTournamentPaymentStatus[] = [
  'pending_payment',
  'manual_review',
  'paid',
  'rejected',
];

export function getTanzaniaTournamentWhatsappUrl(message?: string) {
  const text =
    message ??
    `Habari Days Esports, nimejisajili kwenye ${TZ_TOURNAMENT.swahiliTitle}. Natuma screenshot ya malipo yangu ya ${TZ_TOURNAMENT.entryFeeLabel}.`;

  return `https://wa.me/${TZ_TOURNAMENT.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

export function getTanzaniaTournamentCallUrl() {
  return `tel:${TZ_TOURNAMENT.supportNumber}`;
}

export function cleanTanzaniaTournamentText(value: unknown, maxLength = 120) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

export function normalizeTanzaniaPhone(value: unknown) {
  return cleanTanzaniaTournamentText(value, 32).replace(/[^\d+]/g, '');
}

export function formatTanzaniaPaymentStatus(status: TanzaniaTournamentPaymentStatus) {
  switch (status) {
    case 'paid':
      return 'Imethibitishwa';
    case 'manual_review':
      return 'Inakaguliwa';
    case 'rejected':
      return 'Imekataliwa';
    case 'pending_payment':
    default:
      return 'Inasubiri malipo';
  }
}
