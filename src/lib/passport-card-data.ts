import 'server-only';

import type { PassportCardPresentationSource } from '@/lib/passport-card-model';
import { resolvePlan, type Plan } from '@/lib/plans';
import { createServiceClient } from '@/lib/supabase';

const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, elite: 2 };

type CosmeticRow = {
  cosmetic_key: string;
  cosmetic_type: 'theme' | 'avatar_frame' | 'card_style';
  label: string;
  required_plan: Plan;
  style_tokens: Record<string, unknown> | null;
};

export async function getPassportCardPresentation(
  userId: string
): Promise<PassportCardPresentationSource> {
  const supabase = createServiceClient();
  const [profileResult, customizationResult] = await Promise.all([
    supabase.from('profiles').select('plan, plan_expires_at').eq('id', userId).maybeSingle(),
    supabase.from('passport_customizations')
      .select('theme_key, card_style_key')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);
  const plan = resolvePlan(profileResult.data?.plan, profileResult.data?.plan_expires_at);
  const themeKey = String(customizationResult.data?.theme_key ?? 'mechi_core');
  const cardStyleKey = String(customizationResult.data?.card_style_key ?? 'card_core');
  const catalogResult = await supabase
    .from('passport_cosmetic_catalog')
    .select('cosmetic_key, cosmetic_type, label, required_plan, style_tokens')
    .in('cosmetic_key', [themeKey, cardStyleKey])
    .eq('is_active', true);
  const cosmetics = (catalogResult.data ?? []) as CosmeticRow[];
  const allowed = cosmetics.filter((cosmetic) =>
    PLAN_RANK[plan] >= PLAN_RANK[cosmetic.required_plan]
  );
  const theme = allowed.find((cosmetic) =>
    cosmetic.cosmetic_type === 'theme' && cosmetic.cosmetic_key === themeKey
  );
  const cardStyle = allowed.find((cosmetic) =>
    cosmetic.cosmetic_type === 'card_style' && cosmetic.cosmetic_key === cardStyleKey
  );
  return {
    themeLabel: theme?.label ?? null,
    cardStyleLabel: cardStyle?.label ?? null,
    accent: theme?.style_tokens?.accent,
    background: theme?.style_tokens?.background,
    surface: theme?.style_tokens?.surface,
    pattern: cardStyle?.style_tokens?.pattern,
  };
}
