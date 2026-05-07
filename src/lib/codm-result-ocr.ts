import type { SupabaseClient } from '@supabase/supabase-js';

export type CodmSubmissionOcrStatus = 'pending' | 'complete' | 'failed';

export type CodmSubmissionOcrRecord = {
  ocr_status: CodmSubmissionOcrStatus;
  ocr_text: string | null;
  ocr_confidence: number | null;
  ocr_kills: number | null;
  ocr_placement: number | null;
  ocr_error: string | null;
  ocr_scanned_at: string | null;
};

function normalizeOcrText(value: string) {
  return value.replace(/\r/g, '').replace(/[^\S\n]+/g, ' ').trim();
}

function readBoundedInteger(
  match: RegExpMatchArray | null,
  options: { group?: number; min: number; max: number }
) {
  if (!match) {
    return null;
  }

  const groupIndex = options.group ?? 1;
  const rawValue = match[groupIndex];
  if (!rawValue) {
    return null;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < options.min || parsed > options.max) {
    return null;
  }

  return parsed;
}

export function parseCodmSubmissionOcrText(value: string) {
  const text = normalizeOcrText(value);
  const upperText = text.toUpperCase();

  const placementPatterns = [
    /(?:MATCH\s*RANK|PLACEMENT|RANK)\s*[:#=\-]?\s*(\d{1,2})\b/,
    /(?:NO\.?|NUMBER)\s*(\d{1,2})\b/,
    /#\s*(\d{1,2})\b/,
    /\b(\d{1,2})(?:ST|ND|RD|TH)\b/,
  ];
  const killsPatterns = [
    /(?:KILLS?|ELIMS?|ELIMINATIONS?|DEFEATS?)\s*[:#=\-]?\s*(\d{1,2})\b/,
    /\b(\d{1,2})\s*(?:KILLS?|ELIMS?|ELIMINATIONS?|DEFEATS?)\b/,
  ];

  const placement =
    placementPatterns
      .map((pattern) => readBoundedInteger(upperText.match(pattern), { min: 1, max: 100 }))
      .find((candidate) => candidate !== null) ?? null;
  const kills =
    killsPatterns
      .map((pattern) => readBoundedInteger(upperText.match(pattern), { min: 0, max: 80 }))
      .find((candidate) => candidate !== null) ?? null;

  return {
    text,
    kills,
    placement,
  };
}

export async function runCodmSubmissionOcr(screenshotUrl: string) {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');

  try {
    const {
      data: { confidence, text },
    } = await worker.recognize(screenshotUrl);
    const parsed = parseCodmSubmissionOcrText(text ?? '');

    return {
      ocr_text: parsed.text || null,
      ocr_confidence: Number.isFinite(confidence) ? Number(confidence.toFixed(2)) : null,
      ocr_kills: parsed.kills,
      ocr_placement: parsed.placement,
    };
  } finally {
    await worker.terminate().catch(() => undefined);
  }
}

export async function scanAndStoreCodmSubmissionOcr(params: {
  screenshotUrl: string;
  submissionId: string;
  supabase: SupabaseClient;
}) {
  const scannedAt = new Date().toISOString();

  try {
    const result = await runCodmSubmissionOcr(params.screenshotUrl);
    const payload: CodmSubmissionOcrRecord = {
      ocr_status: 'complete',
      ocr_text: result.ocr_text,
      ocr_confidence: result.ocr_confidence,
      ocr_kills: result.ocr_kills,
      ocr_placement: result.ocr_placement,
      ocr_error: null,
      ocr_scanned_at: scannedAt,
    };

    const { error } = await params.supabase
      .from('online_tournament_result_submissions')
      .update({
        ...payload,
        updated_at: scannedAt,
      })
      .eq('id', params.submissionId);

    if (error) {
      throw error;
    }

    return { ok: true as const, payload };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OCR failed';
    await params.supabase
      .from('online_tournament_result_submissions')
      .update({
        ocr_status: 'failed',
        ocr_error: message,
        ocr_scanned_at: scannedAt,
        updated_at: scannedAt,
      })
      .eq('id', params.submissionId);

    return { ok: false as const, error: message };
  }
}
