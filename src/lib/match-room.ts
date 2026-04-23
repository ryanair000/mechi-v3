import { getCanonicalGameKey } from '@/lib/config';
import type { GameKey, PlatformKey } from '@/types';

export type MatchRoomSide = 'home' | 'away';

export type EfootballMatchRoomAssignment = {
  homeUserId: string;
  awayUserId: string;
  roomCreatorSide: MatchRoomSide;
  roomCreatorUserId: string;
  roomJoinerUserId: string;
};

function getStableMatchHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function usesEfootballRoomCodeFlow(gameKey: GameKey) {
  return getCanonicalGameKey(gameKey) === 'efootball';
}

export function shouldHideOpponentPlatformIds(
  gameKey: GameKey,
  platform?: PlatformKey | null
) {
  return usesEfootballRoomCodeFlow(gameKey) && platform === 'mobile';
}

export function getMatchRoomSideLabel(side: MatchRoomSide) {
  return side === 'home' ? 'Home player' : 'Away player';
}

export function getEfootballMatchRoomAssignment(
  matchId: string,
  player1Id: string,
  player2Id: string
): EfootballMatchRoomAssignment {
  const homeIsPlayer1 = getStableMatchHash(`${matchId}:home-side`) % 2 === 0;
  const homeUserId = homeIsPlayer1 ? player1Id : player2Id;
  const awayUserId = homeIsPlayer1 ? player2Id : player1Id;
  const roomCreatorSide: MatchRoomSide =
    getStableMatchHash(`${matchId}:room-creator`) % 2 === 0 ? 'home' : 'away';
  const roomCreatorUserId = roomCreatorSide === 'home' ? homeUserId : awayUserId;
  const roomJoinerUserId = roomCreatorSide === 'home' ? awayUserId : homeUserId;

  return {
    homeUserId,
    awayUserId,
    roomCreatorSide,
    roomCreatorUserId,
    roomJoinerUserId,
  };
}

export function getMatchRoomSideForUser(
  userId: string,
  assignment: EfootballMatchRoomAssignment
): MatchRoomSide {
  return assignment.homeUserId === userId ? 'home' : 'away';
}
