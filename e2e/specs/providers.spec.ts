import { ONE_PIXEL_PNG, createApiContextAs } from './support';
import { SEEDED_PERSONAS } from '../helpers/personas';
import { test, expect } from '../fixtures';

test.describe('Provider Transcripts', () => {
  test('email and paystack calls are captured during auth and subscription flows @providers', async ({
    playwright,
    appUrl,
    providerTranscripts,
  }) => {
    const anonApi = await createApiContextAs(playwright, appUrl(), 'anon');
    const playerApi = await createApiContextAs(playwright, appUrl(), 'playerPro');

    const magicLinkResponse = await anonApi.post('/api/auth/magic-link/request', {
      data: {
        email: SEEDED_PERSONAS.playerPro.email,
        redirect_to: '/dashboard',
      },
    });
    expect(magicLinkResponse.ok()).toBeTruthy();

    const emailTranscript = await providerTranscripts.waitFor('email', (entry) => {
      const requestPayload = entry.request as { to?: string; subject?: string } | undefined;
      return (
        entry.operation === 'send' &&
        requestPayload?.to === SEEDED_PERSONAS.playerPro.email &&
        requestPayload.subject === 'Your Mechi sign-in link'
      );
    });
    expect(emailTranscript.mode).toMatch(/mock|sandbox/);

    const subscriptionResponse = await playerApi.post('/api/subscriptions', {
      data: {
        plan: 'elite',
        cycle: 'monthly',
      },
    });
    expect(subscriptionResponse.ok()).toBeTruthy();
    const subscriptionPayload = (await subscriptionResponse.json()) as {
      success?: boolean;
      authorization_url?: string | null;
    };
    expect(subscriptionPayload.success).toBeTruthy();
    expect(subscriptionPayload.authorization_url).toBeTruthy();

    const paystackTranscript = await providerTranscripts.waitFor('paystack', (entry) => {
      return entry.operation === 'initialize-transaction';
    });
    expect(paystackTranscript.mode).toMatch(/mock|sandbox/);

    await anonApi.dispose();
    await playerApi.dispose();
  });

  test('cloudinary, whatsapp, and instagram provider calls are captured @providers', async ({
    playwright,
    appUrl,
    providerTranscripts,
  }) => {
    const playerApi = await createApiContextAs(playwright, appUrl(), 'playerFree');
    const adminApi = await createApiContextAs(playwright, appUrl(), 'admin');

    const uploadResponse = await playerApi.post('/api/users/profile/media', {
      multipart: {
        kind: 'avatar',
        file: {
          name: 'avatar.png',
          mimeType: 'image/png',
          buffer: ONE_PIXEL_PNG,
        },
      },
    });
    expect(uploadResponse.ok()).toBeTruthy();

    const cloudinaryTranscript = await providerTranscripts.waitFor('cloudinary', (entry) => {
      return entry.operation === 'upload';
    });
    expect(cloudinaryTranscript.mode).toMatch(/mock|sandbox/);

    const whatsappResponse = await adminApi.post('/api/admin/whatsapp/test', {
      data: {
        mode: 'hello_world',
        username: SEEDED_PERSONAS.playerFree.username,
      },
    });
    expect(whatsappResponse.ok()).toBeTruthy();

    const whatsappTranscript = await providerTranscripts.waitFor('whatsapp', (entry) => {
      return entry.operation === 'send-template' || entry.operation === 'send-text';
    });
    expect(whatsappTranscript.mode).toMatch(/mock|sandbox/);

    const instagramResponse = await adminApi.post('/api/admin/instagram/test', {
      data: {
        recipient_id: '17841400000000000',
        message: 'E2E Instagram provider check',
      },
    });
    expect(instagramResponse.ok()).toBeTruthy();

    const instagramTranscript = await providerTranscripts.waitFor('instagram', (entry) => {
      return entry.operation === 'send-message';
    });
    expect(instagramTranscript.mode).toMatch(/mock|sandbox/);

    await playerApi.dispose();
    await adminApi.dispose();
  });
});
