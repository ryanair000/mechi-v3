import { SEEDED_PERSONAS } from '../helpers/personas';
import { test, expect } from '../fixtures';
import { createApiContextAs } from './support';

test.describe('Competition Flows', () => {
  test('direct challenges can be accepted, chatted, and reported end to end @core', async ({
    playwright,
    appUrl,
    openPersonaPage,
  }) => {
    const challengerApi = await createApiContextAs(playwright, appUrl(), 'playerPro');
    const opponentApi = await createApiContextAs(playwright, appUrl(), 'playerOpponentA');

    const createChallengeResponse = await challengerApi.post('/api/challenges', {
      data: {
        opponent_id: SEEDED_PERSONAS.playerOpponentA.id,
        game: 'efootball',
        platform: 'ps',
        message: 'E2E direct challenge',
      },
    });
    expect(createChallengeResponse.status()).toBe(201);
    const createdChallenge = (await createChallengeResponse.json()) as {
      challenge?: { id: string };
    };

    const acceptResponse = await opponentApi.post(
      `/api/challenges/${createdChallenge.challenge?.id}/accept`
    );
    expect(acceptResponse.ok()).toBeTruthy();
    const acceptedPayload = (await acceptResponse.json()) as { match_id: string };
    expect(acceptedPayload.match_id).toBeTruthy();

    const { context, page } = await openPersonaPage('playerPro');
    await page.goto(`/match/${acceptedPayload.match_id}`);
    await expect(page.locator('body')).toContainText(SEEDED_PERSONAS.playerOpponentA.username);
    await expect(page.locator('body')).toContainText(/Match room setup/i);
    await expect(page.locator('body')).toContainText(/Invite code owner/i);
    await expect(page.locator('body')).toContainText(/PSN ID/i);
    await expect(page.locator('body')).toContainText(SEEDED_PERSONAS.playerOpponentA.gameIds.ps);

    const chatResponse = await challengerApi.post(
      `/api/matches/${acceptedPayload.match_id}/chat`,
      {
        data: {
          message: 'GLHF from the E2E suite',
        },
      }
    );
    expect(chatResponse.ok()).toBeTruthy();

    const opponentChatResponse = await opponentApi.get(
      `/api/matches/${acceptedPayload.match_id}/chat`
    );
    const opponentChat = (await opponentChatResponse.json()) as {
      messages?: Array<{ body?: string | null }>;
    };
    expect(
      opponentChat.messages?.some((message) =>
        message.body?.includes('GLHF from the E2E suite')
      )
    ).toBeTruthy();

    const firstReport = await challengerApi.post(
      `/api/matches/${acceptedPayload.match_id}/report`,
      {
        data: {
          winner_id: SEEDED_PERSONAS.playerPro.id,
        },
      }
    );
    expect(firstReport.ok()).toBeTruthy();

    const finalReport = await opponentApi.post(
      `/api/matches/${acceptedPayload.match_id}/report`,
      {
        data: {
          winner_id: SEEDED_PERSONAS.playerPro.id,
        },
      }
    );
    expect(finalReport.ok()).toBeTruthy();
    const finalPayload = (await finalReport.json()) as { status?: string; winner_id?: string | null };
    expect(finalPayload.status).toBe('completed');
    expect(finalPayload.winner_id).toBe(SEEDED_PERSONAS.playerPro.id);

    await context.close();
    await challengerApi.dispose();
    await opponentApi.dispose();
  });

  test('matchmaking cron turns queued players into a live match @core', async ({
    request,
    playwright,
    environment,
    appUrl,
    openPersonaPage,
  }) => {
    const playerApi = await createApiContextAs(playwright, appUrl(), 'playerFree');
    const opponentApi = await createApiContextAs(playwright, appUrl(), 'playerOpponentB');

    expect(
      await (await playerApi.post('/api/queue/join', { data: { game: 'efootball', platform: 'ps' } })).ok()
    ).toBeTruthy();
    expect(
      await (await opponentApi.post('/api/queue/join', { data: { game: 'efootball', platform: 'ps' } })).ok()
    ).toBeTruthy();

    const matchmakingResponse = await request.get('/api/matchmaking', {
      headers: {
        Authorization: `Bearer ${environment.cronSecret}`,
      },
    });
    expect(matchmakingResponse.ok()).toBeTruthy();

    const currentMatchResponse = await playerApi.get('/api/matches/current');
    const currentMatchPayload = (await currentMatchResponse.json()) as {
      match?: { id: string };
    };
    expect(currentMatchPayload.match?.id).toBeTruthy();

    const { context, page } = await openPersonaPage('playerFree');
    await page.goto(`/match/${currentMatchPayload.match?.id}`);
    await expect(page.locator('body')).toContainText(SEEDED_PERSONAS.playerOpponentB.username);

    await context.close();
    await playerApi.dispose();
    await opponentApi.dispose();
  });

  test('challenge player discovery API enforces auth and filters duplicate opponents @core', async ({
    request,
    playwright,
    appUrl,
  }) => {
    const unauthenticatedResponse = await request.get(appUrl('/api/challenges/players?game=efootball'));
    expect(unauthenticatedResponse.status()).toBe(401);

    const playerApi = await createApiContextAs(playwright, appUrl(), 'playerFree');

    const unconfiguredGameResponse = await playerApi.get('/api/challenges/players?game=tekken8');
    expect(unconfiguredGameResponse.status()).toBe(400);

    const efootballResponse = await playerApi.get('/api/challenges/players?game=efootball&q=@opponent-a');
    expect(efootballResponse.ok()).toBeTruthy();
    const efootballPayload = (await efootballResponse.json()) as {
      players?: Array<{ id: string; username: string }>;
    };
    expect(efootballPayload.players?.some((player) => player.id === SEEDED_PERSONAS.playerFree.id)).toBeFalsy();
    expect(
      efootballPayload.players?.some((player) => player.username === SEEDED_PERSONAS.playerOpponentA.username)
    ).toBeTruthy();

    const fc26Response = await playerApi.get('/api/challenges/players?game=fc26');
    expect(fc26Response.ok()).toBeTruthy();
    const fc26Payload = (await fc26Response.json()) as {
      players?: Array<{ username: string }>;
    };
    expect(
      fc26Payload.players?.some((player) => player.username === SEEDED_PERSONAS.playerOpponentB.username)
    ).toBeFalsy();

    await playerApi.dispose();
  });
});
