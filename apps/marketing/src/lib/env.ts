function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

function requireEnv(name: string) {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function normalizeUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export function getAppUrl() {
  return normalizeUrl(readEnv("NEXT_PUBLIC_APP_URL") || "http://localhost:3000");
}

export function getSupabaseUrl() {
  return requireEnv("NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabaseAnonKey() {
  return requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export function getSupabaseServiceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function getAdminPasswordHash() {
  return requireEnv("ADMIN_PASSWORD_HASH");
}

export function getSessionSecret() {
  return requireEnv("SESSION_SECRET");
}
