import {
  test as base,
  expect,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import { resolveE2EEnvironment, type E2EEnvironment } from './helpers/env';
import {
  readProviderTranscripts,
  waitForProviderTranscript,
  type ProviderTranscriptRecord,
} from './helpers/provider-transcripts';
import {
  PERSONA_KEYS,
  SCENARIO_IDS,
  SEEDED_PERSONAS,
  type PersonaKey,
} from './helpers/personas';
import {
  createChallenge,
  createE2ESupabaseClient,
  createLobby,
  createMatch,
  createMatchChatMessage,
  createNotification,
  createQueueEntry,
  createRewardReviewItem,
  createSuggestion,
  createSupportThread,
  createTournament,
  createLiveStream,
  type ChallengeInput,
  type LobbyInput,
  type LiveStreamInput,
  type MatchInput,
  type MatchMessageInput,
  type NotificationInput,
  type QueueEntryInput,
  type RewardReviewInput,
  type SuggestionInput,
  type SupportThreadInput,
  type TournamentInput,
} from './helpers/seed';
import { getStorageStatePath } from './helpers/storage-state';

type OpenPersonaPage = (
  personaKey: PersonaKey
) => Promise<{ context: BrowserContext; page: Page }>;

type SeedHelpers = {
  createQueueEntry: (input: QueueEntryInput) => ReturnType<typeof createQueueEntry>;
  createMatch: (input: MatchInput) => ReturnType<typeof createMatch>;
  createMatchChatMessage: (
    input: MatchMessageInput
  ) => ReturnType<typeof createMatchChatMessage>;
  createChallenge: (input: ChallengeInput) => ReturnType<typeof createChallenge>;
  createLobby: (input: LobbyInput) => ReturnType<typeof createLobby>;
  createTournament: (input: TournamentInput) => ReturnType<typeof createTournament>;
  createLiveStream: (input: LiveStreamInput) => ReturnType<typeof createLiveStream>;
  createNotification: (input: NotificationInput) => ReturnType<typeof createNotification>;
  createSupportThread: (input: SupportThreadInput) => ReturnType<typeof createSupportThread>;
  createRewardReviewItem: (
    input: RewardReviewInput
  ) => ReturnType<typeof createRewardReviewItem>;
  createSuggestion: (input: SuggestionInput) => ReturnType<typeof createSuggestion>;
};

type ProviderTranscriptHelpers = {
  read: (provider: string) => ProviderTranscriptRecord[];
  waitFor: (
    provider: string,
    predicate: (entry: ProviderTranscriptRecord) => boolean,
    timeoutMs?: number
  ) => Promise<ProviderTranscriptRecord>;
};

type WorkerFixtures = {
  environment: E2EEnvironment;
  personas: typeof SEEDED_PERSONAS;
  scenarioIds: typeof SCENARIO_IDS;
  seed: SeedHelpers;
};

type TestFixtures = {
  appUrl: (pathname?: string) => string;
  adminUrl: (pathname?: string) => string;
  openPersonaPage: OpenPersonaPage;
  providerTranscripts: ProviderTranscriptHelpers;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  environment: [
    async ({}, runFixture) => {
      await runFixture(resolveE2EEnvironment());
    },
    { scope: 'worker' },
  ],
  personas: [
    async ({}, runFixture) => {
      await runFixture(SEEDED_PERSONAS);
    },
    { scope: 'worker' },
  ],
  scenarioIds: [
    async ({}, runFixture) => {
      await runFixture(SCENARIO_IDS);
    },
    { scope: 'worker' },
  ],
  appUrl: async ({ environment }, runFixture) => {
    await runFixture((pathname = '/') => new URL(pathname, environment.baseURL).toString());
  },
  adminUrl: async ({ environment }, runFixture) => {
    await runFixture((pathname = '/') => new URL(pathname, environment.adminBaseURL).toString());
  },
  openPersonaPage: async ({ browser }, runFixture) => {
    await runFixture(async (personaKey) => {
      if (!PERSONA_KEYS.includes(personaKey)) {
        throw new Error(`Unknown persona: ${personaKey}`);
      }

      const context = await browser.newContext({
        storageState: getStorageStatePath(personaKey),
      });
      const page = await context.newPage();
      return { context, page };
    });
  },
  seed: [
    async ({ environment }, runFixture) => {
      const client = createE2ESupabaseClient(environment);
      await runFixture({
        createQueueEntry: (input) => createQueueEntry(client, input),
        createMatch: (input) => createMatch(client, input),
        createMatchChatMessage: (input) => createMatchChatMessage(client, input),
        createChallenge: (input) => createChallenge(client, input),
        createLobby: (input) => createLobby(client, input),
        createTournament: (input) => createTournament(client, input),
        createLiveStream: (input) => createLiveStream(client, input),
        createNotification: (input) => createNotification(client, input),
        createSupportThread: (input) => createSupportThread(client, input),
        createRewardReviewItem: (input) => createRewardReviewItem(client, input),
        createSuggestion: (input) => createSuggestion(client, input),
      });
    },
    { scope: 'worker' },
  ],
  providerTranscripts: async ({ environment }, runFixture) => {
    await runFixture({
      read: (provider) => readProviderTranscripts(environment, provider),
      waitFor: (provider, predicate, timeoutMs) =>
        waitForProviderTranscript(environment, provider, predicate, timeoutMs),
    });
  },
});

export { expect };
