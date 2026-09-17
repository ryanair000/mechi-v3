import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import {
  getPassportOwnerDataByUserId,
  upsertPassportProfile,
  type PassportUpdateInput,
} from '@/lib/passport';
import {
  PASSPORT_ARCHETYPES,
  PASSPORT_FIELDS,
  PASSPORT_STATUSES,
  PASSPORT_VISIBILITIES,
  type PassportArchetype,
  type PassportField,
  type PassportStatus,
  type PassportVisibility,
} from '@/lib/passport-types';

const UPDATE_KEYS = new Set([
  'public_handle',
  'display_name',
  'bio',
  'gamer_since',
  'archetypes',
  'current_status',
  'default_visibility',
  'field_visibility',
  'is_discoverable',
  'card_accent',
]);

function parseUpdate(body: unknown): { input: PassportUpdateInput | null; error: string | null } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { input: null, error: 'Passport update must be an object' };
  }

  const candidate = body as Record<string, unknown>;
  const unknownKey = Object.keys(candidate).find((key) => !UPDATE_KEYS.has(key));
  if (unknownKey) {
    return { input: null, error: `Unsupported Passport field: ${unknownKey}` };
  }
  if (Object.keys(candidate).length === 0) {
    return { input: null, error: 'Choose at least one Passport field to update' };
  }

  const input: PassportUpdateInput = {};

  if ('public_handle' in candidate) {
    if (candidate.public_handle === null || candidate.public_handle === '') {
      input.public_handle = null;
    } else if (typeof candidate.public_handle !== 'string') {
      return { input: null, error: 'Public handle must be text' };
    } else {
      input.public_handle = candidate.public_handle;
    }
  }

  if ('display_name' in candidate) {
    if (candidate.display_name === null || candidate.display_name === '') {
      input.display_name = null;
    } else if (typeof candidate.display_name !== 'string') {
      return { input: null, error: 'Display name must be text' };
    } else {
      const displayName = candidate.display_name.trim();
      if (displayName.length < 2 || displayName.length > 40) {
        return { input: null, error: 'Display name must be 2-40 characters' };
      }
      input.display_name = displayName;
    }
  }

  if ('bio' in candidate) {
    if (typeof candidate.bio !== 'string') {
      return { input: null, error: 'Bio must be text' };
    }
    const bio = candidate.bio.trim();
    if (bio.length > 280) {
      return { input: null, error: 'Bio must be 280 characters or fewer' };
    }
    input.bio = bio;
  }

  if ('gamer_since' in candidate) {
    if (candidate.gamer_since === null || candidate.gamer_since === '') {
      input.gamer_since = null;
    } else if (
      typeof candidate.gamer_since !== 'number'
      || !Number.isInteger(candidate.gamer_since)
      || candidate.gamer_since < 1970
      || candidate.gamer_since > new Date().getUTCFullYear()
    ) {
      return { input: null, error: 'Gamer since must be a valid year' };
    } else {
      input.gamer_since = candidate.gamer_since;
    }
  }

  if ('archetypes' in candidate) {
    if (!Array.isArray(candidate.archetypes)) {
      return { input: null, error: 'Gamer archetypes must be an array' };
    }
    if (candidate.archetypes.length > 3) {
      return { input: null, error: 'Choose up to three gamer archetypes' };
    }
    const archetypes: PassportArchetype[] = [];
    for (const value of candidate.archetypes) {
      if (
        typeof value !== 'string'
        || !PASSPORT_ARCHETYPES.includes(value as PassportArchetype)
      ) {
        return { input: null, error: 'Gamer archetypes contain an invalid value' };
      }
      if (!archetypes.includes(value as PassportArchetype)) {
        archetypes.push(value as PassportArchetype);
      }
    }
    input.archetypes = archetypes;
  }

  if ('current_status' in candidate) {
    if (
      typeof candidate.current_status !== 'string'
      || !PASSPORT_STATUSES.includes(candidate.current_status as PassportStatus)
    ) {
      return { input: null, error: 'Current gamer status is invalid' };
    }
    input.current_status = candidate.current_status as PassportStatus;
  }

  if ('default_visibility' in candidate) {
    if (
      typeof candidate.default_visibility !== 'string'
      || !PASSPORT_VISIBILITIES.includes(candidate.default_visibility as PassportVisibility)
    ) {
      return { input: null, error: 'Default visibility is invalid' };
    }
    input.default_visibility = candidate.default_visibility as PassportVisibility;
  }

  if ('field_visibility' in candidate) {
    if (
      !candidate.field_visibility
      || typeof candidate.field_visibility !== 'object'
      || Array.isArray(candidate.field_visibility)
    ) {
      return { input: null, error: 'Field visibility must be an object' };
    }
    const visibility: Partial<Record<PassportField, PassportVisibility>> = {};
    for (const [field, value] of Object.entries(
      candidate.field_visibility as Record<string, unknown>
    )) {
      if (!PASSPORT_FIELDS.includes(field as PassportField)) {
        return { input: null, error: `Unsupported visibility field: ${field}` };
      }
      if (
        typeof value !== 'string'
        || !PASSPORT_VISIBILITIES.includes(value as PassportVisibility)
      ) {
        return { input: null, error: `Visibility for ${field} is invalid` };
      }
      visibility[field as PassportField] = value as PassportVisibility;
    }
    input.field_visibility = visibility;
  }

  if ('is_discoverable' in candidate) {
    if (typeof candidate.is_discoverable !== 'boolean') {
      return { input: null, error: 'Discoverability must be true or false' };
    }
    input.is_discoverable = candidate.is_discoverable;
  }

  if ('card_accent' in candidate) {
    if (
      typeof candidate.card_accent !== 'string'
      || !/^#[0-9a-f]{6}$/i.test(candidate.card_accent)
    ) {
      return { input: null, error: 'Card accent must be a six-digit hex color' };
    }
    input.card_accent = candidate.card_accent.toUpperCase();
  }

  return { input, error: null };
}

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;

  const passport = await getPassportOwnerDataByUserId(access.profile.id);
  if (!passport) {
    return NextResponse.json({ error: 'Gamer Passport not found' }, { status: 404 });
  }

  return NextResponse.json({ passport });
}

export async function PATCH(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) return access.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  const parsed = parseUpdate(body);
  if (!parsed.input) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const requestId = request.headers.get('x-request-id');
  const result = await upsertPassportProfile(access.profile.id, parsed.input, requestId);
  if (!result.storageReady) {
    return NextResponse.json(
      { error: result.error, storage_ready: false },
      { status: 503 }
    );
  }
  if (result.error || !result.data) {
    const message = result.error ?? 'Could not update Gamer Passport';
    const status = message === 'That public handle is already taken' ? 409
      : 'public_handle' in parsed.input ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ passport: result.data });
}
