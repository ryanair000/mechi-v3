import { createServiceClient } from '@/lib/supabase';

export type ObservabilitySettings = {
  posthog_capture_enabled: boolean;
  sentry_capture_enabled: boolean;
  sentry_replay_on_error_enabled: boolean;
  payment_support_notice: string;
  updated_at: string | null;
  updated_by: string | null;
};

export type ObservabilitySettingsUpdate = Partial<
  Pick<
    ObservabilitySettings,
    | 'posthog_capture_enabled'
    | 'sentry_capture_enabled'
    | 'sentry_replay_on_error_enabled'
    | 'payment_support_notice'
  >
>;

export const DEFAULT_OBSERVABILITY_SETTINGS: ObservabilitySettings = {
  posthog_capture_enabled: true,
  sentry_capture_enabled: true,
  sentry_replay_on_error_enabled: true,
  payment_support_notice:
    'M-PESA requires a Kenyan Safaricom number. Outside Kenya, use Paybill, Till, Airtel, card, or contact support.',
  updated_at: null,
  updated_by: null,
};

const SETTING_ID = 'global';

export async function getObservabilitySettings(): Promise<ObservabilitySettings> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('observability_settings')
    .select(
      'posthog_capture_enabled, sentry_capture_enabled, sentry_replay_on_error_enabled, payment_support_notice, updated_at, updated_by'
    )
    .eq('id', SETTING_ID)
    .maybeSingle();

  if (error) {
    console.warn('[Observability] Falling back to defaults:', error.message);
    return DEFAULT_OBSERVABILITY_SETTINGS;
  }

  return data ? { ...DEFAULT_OBSERVABILITY_SETTINGS, ...data } : DEFAULT_OBSERVABILITY_SETTINGS;
}

export async function updateObservabilitySettings(
  updates: ObservabilitySettingsUpdate,
  adminId: string
): Promise<ObservabilitySettings> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('observability_settings')
    .upsert(
      {
        id: SETTING_ID,
        ...updates,
        updated_by: adminId,
      },
      { onConflict: 'id' }
    )
    .select(
      'posthog_capture_enabled, sentry_capture_enabled, sentry_replay_on_error_enabled, payment_support_notice, updated_at, updated_by'
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { ...DEFAULT_OBSERVABILITY_SETTINGS, ...data };
}
