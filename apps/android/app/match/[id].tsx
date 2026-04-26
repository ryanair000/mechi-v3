import * as ImagePicker from 'expo-image-picker';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../src/api/client';
import { getMatch, submitMatchResult, uploadDisputeScreenshot } from '../../src/api/mechi';
import { useAuth } from '../../src/auth/AuthProvider';
import {
  Button,
  Card,
  ChipGroup,
  ErrorBanner,
  Field,
  LoadingState,
  Screen,
  SectionTitle,
  textStyles,
} from '../../src/components/ui';
import {
  getConfiguredGameId,
  getConfiguredPlatform,
  getGame,
  requiresScoreReport,
} from '../../src/config/games';
import { colors, spacing } from '../../src/theme';

export default function MatchDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user, initializing } = useAuth();
  const [winnerId, setWinnerId] = useState('');
  const [player1Score, setPlayer1Score] = useState('');
  const [player2Score, setPlayer2Score] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const matchQuery = useQuery({
    queryKey: ['matches', id],
    queryFn: () => getMatch(id),
    enabled: Boolean(id && token),
  });
  const match = matchQuery.data?.match;
  const scoreBased = match ? requiresScoreReport(match.game) : false;

  const players = useMemo(() => {
    if (!match) return [];
    return [
      {
        value: match.player1_id,
        label: match.player1?.username ?? 'Player 1',
      },
      {
        value: match.player2_id,
        label: match.player2?.username ?? 'Player 2',
      },
    ];
  }, [match]);

  const opponent = match
    ? user?.id === match.player1_id
      ? match.player2
      : match.player1
    : null;
  const opponentPlatform = match && opponent
    ? getConfiguredPlatform(match.game, opponent.game_ids ?? {}, opponent.platforms ?? [])
    : null;
  const opponentGameId = match && opponent
    ? getConfiguredGameId(match.game, opponentPlatform, opponent.game_ids ?? {})
    : '';

  const submitMutation = useMutation({
    mutationFn: () => {
      if (!match) throw new Error('No match loaded');

      if (scoreBased) {
        return submitMatchResult(match.id, {
          player1_score: Number(player1Score),
          player2_score: Number(player2Score),
        });
      }

      return submitMatchResult(match.id, { winner_id: winnerId });
    },
    onSuccess: async (result) => {
      setError(null);
      setNotice(
        result.status === 'waiting_for_opponent'
          ? 'Result submitted. Waiting for the other player to confirm.'
          : `Match ${result.status}.`
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['matches', id] }),
        queryClient.invalidateQueries({ queryKey: ['matches', 'current'] }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
      ]);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not submit result.');
    },
  });

  const disputeMutation = useMutation({
    mutationFn: uploadDisputeScreenshot,
    onSuccess: async () => {
      setError(null);
      setNotice('Screenshot uploaded for review.');
      await queryClient.invalidateQueries({ queryKey: ['matches', id] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not upload screenshot.');
    },
  });

  async function pickDisputeImage() {
    if (!match) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow photo access to upload proof.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    disputeMutation.mutate({
      matchId: match.id,
      uri: asset.uri,
      name: asset.fileName ?? `match-${match.id}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  }

  if (initializing) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Checking session" />
      </Screen>
    );
  }

  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  if (matchQuery.isLoading || !match) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading match" />
      </Screen>
    );
  }

  return (
    <Screen title="Match" subtitle={`${getGame(match.game).label} . ${match.status}`}>
      <Card>
        <SectionTitle title="Players" />
        <View style={styles.versus}>
          <View style={styles.playerBox}>
            <Text style={styles.playerName}>{match.player1?.username ?? 'Player 1'}</Text>
            <Text style={styles.playerMeta}>{match.player1_id === user?.id ? 'You' : 'Opponent'}</Text>
          </View>
          <Text style={styles.vs}>VS</Text>
          <View style={styles.playerBox}>
            <Text style={styles.playerName}>{match.player2?.username ?? 'Player 2'}</Text>
            <Text style={styles.playerMeta}>{match.player2_id === user?.id ? 'You' : 'Opponent'}</Text>
          </View>
        </View>
        {opponent ? (
          <View style={styles.opponentId}>
            <Text style={styles.infoLabel}>Opponent ID</Text>
            <Text style={styles.infoValue}>{opponentGameId || 'Not provided'}</Text>
          </View>
        ) : null}
      </Card>

      <ErrorBanner message={error} />
      {notice ? (
        <Card>
          <Text style={textStyles.body}>{notice}</Text>
        </Card>
      ) : null}

      {match.status === 'pending' ? (
        <Card>
          <SectionTitle title="Submit result" />
          {scoreBased ? (
            <>
              <Field
                label={`${match.player1?.username ?? 'Player 1'} score`}
                value={player1Score}
                onChangeText={setPlayer1Score}
                keyboardType="number-pad"
                placeholder="0"
              />
              <Field
                label={`${match.player2?.username ?? 'Player 2'} score`}
                value={player2Score}
                onChangeText={setPlayer2Score}
                keyboardType="number-pad"
                placeholder="0"
              />
            </>
          ) : (
            <ChipGroup options={players} value={winnerId || (players[0]?.value ?? '')} onChange={setWinnerId} />
          )}
          <Button
            label="Submit result"
            icon="checkmark-done"
            onPress={() => submitMutation.mutate()}
            loading={submitMutation.isPending}
            disabled={
              scoreBased
                ? player1Score.trim() === '' || player2Score.trim() === ''
                : !(winnerId || players[0]?.value)
            }
          />
        </Card>
      ) : null}

      {match.status === 'disputed' ? (
        <Card>
          <SectionTitle title="Dispute proof" />
          <Text style={textStyles.muted}>
            Upload a clear result screenshot so the Mechi team can review the match.
          </Text>
          {match.dispute_screenshot_url ? (
            <Text style={styles.uploaded}>Screenshot already uploaded.</Text>
          ) : null}
          <Button
            label="Upload screenshot"
            icon="image"
            variant="secondary"
            onPress={pickDisputeImage}
            loading={disputeMutation.isPending}
          />
        </Card>
      ) : null}

      {match.status === 'completed' ? (
        <Card>
          <SectionTitle title="Final result" />
          <Text style={textStyles.body}>
            Winner: {players.find((player) => player.value === match.winner_id)?.label ?? 'Draw'}
          </Text>
          {typeof match.player1_score === 'number' && typeof match.player2_score === 'number' ? (
            <Text style={textStyles.muted}>
              Score: {match.player1_score}-{match.player2_score}
            </Text>
          ) : null}
        </Card>
      ) : null}

      <Button label="Back" icon="arrow-back" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  versus: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  playerBox: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel2,
    padding: spacing.md,
  },
  playerName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  playerMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  vs: {
    color: colors.accent,
    fontWeight: '900',
    alignSelf: 'center',
  },
  opponentId: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  uploaded: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
});
