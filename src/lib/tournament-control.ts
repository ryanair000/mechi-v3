export type TournamentControlTab = 'overview' | 'participants' | 'finance' | 'disputes';

export type TournamentControlParticipant = {
  id: string;
  userId: string;
  username: string;
  seed: number | null;
  paymentStatus: string;
  checkInStatus: string;
  checkedInAt: string | null;
  joinedAt: string;
  isActive: boolean;
};
export type TournamentControlResponse = {
  tournament: {
    id: string;
    slug: string;
    title: string;
    game: string;
    platform: string;
    region: string;
    size: number;
    status: string;
    approvalStatus: string;
    scheduledFor: string | null;
    entryFee: number;
    payoutStatus: string;
  };
  viewer: {
    isOrganizer: boolean;
    isModerator: boolean;
  };
  metrics: {
    activePlayers: number;
    confirmedPlayers: number;
    checkedInPlayers: number;
    pendingPayments: number;
    openDisputes: number;
    matches: {
      total: number;
      pending: number;
      active: number;
      completed: number;
    };
  };
  finance: {
    entryFee: number;
    gross: number;
    prizePool: number;
    platformFee: number;
    payoutStatus: string;
    paidEntries: number;
    freeEntries: number;
    paymentBreakdown: Record<string, number>;
  };
  start: {
    canStart: boolean;
    blockers: string[];
  };
  participants: TournamentControlParticipant[];
  generatedAt: string;
};
