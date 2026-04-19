# Instagram DM Setup For PlayMechi

This project now includes a webhook bridge at `/api/webhooks/instagram` so Instagram DMs can be forwarded to OpenClaw and the reply can be sent back through Meta.

## What It Does

1. Meta sends an Instagram DM webhook to `https://your-domain.com/api/webhooks/instagram`
2. The app validates the webhook signature and extracts the inbound DM
3. The message is sent to your OpenClaw handler
4. OpenClaw returns one or more reply messages
5. The app sends those replies back through Meta's Send API

## Required Environment Variables

Set these in your deployment environment:

```env
INSTAGRAM_VERIFY_TOKEN=your-random-verify-token
INSTAGRAM_APP_SECRET=your-meta-app-secret
INSTAGRAM_PAGE_ACCESS_TOKEN=your-page-access-token
INSTAGRAM_GRAPH_API_VERSION=v25.0

OPENCLAW_WEBHOOK_URL=https://your-openclaw-endpoint.example.com/webhooks/instagram
OPENCLAW_API_KEY=optional-bearer-token
OPENCLAW_TIMEOUT_MS=15000

INSTAGRAM_FALLBACK_REPLY=Optional fallback if OpenClaw is unavailable
```

## Meta Setup

For `playmechi`, make sure the Instagram account is a Professional account and connected to the correct Meta app flow for Instagram messaging.

### 1. Add The Webhook Callback

In the Meta App Dashboard:

- Add the `Webhooks` product if it is not already enabled
- Set the callback URL to:

```text
https://your-domain.com/api/webhooks/instagram
```

- Set the verify token to the same value as `INSTAGRAM_VERIFY_TOKEN`

Meta will send a verification request with:

```text
GET /api/webhooks/instagram?hub.mode=subscribe&hub.challenge=...&hub.verify_token=...
```

The route in this repo already handles that verification handshake.

### 2. Subscribe To Instagram Messaging Fields

At minimum, subscribe your app to:

- `messages`

Optional but useful:

- `messaging_postbacks`
- `messaging_seen`
- `message_reactions`

The official Instagram webhooks docs also show these fields and the required permissions.

### 3. Enable The Instagram Account For Webhooks

Meta's Instagram webhooks docs show enabling the account with `subscribed_apps`.

Example:

```bash
curl -i -X POST \
  "https://graph.instagram.com/<INSTAGRAM_ACCOUNT_ID>/subscribed_apps?subscribed_fields=messages,messaging_postbacks,messaging_seen&access_token=<ACCESS_TOKEN>"
```

Use the account that backs `playmechi`.

### 4. Required Permissions

For Instagram messaging, Meta documents these permissions:

- `instagram_manage_messages`
- `instagram_basic`

Depending on the exact Meta flow you use, you may also see the Instagram Business variants in the docs.

## OpenClaw Request Contract

This app sends OpenClaw a JSON payload like:

```json
{
  "channel": "instagram",
  "sender": {
    "id": "instagram-user-id"
  },
  "recipient": {
    "id": "playmechi-instagram-id"
  },
  "message": {
    "id": "mid-or-null",
    "text": "hello",
    "attachments": [],
    "timestamp": 1776590000000,
    "source_field": "messages"
  },
  "raw_event": {}
}
```

## OpenClaw Response Contract

The bridge accepts any of these response shapes:

```json
{ "reply": "Single message" }
```

```json
{ "replies": ["First message", "Second message"] }
```

```json
{ "messages": [{ "text": "First message" }, { "text": "Second message" }] }
```

Plain text responses are also supported.

## Notes

- Replies are sent through Meta's Send API using the page access token
- The route ignores echo messages to avoid reply loops
- Signature validation is enforced when `INSTAGRAM_APP_SECRET` is set
- If OpenClaw fails, the route can optionally use `INSTAGRAM_FALLBACK_REPLY`

## Useful Docs

- Instagram Messaging overview: https://developers.facebook.com/docs/instagram-messaging/
- Instagram webhooks: https://developers.facebook.com/docs/instagram-platform/webhooks/
- Meta webhooks getting started: https://developers.facebook.com/docs/graph-api/webhooks/getting-started/
- Messenger Send API reference: https://developers.facebook.com/docs/messenger-platform/reference/send-api/
