import { existsSync, readFileSync } from 'node:fs';
import type { E2EEnvironment } from './env';

export type ProviderTranscriptRecord = {
  provider: string;
  operation: string;
  createdAt: string;
  mode: string;
  request?: unknown;
  response?: unknown;
  error?: string | null;
};

function getTranscriptPath(environment: E2EEnvironment, provider: string): string {
  return `${environment.providerTranscriptDirectory}/${provider}.jsonl`;
}

export function readProviderTranscripts(
  environment: E2EEnvironment,
  provider: string
): ProviderTranscriptRecord[] {
  const transcriptPath = getTranscriptPath(environment, provider);
  if (!existsSync(transcriptPath)) {
    return [];
  }

  return readFileSync(transcriptPath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ProviderTranscriptRecord);
}

export async function waitForProviderTranscript(
  environment: E2EEnvironment,
  provider: string,
  predicate: (entry: ProviderTranscriptRecord) => boolean,
  timeoutMs = 10000
): Promise<ProviderTranscriptRecord> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const found = readProviderTranscripts(environment, provider).find(predicate);
    if (found) {
      return found;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${provider} transcript`);
}
