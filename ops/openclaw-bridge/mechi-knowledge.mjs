const APP_URL = normalizeUrl(
  process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'https://mechi.club'
);

export const MECHI_ALLOWED_TOPICS = [
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

export const MECHI_BLOCKED_TOPICS = [
  'payments_or_refunds',
  'subscription_cancellation_or_billing_change',
  'tournament_payouts',
  'match_disputes_or_score_rulings',
  'moderation_or_ban_appeals',
  'account_or_profile_mutations',
];

const PLAN_LINES = [
  'Free: KES 0/month. 5 ranked matches per day, 1 selected game, tournament joins, 1-on-1 direct challenges, WhatsApp match alerts.',
  'Pro: KES 299/month or KES 2,990/year. 1-month Pro trial for new players, unlimited ranked matches, up to 3 selected games, tournament hosting, 5% tournament platform fee.',
  'Elite: KES 999/month or KES 9,990/year. Everything in Pro, 3 fee-free tournaments each month, auto or specified prize pools, priority matchmaking, unlimited history, CSV export, early access, streaming features.',
];

const ONE_ON_ONE_GAMES = [
  'eFootball 2026',
  'EA FC 26',
  'Mortal Kombat 11',
  'NBA 2K26',
  'Tekken 8',
  'Street Fighter 6',
  'CS2',
  'Valorant',
  'Mario Kart 8',
  'Super Smash Bros',
  'Ludo',
  'Rocket League',
];

const LOBBY_GAMES = [
  'Call of Duty: Mobile',
  'PUBG Mobile',
  'Free Fire',
  'Fortnite',
];

function normalizeUrl(value) {
  return String(value || '').replace(/\/+$/, '');
}

function describeUserSummary(userSummary) {
  if (!userSummary || typeof userSummary !== 'object') {
    return 'Known player context: no verified linked Mechi player is supplied in this request.';
  }

  const username = typeof userSummary.username === 'string' ? userSummary.username : 'unknown player';
  const plan = typeof userSummary.plan === 'string' ? userSummary.plan : 'unknown';
  const region = typeof userSummary.region === 'string' && userSummary.region ? userSummary.region : 'unknown';
  const games = Array.isArray(userSummary.selected_games) && userSummary.selected_games.length
    ? userSummary.selected_games.join(', ')
    : 'none supplied';
  const platforms = Array.isArray(userSummary.platforms) && userSummary.platforms.length
    ? userSummary.platforms.join(', ')
    : 'none supplied';

  return `Known player context: ${username} is on the ${plan} plan, region ${region}, selected games ${games}, platforms ${platforms}.`;
}

export function buildMechiBridgeContext(options = {}) {
  const channel = typeof options.channel === 'string' ? options.channel : 'support';
  const userLine = describeUserSummary(options.userSummary);
  const channelLine =
    channel === 'telegram'
      ? '- Telegram operator/control replies should be short, decisive, and ready to send.'
      : channel === 'instagram'
        ? '- Instagram can answer Mechi product questions from this context; account-specific actions should be escalated unless a verified linked profile is supplied.'
        : channel === 'email'
          ? '- Email support replies should read like concise customer service email drafts; account-sensitive requests should be escalated unless verified context is supplied.'
          : '- WhatsApp can show a linked player dashboard summary, start or leave ranked queue, list open lobbies, and list open tournaments.';

  return [
    `App: Mechi. Main site: ${APP_URL}. Pricing page: ${APP_URL}/pricing. Dashboard: ${APP_URL}/dashboard.`,
    'Mechi is a Kenyan gaming platform for matchmaking, tournaments, subscriptions, rewards, support, and operator dashboards.',
    'Plans:',
    ...PLAN_LINES.map((line) => `- ${line}`),
    'Core rules:',
    '- New players can get a 1-month Pro trial.',
    '- Direct 1-on-1 challenges are supported for compatible one-on-one games and platforms when both players are available.',
    '- Tournament hosting requires Pro or Elite.',
    '- Pro organizers use the standard 5% tournament platform fee; Elite gets the first 3 tournaments each month fee-free.',
    '- Pro and Elite organizers can run auto prize pools from paid entries or set a specified prize pool up front.',
    '- FC26 and eFootball score reporting use scorelines; matching reports can confirm a win or draw, mismatches go to dispute review.',
    '- Reward Points are Mechi in-product points; do not promise redemption completion, payout completion, or point restoration without verified state.',
    '- Never invent payment confirmations, refunds, payouts, ban outcomes, match rulings, or live registration counts.',
    '- For operator live tournament availability, the control agent should verify with npm run ops:tournaments -- --json before answering.',
    '- If you are not the control agent and cannot run live tools, route live tournament availability to control instead of sending operators to inspect the public page first.',
    channelLine,
    `Supported 1v1 games: ${ONE_ON_ONE_GAMES.join(', ')}.`,
    `Supported lobby games: ${LOBBY_GAMES.join(', ')}.`,
    userLine,
  ].join('\n');
}

export function buildMechiBridgeSystemPrompt(channel = 'support') {
  const channelLabel =
    channel === 'telegram'
      ? 'Telegram'
      : channel === 'instagram'
        ? 'Instagram DM'
        : channel === 'email'
          ? 'email support'
          : 'support';

  return [
    `You are the Mechi ${channelLabel} assistant running inside OpenClaw.`,
    'Answer from the supplied Mechi context when possible.',
    'Keep replies concise, practical, brand-safe, and mobile-friendly.',
    'Escalate or ask for one missing detail when the request is account-sensitive, risky, or unsupported by the supplied context.',
    'Do not invent product policy, prices, live counts, payment state, payouts, bans, refunds, tournament rulings, or account changes.',
  ].join('\n');
}
