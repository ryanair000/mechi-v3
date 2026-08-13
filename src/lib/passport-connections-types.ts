export type PassportProviderKey = 'steam' | 'twitch' | 'youtube' | 'xbox' | 'psn' | 'nintendo';
export type PassportProviderStatus = 'available' | 'planned' | 'paused' | 'retired';
export type PassportConnectionStatus = 'connected' | 'syncing' | 'error' | 'reauthorization_required' | 'revoked';
export type PassportImportState = 'staged' | 'imported' | 'hidden' | 'conflict' | 'remote_removed';

export type PassportProviderDefinition = {
  key: PassportProviderKey;
  label: string;
  connection_method: 'openid' | 'oauth2' | 'api_key' | 'manual_verification';
  capability_scopes: string[];
  status: PassportProviderStatus;
  attribution_label: string;
  terms_url: string | null;
  privacy_url: string | null;
};

export type PassportProviderConnection = {
  id: string;
  provider_key: PassportProviderKey;
  provider_label: string;
  account_label: string;
  account_url: string | null;
  status: PassportConnectionStatus;
  granted_scopes: string[];
  last_sync_started_at: string | null;
  last_synced_at: string | null;
  last_sync_status: 'never' | 'running' | 'success' | 'partial' | 'error';
  last_error_message: string | null;
  connected_at: string;
};

export type PassportExternalItem = {
  id: string;
  provider_key: PassportProviderKey;
  provider_item_type: 'game' | 'achievement' | 'play_history' | 'creator_channel' | 'event';
  provider_item_id: string;
  title: string;
  import_state: PassportImportState;
  safe_details: { playtime_hours?: number; recent_playtime_hours?: number; image_url?: string | null };
  last_seen_at: string;
};

export type PassportDeveloperScope = 'passport.summary:read' | 'passport.games:read' | 'passport.competition:read' | 'passport.events:read' | 'passport.achievements:read' | 'webhooks:manage';
export type PassportDeveloperToken = { id: string; label: string; token_prefix: string; scopes: PassportDeveloperScope[]; expires_at: string | null; last_used_at: string | null; revoked_at: string | null; created_at: string };
