# Instagram DM Setup For PlayMechi

This project includes an Instagram DM webhook at `/api/webhooks/instagram` and a compatibility alias at `/api/instagram/webhook`. Both routes feed the Mechi support inbox, then route safe replies through the OpenClaw support bridge.

## What It Does

1. Meta sends an Instagram DM webhook to `https://your-domain.com/api/webhooks/instagram`
2. The app validates the webhook signature and extracts the inbound DM
3. The message is saved into `support_threads` / `support_messages`
4. If `INSTAGRAM_AI_AUTO_REPLY_ENABLED=true`, the support inbox asks OpenClaw for a customer-safe reply
5. The app sends approved AI/manual replies back through Meta's Instagram Messages API

## Required Environment Variables

Set these in your deployment environment:

```env
INSTAGRAM_VERIFY_TOKEN=your-random-verify-token
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=optional-alias-or-same-token
INSTAGRAM_APP_SECRET=your-meta-app-secret
INSTAGRAM_GRAPH_API_VERSION=v25.0

MECHI_INSTAGRAM_ACCESS_TOKEN=your-instagram-user-token
MECHI_INSTAGRAM_USER_ID=your-instagram-professional-account-id
MECHI_INSTAGRAM_APP_ID=your-meta-app-id
MECHI_INSTAGRAM_APP_SECRET=your-meta-app-secret

MECHI_OPENCLAW_BRIDGE_URL=https://your-openclaw-host/v1/mechi-support-reply
MECHI_OPENCLAW_BRIDGE_TOKEN=your-openclaw-bridge-token

INSTAGRAM_AI_AUTO_REPLY_ENABLED=false
```

Keep `INSTAGRAM_AI_AUTO_REPLY_ENABLED=false` while testing. With that setting, inbound DMs are captured in the support inbox but no automatic public reply is sent.

For local read-only token checks, put fresh credentials in `.env.instagram.local` and run:

```bash
npm run ops:instagram:check -- --messages
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

- `instagram_business_basic`
- `instagram_business_manage_messages`

Standard access is enough for Instagram professional accounts you own or manage and have added to the Meta app dashboard. Advanced access is needed for accounts you do not own/manage.

## OpenClaw Support Bridge Contract

The support inbox sends the OpenClaw bridge a JSON payload like:

```json
{
  "thread_id": "support-thread-id",
  "phone": "instagram:1784...",
  "user_summary": null,
  "conversation": [],
  "mechi_context": "Mechi support context...",
  "system_prompt": "Instagram-safe support rules...",
  "allowed_topics": [],
  "blocked_topics": []
}
```

## OpenClaw Response Contract

The bridge should return one JSON object:

```json
{
  "disposition": "reply",
  "reply_text": "Short Instagram-safe reply",
  "confidence": 0.82,
  "tags": ["pricing"],
  "escalation_reason": null
}
```

## Notes

- Replies are sent through Meta's Instagram Messages API using the Instagram user token
- The route ignores echo messages to avoid reply loops
- Signature validation is enforced with `INSTAGRAM_APP_SECRET` / `MECHI_INSTAGRAM_APP_SECRET`
- OpenClaw failures move the thread to human follow-up instead of inventing an answer
- The token pasted in chat during setup should be treated as compromised and rotated before testing

## Useful Docs

- Instagram Messaging overview: https://developers.facebook.com/docs/instagram-messaging/
- Instagram webhooks: https://developers.facebook.com/docs/instagram-platform/webhooks/
- Meta webhooks getting started: https://developers.facebook.com/docs/graph-api/webhooks/getting-started/
- Messenger Send API reference: https://developers.facebook.com/docs/messenger-platform/reference/send-api/
