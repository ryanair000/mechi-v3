# Meta WhatsApp Cloud API Runbook

This is the Mechi production path for WhatsApp player DMs:

```text
Player WhatsApp DM
-> Meta WhatsApp Cloud API webhook
-> /api/whatsapp/webhook
-> support inbox
-> WhatsApp player-action fast path or OpenClaw bridge
-> Graph API /{phone_number_id}/messages
```

Native OpenClaw WhatsApp can still exist for operator/admin groups, but player DMs for the tournament should use Meta Cloud API through the Mechi app.

## Two-number operating split

Use these numbers as separate products, not interchangeable senders:

- `+254113033475`: Meta WhatsApp Cloud API sender for Mechi player/customer DMs, PlayMechi registration confirmations, match reminders, support inbox replies, and approved template sends.
- `+254733638841`: native OpenClaw WhatsApp sender for operator/admin WhatsApp groups only. Do not use this number for player DMs, cold outreach, tournament mass messages, marketing broadcasts, or automated replies to unknown chats.

The native OpenClaw number should never be logged into a local Windows/laptop gateway for production. It should be linked once on the EC2 OpenClaw host, routed to `control`, and constrained to approved operator/admin groups.

Shadowban recovery rule for `+254733638841`: if the number was recently restricted, do not relink repeatedly or push automated traffic through it. Let it cool down, use it manually and lightly first, then reconnect it on EC2 only when normal manual send/receive behavior is healthy.

## Meta App

- Current active app for setup reuse: Chezahub Meta app (`1583907273573846`) under business portfolio `979153360704572`.
- Callback URL: `https://mechi.club/api/whatsapp/webhook`
- Webhook product: WhatsApp Business Account
- Subscribe to: `messages`
- Mechi sender number: `+254113033475`

Current observed state on 2026-05-02:

- Chezahub app is published and has the WhatsApp use case enabled.
- Webhook callback is already set to `https://mechi.club/api/whatsapp/webhook`.
- `messages` is subscribed at Graph API `v25.0`.
- WABA shown in setup is Meta's `Test WhatsApp Business Account`.
- Connected sender is only Meta's test number `+1 555-150-5108`.
- Phone Number ID shown for the test number is `1026890433848520`.
- WhatsApp Business Account ID shown is `1860142151335471`.
- Only active template shown is `hello_world`.
- PlayMechi registration/reminder templates are not present yet.
- WhatsApp Manager has `Add phone number` disabled for the test WABA.

This setup is enough for Mechi development/testing against Meta Cloud API, but it is not enough for live tournament player traffic until a production WhatsApp number is connected and the PlayMechi templates are approved.

Do not register, migrate, or repoint the sender number until the Boss approves the action in Meta, because it changes where WhatsApp traffic for that number is delivered.

## Environment

Set these on the hosted Mechi app:

```env
WHATSAPP_APP_SECRET=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_TOKEN=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_TEMPLATE_LANGUAGE=en_US
WHATSAPP_TEST_TEMPLATE_NAME=hello_world
WHATSAPP_TEMPLATE_PLAYMECHI_REGISTRATION=
WHATSAPP_TEMPLATE_PLAYMECHI_REMINDER=
```

Keep `MECHI_OPENCLAW_BRIDGE_URL` and `MECHI_OPENCLAW_BRIDGE_TOKEN` configured so inbound player DMs can still route through OpenClaw for safe responses.

## Approved Templates

Business-initiated tournament messages need approved Meta templates. The app intentionally skips these sends if a template name is missing.

Only send tournament messages to players who opted in through Mechi registration, direct WhatsApp conversation, or another explicit Mechi/PlayMechi opt-in path. Every player-facing message must be expected, useful, and easy to opt out of. Do not import scraped contacts or use group members as a broadcast list.

### `WHATSAPP_TEMPLATE_PLAYMECHI_REGISTRATION`

Body parameters, in order:

1. player username
2. game label
3. date label
4. time label
5. in-game username
6. registration URL
7. WhatsApp group URL

### `WHATSAPP_TEMPLATE_PLAYMECHI_REMINDER`

Body parameters, in order:

1. player username
2. game label
3. date label
4. time label
5. in-game username
6. format
7. scoring
8. tournament arena URL
9. stream URL

## Test Sequence

1. Verify Meta webhook challenge against `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
2. Send `hello_world` from `/admin/whatsapp`.
3. Send a normal inbound player DM to confirm it lands in `/admin/support`.
4. Confirm the support inbox creates an OpenClaw bridge request.
5. Test `playmechi_registration` from `/admin/whatsapp` after the registration template is approved.
6. Test `playmechi_reminder` from `/admin/whatsapp` after the reminder template is approved.
7. Run the reminder cron dry check near the window with `CRON_SECRET` auth.

## Tournament Behavior

- Registration confirmation is attempted after a first PlayMechi registration if the player has a phone or WhatsApp number and the registration template is configured.
- Match reminders run through `/api/cron/email-reminders` alongside email reminders and use separate idempotency keys.
- Inbound WhatsApp text can answer PlayMechi schedule, prizes, rules, stream, group, and registration questions directly before falling back to OpenClaw.
- Payouts, disqualifications, reward eligibility, winner status, and disputes remain human/control-agent surfaces.

## Policy posture

- Keep PlayMechi messaging as service/utility messaging for a free-to-enter event. Avoid casino, betting, wager, stake, odds, or gambling framing.
- Because prizes have monetary value, do not send broad promotional WhatsApp campaigns about the event without first checking the current WhatsApp Business Messaging Policy and local legal posture.
- Use approved Meta templates outside the 24-hour user-service window.
- Honor opt-out requests immediately and suppress future sends to that player.
- Monitor quality, delivery failures, blocks, and reports before increasing volume.
