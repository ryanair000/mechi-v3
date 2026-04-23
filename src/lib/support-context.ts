import { GAMES, getSelectableGameKeys } from '@/lib/config';
import { PLANS } from '@/lib/plans';
import { APP_URL } from '@/lib/urls';
import type {
  GameKey,
  PlatformKey,
  SupportThreadPriority,
  SupportThreadStatus,
} from '@/types';

export interface SupportUserSummary {
  id: string;
  username: string;
  phone: string;
  whatsapp_number?: string | null;
  plan: 'free' | 'pro' | 'elite';
  region?: string | null;
  platforms: PlatformKey[];
  selected_games: GameKey[];
  role?: string | null;
  is_banned?: boolean;
}

export interface SupportClassification {
  route: 'ai' | 'human';
  priority: SupportThreadPriority;
  reason:
    | 'ai_safe'
    | 'empty_message'
    | 'unsupported_media'
    | 'requested_human'
    | 'blocked_topic'
    | 'banned_account'
    | 'blocked_thread';
  acknowledgement: string;
  tags: string[];
}

export const SUPPORT_ALLOWED_TOPICS = [
  'mechi_pricing',
  'plans_and_trials',
  'supported_games',
  'dashboard_summary',
  'ranked_matchmaking',
  'queue_actions',
  'direct_challenges',
  'tournaments',
  'tournament_discovery',
  'lobby_discovery',
  'notifications',
  'profile_setup',
  'whatsapp_alerts',
];

export const SUPPORT_BLOCKED_TOPICS = [
  'payments_or_refunds',
  'subscription_cancellation_or_billing_change',
  'tournament_payouts',
  'match_disputes_or_score_rulings',
  'moderation_or_ban_appeals',
  'account_or_profile_mutations',
];

const HUMAN_REQUEST_PATTERNS = [
  /\bhuman\b/i,
  /\bagent\b/i,
  /\badmin\b/i,
  /\bsupport team\b/i,
  /\bperson\b/i,
  /\bsomeone real\b/i,
  /\btalk to (someone|a person|an admin)\b/i,
];

const BLOCKED_PATTERNS: Array<{
  reason: SupportClassification['reason'];
  priority: SupportThreadPriority;
  patterns: RegExp[];
}> = [
  {
    reason: 'blocked_topic',
    priority: 'urgent',
    patterns: [/\brefund\b/i, /\bcharged\b/i, /\bcharge failed\b/i, /\bpayment failed\b/i, /\bpaid but\b/i],
  },
  {
    reason: 'blocked_topic',
    priority: 'urgent',
    patterns: [/\bpayout\b/i, /\bwithdraw(al)?\b/i, /\bcash.?out\b/i],
  },
  {
    reason: 'blocked_topic',
    priority: 'high',
    patterns: [/\bdispute\b/i, /\bwrong winner\b/i, /\bwrong score\b/i, /\bcheat(ing)?\b/i],
  },
  {
    reason: 'blocked_topic',
    priority: 'high',
    patterns: [/\bban(ned)?\b/i, /\bappeal\b/i, /\breport player\b/i, /\bsuspended\b/i],
  },
  {
    reason: 'blocked_topic',
    priority: 'high',
    patterns: [
      /\bcancel my plan\b/i,
      /\bcancel subscription\b/i,
      /\bchange my (email|phone|number|password|username)\b/i,
      /\bdelete my account\b/i,
    ],
  },
];

