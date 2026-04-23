export const DEFAULT_PASSWORD = 'MechiE2E!123';

type SeedPersona = {
  id: string;
  username: string;
  phone: string;
  email: string;
  inviteCode: string;
  country: string;
  region: string;
  plan: 'free' | 'pro' | 'elite';
  role: 'user' | 'moderator' | 'admin';
  platforms: string[];
  selectedGames: string[];
  gameIds: Record<string, string>;
  whatsappNumber: string;
  whatsappNotifications: boolean;
  isBanned?: boolean;
  banReason?: string;
  xp?: number;
  level?: number;
  mp?: number;
  rewardPointsAvailable?: number;
  rewardPointsPending?: number;
  rewardPointsLifetime?: number;
};

export type SeededPersonaKey =
  | 'playerFree'
  | 'playerPro'
  | 'playerElite'
  | 'playerBanned'
  | 'playerOpponentA'
  | 'playerOpponentB'
  | 'moderator'
  | 'admin'
  | 'rewardLinkedUser'
  | 'supportContact';

function buildGameIds(prefix: string) {
  return {
    'platform:efootball': 'ps',
    'platform:fc26': 'ps',
    'platform:codm': 'mobile',
    ps: `${prefix.toUpperCase()}_PS`,
    'codm:mobile': `${prefix.toUpperCase()}_CODM`,
  };
}

export const SEEDED_PERSONAS: Record<SeededPersonaKey, SeedPersona> = {
  playerFree: {
    id: '11111111-1111-4111-8111-111111111111',
    username: 'e2e-free-player',
    phone: '0711111001',
    email: 'e2e.free@mechi.test',
    inviteCode: 'E2EFREE1',
    country: 'kenya',
    region: 'Nairobi',
    plan: 'free',
    role: 'user',
    platforms: ['ps', 'mobile'],
    selectedGames: ['efootball', 'fc26', 'codm'],
    gameIds: buildGameIds('freeplayer'),
    whatsappNumber: '0711111001',
    whatsappNotifications: true,
    xp: 120,
    level: 2,
    mp: 35,
    rewardPointsAvailable: 4200,
    rewardPointsPending: 40,
    rewardPointsLifetime: 4700,
  },
  playerPro: {
    id: '22222222-2222-4222-8222-222222222222',
    username: 'e2e-pro-player',
    phone: '0711111002',
    email: 'e2e.pro@mechi.test',
    inviteCode: 'E2EPRO22',
    country: 'kenya',
    region: 'Nakuru',
    plan: 'pro',
    role: 'user',
    platforms: ['ps', 'mobile'],
    selectedGames: ['efootball', 'fc26', 'codm'],
    gameIds: buildGameIds('proplayer'),
    whatsappNumber: '0711111002',
    whatsappNotifications: true,
    xp: 640,
    level: 6,
    mp: 140,
  },
  playerElite: {
    id: '33333333-3333-4333-8333-333333333333',
    username: 'e2e-elite-player',
    phone: '0711111003',
    email: 'e2e.elite@mechi.test',
    inviteCode: 'E2EELT33',
    country: 'kenya',
    region: 'Mombasa',
    plan: 'elite',
    role: 'user',
    platforms: ['ps', 'mobile'],
    selectedGames: ['efootball', 'fc26', 'codm'],
    gameIds: buildGameIds('eliteplayer'),
    whatsappNumber: '0711111003',
    whatsappNotifications: true,
    xp: 1440,
    level: 12,
    mp: 410,
  },
  playerBanned: {
    id: '44444444-4444-4444-8444-444444444444',
    username: 'e2e-banned-player',
    phone: '0711111004',
    email: 'e2e.banned@mechi.test',
    inviteCode: 'E2EBAN44',
    country: 'kenya',
    region: 'Kisumu',
    plan: 'free',
    role: 'user',
    platforms: ['ps'],
    selectedGames: ['efootball'],
    gameIds: buildGameIds('bannedplayer'),
    whatsappNumber: '0711111004',
    whatsappNotifications: false,
    isBanned: true,
    banReason: 'E2E suspension fixture',
  },
  playerOpponentA: {
    id: '55555555-5555-4555-8555-555555555555',
    username: 'e2e-opponent-a',
    phone: '0711111005',
    email: 'e2e.opponent.a@mechi.test',
    inviteCode: 'E2EOPA55',
    country: 'kenya',
    region: 'Eldoret',
    plan: 'free',
    role: 'user',
    platforms: ['ps'],
    selectedGames: ['efootball', 'fc26'],
    gameIds: buildGameIds('opponenta'),
    whatsappNumber: '0711111005',
    whatsappNotifications: true,
  },
  playerOpponentB: {
    id: '66666666-6666-4666-8666-666666666666',
    username: 'e2e-opponent-b',
    phone: '0711111006',
    email: 'e2e.opponent.b@mechi.test',
    inviteCode: 'E2EOPB66',
    country: 'kenya',
    region: 'Nairobi',
    plan: 'free',
    role: 'user',
    platforms: ['ps'],
    selectedGames: ['efootball', 'fc26'],
    gameIds: buildGameIds('opponentb'),
    whatsappNumber: '0711111006',
    whatsappNotifications: true,
  },
  moderator: {
    id: '77777777-7777-4777-8777-777777777777',
    username: 'e2e-moderator',
    phone: '0711111007',
    email: 'e2e.moderator@mechi.test',
    inviteCode: 'E2EMOD77',
    country: 'kenya',
    region: 'Nairobi',
    plan: 'elite',
    role: 'moderator',
    platforms: ['ps'],
    selectedGames: ['efootball'],
    gameIds: buildGameIds('moderator'),
    whatsappNumber: '0711111007',
    whatsappNotifications: true,
  },
  admin: {
    id: '88888888-8888-4888-8888-888888888888',
    username: 'e2e-admin',
    phone: '0708355692',
    email: 'e2e.admin@mechi.test',
    inviteCode: 'E2EADM88',
    country: 'kenya',
    region: 'Nairobi',
    plan: 'elite',
    role: 'admin',
    platforms: ['ps'],
    selectedGames: ['efootball', 'fc26'],
    gameIds: buildGameIds('admin'),
    whatsappNumber: '0708355692',
    whatsappNotifications: true,
  },
  rewardLinkedUser: {
    id: '99999999-9999-4999-8999-999999999999',
    username: 'e2e-reward-linked',
    phone: '0711111009',
    email: 'e2e.reward.linked@mechi.test',
    inviteCode: 'E2ERWD99',
    country: 'kenya',
    region: 'Nairobi',
    plan: 'pro',
    role: 'user',
    platforms: ['ps'],
    selectedGames: ['efootball'],
    gameIds: buildGameIds('rewardlinked'),
    whatsappNumber: '0711111009',
    whatsappNotifications: true,
    rewardPointsAvailable: 540,
    rewardPointsPending: 80,
    rewardPointsLifetime: 1120,
  },
  supportContact: {
    id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    username: 'e2e-support-contact',
    phone: '0711111010',
    email: 'e2e.support.contact@mechi.test',
    inviteCode: 'E2ESUP10',
    country: 'kenya',
    region: 'Nairobi',
    plan: 'pro',
    role: 'user',
    platforms: ['mobile'],
    selectedGames: ['codm'],
    gameIds: buildGameIds('supportcontact'),
    whatsappNumber: '0711111010',
    whatsappNotifications: true,
  },
};

