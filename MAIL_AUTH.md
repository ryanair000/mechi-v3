# Mechi V3 — Mail Service, Auth & WhatsApp Notifications

## What Already Exists (do not recreate)

- `src/lib/email.ts` — Resend client, `sendWelcomeEmail`, `sendMatchFoundEmail`, `sendResultConfirmedEmail` — all with branded HTML templates, FROM `noreply@mechi.club`
- `src/app/api/auth/register/route.ts` — calls `sendWelcomeEmail` on signup (email optional)
- `src/app/api/matches/[id]/report/route.ts` — calls `sendResultConfirmedEmail` on match complete
- `src/lib/whatsapp.ts` — exists, imports used in report route

Read these files fully before touching anything:
- `src/lib/email.ts`
- `src/lib/whatsapp.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/register/route.ts`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/app/api/matchmaking/route.ts`

---

## Part 1 — DNS & Resend Domain Verification

> This is a checklist, not code. Complete before running any email tests.

Mechi's sending domain is `mechi.club`. MX and A records are already on Truehost. For Resend to send *from* mechi.club, these additional DNS records must be added on Truehost:

### Records to add on Truehost DNS panel

| Type | Name | Value |
|---|---|---|
| TXT | `@` (root) | `v=spf1 include:_spf.resend.com ~all` |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:admin@mechi.club` |
| TXT | `resend._domainkey` | *(copy exact value from Resend dashboard → Domains → mechi.club → DKIM)* |

