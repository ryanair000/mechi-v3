import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'Mechi <noreply@mechi.club>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mechi.club';

function baseLayout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 560px; margin: 0 auto; padding: 32px 16px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #059669, #0d9488); padding: 32px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px; }
    .body h2 { color: #f1f5f9; margin: 0 0 8px; font-size: 20px; font-weight: 700; }
    .body p { color: #94a3b8; line-height: 1.6; margin: 0 0 16px; }
    .info-box { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1e293b; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #64748b; font-size: 13px; }
    .info-value { color: #f1f5f9; font-size: 13px; font-weight: 600; }
    .btn { display: inline-block; background: #059669; color: white !important; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 15px; margin: 8px 0; }
    .footer { padding: 24px 32px; border-top: 1px solid #334155; text-align: center; }
    .footer p { color: #475569; font-size: 12px; margin: 0; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; }
    .badge-green { background: #065f46; color: #34d399; }
    .badge-red { background: #7f1d1d; color: #f87171; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1>🎮 Mechi</h1>
        <p>Kenya's Premier Gaming Matchmaking Platform</p>
      </div>
      <div class="body">
        ${content}
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Mechi · mechi.club · You are receiving this because you registered on Mechi.</p>
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
  const content = `
    <h2>Welcome, ${params.username}! 🎉</h2>
    <p>You've joined Kenya's #1 gaming matchmaking platform. Find opponents, track your rating, and prove you're the best.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Starting Rating</span>
        <span class="info-value">1000 (Silver)</span>
      </div>
      <div class="info-row">
        <span class="info-label">Platform</span>
        <span class="info-value">mechi.club</span>
      </div>
    </div>
    <p>Head to your dashboard to start matching:</p>
    <a href="${APP_URL}/dashboard" class="btn">Go to Dashboard →</a>
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
    <h2>Match Found! ⚔️</h2>
    <p>A worthy opponent has been found. Head to the match page to see details and connect with your opponent.</p>
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
        <span class="info-label">Opponent's ID</span>
        <span class="info-value">${params.opponentPlatformId}</span>
      </div>
    </div>
    <p>Connect with your opponent and play the match, then report the result.</p>
    <a href="${APP_URL}/match/${params.matchId}" class="btn">View Match →</a>
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: `Match found! You vs ${params.opponentUsername}`,
      html: baseLayout('Match Found!', content),
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
  ratingChange: number;
  newRating: number;
}): Promise<void> {
  const sign = params.ratingChange >= 0 ? '+' : '';
  const content = `
    <h2>${params.won ? 'Victory! 🏆' : 'Match Complete 🎮'}</h2>
    <p>Your match against <strong>${params.opponentUsername}</strong> has been confirmed.</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Game</span>
        <span class="info-value">${params.game}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Result</span>
        <span class="info-value">
          <span class="badge ${params.won ? 'badge-green' : 'badge-red'}">${params.won ? 'WIN' : 'LOSS'}</span>
        </span>
      </div>
      <div class="info-row">
        <span class="info-label">Rating Change</span>
        <span class="info-value" style="color: ${params.ratingChange >= 0 ? '#34d399' : '#f87171'}">${sign}${params.ratingChange}</span>
      </div>
      <div class="info-row">
        <span class="info-label">New Rating</span>
        <span class="info-value">${params.newRating}</span>
      </div>
    </div>
    <a href="${APP_URL}/dashboard" class="btn">Play Again →</a>
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: `Match result: ${params.won ? 'You won!' : 'Match complete'} ${sign}${params.ratingChange} rating`,
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
    <h2>Match Disputed ⚠️</h2>
    <p>Your match against <strong>${params.opponentUsername}</strong> in <strong>${params.game}</strong> has been disputed.</p>
    <p>Upload a screenshot of the result so our team can resolve it within 24 hours.</p>
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
      subject: `Match disputed — upload a screenshot to resolve`,
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
