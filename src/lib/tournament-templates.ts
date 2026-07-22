import type { GameMode, TournamentPrizePoolMode } from '@/types';

export type TournamentTemplateKey =
  | 'one_v_one_knockout'
  | 'creator_cup'
  | 'sponsored_free_cup'
  | 'mobile_battle_royale';

export type TournamentCheckInPolicy = 'one_hour' | 'thirty_minutes' | 'manual';
export type TournamentProofType = 'score_report' | 'screenshot' | 'video' | 'admin_record';

export type TournamentRegistrationRequirement =
  | 'account'
  | 'game_id'
  | 'whatsapp'
  | 'social_follow'
  | 'country_region';

export type TournamentTemplate = {
  key: TournamentTemplateKey;
  title: string;
  summary: string;
  enabled: boolean;
  supportedGameModes: GameMode[];
  defaultSize: 4 | 8 | 16;
  defaultEntryType: 'paid' | 'free';
  defaultPrizePoolMode: TournamentPrizePoolMode;
  defaultCheckInPolicy: TournamentCheckInPolicy;
  defaultProofType: TournamentProofType;
  defaultDisputeWindowMinutes: number;
  defaultRequirements: TournamentRegistrationRequirement[];
  defaultRules: string;
};

export const TOURNAMENT_TEMPLATES: TournamentTemplate[] = [
  {
    key: 'one_v_one_knockout',
    title: '1v1 Knockout',
    summary: 'Fast bracket for FC, eFootball, fighters, and other direct match games.',
    enabled: true,
    supportedGameModes: ['1v1'],
    defaultSize: 8,
    defaultEntryType: 'paid',
    defaultPrizePoolMode: 'auto',
    defaultCheckInPolicy: 'one_hour',
    defaultProofType: 'score_report',
    defaultDisputeWindowMinutes: 20,
    defaultRequirements: ['account', 'game_id', 'country_region'],
    defaultRules: 'Single elimination. Best of 1 unless the organizer says otherwise. Matching score reports confirm the result. Mismatched reports go to dispute review.',
  },
  {
    key: 'creator_cup',
    title: 'Creator Cup',
    summary: 'Community bracket with social coordination, stream-friendly schedule, and proof rules.',
    enabled: true,
    supportedGameModes: ['1v1'],
    defaultSize: 16,
    defaultEntryType: 'paid',
    defaultPrizePoolMode: 'auto',
    defaultCheckInPolicy: 'one_hour',
    defaultProofType: 'screenshot',
    defaultDisputeWindowMinutes: 30,
    defaultRequirements: ['account', 'game_id', 'whatsapp', 'social_follow', 'country_region'],
    defaultRules: 'Single elimination. Players must use the registered game ID, join organizer comms on time, and submit screenshot proof when requested.',
  },
  {
    key: 'sponsored_free_cup',
    title: 'Sponsored Free Cup',
    summary: 'Free-entry cup with a fixed sponsor-backed prize pool and clear eligibility terms.',
    enabled: true,
    supportedGameModes: ['1v1'],
    defaultSize: 16,
    defaultEntryType: 'free',
    defaultPrizePoolMode: 'specified',
    defaultCheckInPolicy: 'one_hour',
    defaultProofType: 'screenshot',
    defaultDisputeWindowMinutes: 30,
    defaultRequirements: ['account', 'game_id', 'whatsapp', 'social_follow', 'country_region'],
    defaultRules: 'Free entry. Sponsor prize terms apply. Players must check in, use the registered game ID, and submit proof for result review.',
  },
  {
    key: 'mobile_battle_royale',
    title: 'Mobile Battle Royale',
    summary: 'Lobby series template for PUBG Mobile, CODM, and Free Fire room events.',
    enabled: false,
    supportedGameModes: ['lobby'],
    defaultSize: 16,
    defaultEntryType: 'free',
    defaultPrizePoolMode: 'specified',
    defaultCheckInPolicy: 'manual',
    defaultProofType: 'admin_record',
    defaultDisputeWindowMinutes: 20,
    defaultRequirements: ['account', 'game_id', 'whatsapp', 'country_region'],
    defaultRules: 'Room credentials are released by the organizer. Standings use admin records and screenshot proof. This template needs the generic lobby-series engine before public self-serve use.',
  },
];

export const TOURNAMENT_TEMPLATE_BY_KEY = TOURNAMENT_TEMPLATES.reduce(
  (templates, template) => {
    templates[template.key] = template;
    return templates;
  },
  {} as Record<TournamentTemplateKey, TournamentTemplate>
);

export const TOURNAMENT_CHECK_IN_POLICIES: Array<{
  key: TournamentCheckInPolicy;
  label: string;
  description: string;
}> = [
  {
    key: 'one_hour',
    label: '1 hour before kickoff',
    description: 'Best default for brackets that need player reminders and no-show cleanup.',
  },
  {
    key: 'thirty_minutes',
    label: '30 minutes before kickoff',
    description: 'Useful for smaller cups with players already waiting.',
  },
  {
    key: 'manual',
    label: 'Manual organizer check-in',
    description: 'Organizer confirms readiness through community channels.',
  },
];

