import { getStorageStatePath } from '../helpers/storage-state';
import { test, expect } from '../fixtures';
import { SEEDED_PERSONAS } from '../helpers/personas';
import { createApiContextAs } from './support';

test.use({ storageState: getStorageStatePath('playerFree') });

test.describe('Player Pages', () => {
  test('dashboard and core player surfaces load with seeded content @core', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await expect(page.locator('body')).toContainText(/eFootball 2026/i);
    await expect(page.locator('body')).toContainText(/EA FC 26/i);

    await page.goto('/notifications');
    await expect(page.locator('body')).toContainText(/Baseline match complete/i);

    await page.goto('/rewards');
    await expect(page.locator('body')).toContainText(/Available RP/i);

    await page.goto('/bounties');
    await expect(page.locator('body')).toContainText(/Bounties/i);
    await expect(page.locator('body')).toContainText(/E2E Live Bounty/i);

    await page.goto('/suggest');
    await expect(page.locator('body')).toContainText(/Rocket League/i);
  });

  test('queue join and leave works for an authenticated player @core', async ({
    page,
    playwright,
    appUrl,
  }) => {
    const playerApi = await createApiContextAs(playwright, appUrl(), 'playerFree');
    const joinResponse = await playerApi.post('/api/queue/join', {
      data: {
        game: 'efootball',
        platform: 'ps',
      },
    });
    expect(joinResponse.ok()).toBeTruthy();

    await page.goto('/queue?game=efootball&platform=ps');
    await expect(page.locator('body')).toContainText(/Cancel Search/i);
    await page.getByRole('button', { name: /cancel search/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await playerApi.dispose();
  });

  test('lobbies and tournaments list seeded fixtures @core', async ({ page }) => {
    await page.goto('/lobbies');
    await expect(page.locator('body')).toContainText(/E2E Lobby/i);

    await page.goto('/tournaments');
    await expect(page.locator('body')).toContainText(/E2E Open Cup/i);
    await expect(page.locator('body')).toContainText(/E2E Live Cup/i);
    await expect(page.locator('body')).toContainText(/LIVE/i);

    await page.goto('/t/e2e-open-cup');
    await expect(page.locator('body')).toContainText(/E2E Open Cup/i);
  });

  test('challenge finder shows eligible games, filters by username, and refreshes sent challenges @core', async ({
    page,
  }) => {
    await page.goto('/challenges');

    await page.getByRole('button', { name: /find opponent/i }).click();
    const dialog = page.getByRole('dialog', { name: /find opponent/i });

    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: /efootball 2026/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /ea fc 26/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /call of duty: mobile/i })).toHaveCount(0);

    const usernameSearch = dialog.getByLabel(/search by username/i);
    await usernameSearch.fill('@opponent-a');
    await expect(dialog).toContainText(/e2e-opponent-a/i);

    const opponentRow = dialog.locator('div.rounded-2xl').filter({ hasText: 'e2e-opponent-a' }).first();
    await opponentRow.getByRole('button', { name: /^challenge$/i }).click();

    await expect(dialog).toBeHidden();
    await expect(page.locator('body')).toContainText(/e2e-opponent-a/i);
    await expect(page.locator('body')).toContainText(/waiting on/i);

    const sentRow = page.locator('div').filter({ hasText: 'e2e-opponent-a' }).last();
    await sentRow.getByRole('button', { name: /cancel/i }).click();
    await expect(page.locator('body')).not.toContainText(/waiting on e2e-opponent-a/i);
  });

  test('friends and public profile surfaces show last seen copy @core', async ({ page }) => {
    await page.goto('/share?username=e2e-free-player');
    await expect(page.locator('body')).toContainText(/last seen/i);

    await page.goto('/s/e2e-free-player');
    await expect(page.locator('body')).toContainText(/last seen/i);

    await page.goto('/share?username=e2e-support-contact');
    await expect(page.locator('body')).toContainText(/no matches yet/i);
  });

  test('live tournament pages show active and queued stream states from seeded data @core', async ({
    page,
  }) => {
    await page.goto('/t/e2e-live-cup');
    await expect(page.locator('body')).toContainText(/E2E Live Cup/i);
    await expect(page.locator('body')).toContainText(/Open live stream/i);
    await expect(page.locator('body')).toContainText(/E2E Live Cup Broadcast/i);

    await page.goto('/t/e2e-idle-cup/live');
    await expect(page.locator('body')).toContainText(/Stream starting soon/i);
    await expect(page.locator('body')).toContainText(/E2E Idle Cup/i);

    await page.goto('/t/e2e-live-cup/live');
    await expect(page.locator('body')).toContainText(/E2E Live Cup Broadcast/i);
    await expect(page.locator('body')).toContainText(/Streamer: e2e-elite-player/i);
  });

  test('playmechi check-in preserves unsaved UID edits across refreshes @core', async ({
    page,
  }) => {
    let stateRequests = 0;
    const player = SEEDED_PERSONAS.playerFree;
    const mockState = {
      roster: [],
      myRegistrations: [
        {
          id: 'codm-registration-e2e',
          event_slug: 'mechi-online-gaming-tournament',
          user_id: player.id,
          game: 'codm',
          in_game_username: 'E2E Free CODM',
          game_uid: '',
          phone: player.phone,
          whatsapp_number: '254788454985',
          device_model: 'Samsung A15',
          device_serial_last6: '',
          tournament_lobby_number: null,
          tournament_lobby_slot: null,
          tournament_lobby_assigned_at: null,
          email: player.email,
          instagram_username: 'e2e-free-player',
          youtube_name: 'e2e-free-player',
          followed_instagram: true,
          subscribed_youtube: true,
          available_at_8pm: true,
          accepted_rules: true,
          reward_eligible: true,
          eligibility_status: 'eligible',
          check_in_status: 'checked_in',
          checked_in_at: '2026-05-08T11:00:00.000Z',
          admin_note: null,
          created_at: '2026-05-08T10:00:00.000Z',
          updated_at: '2026-05-08T10:00:00.000Z',
          user: {
            id: player.id,
            username: player.username,
            phone: player.phone,
            email: player.email,
            role: 'user',
            is_banned: false,
          },
        },
      ],
      rooms: [],
      fixtures: [],
      standings: {
        codm: [],
      },
      mySubmissions: [],
      disputes: [],
      payouts: [],
    };

    await page.route('**/api/events/mechi-online-gaming-tournament/state', async (route) => {
      if (route.request().method() === 'GET') {
        stateRequests += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockState),
        });
        return;
      }

      await route.continue();
    });

    await page.goto('/playmechi/check-in?game=codm');
    await expect(page.getByRole('button', { name: /save details/i })).toBeVisible();

    const uidInput = page.getByLabel(/^UID$/i);
    await uidInput.fill('5203');

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/api/events/mechi-online-gaming-tournament/state') &&
          response.request().method() === 'GET' &&
          stateRequests >= 2
      ),
      page.getByRole('button', { name: /refresh/i }).click(),
    ]);

    await expect(uidInput).toHaveValue('5203');
  });
});
