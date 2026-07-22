import { test, expect } from '../fixtures';
import { createApiContextAs } from './support';
import { SCENARIO_IDS, SEEDED_PERSONAS } from '../helpers/personas';

test.describe('V5 workspace authorization and membership', () => {
  test('locks, deduplicates, displays, and withdraws a team tournament roster @workspaces', async ({
    playwright,
    appUrl,
    openPersonaPage,
  }) => {
    const outsiderApi = await createApiContextAs(playwright, appUrl(), 'playerFree');
    const captainApi = await createApiContextAs(playwright, appUrl(), 'playerPro');
    const entryPayload = {
      tournament_id: SCENARIO_IDS.teamTournament,
      idempotency_key: 'team-entry-e2e-00000001',
      reason: 'Captain confirmed the E2E roster',
    };

    const outsiderResponse = await outsiderApi.post(
      `/api/v5/teams/${SCENARIO_IDS.team}/entries`,
      { data: entryPayload }
    );
    expect(outsiderResponse.status()).toBe(404);

    const createResponse = await captainApi.post(`/api/v5/teams/${SCENARIO_IDS.team}/entries`, {
      data: entryPayload,
    });
    expect(createResponse.status()).toBe(201);
    const created = (await createResponse.json()) as {
      entry?: { id?: string; status?: string };
      roster_snapshot?: { roster?: Array<{ user_id?: string; game_id?: string }> };
      idempotent?: boolean;
    };
    expect(created.entry).toMatchObject({ status: 'confirmed' });
    expect(created.roster_snapshot?.roster).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ user_id: SEEDED_PERSONAS.playerPro.id }),
        expect.objectContaining({ user_id: SEEDED_PERSONAS.playerOpponentA.id }),
      ])
    );
    expect(created.roster_snapshot?.roster?.every((member) => Boolean(member.game_id))).toBe(true);

    const duplicateResponse = await captainApi.post(
      `/api/v5/teams/${SCENARIO_IDS.team}/entries`,
      { data: entryPayload }
    );
    expect(duplicateResponse.status()).toBe(200);
    await expect(duplicateResponse.json()).resolves.toMatchObject({
      entry: { id: created.entry?.id },
      idempotent: true,
    });

    const { context, page } = await openPersonaPage('playerPro');
    await page.goto(appUrl('/app/team/tournaments'));
    await expect(page.getByRole('heading', { name: 'Team tournaments' })).toBeVisible();
    await expect(page.getByText(/E2E Team Cup/)).toBeVisible();
    await expect(page.getByText('Confirmed', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Withdraw' }).click();
    await page.getByLabel('Reason').fill('Captain withdrew before tournament check-in');
    await page.getByRole('button', { name: 'Confirm withdrawal' }).click();
    await expect(page.getByText('Entry withdrawn and roster lock released.')).toBeVisible();
    await context.close();

    const entriesResponse = await captainApi.get(`/api/v5/teams/${SCENARIO_IDS.team}/entries`);
    expect(entriesResponse.ok()).toBeTruthy();
    await expect(entriesResponse.json()).resolves.toMatchObject({
      entries: expect.arrayContaining([
        expect.objectContaining({ id: created.entry?.id, status: 'withdrawn' }),
      ]),
    });

    await outsiderApi.dispose();
    await captainApi.dispose();
  });

  test('enforces IDOR boundaries and completes the invitation lifecycle @workspaces', async ({
    playwright,
    appUrl,
    openPersonaPage,
  }) => {
    const outsiderApi = await createApiContextAs(playwright, appUrl(), 'playerFree');
    const captainApi = await createApiContextAs(playwright, appUrl(), 'playerPro');
    const sponsorApi = await createApiContextAs(playwright, appUrl(), 'rewardLinkedUser');
    const invitedPlayerApi = await createApiContextAs(playwright, appUrl(), 'playerOpponentB');

    const outsiderWorkspaceResponse = await outsiderApi.get(
      `/api/v5/workspaces/${SCENARIO_IDS.teamWorkspace}`
    );
    expect(outsiderWorkspaceResponse.status()).toBe(404);

    const outsiderMembersResponse = await outsiderApi.get(
      `/api/v5/workspaces/${SCENARIO_IDS.teamWorkspace}/members`
    );
    expect(outsiderMembersResponse.status()).toBe(404);

    const captainMembersResponse = await captainApi.get(
      `/api/v5/workspaces/${SCENARIO_IDS.teamWorkspace}/members`
    );
    expect(captainMembersResponse.ok()).toBeTruthy();
    await expect(captainMembersResponse.json()).resolves.toMatchObject({
      members: expect.arrayContaining([
        expect.objectContaining({ user_id: SEEDED_PERSONAS.playerOpponentA.id, role: 'starter' }),
      ]),
    });

    const publicSponsorResponse = await sponsorApi.patch(
      `/api/v5/workspaces/${SCENARIO_IDS.sponsorWorkspace}`,
      {
        data: { is_public: true, reason: 'Attempt public profile before verification' },
      }
    );
    expect(publicSponsorResponse.status()).toBe(409);

    const invalidPreferenceResponse = await captainApi.patch(
      `/api/v5/workspaces/${SCENARIO_IDS.teamWorkspace}/preferences`,
      {
        data: { last_route: '/app/sponsor/campaigns', theme: 'dark', density: 'compact' },
      }
    );
    expect(invalidPreferenceResponse.status()).toBe(400);

    const preferenceResponse = await captainApi.patch(
      `/api/v5/workspaces/${SCENARIO_IDS.teamWorkspace}/preferences`,
      {
        data: { last_route: '/app/team/roster', theme: 'dark', density: 'compact' },
      }
    );
    expect(preferenceResponse.ok()).toBeTruthy();

    const { context: invitedContext, page: invitedPage } = await openPersonaPage('playerOpponentB');
    await invitedPage.goto(appUrl('/app/player/inbox'));
    await expect(invitedPage.getByRole('heading', { name: 'Invitations' })).toBeVisible();
    await expect(invitedPage.getByText('E2E Rift Squad')).toBeVisible();
    await invitedPage.getByRole('button', { name: 'Accept' }).click();
    await expect(invitedPage.getByText('No workspace invitation needs your response.')).toBeVisible();
    await invitedContext.close();

    const invitedWorkspacesResponse = await invitedPlayerApi.get('/api/v5/workspaces');
    expect(invitedWorkspacesResponse.ok()).toBeTruthy();
    const invitedWorkspaces = (await invitedWorkspacesResponse.json()) as {
      workspaces?: Array<{ id?: string; type?: string }>;
    };
    expect(invitedWorkspaces.workspaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: SCENARIO_IDS.teamWorkspace, type: 'team' }),
      ])
    );

    const createInvitationResponse = await captainApi.post(
      `/api/v5/workspaces/${SCENARIO_IDS.teamWorkspace}/invitations`,
      {
        data: { username_or_email: SEEDED_PERSONAS.playerFree.username, role: 'analyst' },
      }
    );
    expect(createInvitationResponse.status()).toBe(201);
    const createdInvitation = (await createInvitationResponse.json()) as {
      invitation?: { id?: string };
    };
    expect(createdInvitation.invitation?.id).toBeTruthy();

    const revokeResponse = await captainApi.delete(
      `/api/v5/workspaces/${SCENARIO_IDS.teamWorkspace}/invitations/${createdInvitation.invitation?.id}`,
      { data: { reason: 'Player is no longer joining this roster' } }
    );
    expect(revokeResponse.status()).toBe(204);

    const { context: captainContext, page: captainPage } = await openPersonaPage('playerPro');
    await captainPage.goto(appUrl('/app/team/roster'));
    await expect(captainPage.getByRole('heading', { name: 'Team roster' })).toBeVisible();
    await expect(captainPage.getByText('E2E Rift Squad')).toBeVisible();
    await expect(captainPage.getByText(SEEDED_PERSONAS.playerOpponentA.username)).toBeVisible();
    await captainContext.close();

    await outsiderApi.dispose();
    await captainApi.dispose();
    await sponsorApi.dispose();
    await invitedPlayerApi.dispose();
  });
});
