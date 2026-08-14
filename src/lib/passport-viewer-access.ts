import 'server-only';

import type { NextRequest } from 'next/server';
import {
  getActiveAccessProfileFromToken,
  getOptionalActiveAccessProfile,
} from '@/lib/access';
import {
  arePassportFriends,
  hasPassportBlockBetween,
} from '@/lib/passport-social';
import {
  resolvePassportViewerAccess,
  type PassportViewerAccess,
} from '@/lib/passport-viewer-access-policy';

export type { PassportViewerAccess } from '@/lib/passport-viewer-access-policy';

function requestHasCredential(request: NextRequest): boolean {
  return Boolean(
    request.headers.get('authorization')
    || request.cookies.get('auth_token')?.value
  );
}

export function resolvePassportRequestViewerAccess(
  request: NextRequest,
  targetId: string
): Promise<PassportViewerAccess> {
  return resolvePassportViewerAccess(targetId, requestHasCredential(request), {
    getActiveViewer: () => getOptionalActiveAccessProfile(request),
    hasBlock: hasPassportBlockBetween,
    areFriends: arePassportFriends,
  });
}

export function resolvePassportTokenViewerAccess(
  token: string | null | undefined,
  targetId: string
): Promise<PassportViewerAccess> {
  return resolvePassportViewerAccess(targetId, Boolean(token), {
    getActiveViewer: () => getActiveAccessProfileFromToken(token),
    hasBlock: hasPassportBlockBetween,
    areFriends: arePassportFriends,
  });
}
