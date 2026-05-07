export type EmailCampaignTemplate = {
  id: string;
  name: string;
  category: string;
  description: string;
  subject: string;
  title: string;
  bodyText: string;
  ctaLabel: string;
  ctaUrl: string;
};

export const DEFAULT_EMAIL_CAMPAIGN_TEMPLATE_ID = 'welcome-to-mechi-hype';

export const EMAIL_CAMPAIGN_TEMPLATES: EmailCampaignTemplate[] = [
  {
    id: DEFAULT_EMAIL_CAMPAIGN_TEMPLATE_ID,
    name: 'Welcome to Mechi',
    category: 'Onboarding',
    description: 'Hype welcome blast for all profile emails.',
    subject: 'Welcome to Mechi. Your arena is live.',
    title: 'Mechi is live. Time to lock in.',
    bodyText:
      'You are officially inside Mechi, the home base for Kenyan gamers who want cleaner matches, louder wins, and real rewards.\n\nSet up your profile, pick your main games, add your in-game IDs, and start moving like a player with a plan. Queues, lobbies, tournaments, rewards, and support all sit in one place now.\n\nThis is not just another account. It is your player card, your match hub, and your route into the next PlayMechi run.',
    ctaLabel: 'Open Mechi',
    ctaUrl: '/dashboard',
  },
  {
    id: 'finish-profile-loadout',
    name: 'Finish Your Loadout',
    category: 'Onboarding',
    description: 'Push new users to complete game IDs and platform setup.',
    subject: 'Your Mechi loadout is almost ready',
    title: 'Finish setup before the next match drops.',
    bodyText:
      'Your profile is live, but your loadout needs the final pieces.\n\nAdd your main games, platform IDs, phone or WhatsApp details, and the tags opponents need to find you fast. A clean profile means smoother queues, faster tournament checks, and fewer match-day delays.\n\nTake two minutes now so the next invite does not catch you half-ready.',
    ctaLabel: 'Finish Profile',
    ctaUrl: '/profile/settings',
  },
  {
    id: 'first-queue-push',
    name: 'First Queue Push',
    category: 'Matchmaking',
    description: 'Invite players to try their first Mechi queue.',
    subject: 'Your first Mechi queue is waiting',
    title: 'Queue up and find your next run.',
    bodyText:
      'The fastest way to feel Mechi is simple: join a queue.\n\nPick your game, show you are available, and let the system surface players who are ready to run. No messy back-and-forth, no guessing who is online, just a cleaner path to a real match.\n\nStart with one queue. Let the results talk.',
    ctaLabel: 'Join Queue',
    ctaUrl: '/queue',
  },
  {
    id: 'game-id-check',
    name: 'Game ID Check',
    category: 'Trust',
    description: 'Get players to clean up missing or wrong in-game names.',
    subject: 'Quick check: is your game tag correct?',
    title: 'Wrong tags lose matches before they start.',
    bodyText:
      'Before the next lobby opens, make sure your Mechi profile has the exact in-game names you use today.\n\nIf your CODM, PUBG Mobile, eFootball, or console tag is off by even a small typo, opponents and moderators can waste time trying to find you. Clean tags keep match rooms moving and help support resolve issues faster.\n\nUpdate once. Play smoother every time.',
    ctaLabel: 'Check My Tags',
    ctaUrl: '/profile/settings',
  },
  {
    id: 'playmechi-registration-open',
    name: 'PlayMechi Registration',
    category: 'Tournament',
    description: 'Registration push for the flagship PlayMechi event.',
    subject: 'PlayMechi registration is open',
    title: 'Slots are live. Pick your game.',
    bodyText:
      'PlayMechi is where casual talk turns into actual match-day pressure.\n\nChoose your game, submit your real in-game username, confirm availability, and get ready for room details from ops. The earlier you register, the easier it is to verify your slot and avoid the last-minute scramble.\n\nIf you are serious about playing, do not wait for the group chat to get loud.',
    ctaLabel: 'Register Now',
    ctaUrl: '/playmechi/register',
  },
  {
    id: 'codm-room-ready',
    name: 'CODM Room Ready',
    category: 'Tournament',
    description: 'CODM match-day reminder with urgent energy.',
    subject: 'CODM room energy is loading',
    title: 'Charge up. CODM is almost live.',
    bodyText:
      'CODM players, this is your match-day check.\n\nCharge your device, confirm your data or Wi-Fi, open the game early, and keep WhatsApp nearby for room instructions. If your tag has changed, update it before moderators start matching names.\n\nThe smooth players arrive early. The panicked players ask for room details late.',
    ctaLabel: 'Open Tournament Hub',
    ctaUrl: '/playmechi/tournament',
  },
  {
    id: 'pubgm-squad-call',
    name: 'PUBG Mobile Squad Call',
    category: 'Tournament',
    description: 'PUBG Mobile player reminder for squad and room readiness.',
    subject: 'PUBG Mobile players, assemble',
    title: 'Your room check starts before the first drop.',
    bodyText:
      'PUBG Mobile runs better when everyone is ready before the room opens.\n\nConfirm your registered game tag, warm up your controls, and keep the event hub open for match updates. If you are playing with a squad mindset, communicate early and stay reachable.\n\nThe lobby does not wait for slow preparation.',
    ctaLabel: 'Open PlayMechi',
    ctaUrl: '/playmechi/tournament',
  },
  {
    id: 'efootball-night',
    name: 'eFootball Night',
    category: 'Tournament',
    description: 'Invite football-game players into evening competition.',
    subject: 'eFootball night is calling',
    title: 'Bring clean passes and cold finishes.',
    bodyText:
      'eFootball players, this is your signal.\n\nCheck your registered team name, confirm your availability, and be ready to respond when fixtures or room instructions land. Mechi is built to make the bracket easier to follow, but you still need to show up sharp.\n\nNo long excuses, just kickoff energy.',
    ctaLabel: 'View Event',
    ctaUrl: '/playmechi/tournament',
  },
  {
    id: 'tournament-last-call',
    name: 'Tournament Last Call',
    category: 'Tournament',
    description: 'Final registration reminder before slots close.',
    subject: 'Last call before slots close',
    title: 'If you want in, this is the move.',
    bodyText:
      'Tournament slots do not stay open forever.\n\nIf you have been waiting for the perfect moment to register, this is close enough. Pick your game, confirm your details, and let ops know you are ready before the bracket locks.\n\nLate energy is risky. Locked-in energy wins.',
    ctaLabel: 'Claim Slot',
    ctaUrl: '/playmechi/register',
  },
  {
    id: 'bracket-reveal',
    name: 'Bracket Reveal',
    category: 'Tournament',
    description: 'Hype message when brackets or match rooms are visible.',
    subject: 'The bracket is taking shape',
    title: 'Your next opponent could already be loading.',
    bodyText:
      'The tournament hub is where the noise becomes a bracket.\n\nCheck the page for match status, opponent details, room updates, and moderator instructions. Keep screenshots ready if anything needs review, and report results inside Mechi so the bracket can move cleanly.\n\nPlay your match. Keep the receipts. Let the bracket breathe.',
    ctaLabel: 'View Bracket',
    ctaUrl: '/playmechi/tournament',
  },
  {
    id: 'rewards-drop',
    name: 'Rewards Drop',
    category: 'Rewards',
    description: 'Announce redeemables, points, and player rewards.',
    subject: 'New rewards just touched down',
    title: 'Your points are not decoration.',
    bodyText:
      'Mechi rewards are built to turn activity into something you can actually use.\n\nCheck the catalog, see what is live, and redeem when your points line up. Some drops move faster than others, so do not let good points sit idle while the sharp players cash out.\n\nIf you earned it, check what it unlocks.',
    ctaLabel: 'Open Rewards',
    ctaUrl: '/rewards',
  },
  {
    id: 'points-reminder',
    name: 'Points Reminder',
    category: 'Rewards',
    description: 'Nudge players to view reward points and activity.',
    subject: 'Your Mechi points are waiting',
    title: 'Check the balance. Plan the next unlock.',
    bodyText:
      'Every match, event, and eligible action can push your Mechi journey forward.\n\nOpen your rewards page, see where your points stand, and decide what you are chasing next. A smart player tracks the scoreboard outside the match too.\n\nThe grind feels better when you know what it is building toward.',
    ctaLabel: 'Check Points',
    ctaUrl: '/rewards',
  },
  {
    id: 'streak-save',
    name: 'Streak Save',
    category: 'Engagement',
    description: 'Bring active players back before momentum fades.',
    subject: 'Do not let the streak go quiet',
    title: 'One clean run keeps momentum alive.',
    bodyText:
      'You do not need a whole weekend to stay active.\n\nJoin a queue, check a lobby, register for the next event, or update your player profile. Small moves keep you visible and ready when the next match opportunity shows up.\n\nMomentum is easier to keep than restart.',
    ctaLabel: 'Open Dashboard',
    ctaUrl: '/dashboard',
  },
  {
    id: 'inactive-comeback',
    name: 'Comeback Ping',
    category: 'Engagement',
    description: 'Reactivation email for players who have gone quiet.',
    subject: 'Mechi has moved since your last login',
    title: 'The arena did not stay still.',
    bodyText:
      'New rooms, tournament flows, rewards, and player tools have been moving while you were away.\n\nOpen Mechi, check what changed, and see where your profile sits now. You do not need a dramatic comeback. You just need one clean login and the next good match.\n\nWelcome back energy starts with a tap.',
    ctaLabel: 'Return to Mechi',
    ctaUrl: '/dashboard',
  },
  {
    id: 'leaderboard-chase',
    name: 'Leaderboard Chase',
    category: 'Competitive',
    description: 'Push ranked and competitive players toward leaderboards.',
    subject: 'Someone is climbing your leaderboard',
    title: 'If your name matters, defend it.',
    bodyText:
      'Leaderboards are not for silent players.\n\nCheck your game board, see who is moving, and line up your next matches. Every clean result builds the story around your profile, your rank, and your pressure.\n\nIf you want the top row, play like it is visible.',
    ctaLabel: 'View Leaderboard',
    ctaUrl: '/leaderboard',
  },
  {
    id: 'bounty-open',
    name: 'Bounty Open',
    category: 'Competitive',
    description: 'Announce fresh bounty opportunities.',
    subject: 'Fresh bounty energy is live',
    title: 'There is a target on the board.',
    bodyText:
      'Bounties give competitive players a reason to move now, not later.\n\nCheck what is open, read the conditions, and decide whether you are built for the run. The best players do not just wait for random matches; they choose pressure with a prize attached.\n\nOpen the board and pick your moment.',
    ctaLabel: 'View Bounties',
    ctaUrl: '/bounties',
  },
  {
    id: 'challenge-invite',
    name: 'Challenge Invite',
    category: 'Competitive',
    description: 'Push users into direct challenges.',
    subject: 'Call your match. Settle it clean.',
    title: 'Challenges keep the talk honest.',
    bodyText:
      'If there is a player you want to face, do not let it live only in chat.\n\nUse Mechi challenges to create the matchup, track the status, and keep the result in one place. Cleaner setup means fewer arguments and more time actually playing.\n\nSend the challenge and let the match answer.',
    ctaLabel: 'Create Challenge',
    ctaUrl: '/challenges',
  },
  {
    id: 'lobby-invite',
    name: 'Lobby Invite',
    category: 'Community',
    description: 'Invite players to open lobbies and casual rooms.',
    subject: 'A lobby run would hit right now',
    title: 'Open a room. Let the right players join.',
    bodyText:
      'Not every match needs a full tournament bracket.\n\nCreate a lobby, set the game, share the vibe, and let players join when they are ready. It is the easiest way to turn online energy into an actual room without chasing people across chats.\n\nYour next room can start from Mechi.',
    ctaLabel: 'Open Lobbies',
    ctaUrl: '/lobbies',
  },
  {
    id: 'weekend-arena',
    name: 'Weekend Arena',
    category: 'Community',
    description: 'Weekend engagement blast for Gen Z players.',
    subject: 'Weekend arena mode is on',
    title: 'This weekend needs a scoreboard.',
    bodyText:
      'The weekend is better when there is something to play for.\n\nCheck active queues, open lobbies, fresh tournaments, and rewards before your group chat starts making random plans. Mechi gives the weekend a clean place to happen.\n\nPull up, lock in, and make the run count.',
    ctaLabel: 'Find a Match',
    ctaUrl: '/dashboard',
  },
  {
    id: 'stream-live',
    name: 'Stream Live',
    category: 'Content',
    description: 'Tell players when streams or watch pages are active.',
    subject: 'Mechi stream energy is live',
    title: 'Watch the run while the lobby cooks.',
    bodyText:
      'Some matches deserve an audience.\n\nOpen the stream hub, follow the PlayMechi action, and keep an eye on the players making noise. Even when you are not in the room, you can still be part of the night.\n\nPull up and watch the pressure build.',
    ctaLabel: 'Watch Stream',
    ctaUrl: '/streams/playmechi',
  },
  {
    id: 'referral-squad',
    name: 'Referral Squad',
    category: 'Growth',
    description: 'Invite players to bring friends and squads.',
    subject: 'Bring the squad into Mechi',
    title: 'The platform gets better when your people are in.',
    bodyText:
      'Good matches need good players.\n\nSend Mechi to the people you actually want in your rooms: teammates, rivals, school friends, campus players, and the one person who always says they are better. The more real players inside, the better the queues and events feel.\n\nBring the right crowd.',
    ctaLabel: 'Share Mechi',
    ctaUrl: '/share',
  },
  {
    id: 'pro-upgrade',
    name: 'Pro Upgrade',
    category: 'Membership',
    description: 'Promote Pro with competitive benefits.',
    subject: 'Pro tools are waiting on your account',
    title: 'Play with more signal, less noise.',
    bodyText:
      'Pro is built for players who want Mechi to feel sharper.\n\nBetter access, stronger profile utility, and cleaner competitive tools help you move with more intention. If you are already active, upgrading is how you make the platform work harder for your game.\n\nCheck the plan and decide if it fits your run.',
    ctaLabel: 'View Plans',
    ctaUrl: '/pricing',
  },
  {
    id: 'elite-upgrade',
    name: 'Elite Upgrade',
    category: 'Membership',
    description: 'Higher-energy push for premium competitive players.',
    subject: 'Elite is for the loudest profiles',
    title: 'If you are active, move like it.',
    bodyText:
      'Elite is not for players who only watch the scoreboard.\n\nIt is for the ones chasing visibility, cleaner access, and a stronger presence across Mechi. If you are showing up often, check what Elite gives you and decide whether your account should match your energy.\n\nThe top tier should feel earned.',
    ctaLabel: 'Explore Elite',
    ctaUrl: '/pricing',
  },
  {
    id: 'fair-play-code',
    name: 'Fair Play Code',
    category: 'Trust',
    description: 'Set conduct expectations without sounding corporate.',
    subject: 'Win loud. Play clean.',
    title: 'Mechi only works if the match is fair.',
    bodyText:
      'Competitive energy is welcome. Messy behavior is not.\n\nUse the right game tags, respect room instructions, report results honestly, and keep screenshots when something needs review. Clean players make tournaments faster, disputes easier, and wins harder to question.\n\nTalk your talk, but keep the match legit.',
    ctaLabel: 'Read Rules',
    ctaUrl: '/terms-of-service',
  },
  {
    id: 'support-checkin',
    name: 'Support Check-in',
    category: 'Support',
    description: 'Friendly support nudge for players who may need help.',
    subject: 'Need help getting unstuck on Mechi?',
    title: 'Support is close if something feels off.',
    bodyText:
      'If your account, match, reward, or registration is not behaving right, do not sit there guessing.\n\nOpen support, explain what happened, and include useful details like your username, game, match link, screenshots, and phone number. Better details help the team move faster.\n\nWe want players back in the arena, not stuck in confusion.',
    ctaLabel: 'Contact Support',
    ctaUrl: '/report',
  },
  {
    id: 'android-testers',
    name: 'Android Testers',
    category: 'Product',
    description: 'Recruit Android testers with a youthful tone.',
    subject: 'Mechi Android testers, we need sharp eyes',
    title: 'Help test the app before the crowd gets it.',
    bodyText:
      'The Android build needs players who notice the small things.\n\nIf you are on Android and want early access, join the tester flow, use the app like a real player, and report anything that feels slow, broken, confusing, or weird. Early feedback shapes the version everyone else gets.\n\nTest like a player. Report like a pro.',
    ctaLabel: 'Join Testers',
    ctaUrl: '/android-testers',
  },
  {
    id: 'product-update',
    name: 'Product Update',
    category: 'Product',
    description: 'General update template for features and fixes.',
    subject: 'Mechi just got cleaner',
    title: 'New fixes, smoother flows, better player control.',
    bodyText:
      'We have been tightening the platform behind the scenes.\n\nExpect cleaner pages, stronger tournament tools, better support flows, and fewer rough edges when you move between matches, rewards, and profile setup. The goal is simple: less friction, more game.\n\nOpen Mechi and feel the update for yourself.',
    ctaLabel: 'See What Changed',
    ctaUrl: '/dashboard',
  },
  {
    id: 'moderator-recruit',
    name: 'Moderator Recruit',
    category: 'Ops',
    description: 'Invite serious community members to help moderate.',
    subject: 'Mechi moderator energy is different',
    title: 'Good events need sharp operators.',
    bodyText:
      'If you are organized, calm under pressure, and serious about fair play, Mechi moderation might fit you.\n\nModerators help check registrations, watch match flow, collect proof, and keep tournament nights moving without chaos. This is not just a title. It is trust with real responsibility.\n\nApply only if you can handle the pressure cleanly.',
    ctaLabel: 'Apply to Moderate',
    ctaUrl: '/moderators/register',
  },
  {
    id: 'payment-reminder',
    name: 'Payment Reminder',
    category: 'Tournament',
    description: 'Prompt players to complete paid tournament slots.',
    subject: 'Your slot is not locked until payment clears',
    title: 'Finish payment before someone else takes the lane.',
    bodyText:
      'If your tournament has an entry fee, registration is only half the job.\n\nComplete payment, keep the confirmation available, and check your tournament page for status updates. Paid slots move faster when proof is clean and the account details match.\n\nDo not lose a good slot to an unfinished step.',
    ctaLabel: 'Check Registration',
    ctaUrl: '/playmechi/register',
  },
  {
    id: 'proof-upload',
    name: 'Proof Upload',
    category: 'Trust',
    description: 'Ask players to upload result proof for disputes or review.',
    subject: 'Got proof? Upload it before the call is made',
    title: 'Screenshots settle what chat cannot.',
    bodyText:
      'When a result is disputed or unclear, proof matters more than noise.\n\nUpload clean screenshots, keep the match link ready, and explain the issue clearly. Moderators can move faster when they have the facts in one place instead of scattered across DMs.\n\nProtect your result with receipts.',
    ctaLabel: 'Open Matches',
    ctaUrl: '/matches',
  },
];

export function getEmailCampaignTemplate(id: string | null | undefined) {
  const normalizedId = id?.trim();
  if (!normalizedId) {
    return null;
  }

  return EMAIL_CAMPAIGN_TEMPLATES.find((template) => template.id === normalizedId) ?? null;
}