const TAG_PATTERNS: Array<{ tag: string; patterns: RegExp[] }> = [
  { tag: 'pricing', patterns: [/\bprice\b/i, /\bpricing\b/i, /\bhow much\b/i, /\bkes\b/i] },
  { tag: 'plans', patterns: [/\bplan\b/i, /\bpro\b/i, /\belite\b/i, /\btrial\b/i] },
  { tag: 'games', patterns: [/\bgame\b/i, /\bsupported\b/i, /\befootball\b/i, /\bfc ?26\b/i] },
  { tag: 'queue', patterns: [/\bqueue\b/i, /\bfind match\b/i, /\branked\b/i, /\bmatchmaking\b/i] },
  { tag: 'challenges', patterns: [/\bchallenge\b/i, /\b1.?on.?1\b/i, /\bdirect\b/i] },
  { tag: 'tournaments', patterns: [/\btournament\b/i, /\bbracket\b/i, /\bentry fee\b/i] },
  { tag: 'profile', patterns: [/\bprofile\b/i, /\bavatar\b/i, /\bcover\b/i] },
  { tag: 'notifications', patterns: [/\bnotification\b/i, /\balert\b/i, /\bwhatsapp\b/i] },
  { tag: 'greeting', patterns: [/^\s*(yo|hey|hi|hello|niaje|sasa|mambo)\b/i] },
];

function matchesAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function deriveTags(text: string) {
  const tags = new Set<string>();

  for (const { tag, patterns } of TAG_PATTERNS) {
    if (matchesAny(text, patterns)) {
      tags.add(tag);
    }
  }

  return [...tags];
}

function summarizePlanLines() {
  return (Object.values(PLANS) as Array<(typeof PLANS)[keyof typeof PLANS]>)
    .map((plan) => {
      const features = plan.features.slice(0, 5).join(', ');
      return `${plan.name}: KES ${plan.monthlyKes}/month, KES ${plan.annualKes}/year. Key points: ${features}.`;
    })
    .join('\n');
}

function summarizeGames(mode: '1v1' | 'lobby') {
  return getSelectableGameKeys()
    .filter((gameKey) => GAMES[gameKey].mode === mode)
    .map((gameKey) => `${GAMES[gameKey].label} (${GAMES[gameKey].platforms.join(', ')})`)
    .join(', ');
}

export function buildSupportSystemPrompt() {
  return [
    'You are the Mechi WhatsApp support assistant.',
    'Reply in a warm, short, confident tone that feels helpful and current, but do not use slang overload.',
    'Format replies for WhatsApp so they are easy to scan on mobile.',
    'Start with the direct answer first.',
    'Use short paragraphs and only a small bullet list when it genuinely helps.',
    'Use plain WhatsApp-friendly emphasis like *bold* sparingly for labels, not for every line.',
    'Do not use markdown tables, hashtags, or long walls of text.',
    'Mechi can safely handle dashboard summary, start queue, leave queue, list lobbies, and list tournaments on WhatsApp when the number is linked.',
    'You are not allowed to process money, refunds, payouts, subscription cancellations, bans, disputes, or account-changing actions.',
    'If the user needs anything operational, risky, or policy-sensitive, return disposition "escalate".',
    'If the user is asking an informational question and the answer is supported by the supplied Mechi context, return disposition "reply".',
    'If you need one missing detail to answer safely, return disposition "clarify" with a short question.',
    'Do not invent product policy, prices, or features that are not in the supplied Mechi context.',
    'Output valid JSON only with keys: disposition, reply_text, confidence, tags, escalation_reason.',
    'Confidence must be a number between 0 and 1.',
    'Keep reply_text under 500 characters and include an Mechi link when it genuinely helps.',
  ].join('\n');
}