**Steps:**
1. Go to [resend.com](https://resend.com) → Domains → Add Domain → enter `mechi.club`
2. Copy the three DNS records Resend shows (SPF, DKIM, DMARC)
3. Add them on Truehost DNS manager
4. Back in Resend, click "Verify DNS Records"
5. Verification usually takes 5–30 minutes

### Required env vars (`.env.local` and Vercel project settings)

```
RESEND_API_KEY=re_xxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=https://mechi.club
NEXT_PUBLIC_BASE_URL=https://mechi.club
```

### Test send (run once after DNS verifies)

Create a temporary test script `scripts/test-email.ts`:

```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);
resend.emails.send({
  from: 'noreply@mechi.club',
  to: 'delivered@resend.dev', // Resend test address — always succeeds
  subject: 'Mechi email test',
  html: '<p>Email service working ✅</p>',
}).then(console.log).catch(console.error);
```

Run: `npx tsx scripts/test-email.ts`

Delete `scripts/test-email.ts` after confirming it works.

---

## Part 2 — Email Template Audit & Improvements

File: `src/lib/email.ts`

Read the existing file. Make the following targeted improvements only — do not rewrite the whole file:

### 2a. Fix FROM address format

Change:
```typescript
const FROM = 'noreply@mechi.club';
```
To:
```typescript
const FROM = 'Mechi <noreply@mechi.club>';
```

### 2b. Add `sendMatchDisputeEmail`

After the existing functions, add:

```typescript
export async function sendMatchDisputeEmail(params: {
  to: string;
  username: string;
  opponentUsername: string;
  game: string;
  matchId: string;
}): Promise<void> {
  const content = `
    <h2>Match Disputed ⚠️</h2>
    <p>Your match against <strong>${params.opponentUsername}</strong> in <strong>${params.game}</strong> has been disputed.</p>
    <p>Upload a screenshot of the result on the match page so our team can resolve it within 24 hours.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Game</span>
        <span class="info-value">${params.game}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Opponent</span>
        <span class="info-value">${params.opponentUsername}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Status</span>
        <span class="info-value"><span class="badge badge-red">DISPUTED</span></span>
      </div>
    </div>
    <a href="${APP_URL}/match/${params.matchId}" class="btn">Upload Screenshot →</a>
  `;
  try {
    await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: `Match disputed — upload screenshot to resolve`,
      html: baseLayout('Match Disputed', content),
    });
  } catch (err) {
    console.error('[Email] Dispute send error:', err);
  }
}
```

### 2c. Wire dispute email into the dispute API

File: `src/app/api/matches/[id]/dispute/route.ts`

After a screenshot is uploaded and the match status is set to `disputed`, add (fire-and-forget):

```typescript
import { sendMatchDisputeEmail } from '@/lib/email';

// After status update, fetch both players' emails and send:
const [p1Email, p2Email] = [player1.email, player2.email];
if (p1Email) sendMatchDisputeEmail({ to: p1Email, username: player1.username, opponentUsername: player2.username, game: gameLabel, matchId: id }).catch(console.error);
if (p2Email) sendMatchDisputeEmail({ to: p2Email, username: player2.username, opponentUsername: player1.username, game: gameLabel, matchId: id }).catch(console.error);
```

### 2d. Verify match found email is fired on match creation

File: `src/app/api/matchmaking/route.ts`

Read the file. Find where a match is inserted into the `matches` table and both players are notified. After the match insert, if `sendMatchFoundEmail` is not already called for both players, add it:

```typescript
import { sendMatchFoundEmail } from '@/lib/email';

// For player 1:
if (player1.email) {
  sendMatchFoundEmail({
    to: player1.email,
    username: player1.username,
    opponentUsername: player2.username,
    game: GAME_LABELS[game] ?? game,
    platform: displayPlatform,
    opponentPlatformId: player2PlatformId,
    matchId: match.id,
  }).catch(console.error);
}

// For player 2:
if (player2.email) {
  sendMatchFoundEmail({
    to: player2.email,
    username: player2.username,
    opponentUsername: player1.username,
    game: GAME_LABELS[game] ?? game,
    platform: displayPlatform,
    opponentPlatformId: player1PlatformId,
    matchId: match.id,
  }).catch(console.error);
}
```

Do not duplicate if it's already there — read the file first.

---

## Part 3 — Multi-Identifier Login

Currently login only accepts `phone`. Change it to accept phone number, username, or email in a single field.

### 3a. API — `src/app/api/auth/login/route.ts`

Replace the entire route with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { verifyPassword, signToken } from '@/lib/auth';

function detectIdentifierType(identifier: string): 'email' | 'phone' | 'username' {
  if (identifier.includes('@')) return 'email';
  // phone: starts with 0, 07, +254, or is mostly digits/spaces/dashes
  if (/^[\+\d][\d\s\-\(\)]{7,}$/.test(identifier)) return 'phone';
  return 'username';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Identifier and password are required' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const type = detectIdentifierType(identifier.trim());

    let query = supabase.from('profiles').select('*');

    if (type === 'email') {
      query = query.eq('email', identifier.trim().toLowerCase());
    } else if (type === 'phone') {
      // Normalise phone: strip all non-digit chars except leading +
      const normalised = identifier.trim().replace(/[\s\-\(\)]/g, '');
      query = query.eq('phone', normalised);
    } else {
      query = query.ilike('username', identifier.trim());
    }

    const { data: profile, error } = await query.single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Account not found. Check your details.' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, profile.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    const token = signToken({ sub: profile.id, username: profile.username });

    const response = NextResponse.json({
      token,
      user: {
        id: profile.id,
        username: profile.username,
        phone: profile.phone,
        email: profile.email,
        region: profile.region,
        platforms: profile.platforms ?? [],
        game_ids: profile.game_ids ?? {},
        selected_games: profile.selected_games ?? [],
      },
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[Login] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3b. Login page — `src/app/(auth)/login/page.tsx`

Change the state and form field:

```typescript
// Before:
const [phone, setPhone] = useState('');
// After:
const [identifier, setIdentifier] = useState('');
```

Update the fetch body:
```typescript
// Before:
body: JSON.stringify({ phone: phone.trim(), password }),
// After:
body: JSON.stringify({ identifier: identifier.trim(), password }),
```

Update the guard at the top of `handleSubmit`:
```typescript
// Before:
if (!phone.trim() || !password) { toast.error('Enter your phone and password'); return; }
// After:
if (!identifier.trim() || !password) { toast.error('Enter your details and password'); return; }
```

Update the form field JSX:
```tsx
<div>
  <label className="label">Phone, username, or email</label>
  <input
    type="text"
    value={identifier}
    onChange={(e) => setIdentifier(e.target.value)}
    placeholder="0712 345 678 · GameKing254 · you@mail.com"
    className="input"
    autoComplete="username"
    autoCapitalize="none"
    spellCheck={false}
  />
</div>
```

---

## Part 4 — WhatsApp Notification Preference

### 4a. Supabase Migration

Create file: `supabase/migrations/20260414_whatsapp_notifications.sql`

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS whatsapp_notifications boolean NOT NULL DEFAULT false;
```

### 4b. Register API — `src/app/api/auth/register/route.ts`

In the destructuring at the top, add:
```typescript
const { username, phone, email, password, region, platforms, game_ids, selected_games, whatsapp_number, whatsapp_notifications } = body;
```

In the profiles insert object, add:
```typescript
whatsapp_number: whatsapp_number || phone || null,
whatsapp_notifications: whatsapp_notifications ?? false,
```

### 4c. Register Page Step 1 — `src/app/(auth)/register/page.tsx`

Add two new fields to `FormData`:
```typescript
interface FormData {
  // ...existing fields...
  whatsapp_notifications: boolean;
  whatsapp_number: string;
}
```

In `useState` initial value:
```typescript
const [formData, setFormData] = useState<FormData>({
  username: '', phone: '', email: '', password: '', region: 'Nairobi',
  platforms: [], game_ids: {}, selected_games: [],
  whatsapp_notifications: false,
  whatsapp_number: '',
});
```

In Step 1 JSX, after the Phone Number field and before the Email field, insert:

```tsx
{/* WhatsApp notifications opt-in */}
<div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
  <label className="flex items-start gap-3 cursor-pointer">
    <div className="relative mt-0.5 flex-shrink-0">
      <input
        type="checkbox"
        checked={formData.whatsapp_notifications}
        onChange={(e) => setFormData({
          ...formData,
          whatsapp_notifications: e.target.checked,
          whatsapp_number: e.target.checked ? formData.phone : '',
        })}
        className="sr-only"
      />
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
        formData.whatsapp_notifications
          ? 'border-green-500 bg-green-500'
          : 'border-white/20 bg-transparent'
      }`}>
        {formData.whatsapp_notifications && <Check size={11} className="text-white" />}
      </div>
    </div>
    <div>
      <p className="text-sm font-medium text-white">
        📲 WhatsApp match alerts
      </p>
      <p className="text-xs text-white/30 mt-0.5">
        Get notified when a match is found or a result is confirmed
      </p>
    </div>
  </label>

  {formData.whatsapp_notifications && (
    <div className="mt-3 pt-3 border-t border-white/[0.06]">
      <label className="label">WhatsApp Number</label>
      <input
        type="tel"
        value={formData.whatsapp_number}
        onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
        placeholder="0712 345 678"
        className="input"
        inputMode="tel"
      />
      <p className="text-xs text-white/20 mt-1.5">
        Leave as is if same as your phone number above
      </p>
    </div>
  )}
</div>
```

---

## Part 5 — WhatsApp Notification Stubs

File: `src/lib/whatsapp.ts`

Read the existing file. If it only has stub functions or is empty, leave the structure intact but ensure the following functions are exported and handle their params gracefully (no crash if WhatsApp API is not configured):

```typescript
export async function notifyMatchFound(params: {
  whatsappNumber: string;
  username: string;
  opponentUsername: string;
  game: string;
  matchId: string;
  appUrl: string;
}): Promise<void>

export async function notifyResultConfirmed(params: {
  whatsappNumber: string;
  username: string;
  opponentUsername: string;
  game: string;
  won: boolean;
  ratingChange: number;
  appUrl: string;
}): Promise<void>
```

Each function should check if `WHATSAPP_API_KEY` env var exists — if not, log a warning and return early. Do not throw. This keeps the system functional before WhatsApp Business API is set up.

```typescript
const WHATSAPP_ENABLED = !!process.env.WHATSAPP_API_KEY;

async function safeNotify(label: string, fn: () => Promise<void>): Promise<void> {
  if (!WHATSAPP_ENABLED) {
    console.log(`[WhatsApp] ${label} skipped — WHATSAPP_API_KEY not set`);
    return;
  }
  try {
    await fn();
  } catch (err) {
    console.error(`[WhatsApp] ${label} error:`, err);
  }
}
```

---

## Part 6 — Profile API: include whatsapp fields

File: `src/app/api/users/profile/route.ts` (GET and PATCH handlers)

**GET:** Add `whatsapp_number`, `whatsapp_notifications` to the SELECT columns list.

**PATCH:** Accept `whatsapp_number` and `whatsapp_notifications` in the update body. Add them to the `updateData` object if present in the request.

Return them in the user object response so the settings tab can display/edit them.

---

## Part 7 — Profile Settings: WhatsApp preference toggle

File: `src/app/(app)/profile/page.tsx`

In the settings tab, after the Region card and before the Platforms card, add a WhatsApp notification preference card:

```tsx
{/* WhatsApp Notifications */}
<div className="card p-5">
  <label className="label mb-3">Notifications</label>
  <label className="flex items-center justify-between gap-4 cursor-pointer">
    <div>
      <p className="text-sm font-medium text-white">📲 WhatsApp match alerts</p>
      <p className="text-xs text-white/30 mt-0.5">Get notified when matches are found or results confirmed</p>
    </div>
    {/* Toggle switch */}
    <button
      type="button"
      onClick={() => {
        const newVal = !(profile?.whatsapp_notifications as boolean ?? false);
        // optimistic update — save handled by the main Save Changes button
        setProfile((p) => p ? { ...p, whatsapp_notifications: newVal } : p);
      }}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
        (profile?.whatsapp_notifications as boolean)
          ? 'bg-green-500'
          : 'bg-white/10'
      }`}
    >
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
        (profile?.whatsapp_notifications as boolean) ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  </label>

  {(profile?.whatsapp_notifications as boolean) && (
    <div className="mt-4 pt-4 border-t border-white/[0.05]">
      <label className="label">WhatsApp Number</label>
      <input
        type="tel"
        value={(profile?.whatsapp_number as string) ?? ''}
        onChange={(e) => setProfile((p) => p ? { ...p, whatsapp_number: e.target.value } : p)}
        placeholder="0712 345 678"
        className="input"
        inputMode="tel"
      />
    </div>
  )}
</div>
```

Include `whatsapp_number` and `whatsapp_notifications` in the `handleSave` PATCH body:

```typescript
body: JSON.stringify({
  region,
  platforms,
  game_ids: gameIds,
  selected_games: selectedGames,
  whatsapp_notifications: profile?.whatsapp_notifications ?? false,
  whatsapp_number: profile?.whatsapp_number ?? null,
}),
```

---

## Implementation Order

1. Add DNS records on Truehost, verify domain in Resend dashboard
2. Set env vars in Vercel project settings
3. Run `supabase/migrations/20260414_whatsapp_notifications.sql` via Supabase dashboard SQL editor
4. Update `src/lib/email.ts` (FROM format + `sendMatchDisputeEmail`)
5. Update `src/lib/whatsapp.ts` (safe stubs)
6. Update `src/app/api/auth/login/route.ts` (multi-identifier)
7. Update `src/app/(auth)/login/page.tsx` (identifier field)
8. Update `src/app/api/auth/register/route.ts` (whatsapp fields)
9. Update `src/app/(auth)/register/page.tsx` (WhatsApp opt-in)
10. Update `src/app/api/users/profile/route.ts` (GET + PATCH)
11. Update `src/app/(app)/profile/page.tsx` (toggle UI)
12. Wire dispute email into dispute API route
13. Verify match found email is in matchmaking route
14. Run `npm run build` — fix all TypeScript and ESLint errors
15. Deploy

---

## Constraints

- All email sends are fire-and-forget (`fn().catch(console.error)`) — never `await` them in request handlers where latency matters
- Never throw from email or WhatsApp functions — catch internally and log
- The WhatsApp system is a stub until `WHATSAPP_API_KEY` is configured — the app must work fully without it
- Do not change the JWT structure, `signToken`, or `verifyPassword` functions
- Do not change the Supabase client setup
- `npm run build` must pass clean before the task is considered done
