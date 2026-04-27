import { createServiceClient } from '@/lib/supabase';
import { normalizeUsername } from '@/lib/username';

export async function isUsernameTaken(value: string) {
  const username = normalizeUsername(value);
  if (!username) {
    return false;
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.from('profiles').select('id').eq('username', username).limit(1);

  if (error) {
    throw error;
  }

  return (data?.length ?? 0) > 0;
}