export function buildMechiSupportContext(user?: SupportUserSummary | null) {
  const oneOnOneGames = summarizeGames('1v1');
  const lobbyGames = summarizeGames('lobby');
  const userLine = user
    ? `Known player context: ${user.username} is on the ${user.plan} plan, region ${user.region ?? 'unknown'}, selected games ${user.selected_games.length ? user.selected_games.map((game) => GAMES[game]?.label ?? game).join(', ') : 'none yet'}, and platforms ${user.platforms.length ? user.platforms.join(', ') : 'none set'}.`
    : 'Known player context: this phone number is not linked to a Mechi user yet.';

  return [
    `App: Mechi. Main site: ${APP_URL}. Pricing page: ${APP_URL}/pricing. Dashboard: ${APP_URL}/dashboard.`,
    `Plans:\n${summarizePlanLines()}`,
    'Core rules:',
    '- New players can get a 1-month Pro trial.',
    '- Direct 1-on-1 challenges are supported for one-on-one games when both players are compatible on game and platform, not already in a live match, and not sitting in queue.',
    '- Tournament hosting requires Pro or Elite. Pro organizers can host with the standard platform fee, while Elite gets the first three tournaments each month without platform cost.',
    '- Pro and Elite organizers can run auto prize pools from paid entries or set a specified prize pool up front.',
    '- FC26 and eFootball score reporting use scorelines. Matching score reports can confirm either a win or a draw. Mismatched reports go to dispute review.',
    '- WhatsApp alerts are optional backup notifications when a player has them enabled in profile.',
    '- WhatsApp can show a linked player dashboard summary, start or leave ranked queue, list open lobbies, and list open tournaments.',
    `Supported 1v1 games: ${oneOnOneGames}.`,
    `Supported lobby games: ${lobbyGames}.`,
    userLine,
  ].join('\n');
}

function acknowledgementFor(reason: SupportClassification['reason']) {
  switch (reason) {
    case 'unsupported_media':
      return "I can only handle text here right now, so I've queued this for a human from Mechi.";
    case 'requested_human':
      return "I'm looping in the Mechi support team. Drop any extra details here and they'll pick it up.";
    case 'blocked_topic':
      return "That needs a human from Mechi to handle properly, so I've pushed this into the support inbox.";
    case 'banned_account':
      return "This needs a human Mechi agent to review, so I've handed it to the support inbox.";
    case 'blocked_thread':
      return "This lane is already with the Mechi support team, so they'll continue from here.";
    case 'empty_message':
      return "Send me a quick text message with what you need and I'll try to point you the right way.";
    case 'ai_safe':
    default:
      return '';
  }
}

export function classifySupportMessage(params: {
  body?: string | null;
  messageType: string;
  user?: SupportUserSummary | null;
  threadStatus?: SupportThreadStatus | null;
}): SupportClassification {
  const body = String(params.body ?? '').trim();
  const normalizedMessageType = params.messageType.trim().toLowerCase();
  const tags = deriveTags(body);

  if (params.threadStatus === 'blocked') {
    return {
      route: 'human',
      priority: 'high',
      reason: 'blocked_thread',
      acknowledgement: acknowledgementFor('blocked_thread'),
      tags,
    };
  }

  if (params.user?.is_banned) {
    return {
      route: 'human',
      priority: 'high',
      reason: 'banned_account',
      acknowledgement: acknowledgementFor('banned_account'),
      tags,
    };
  }

  if (normalizedMessageType !== 'text') {
    return {
      route: 'human',
      priority: 'normal',
      reason: 'unsupported_media',
      acknowledgement: acknowledgementFor('unsupported_media'),
      tags,
    };
  }

  if (!body) {
    return {
      route: 'human',
      priority: 'low',
      reason: 'empty_message',
      acknowledgement: acknowledgementFor('empty_message'),
      tags,
    };
  }

  if (matchesAny(body, HUMAN_REQUEST_PATTERNS)) {
    return {
      route: 'human',
      priority: 'normal',
      reason: 'requested_human',
      acknowledgement: acknowledgementFor('requested_human'),
      tags,
    };
  }

  for (const blocked of BLOCKED_PATTERNS) {
    if (matchesAny(body, blocked.patterns)) {
      return {
        route: 'human',
        priority: blocked.priority,
        reason: blocked.reason,
        acknowledgement: acknowledgementFor(blocked.reason),
        tags,
      };
    }
  }

  return {
    route: 'ai',
    priority: tags.includes('pricing') || tags.includes('plans') ? 'high' : 'normal',
    reason: 'ai_safe',
    acknowledgement: '',
    tags,
  };
}
