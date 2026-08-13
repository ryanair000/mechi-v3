import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(new URL('../supabase/migrations/20260812131546_passport_competitive_resume_event_passport.sql', import.meta.url), 'utf8');
const resume = await readFile(new URL('../src/lib/passport-resume.ts', import.meta.url), 'utf8');
const pdf = await readFile(new URL('../src/lib/passport-cv-pdf.ts', import.meta.url), 'utf8');
const verifyPage = await readFile(new URL('../src/app/verify/passport/[token]/page.tsx', import.meta.url), 'utf8');
const qrRoute = await readFile(new URL('../src/app/api/passport/check-in/[token]/qr/route.ts', import.meta.url), 'utf8');

test('Phase 4 trust tables are RLS protected and server-only', () => {
  for (const table of ['passport_competitive_seasons', 'passport_competitive_snapshots', 'passport_event_credentials', 'passport_event_checkin_passes', 'passport_event_checkin_attempts', 'passport_cv_settings']) {
    assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`, 'i'));
  }
  assert.match(migration, /REVOKE ALL ON TABLE[\s\S]+FROM anon, authenticated/i);
  assert.match(migration, /GRANT ALL ON TABLE[\s\S]+TO service_role/i);
});

test('registration and attendance remain distinct credential facts', () => {
  assert.match(migration, /stamp_type IN \('registered', 'checked_in', 'attended', 'competed', 'placement', 'staff', 'organizer', 'streamer'\)/);
  assert.match(migration, /tp\.id::text \|\| ':registered'/);
  assert.match(migration, /tp\.id::text \|\| ':checked_in'/);
  assert.match(migration, /tp\.check_in_status = 'checked_in'/);
});

test('QR redemption is transactional and rejects replay, transfer, expiry, and revocation', () => {
  assert.match(migration, /FOR UPDATE/);
  for (const outcome of ['replayed', 'transferred', 'expired', 'revoked', 'invalid', 'accepted']) assert.match(migration, new RegExp(`'${outcome}'`));
  assert.match(migration, /v_pass\.user_id <> p_actor_id THEN 'transferred'/);
  assert.match(migration, /UPDATE public\.tournament_players[\s\S]+SET check_in_status = 'checked_in'/);
  assert.match(migration, /SET used_at = timezone\('utc', now\(\)\)/);
});

test('competitive resume reads only completed authoritative matches', () => {
  assert.match(resume, /from\('matches'\)[\s\S]+\.eq\('status', 'completed'\)/);
  assert.match(resume, /winner_id === userId/);
  assert.doesNotMatch(resume, /reported_winner/);
  assert.match(resume, /loadCompetitiveSeasons/);
});

test('public resume honors Passport competitive, event, and team visibility', () => {
  assert.match(resume, /fieldVisible\('competitive'\)/);
  assert.match(resume, /fieldVisible\('events'\)/);
  assert.match(resume, /fieldVisible\('teams'\)/);
});

test('Gamer CV excludes private contact details and links verification pages', () => {
  assert.match(pdf, /No private contact details are included/);
  assert.match(pdf, /verify\/passport/);
  assert.match(pdf, /PUBLIC PASSPORT/);
  assert.doesNotMatch(pdf, /phone|email|whatsapp_number/);
});

test('event credential verification exposes source, issuer, and issue date', () => {
  assert.match(verifyPage, /Source:/);
  assert.match(verifyPage, /Issuer:/);
  assert.match(verifyPage, /Issued /);
  assert.match(verifyPage, /Revoked credential/);
});

test('real QR images encode account-bound check-in URLs', () => {
  assert.match(qrRoute, /QRCode\.toBuffer/);
  assert.match(qrRoute, /passport\/check-in/);
  assert.match(qrRoute, /image\/png/);
});

test('tournament QR passes require an exact confirmed participant link', () => {
  assert.match(resume, /Boolean\(input\.tournamentId\) !== Boolean\(input\.tournamentPlayerId\)/);
  assert.match(resume, /Confirmed tournament registration not found/);
});

test('organizers can idempotently project authoritative tournament credentials', () => {
  assert.match(resume, /projectPassportTournamentCredentials/);
  assert.match(resume, /tournament\.status === 'completed'/);
  assert.match(resume, /tournament\.winner_id === player\.user_id/);
  assert.match(resume, /if \(before\.data\) \{ existing \+= 1/);
});