export type SeededPersona = (typeof SEEDED_PERSONAS)[SeededPersonaKey];

export const PERSONA_KEYS = [
  'anon',
  'playerFree',
  'playerPro',
  'playerElite',
  'playerBanned',
  'playerOpponentA',
  'playerOpponentB',
  'moderator',
  'admin',
  'rewardLinkedUser',
  'supportContact',
] as const;
export type PersonaKey = (typeof PERSONA_KEYS)[number];

export const SCENARIO_IDS = {
  completedMatch: 'bbbbbbbb-1111-4111-8111-111111111111',
  pendingChallenge: 'bbbbbbbb-2222-4222-8222-222222222222',
  publicLobby: 'bbbbbbbb-3333-4333-8333-333333333333',
  openTournament: 'bbbbbbbb-4444-4444-8444-444444444444',
  liveTournament: 'bbbbbbbb-4444-4444-8444-555555555555',
  liveStream: 'bbbbbbbb-4444-4444-8444-666666666666',
  idleTournament: 'bbbbbbbb-4444-4444-8444-777777777777',
  idleStream: 'bbbbbbbb-4444-4444-8444-888888888888',
  supportThread: 'bbbbbbbb-5555-4555-8555-555555555555',
  rewardReview: 'bbbbbbbb-6666-4666-8666-666666666666',
  suggestion: 'bbbbbbbb-7777-4777-8777-777777777777',
  notification: 'bbbbbbbb-8888-4888-8888-888888888888',
  adminAuditLog: 'bbbbbbbb-9999-4999-8999-999999999999',
  activeBounty: 'cccccccc-1111-4111-8111-111111111111',
  claimedBounty: 'cccccccc-2222-4222-8222-222222222222',
  claimedBountyAttempt: 'cccccccc-3333-4333-8333-333333333333',
} as const;
