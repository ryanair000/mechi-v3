import type { PassportPublicationStatus } from '@/lib/passport-handle';
import type { PassportVisibility } from '@/lib/passport-types';

export const PASSPORT_ACCESS_MODES = [
  'private',
  'friends',
  'link_only',
  'discoverable',
] as const;

export type PassportAccessMode = (typeof PASSPORT_ACCESS_MODES)[number];

export type PassportAccessPolicyInput = {
  publication_status: PassportPublicationStatus;
  default_visibility: PassportVisibility;
  is_discoverable: boolean;
};

export function resolvePassportAccessMode(
  input: PassportAccessPolicyInput
): PassportAccessMode {
  if (input.publication_status !== 'published' || input.default_visibility === 'private') {
    return 'private';
  }
  if (input.default_visibility === 'friends') {
    return 'friends';
  }
  return input.is_discoverable ? 'discoverable' : 'link_only';
}

export function isPassportAnonymousAccessible(input: PassportAccessPolicyInput): boolean {
  const mode = resolvePassportAccessMode(input);
  return mode === 'link_only' || mode === 'discoverable';
}

export function isPassportDiscoveryEligible(input: PassportAccessPolicyInput): boolean {
  return resolvePassportAccessMode(input) === 'discoverable';
}

export function passportActivityAudienceCeiling(
  input: PassportAccessPolicyInput
): PassportVisibility {
  const mode = resolvePassportAccessMode(input);
  if (mode === 'discoverable') return 'public';
  if (mode === 'friends') return 'friends';
  return 'private';
}
