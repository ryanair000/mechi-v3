import { createHash, randomUUID } from 'node:crypto';
import * as Sentry from '@sentry/nextjs';
import { PASSPORT_GAME_STATUS_LABELS } from '@/lib/passport-game-types';
import {
  buildPassportCardModel,
  resolvePassportCardFormat,
  type PassportCardPresentationSource,
} from '@/lib/passport-card-model';
import { createPassportCardFallbackPng } from '@/lib/passport-card-png';
import { renderPassportCardPng } from '@/lib/passport-card-renderer';
import type { PublicPassportData } from '@/lib/passport-types';

type PassportCardDependencies = {
  loadPassport: (handle: string) => Promise<PublicPassportData | null>;
  loadPresentation: (userId: string) => Promise<PassportCardPresentationSource>;
  renderCard?: typeof renderPassportCardPng;
  captureGenerated?: (event: {
    subjectUserId: string;
    format: string;
    delivery: 'inline' | 'download';
    renderState: 'rendered' | 'fallback';
  }) => void;
};

type PassportCardEvent = {
  event: 'passport_card_load_failed' | 'passport_card_presentation_failed' | 'passport_card_render_failed';
  format: string;
  handle_hash: string;
  request_id: string;
  duration_ms: number;
  error_class: string;
};

function errorClass(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}

function logPassportCardError(event: PassportCardEvent, error: unknown) {
  console.error('[Passport Card]', JSON.stringify(event));
  Sentry.captureException(error, { tags: { feature: 'passport_card', stage: event.event }, extra: event });
}

function handleHash(handle: string): string {
  return createHash('sha256').update(handle).digest('hex').slice(0, 12);
}

function pngResponse(
  png: Uint8Array,
  options: {
    status?: number;
    cacheControl: string;
    disposition?: string;
    state: string;
  }
): Response {
  return new Response(Buffer.from(png), {
    status: options.status ?? 200,
    headers: {
      'Cache-Control': options.cacheControl,
      'Content-Disposition': options.disposition ?? 'inline',
      'Content-Length': String(png.byteLength),
      'Content-Type': 'image/png',
      'X-Content-Type-Options': 'nosniff',
      'X-Passport-Card-State': options.state,
    },
  });
}

function safeCardResponse(
  format: ReturnType<typeof resolvePassportCardFormat>,
  status: number,
  state: string
): Response {
  return pngResponse(createPassportCardFallbackPng(format), {
    status,
    cacheControl: 'private, no-store',
    state,
  });
}

export async function createPassportCardResponse(
  request: Request,
  rawHandle: string,
  dependencies: PassportCardDependencies
): Promise<Response> {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const format = resolvePassportCardFormat(url.searchParams.get('format'));
  const handle = rawHandle.trim().replace(/^@/, '').toLowerCase();
  const requestId = request.headers.get('x-request-id') || randomUUID();
  const hashedHandle = handleHash(handle);
  if (!handle) return safeCardResponse(format, 404, 'not_found');

  let passport: PublicPassportData | null;
  try {
    passport = await dependencies.loadPassport(handle);
  } catch (error) {
    logPassportCardError({
      event: 'passport_card_load_failed',
      format,
      handle_hash: hashedHandle,
      request_id: requestId,
      duration_ms: Date.now() - startedAt,
      error_class: errorClass(error),
    }, error);
    return safeCardResponse(format, 503, 'load_fallback');
  }
  if (!passport) return safeCardResponse(format, 404, 'not_found');
  if (passport.access !== 'public') return safeCardResponse(format, 403, 'restricted');

  let presentation: PassportCardPresentationSource = {};
  try {
    presentation = await dependencies.loadPresentation(passport.identity.user_id);
  } catch (error) {
    logPassportCardError({
      event: 'passport_card_presentation_failed',
      format,
      handle_hash: hashedHandle,
      request_id: requestId,
      duration_ms: Date.now() - startedAt,
      error_class: errorClass(error),
    }, error);
  }

  const model = buildPassportCardModel({
    handle: passport.identity.username,
    displayName: passport.identity.display_name,
    archetypes: passport.identity.archetypes,
    accent: passport.identity.card_accent,
    games: passport.library.entries.map((entry) => ({
      id: entry.id,
      title: entry.game.title,
      status: PASSPORT_GAME_STATUS_LABELS[entry.play_status],
      rating: entry.rating,
      featured: entry.is_featured,
      favorite: entry.is_favorite,
    })),
    gamesCount: passport.library.stats.total,
    completedCount: passport.library.stats.completed,
    matchesCount: passport.summary?.total_matches ?? 0,
  }, presentation, format);

  try {
    const png = await (dependencies.renderCard ?? renderPassportCardPng)(model);
    const download = url.searchParams.get('download') === '1';
    dependencies.captureGenerated?.({
      subjectUserId: passport.identity.user_id,
      format,
      delivery: download ? 'download' : 'inline',
      renderState: 'rendered',
    });
    return pngResponse(png, {
      cacheControl: 'public, max-age=60, stale-while-revalidate=300',
      disposition: `${download ? 'attachment' : 'inline'}; filename="${model.handle}-gamer-card-${format}.png"`,
      state: 'rendered',
    });
  } catch (error) {
    logPassportCardError({
      event: 'passport_card_render_failed',
      format,
      handle_hash: hashedHandle,
      request_id: requestId,
      duration_ms: Date.now() - startedAt,
      error_class: errorClass(error),
    }, error);
    dependencies.captureGenerated?.({
      subjectUserId: passport.identity.user_id,
      format,
      delivery: url.searchParams.get('download') === '1' ? 'download' : 'inline',
      renderState: 'fallback',
    });
    return pngResponse(createPassportCardFallbackPng(format), {
      cacheControl: 'private, no-store',
      state: 'render_fallback',
    });
  }
}
