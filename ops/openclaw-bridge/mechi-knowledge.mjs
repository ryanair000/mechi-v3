const APP_URL = normalizeUrl(
  process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'https://mechi.club'
);
const GAME_ENQUIRIES_WHATSAPP = '+254104003156';
const PLAYMECHI_REGISTER_URL = `${APP_URL}/playmechi/register`;
const PLAYMECHI_PAGE_URL = `${APP_URL}/playmechi`;
const PLAYMECHI_YOUTUBE_URL = 'https://www.youtube.com/@playmechi';

const PLAYMECHI_FACT_LINES = [
  'PlayMechi tournament: Playmechi Launch / Mechi.club Online Gaming Tournament.',
  `Registration link: ${PLAYMECHI_REGISTER_URL}. Tournament page: ${PLAYMECHI_PAGE_URL}.`,
  'Registration is free. Total slots: 216 players. Cash prize pool: KSh 6,000.',
  'Games: PUBG Mobile, CODM, and eFootball.',
  'PUBG Mobile: Friday 8 May 2026 at 8:00 PM EAT, 100 slots, 3 Battle Royale matches, kills only. Prizes: KSh 1,500, KSh 1,000, 60 UC.',
  'CODM: Saturday 9 May 2026 at 8:00 PM EAT, 100 slots, 3 Battle Royale matches, kills only. Prizes: KSh 1,200, KSh 800, 80 CP.',
  'eFootball: Sunday 10 May 2026 at 8:00 PM EAT, 16 slots, 1v1 knockout. Prizes: KSh 1,000, KSh 500, 315 Coins.',
  `Stream: PlayMechi on YouTube (${PLAYMECHI_YOUTUBE_URL}). Streamer: Kabaka Mwangi.`,
  'Reward eligibility: players must follow PlayMechi on Instagram and subscribe to PlayMechi on YouTube before match day. Admin verification is the only eligibility truth.',
  'Registration requirements: Mechi account, full name, phone/WhatsApp, email, game, exact in-game username, 8:00 PM availability, rules acceptance, Instagram username, and YouTube name.',
];

const PLAYMECHI_REGISTER_REPLY = [
  `Yes. Register for the PlayMechi tournament here: ${PLAYMECHI_REGISTER_URL}`,
  'Pick PUBG Mobile, CODM, or eFootball, enter your exact in-game username, then submit your Instagram and YouTube names for reward verification.',
  'Matches start at 8:00 PM EAT from 8-10 May 2026.',
].join('\n');

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
  'playmechi_online_tournament',
  'playmechi_registration',
  'playmechi_schedule',
  'playmechi_prizes',
  'playmechi_rules',
  'lobby_discovery',
  'notifications',
  'profile_setup',
  'whatsapp_alerts',
  'game_purchase_enquiries',
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
    'PlayMechi tournament facts:',
    ...PLAYMECHI_FACT_LINES.map((line) => `- ${line}`),
    'Default PlayMechi registration reply:',
    PLAYMECHI_REGISTER_REPLY,
    `- Game purchase enquiries are handled on WhatsApp at ${GAME_ENQUIRIES_WHATSAPP}. If someone wants to buy a game, tell them to DM that number and do not negotiate prices or collect payment details.`,
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
    `If someone asks how to register, asks for the registration link, says "register me", or says they want to register, join, enter, or sign up for the tournament, assume they mean PlayMechi and reply with: ${PLAYMECHI_REGISTER_REPLY}`,
    'For PlayMechi schedule, prize, stream, rule, and registration questions, answer from the supplied PlayMechi facts instead of asking which tournament.',
    `If someone wants to buy a game or asks for game enquiries, tell them to DM WhatsApp ${GAME_ENQUIRIES_WHATSAPP}. Do not collect payment details.`,
    'Escalate or ask for one missing detail when the request is account-sensitive, risky, or unsupported by the supplied context.',
    'Do not invent product policy, prices, live counts, payment state, payouts, bans, refunds, tournament rulings, or account changes.',
  ].join('\n');
}
