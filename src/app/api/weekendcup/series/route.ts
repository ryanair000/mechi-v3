import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, requireActiveAccessProfile } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import {
  WEEKEND_CUP_BALLOTS,
  WEEKEND_CUP_MAX_VOTE_SELECTIONS,
  WEEKEND_CUP_PUBLIC_PATH,
  WEEKEND_CUP_REGISTRATION_PATH,
  WEEKEND_CUP_VOTING_DISABLED_MESSAGE,
  WEEKEND_CUP_VOTING_ENABLED,
  cleanWeekendCupText,
} from '@/lib/weekend-cup';
import {
  ensureWeekendCupBallotSeeds,
  getWeekendCupRegistrationSummary,
  loadWeekendCupBallotState,
} from '@/lib/weekend-cup-server';

function isMissingWeekendCupTableError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    code?: string;
    details?: string;
    message?: string;
  };
  const text = [candidate.code, candidate.details, candidate.message]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    text.includes('weekend_cup_') &&
    (text.includes('42p01') || text.includes('does not exist') || text.includes('schema cache'))
  );
}

function slugifyWeekendCupOption(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type WeekendCupResolvedBallot = {
  id: string;
};

type WeekendCupResolvedOption = {
  id: string;
  ballot_id: string;
};

async function getUserBallotVoteCount(
  supabase: ReturnType<typeof createServiceClient>,
  ballotId: string,
  userId: string
) {
  const { count, error } = await supabase
    .from('weekend_cup_ballot_votes')
    .select('id', { count: 'exact', head: true })
    .eq('ballot_id', ballotId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function ensureSeedBallot(
  supabase: ReturnType<typeof createServiceClient>,
  ballotSlug: string
): Promise<WeekendCupResolvedBallot | null> {
  const ballotIndex = WEEKEND_CUP_BALLOTS.findIndex((ballot) => ballot.slug === ballotSlug);
  const seedBallot = WEEKEND_CUP_BALLOTS[ballotIndex];

  if (!seedBallot) {
    return null;
  }

  const { data, error } = await supabase
    .from('weekend_cup_ballots')
    .upsert(
      {
        slug: seedBallot.slug,
        title: seedBallot.title,
        subtitle: seedBallot.subtitle,
        date_label: seedBallot.dateLabel,
        theme_label: seedBallot.themeLabel,
        cup_order: ballotIndex + 1,
        status: seedBallot.status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'slug' }
    )
    .select('id')
    .single();

  if (error || !data) {
    throw error ?? new Error('Could not prepare Weekend Cup ballot');
  }

  return data as WeekendCupResolvedBallot;
}

async function resolveVoteOption(
  supabase: ReturnType<typeof createServiceClient>,
  optionId: string
): Promise<WeekendCupResolvedOption | null> {
  if (UUID_PATTERN.test(optionId)) {
    const { data, error } = await supabase
      .from('weekend_cup_ballot_options')
      .select('id, ballot_id')
      .eq('id', optionId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as WeekendCupResolvedOption | null;
  }

  const [ballotSlug, optionSlug] = optionId.split(':', 2);
  if (!ballotSlug || !optionSlug) {
    return null;
  }

  const seedBallot = WEEKEND_CUP_BALLOTS.find((ballot) => ballot.slug === ballotSlug);
  const seedOption = seedBallot?.options.find((option) => option.slug === optionSlug);
  if (!seedOption) {
    return null;
  }

  const ballot = await ensureSeedBallot(supabase, ballotSlug);
  if (!ballot) {
    return null;
  }

  const { data, error } = await supabase
    .from('weekend_cup_ballot_options')
    .upsert(
      {
        ballot_id: ballot.id,
        slug: seedOption.slug,
        label: seedOption.label,
        platform: seedOption.platform,
        description: seedOption.description,
        is_official: seedOption.isOfficial,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'ballot_id,slug' }
    )
    .select('id, ballot_id')
    .single();

  if (error || !data) {
    throw error ?? new Error('Could not prepare Weekend Cup vote option');
  }

  return data as WeekendCupResolvedOption;
}

export async function GET(request: NextRequest) {
  try {
    const accessProfile = await getRequestAccessProfile(request);
    const supabase = createServiceClient();
    await ensureWeekendCupBallotSeeds({ supabase });
    const [ballots, registrationSummary] = await Promise.all([
      loadWeekendCupBallotState({
        supabase,
        userId: accessProfile?.id ?? null,
      }),
      getWeekendCupRegistrationSummary({
        supabase,
        userId: accessProfile?.id ?? null,
      }),
    ]);

    return NextResponse.json({
      ballots,
      registrationSummary,
      publicPath: WEEKEND_CUP_PUBLIC_PATH,
      registrationPath: WEEKEND_CUP_REGISTRATION_PATH,
    });
  } catch (error) {
    console.error('[WeekendCupSeries GET] Error:', error);
    return NextResponse.json({ error: 'Could not load Weekend Cup voting' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!WEEKEND_CUP_VOTING_ENABLED) {
    return NextResponse.json(
      { error: WEEKEND_CUP_VOTING_DISABLED_MESSAGE },
      { status: 503 }
    );
  }

  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = cleanWeekendCupText(body.action, 40);
    const supabase = createServiceClient();
    await ensureWeekendCupBallotSeeds({ supabase });

    if (action === 'vote') {
      const optionId = cleanWeekendCupText(body.option_id, 80);
      if (!optionId) {
        return NextResponse.json({ error: 'Pick a game to vote for' }, { status: 400 });
      }

      const option = await resolveVoteOption(supabase, optionId);
      if (!option) {
        return NextResponse.json({ error: 'That Weekend Cup vote option was not found' }, { status: 404 });
      }

      const { data: existingVote } = await supabase
        .from('weekend_cup_ballot_votes')
        .select('id')
        .eq('ballot_option_id', option.id)
        .eq('user_id', access.profile.id)
        .maybeSingle();

      if (existingVote?.id) {
        const { error: deleteError } = await supabase
          .from('weekend_cup_ballot_votes')
          .delete()
          .eq('id', existingVote.id);

        if (deleteError) {
          throw deleteError;
        }
      } else {
        const selectedCount = await getUserBallotVoteCount(
          supabase,
          option.ballot_id,
          access.profile.id
        );
        if (selectedCount >= WEEKEND_CUP_MAX_VOTE_SELECTIONS) {
          return NextResponse.json(
            { error: 'You can pick up to five Season 2 Weekend Cup games.' },
            { status: 400 }
          );
        }

        const { error: insertError } = await supabase
          .from('weekend_cup_ballot_votes')
          .insert({
            ballot_id: option.ballot_id,
            ballot_option_id: option.id,
            user_id: access.profile.id,
          });

        if (insertError) {
          throw insertError;
        }
      }
    } else if (action === 'clear_votes') {
      const ballotSlug = cleanWeekendCupText(body.ballot_slug, 80);
      if (!ballotSlug) {
        return NextResponse.json({ error: 'Pick the Season 2 Weekend Cup vote you want to reset.' }, { status: 400 });
      }

      const ballot = await ensureSeedBallot(supabase, ballotSlug);
      if (!ballot) {
        return NextResponse.json({ error: 'That Weekend Cup ballot was not found' }, { status: 404 });
      }

      const { error: clearError } = await supabase
        .from('weekend_cup_ballot_votes')
        .delete()
        .eq('ballot_id', ballot.id)
        .eq('user_id', access.profile.id);

      if (clearError) {
        throw clearError;
      }
    } else if (action === 'suggest_game') {
      const ballotSlug = cleanWeekendCupText(body.ballot_slug, 80);
      const label = cleanWeekendCupText(body.label, 80);
      const description = cleanWeekendCupText(body.description, 240);

      if (!ballotSlug || !label) {
        return NextResponse.json(
          { error: 'Pick the weekend and add the game title you want to push.' },
          { status: 400 }
        );
      }

      const fallbackBallot = WEEKEND_CUP_BALLOTS.find((ballot) => ballot.slug === ballotSlug);
      const defaultPlatform = fallbackBallot?.options[0]?.platform ?? 'mobile';
      const platform = cleanWeekendCupText(body.platform, 20) || defaultPlatform;
      const safePlatform =
        platform === 'console' || platform === 'pc' || platform === 'mixed' ? platform : 'mobile';

      const ballot = await ensureSeedBallot(supabase, ballotSlug);
      if (!ballot) {
        return NextResponse.json({ error: 'That Weekend Cup ballot was not found' }, { status: 404 });
      }

      const optionSlug = slugifyWeekendCupOption(label);
      const { data: existingOption, error: existingOptionError } = await supabase
        .from('weekend_cup_ballot_options')
        .select('id')
        .eq('ballot_id', (ballot as { id: string }).id)
        .eq('slug', optionSlug)
        .maybeSingle();

      if (existingOptionError) {
        throw existingOptionError;
      }

      const optionId = existingOption?.id ?? null;
      let targetOptionId = optionId;
      const selectedCount = await getUserBallotVoteCount(
        supabase,
        (ballot as { id: string }).id,
        access.profile.id
      );

      if (!optionId) {
        if (selectedCount >= WEEKEND_CUP_MAX_VOTE_SELECTIONS) {
          return NextResponse.json(
            { error: 'You can pick up to five Season 2 Weekend Cup games.' },
            { status: 400 }
          );
        }

        const { data: insertedOption, error: insertOptionError } = await supabase
          .from('weekend_cup_ballot_options')
          .insert({
            ballot_id: (ballot as { id: string }).id,
            slug: optionSlug,
            label,
            platform: safePlatform,
            description: description || `${label} pushed by the community.`,
            is_official: false,
            suggested_by: access.profile.id,
            suggestion_note: description || null,
          })
          .select('id')
          .single();

        if (insertOptionError || !insertedOption) {
          throw insertOptionError ?? new Error('Could not create Weekend Cup option');
        }

        targetOptionId = insertedOption.id;
      }

      const { data: existingVote } = await supabase
        .from('weekend_cup_ballot_votes')
        .select('id')
        .eq('ballot_option_id', targetOptionId)
        .eq('user_id', access.profile.id)
        .maybeSingle();

      if (!existingVote?.id) {
        if (selectedCount >= WEEKEND_CUP_MAX_VOTE_SELECTIONS) {
          return NextResponse.json(
            { error: 'You can pick up to five Season 2 Weekend Cup games.' },
            { status: 400 }
          );
        }

        const { error: voteInsertError } = await supabase
          .from('weekend_cup_ballot_votes')
          .insert({
            ballot_id: (ballot as { id: string }).id,
            ballot_option_id: targetOptionId,
            user_id: access.profile.id,
          });

        if (voteInsertError) {
          throw voteInsertError;
        }
      }
    } else {
      return NextResponse.json({ error: 'Unknown Weekend Cup action' }, { status: 400 });
    }

    const [ballots, registrationSummary] = await Promise.all([
      loadWeekendCupBallotState({
        supabase,
        userId: access.profile.id,
      }),
      getWeekendCupRegistrationSummary({
        supabase,
        userId: access.profile.id,
      }),
    ]);

    return NextResponse.json({
      ballots,
      registrationSummary,
    });
  } catch (error) {
    console.error('[WeekendCupSeries POST] Error:', error);
    if (isMissingWeekendCupTableError(error)) {
      return NextResponse.json(
        { error: 'Weekend Cup voting desk is still syncing. Try again shortly.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: 'Could not update Weekend Cup vote state' }, { status: 500 });
  }
}
