import { Resend } from 'resend';
import { DEFAULT_RATING } from '@/lib/config';
import { getRankDivision } from '@/lib/gamification';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? 'noreply@mechi.club';
const FROM = `Mechi <${FROM_ADDRESS}>`;
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_BASE_URL ??
  'https://mechi.club';

function baseLayout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #eef3f7; font-family: 'Segoe UI', Arial, sans-serif; color: #0B1121; }
    .wrapper { max-width: 620px; margin: 0 auto; padding: 32px 16px; }
    .card { background: #ffffff; border: 1px solid #d7e1ea; border-radius: 24px; overflow: hidden; box-shadow: 0 24px 60px rgba(11, 17, 33, 0.08); }
    .header { background: linear-gradient(135deg, #0B1121 0%, #152033 58%, #FF6B6B 100%); padding: 36px 32px; }
    .brand { color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.04em; margin: 0; }
    .tagline { color: rgba(255,255,255,0.7); margin: 10px 0 0; font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
    .body { padding: 32px; }
    .body h2 { color: #0B1121; margin: 0 0 10px; font-size: 24px; font-weight: 800; letter-spacing: -0.03em; }
    .body p { color: #435066; line-height: 1.7; margin: 0 0 16px; font-size: 14px; }
    .info-box { background: #f8fbfd; border: 1px solid #d7e1ea; border-radius: 18px; padding: 20px; margin: 22px 0; }
    .info-row { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid #e3ebf2; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #5f6d82; font-size: 13px; }
    .info-value { color: #0B1121; font-size: 13px; font-weight: 700; text-align: right; }
    .btn { display: inline-block; background: #FF6B6B; color: #0B1121 !important; text-decoration: none; padding: 14px 28px; border-radius: 14px; font-weight: 800; font-size: 14px; margin-top: 8px; }
    .footer { padding: 22px 32px 28px; border-top: 1px solid #e3ebf2; text-align: center; }
    .footer p { color: #5f6d82; font-size: 12px; margin: 0; line-height: 1.6; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
    .badge-win { background: rgba(50,224,196,0.16); color: #148a77; }
    .badge-loss { background: rgba(255,107,107,0.12); color: #c94a4a; }
    .badge-red { background: rgba(255,107,107,0.12); color: #c94a4a; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <p class="brand">MECHI</p>
        <p class="tagline">Compete. Connect. Rise.</p>
      </div>
      <div class="body">
        ${content}
      </div>
      <div class="footer">
        <p>mechi.club</p>
        <p>You are receiving this email because you have an account on Mechi.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendWelcomeEmail(params: {
  to: string;
  username: string;
}): Promise<void> {
  const starterRank = getRankDivision(DEFAULT_RATING);
  const content = `
    <h2>Welcome, ${params.username}</h2>
    <p>Your Mechi profile is live. Pick your focus games, lock in your setup, and start climbing through clean competitive matches.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Starting Rank</span>
        <span class="info-value">${starterRank.label}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Level</span>
        <span class="info-value">Lv. 1</span>
      </div>
      <div class="info-row">
        <span class="info-label">Platform</span>
        <span class="info-value">mechi.club</span>
      </div>
    </div>
    <p>Head to your dashboard, finish setup, and get into your first queue.</p>
    <a href="${APP_URL}/dashboard" class="btn">Open Dashboard</a>
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: `Welcome to Mechi, ${params.username}!`,
      html: baseLayout(`Welcome to Mechi, ${params.username}!`, content),
    });
  } catch (err) {
    console.error('[Email] Welcome send error:', err);
  }
}

export async function sendMatchFoundEmail(params: {
  to: string;
  username: string;
  opponentUsername: string;
  game: string;
  platform: string;
  opponentPlatformId: string;
  matchId: string;
}): Promise<void> {
  const content = `
    <h2>Match found</h2>
    <p>Your next Mechi match is ready. Open the match room, connect with your opponent, and finish cleanly so both profiles stay accurate.</p>
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
        <span class="info-label">Platform</span>
        <span class="info-value">${params.platform}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Opponent ID</span>
        <span class="info-value">${params.opponentPlatformId}</span>
      </div>
    </div>
    <p>Use the match page to coordinate, report the result, and keep the ladder moving.</p>
    <a href="${APP_URL}/match/${params.matchId}" class="btn">View Match</a>
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: `Match found! You vs ${params.opponentUsername}`,
      html: baseLayout('Match Found', content),
    });
  } catch (err) {
    console.error('[Email] Match found send error:', err);
  }
}

export async function sendResultConfirmedEmail(params: {
  to: string;
  username: string;
  opponentUsername: string;
  game: string;
  won: boolean;
  rankLabel: string;
  level: number;
}): Promise<void> {
  const content = `
    <h2>${params.won ? 'Victory confirmed' : 'Match complete'}</h2>
    <p>Your match against <strong>${params.opponentUsername}</strong> is locked in. Your Mechi climb has been updated.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Game</span>
        <span class="info-value">${params.game}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Result</span>
        <span class="info-value">
          <span class="badge ${params.won ? 'badge-win' : 'badge-loss'}">${params.won ? 'Win' : 'Loss'}</span>
        </span>
      </div>
      <div class="info-row">
        <span class="info-label">Current Rank</span>
        <span class="info-value">${params.rankLabel}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Level</span>
        <span class="info-value">Lv. ${params.level}</span>
      </div>
    </div>
    <a href="${APP_URL}/dashboard" class="btn">Play Again</a>
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: `Match result: ${params.won ? 'You won!' : 'Match complete'} / ${params.rankLabel}`,
      html: baseLayout('Match Result', content),
    });
  } catch (err) {
    console.error('[Email] Result confirmed send error:', err);
  }
}

export async function sendMatchDisputeEmail(params: {
  to: string;
  username: string;
  opponentUsername: string;
  game: string;
  matchId: string;
}): Promise<void> {
  const content = `
    <h2>Match disputed</h2>
    <p>Your match against <strong>${params.opponentUsername}</strong> in <strong>${params.game}</strong> has been disputed.</p>
    <p>Upload a screenshot of the result on the match page so the result can be resolved cleanly.</p>
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
        <span class="info-value"><span class="badge badge-red">Disputed</span></span>
      </div>
    </div>
    <a href="${APP_URL}/match/${params.matchId}" class="btn">Upload Screenshot</a>
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: 'Match disputed - upload screenshot to resolve',
      html: baseLayout('Match Disputed', content),
    });
  } catch (err) {
    console.error('[Email] Dispute send error:', err);
  }
}

export async function sendTournamentFullEmail(params: {
  to: string;
  organizerName: string;
  tournamentTitle: string;
  tournamentUrl: string;
}): Promise<void> {
  const content = `
    <h2>Your bracket is full</h2>
    <p>Hey ${params.organizerName}, every slot in <strong>${params.tournamentTitle}</strong> is locked.</p>
    <p>Start the tournament to create the first match rooms and get players moving.</p>
    <a href="${params.tournamentUrl}" class="btn">Start Tournament</a>
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: `${params.tournamentTitle} is full - start it now`,
      html: baseLayout('Tournament Full', content),
    });
  } catch (err) {
    console.error('[Email] Tournament full send error:', err);
  }
}

export async function sendTournamentMatchReadyEmail(params: {
  to: string;
  playerName: string;
  opponentName: string;
  tournamentTitle: string;
  game: string;
  matchUrl: string;
}): Promise<void> {
  const content = `
    <h2>Your bracket match is ready</h2>
    <p>Hey ${params.playerName}, your match in <strong>${params.tournamentTitle}</strong> is live.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Game</span>
        <span class="info-value">${params.game}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Opponent</span>
        <span class="info-value">${params.opponentName}</span>
      </div>
    </div>
    <a href="${params.matchUrl}" class="btn">Open Match</a>
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: `Your Mechi tournament match is ready`,
      html: baseLayout('Tournament Match Ready', content),
    });
  } catch (err) {
    console.error('[Email] Tournament match send error:', err);
  }
}

export async function sendTournamentWinnerEmail(params: {
  to: string;
  winnerName: string;
  tournamentTitle: string;
  prizeAmount: number;
  tournamentUrl: string;
}): Promise<void> {
  const prizeCopy =
    params.prizeAmount > 0
      ? `Your prize is KES ${params.prizeAmount.toLocaleString()}. If automatic payout needs review, Mechi will keep it marked on the tournament.`
      : 'No cash prize on this one, but the win is yours.';

  const content = `
    <h2>Champion status locked</h2>
    <p>GG ${params.winnerName}. You won <strong>${params.tournamentTitle}</strong>.</p>
    <p>${prizeCopy}</p>
    <a href="${params.tournamentUrl}" class="btn">View Bracket</a>
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: `You won ${params.tournamentTitle}`,
      html: baseLayout('Tournament Winner', content),
    });
  } catch (err) {
    console.error('[Email] Tournament winner send error:', err);
  }
}

export async function sendSubscriptionConfirmEmail(params: {
  to: string;
  username: string;
  plan: 'pro' | 'elite';
  expiresAt: string;
}): Promise<void> {
  const planName = params.plan === 'elite' ? 'Elite' : 'Pro';
  const expiry = new Date(params.expiresAt).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const content = `
    <h2>${planName} activated</h2>
    <p>Hey ${params.username}, your ${planName} plan is live on Mechi.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Plan</span>
        <span class="info-value">${planName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Renews</span>
        <span class="info-value">${expiry}</span>
      </div>
    </div>
    <p>Your upgraded perks are ready now. Jump back in and keep climbing.</p>
    <a href="${APP_URL}/dashboard" class="btn">Open Dashboard</a>
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: `${planName} activated on Mechi`,
      html: baseLayout(`${planName} activated on Mechi`, content),
    });
  } catch (err) {
    console.error('[Email] Subscription confirm send error:', err);
  }
}
