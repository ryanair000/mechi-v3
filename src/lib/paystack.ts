import { isMockProviderMode, shouldCaptureProviderTranscripts } from '@/lib/provider-mode';
import { captureProviderTranscript } from '@/lib/provider-transcript';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const DEFAULT_CURRENCY = process.env.PAYSTACK_CURRENCY ?? 'KES';

type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data?: T;
};

type InitializeData = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

type VerifyData = {
  id: number;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  customer: {
    email: string;
  };
  metadata?: Record<string, unknown>;
};

type RecipientData = {
  recipient_code: string;
};

type TransferData = {
  transfer_code?: string;
  reference?: string;
};

async function capturePaystackTranscript(
  operation: string,
  request: Record<string, unknown>,
  response?: unknown,
  error?: string
) {
  if (!shouldCaptureProviderTranscripts()) {
    return;
  }

  await captureProviderTranscript({
    provider: 'paystack',
    operation,
    request,
    response,
    error,
  });
}

export function isPaystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

function allowDevPaymentFallback(): boolean {
  return !isPaystackConfigured() && process.env.NODE_ENV !== 'production';
}

export function normaliseKenyanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('7') && digits.length === 9) return `254${digits}`;
  return digits;
}

export function toPaystackAmount(amountKes: number): number {
  return Math.max(0, Math.round(amountKes * 100));
}

export async function initializePaystackTransaction(params: {
  amountKes: number;
  email: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<{
  success: boolean;
  authorizationUrl?: string;
  accessCode?: string;
  reference: string;
  error?: string;
}> {
  if (isMockProviderMode()) {
    const mockResult = {
      success: true,
      authorizationUrl: `${params.callbackUrl}?reference=${encodeURIComponent(params.reference)}`,
      accessCode: `mock_access_${params.reference}`,
      reference: params.reference,
    };

    await capturePaystackTranscript('initialize-transaction', params, mockResult);
    return mockResult;
  }

  if (allowDevPaymentFallback()) {
    const fallbackResult = {
      success: true,
      authorizationUrl: `${params.callbackUrl}?reference=${encodeURIComponent(params.reference)}`,
      accessCode: 'dev',
      reference: params.reference,
    };

    await capturePaystackTranscript('initialize-transaction', params, fallbackResult);
    return fallbackResult;
  }

  if (!isPaystackConfigured()) {
    const errorResult = {
      success: false,
      reference: params.reference,
      error: 'Payment provider is not configured',
    };

    await capturePaystackTranscript('initialize-transaction', params, errorResult, errorResult.error);
    return errorResult;
  }

  const response = await paystackRequest<InitializeData>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      amount: toPaystackAmount(params.amountKes),
      email: params.email,
      reference: params.reference,
      currency: DEFAULT_CURRENCY,
      callback_url: params.callbackUrl,
      metadata: params.metadata ?? {},
    }),
  });

  if (!response.status || !response.data) {
    const errorResult = {
      success: false,
      reference: params.reference,
      error: response.message || 'Payment could not start',
    };

    await capturePaystackTranscript('initialize-transaction', params, errorResult, errorResult.error);
    return errorResult;
  }

  const successResult = {
    success: true,
    authorizationUrl: response.data.authorization_url,
    accessCode: response.data.access_code,
    reference: response.data.reference,
  };

  await capturePaystackTranscript('initialize-transaction', params, successResult);
  return successResult;
}

export async function verifyPaystackTransaction(params: {
  reference: string;
  expectedAmountKes?: number;
}): Promise<{
  success: boolean;
  amountKes?: number;
  email?: string;
  metadata?: Record<string, unknown>;
  error?: string;
}> {
  if (isMockProviderMode()) {
    const mockResult = {
      success: true,
      amountKes: params.expectedAmountKes ?? 0,
      email: 'mock-paystack@mechi.test',
      metadata: {},
    };

    await capturePaystackTranscript('verify-transaction', params, mockResult);
    return mockResult;
  }

  if (allowDevPaymentFallback()) {
    const fallbackResult = {
      success: true,
      amountKes: params.expectedAmountKes ?? 0,
      email: '',
      metadata: {},
    };

    await capturePaystackTranscript('verify-transaction', params, fallbackResult);
    return fallbackResult;
  }

  if (!isPaystackConfigured()) {
    const errorResult = { success: false, error: 'Payment provider is not configured' };
    await capturePaystackTranscript('verify-transaction', params, errorResult, errorResult.error);
    return errorResult;
  }

  const response = await paystackRequest<VerifyData>(
    `/transaction/verify/${encodeURIComponent(params.reference)}`,
    { method: 'GET' }
  );

  if (!response.status || !response.data) {
    const errorResult = {
      success: false,
      error: response.message || 'Payment could not be verified',
    };

    await capturePaystackTranscript('verify-transaction', params, errorResult, errorResult.error);
    return errorResult;
  }

  const paidEnough =
    params.expectedAmountKes === undefined ||
    response.data.amount >= toPaystackAmount(params.expectedAmountKes);

  if (response.data.status !== 'success' || !paidEnough) {
    const errorResult = { success: false, error: 'Payment is not complete yet' };
    await capturePaystackTranscript('verify-transaction', params, errorResult, errorResult.error);
    return errorResult;
  }

  const successResult = {
    success: true,
    amountKes: response.data.amount / 100,
    email: response.data.customer.email,
    metadata: response.data.metadata ?? {},
  };

  await capturePaystackTranscript('verify-transaction', params, successResult);
  return successResult;
}

