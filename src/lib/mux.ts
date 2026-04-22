import Mux from '@mux/mux-node';

export const MUX_RTMPS_URL = 'rtmps://global-live.mux.com:443/app';

let muxClient: Mux | null = null;

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

export function getMuxPlayerEnvKey() {
  return process.env.NEXT_PUBLIC_MUX_ENV_KEY?.trim() || '';
}

export function createMuxClient() {
  if (muxClient) {
    return muxClient;
  }

  muxClient = new Mux({
    tokenId: requireEnv('MUX_TOKEN_ID'),
    tokenSecret: requireEnv('MUX_TOKEN_SECRET'),
    webhookSecret: requireEnv('MUX_WEBHOOK_SECRET'),
    jwtSigningKey: requireEnv('MUX_SIGNING_KEY_ID'),
    jwtPrivateKey: requireEnv('MUX_SIGNING_PRIVATE_KEY'),
  });

  return muxClient;
}

export async function signMuxPlaybackToken(playbackId: string) {
  const mux = createMuxClient();
  return mux.jwt.signPlaybackId(playbackId, {
    type: 'video',
    expiration: '3600s',
  });
}

export async function unwrapMuxWebhook(body: string, headers: Headers) {
  const mux = createMuxClient();
  return mux.webhooks.unwrap(body, headers);
}
