import { appendFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { getProviderMode, shouldCaptureProviderTranscripts } from '@/lib/provider-mode';

type ProviderTranscriptEntry = {
  provider: string;
  operation: string;
  request?: unknown;
  response?: unknown;
  error?: string | null;
  metadata?: Record<string, unknown>;
};

function sanitizeSegment(value: string): string {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return sanitized || 'provider';
}

export function getProviderTranscriptDirectory(): string {
  const configuredDirectory = process.env.E2E_PROVIDER_TRANSCRIPT_DIR?.trim();
  if (configuredDirectory) {
    return configuredDirectory;
  }

  return path.join(process.cwd(), 'test-results', 'provider-transcripts');
}

export async function resetProviderTranscripts(): Promise<void> {
  await rm(getProviderTranscriptDirectory(), {
    force: true,
    recursive: true,
  });
}

export async function captureProviderTranscript(
  entry: ProviderTranscriptEntry
): Promise<void> {
  if (!shouldCaptureProviderTranscripts()) {
    return;
  }

  const directory = getProviderTranscriptDirectory();
  await mkdir(directory, { recursive: true });

  const payload = {
    ...entry,
    mode: getProviderMode(),
    createdAt: new Date().toISOString(),
  };

  const transcriptFile = path.join(directory, `${sanitizeSegment(entry.provider)}.jsonl`);
  await appendFile(transcriptFile, `${JSON.stringify(payload)}\n`, 'utf8');
}