export async function initializeTournamentPayment(params: {
  amountKes: number;
  email: string;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string | number | boolean | null>;
}): Promise<{
  success: boolean;
  authorizationUrl?: string;
  accessCode?: string;
  reference: string;
  error?: string;
}> {
  return initializePaystackTransaction(params);
}

export async function verifyTournamentPayment(params: {
  reference: string;
  expectedAmountKes: number;
}): Promise<{ success: boolean; error?: string }> {
  const verified = await verifyPaystackTransaction(params);
  return verified.success ? { success: true } : { success: false, error: verified.error };
}

export async function createMobileMoneyRecipient(params: {
  name: string;
  phone: string;
}): Promise<{ success: boolean; recipientCode?: string; error?: string }> {
  if (isMockProviderMode()) {
    const mockResult = {
      success: true,
      recipientCode: `mock_recipient_${Date.now()}`,
    };

    await capturePaystackTranscript('create-recipient', params, mockResult);
    return mockResult;
  }

  if (allowDevPaymentFallback()) {
    const fallbackResult = {
      success: true,
      recipientCode: `dev_recipient_${Date.now()}`,
    };

    await capturePaystackTranscript('create-recipient', params, fallbackResult);
    return fallbackResult;
  }

  if (!isPaystackConfigured()) {
    const errorResult = { success: false, error: 'Payment provider is not configured' };
    await capturePaystackTranscript('create-recipient', params, errorResult, errorResult.error);
    return errorResult;
  }

  const bankCode = process.env.PAYSTACK_MOBILE_MONEY_BANK_CODE;
  if (!bankCode) {
    const errorResult = {
      success: false,
      error: 'PAYSTACK_MOBILE_MONEY_BANK_CODE is missing',
    };

    await capturePaystackTranscript('create-recipient', params, errorResult, errorResult.error);
    return errorResult;
  }

  const response = await paystackRequest<RecipientData>('/transferrecipient', {
    method: 'POST',
    body: JSON.stringify({
      type: process.env.PAYSTACK_TRANSFER_RECIPIENT_TYPE ?? 'mobile_money',
      name: params.name,
      account_number: normaliseKenyanPhone(params.phone),
      bank_code: bankCode,
      currency: DEFAULT_CURRENCY,
    }),
  });

  if (!response.status || !response.data?.recipient_code) {
    const errorResult = {
      success: false,
      error: response.message || 'Could not create payout recipient',
    };

    await capturePaystackTranscript('create-recipient', params, errorResult, errorResult.error);
    return errorResult;
  }

  const successResult = { success: true, recipientCode: response.data.recipient_code };
  await capturePaystackTranscript('create-recipient', params, successResult);
  return successResult;
}

export async function disbursePrize(params: {
  recipientCode: string;
  amountKes: number;
  reason: string;
}): Promise<{ success: boolean; reference?: string; error?: string }> {
  if (isMockProviderMode()) {
    const mockResult = {
      success: true,
      reference: `mock_transfer_${Date.now()}`,
    };

    await capturePaystackTranscript('disburse-prize', params, mockResult);
    return mockResult;
  }

  if (allowDevPaymentFallback()) {
    const fallbackResult = {
      success: true,
      reference: `dev_transfer_${Date.now()}`,
    };

    await capturePaystackTranscript('disburse-prize', params, fallbackResult);
    return fallbackResult;
  }

  if (!isPaystackConfigured()) {
    const errorResult = { success: false, error: 'Payment provider is not configured' };
    await capturePaystackTranscript('disburse-prize', params, errorResult, errorResult.error);
    return errorResult;
  }

  const response = await paystackRequest<TransferData>('/transfer', {
    method: 'POST',
    body: JSON.stringify({
      source: 'balance',
      amount: toPaystackAmount(params.amountKes),
      recipient: params.recipientCode,
      reason: params.reason,
    }),
  });

  if (!response.status) {
    const errorResult = {
      success: false,
      error: response.message || 'Prize transfer failed',
    };

    await capturePaystackTranscript('disburse-prize', params, errorResult, errorResult.error);
    return errorResult;
  }

  const successResult = {
    success: true,
    reference: response.data?.transfer_code ?? response.data?.reference,
  };

  await capturePaystackTranscript('disburse-prize', params, successResult);
  return successResult;
}

async function paystackRequest<T>(
  path: string,
  init: RequestInit
): Promise<PaystackResponse<T>> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return { status: false, message: 'PAYSTACK_SECRET_KEY is missing' };
  }

  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });

    const payload = (await response.json()) as PaystackResponse<T>;
    if (!response.ok) {
      return {
        status: false,
        message: payload.message || `Paystack request failed with ${response.status}`,
        data: payload.data,
      };
    }

    return payload;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Paystack request failed';
    return { status: false, message };
  }
}
