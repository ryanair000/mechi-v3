import { ONE_PIXEL_PNG, createApiContextAs, createUniqueAccount } from './support';
import { DEFAULT_PASSWORD, SEEDED_PERSONAS } from '../helpers/personas';
import { createE2ESupabaseClient } from '../helpers/seed';
import { test, expect } from '../fixtures';

test.describe('Provider Transcripts', () => {
  test('email and paystack calls are captured during auth and subscription flows @providers', async ({
    playwright,
    appUrl,
    providerTranscripts,
  }) => {
    const anonApi = await createApiContextAs(playwright, appUrl(), 'anon');
    const playerApi = await createApiContextAs(playwright, appUrl(), 'playerPro');

    const emailAccount = createUniqueAccount('provider-email');
    const registerResponse = await anonApi.post('/api/auth/register', {
      data: {
        username: emailAccount.username,
        phone: emailAccount.phone,
        email: emailAccount.email,
        password: DEFAULT_PASSWORD,
      },
    });
    expect(registerResponse.ok()).toBeTruthy();

    const emailTranscript = await providerTranscripts.waitFor('email', (entry) => {
      const requestPayload = entry.request as { to?: string; subject?: string } | undefined;
      return (
        entry.operation === 'send' &&
        requestPayload?.to === emailAccount.email &&
        requestPayload.subject === `Registration confirmed: welcome to Mechi, ${emailAccount.username}`
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

  test('subscription webhooks authenticate and re-verify the stored payment intent @providers', async ({
    playwright,
    appUrl,
    environment,
    providerTranscripts,
  }) => {
    test.skip(environment.providerMode !== 'mock', 'Deterministic payment fulfillment uses mock mode.');

    const playerApi = await createApiContextAs(playwright, appUrl(), 'playerPro');
    const subscriptionResponse = await playerApi.post('/api/subscriptions', {
      data: {
        plan: 'elite',
        cycle: 'monthly',
      },
    });
    expect(subscriptionResponse.ok()).toBeTruthy();
    const subscriptionPayload = (await subscriptionResponse.json()) as {
      subscription_id?: string;
      reference?: string;
    };
    expect(subscriptionPayload.subscription_id).toBeTruthy();
    expect(subscriptionPayload.reference).toMatch(/^mechi_sub/);

    const event = {
      event: 'charge.success',
      data: {
        reference: subscriptionPayload.reference,
        metadata: {
          app: 'mechi',
          source: 'mechi',
          type: 'subscription',
        },
      },
    };

    const unauthorizedResponse = await playerApi.post('/api/paystack/webhook', {
      data: event,
    });
    expect(unauthorizedResponse.status()).toBe(401);

    const webhookResponse = await playerApi.post('/api/paystack/webhook', {
      headers: {
        'x-mechi-paystack-secret': 'e2e-paystack-forward-secret',
      },
      data: event,
    });
    expect(webhookResponse.ok()).toBeTruthy();
    await expect(webhookResponse.json()).resolves.toMatchObject({
      received: true,
      handled: true,
      kind: 'subscription',
      reference: subscriptionPayload.reference,
    });

    const duplicateWebhookResponse = await playerApi.post('/api/paystack/webhook', {
      headers: {
        'x-mechi-paystack-secret': 'e2e-paystack-forward-secret',
      },
      data: event,
    });
    expect(duplicateWebhookResponse.ok()).toBeTruthy();

    const verificationTranscript = await providerTranscripts.waitFor('paystack', (entry) => {
      const requestPayload = entry.request as
        | { reference?: string; expectedMetadata?: Record<string, unknown> }
        | undefined;
      return (
        entry.operation === 'verify-transaction' &&
        requestPayload?.reference === subscriptionPayload.reference
      );
    });
    expect(verificationTranscript.request).toMatchObject({
      reference: subscriptionPayload.reference,
      expectedCurrency: 'KES',
      expectedMetadata: {
        app: 'mechi',
        source: 'mechi',
        type: 'subscription',
        subscription_id: subscriptionPayload.subscription_id,
      },
    });

    const currentSubscriptionResponse = await playerApi.get('/api/subscriptions');
    expect(currentSubscriptionResponse.ok()).toBeTruthy();
    await expect(currentSubscriptionResponse.json()).resolves.toMatchObject({
      plan: 'elite',
      subscription: {
        id: subscriptionPayload.subscription_id,
        status: 'active',
        payment_currency: 'KES',
        payment_verified_at: expect.any(String),
        payment_provider_transaction_id: expect.any(Number),
      },
    });

    await playerApi.dispose();
  });

  test('payment mismatches and provider timeouts deliver no subscription value @providers', async ({
    playwright,
    appUrl,
    environment,
  }) => {
    test.skip(environment.providerMode !== 'mock', 'Deterministic mismatch simulation uses mock mode.');
    const client = createE2ESupabaseClient(environment);
    const cases = [
      ['e2e_amount_mismatch', 422],
      ['e2e_currency_mismatch', 422],
      ['e2e_reference_mismatch', 422],
      ['e2e_metadata_mismatch', 422],
      ['e2e_not_successful', 422],
      ['e2e_provider_error', 503],
    ] as const;
    const rows = cases.map(([marker], index) => ({
      id: `eeeeeeee-${String(index + 1).padStart(4, '0')}-4000-8000-${String(index + 1).padStart(12, '0')}`,
      user_id: SEEDED_PERSONAS.playerFree.id,
      plan: 'pro',
      billing_cycle: 'monthly',
      amount_kes: 1000,
      status: 'pending',
      paystack_ref: `mechi_sub_${marker}`,
    }));
    const { error: insertError } = await client.from('subscriptions').insert(rows);
    expect(insertError).toBeNull();

    const api = await createApiContextAs(playwright, appUrl(), 'anon');
    for (const [marker, expectedStatus] of cases) {
      const reference = `mechi_sub_${marker}`;
      const response = await api.post('/api/paystack/webhook', {
        headers: {
          'x-mechi-paystack-secret': 'e2e-paystack-forward-secret',
        },
        data: {
          event: 'charge.success',
          data: {
            reference,
            metadata: { app: 'mechi', source: 'mechi', type: 'subscription' },
          },
        },
      });
      expect(response.status()).toBe(expectedStatus);
    }

    const { data: unchanged, error: loadError } = await client
      .from('subscriptions')
      .select('paystack_ref,status,payment_provider_transaction_id,payment_verified_at')
      .in('paystack_ref', rows.map((row) => row.paystack_ref));
    expect(loadError).toBeNull();
    expect(unchanged).toHaveLength(cases.length);
    expect(unchanged?.every((row) => row.status === 'pending')).toBeTruthy();
    expect(unchanged?.every((row) => row.payment_provider_transaction_id === null)).toBeTruthy();
    expect(unchanged?.every((row) => row.payment_verified_at === null)).toBeTruthy();
    await api.dispose();
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
