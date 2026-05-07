export type ProviderMode = 'live' | 'mock' | 'sandbox';

const VALID_PROVIDER_MODES = new Set<ProviderMode>(['live', 'mock', 'sandbox']);

export function getProviderMode(): ProviderMode {
  const rawValue = process.env.E2E_PROVIDER_MODE?.trim().toLowerCase();

  if (rawValue && VALID_PROVIDER_MODES.has(rawValue as ProviderMode)) {
    return rawValue as ProviderMode;
  }

  return 'live';
}

export function isMockProviderMode(): boolean {
  return getProviderMode() === 'mock';
}

export function shouldCaptureProviderTranscripts(): boolean {
  return getProviderMode() !== 'live';
}