export const TOURNAMENT_PROOF_TYPES: Array<{
  key: TournamentProofType;
  label: string;
  description: string;
}> = [
  {
    key: 'score_report',
    label: 'Matching score reports',
    description: 'Both players report the score inside Mechi.',
  },
  {
    key: 'screenshot',
    label: 'Screenshot proof',
    description: 'Players keep screenshot evidence for review or disputes.',
  },
  {
    key: 'video',
    label: 'Video or stream proof',
    description: 'Best for finals, sponsor matches, and high-risk disputes.',
  },
  {
    key: 'admin_record',
    label: 'Admin record',
    description: 'Organizer or moderator enters the official result.',
  },
];

export const TOURNAMENT_REQUIREMENTS: Array<{
  key: TournamentRegistrationRequirement;
  label: string;
}> = [
  { key: 'account', label: 'Mechi account' },
  { key: 'game_id', label: 'Game ID/gamer tag' },
  { key: 'whatsapp', label: 'WhatsApp contact' },
  { key: 'social_follow', label: 'Social follow' },
  { key: 'country_region', label: 'Country/region eligibility' },
];

const TEMPLATE_KEYS = new Set(TOURNAMENT_TEMPLATES.map((template) => template.key));
const CHECK_IN_POLICY_KEYS = new Set(TOURNAMENT_CHECK_IN_POLICIES.map((policy) => policy.key));
const PROOF_TYPE_KEYS = new Set(TOURNAMENT_PROOF_TYPES.map((proofType) => proofType.key));
const REQUIREMENT_KEYS = new Set(TOURNAMENT_REQUIREMENTS.map((requirement) => requirement.key));

export function isTournamentTemplateKey(value: unknown): value is TournamentTemplateKey {
  return typeof value === 'string' && TEMPLATE_KEYS.has(value as TournamentTemplateKey);
}

export function getTournamentTemplate(value: unknown): TournamentTemplate {
  if (isTournamentTemplateKey(value)) {
    return TOURNAMENT_TEMPLATE_BY_KEY[value];
  }

  return TOURNAMENT_TEMPLATE_BY_KEY.one_v_one_knockout;
}

export function normalizeTournamentCheckInPolicy(value: unknown): TournamentCheckInPolicy {
  return typeof value === 'string' && CHECK_IN_POLICY_KEYS.has(value as TournamentCheckInPolicy)
    ? (value as TournamentCheckInPolicy)
    : 'one_hour';
}

export function normalizeTournamentProofType(value: unknown): TournamentProofType {
  return typeof value === 'string' && PROOF_TYPE_KEYS.has(value as TournamentProofType)
    ? (value as TournamentProofType)
    : 'score_report';
}

export function normalizeTournamentRequirements(
  value: unknown
): TournamentRegistrationRequirement[] {
  if (!Array.isArray(value)) {
    return ['account', 'game_id'];
  }

  const requirements = value.filter(
    (item): item is TournamentRegistrationRequirement =>
      typeof item === 'string' && REQUIREMENT_KEYS.has(item as TournamentRegistrationRequirement)
  );

  return requirements.length > 0 ? [...new Set(requirements)] : ['account', 'game_id'];
}

export function getTournamentCheckInPolicyLabel(value: TournamentCheckInPolicy) {
  return TOURNAMENT_CHECK_IN_POLICIES.find((policy) => policy.key === value)?.label ?? value;
}

export function getTournamentProofTypeLabel(value: TournamentProofType) {
  return TOURNAMENT_PROOF_TYPES.find((proofType) => proofType.key === value)?.label ?? value;
}

export function getTournamentRequirementLabel(value: TournamentRegistrationRequirement) {
  return TOURNAMENT_REQUIREMENTS.find((requirement) => requirement.key === value)?.label ?? value;
}

export function buildTournamentRules(params: {
  template: TournamentTemplate;
  customRules: string;
  checkInPolicy: TournamentCheckInPolicy;
  proofType: TournamentProofType;
  disputeWindowMinutes: number;
  prizeTerms: string;
  requirements: TournamentRegistrationRequirement[];
}) {
  const customRules = params.customRules.trim();
  const prizeTerms = params.prizeTerms.trim();
  const disputeWindowMinutes = Math.min(
    240,
    Math.max(5, Math.round(params.disputeWindowMinutes))
  );

  return [
    `Template: ${params.template.title}`,
    `Format: ${params.template.summary}`,
    `Check-in: ${getTournamentCheckInPolicyLabel(params.checkInPolicy)}`,
    `Result proof: ${getTournamentProofTypeLabel(params.proofType)}`,
    `Dispute window: ${disputeWindowMinutes} minutes after result submission`,
    `Requirements: ${params.requirements.map(getTournamentRequirementLabel).join(', ')}`,
    prizeTerms ? `Prize terms: ${prizeTerms}` : null,
    customRules ? `Organizer rules: ${customRules}` : `Organizer rules: ${params.template.defaultRules}`,
  ]
    .filter(Boolean)
    .join('\n');
}
