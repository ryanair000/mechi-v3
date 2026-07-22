import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const workspaceRoute = await readFile(path.join(root, 'src/components/v5/app/V5WorkspaceRoute.tsx'), 'utf8');
const historyRoute = await readFile(path.join(root, 'src/app/api/v5/player-history/route.ts'), 'utf8');

const requirements = [
  ['nested reward balances', workspaceRoute.includes('rewards?.balances')],
  ['reward activity', workspaceRoute.includes('recent_activity')],
  ['player registration history', workspaceRoute.includes("'/api/v5/player-history'")],
  ['live tournament leaderboard', workspaceRoute.includes("'/api/users/leaderboard/tournaments'")],
  ['derived tournament checklist', workspaceRoute.includes('data.registrations.length > 0')],
  ['derived verified-result checklist', workspaceRoute.includes("match.status === 'completed'")],
  ['profile game IDs', workspaceRoute.includes('Object.entries(user?.game_ids ?? {})')],
  ['standard tournament registrations', historyRoute.includes("from('tournament_players')")],
  ['PlayMechi registrations', historyRoute.includes("from('online_tournament_registrations')")],
  ['Weka Mawe registrations', historyRoute.includes("from('weka_mawe_registrations')")],
];

const failures = requirements.filter(([, present]) => !present);
if (workspaceRoute.includes('Rankings are built from verified results') || workspaceRoute.includes('href="/rankings"')) {
  failures.push(['removed static rankings placeholder and invalid link', false]);
}

if (failures.length) {
  console.error('V5 player-data regression guard failed:');
  for (const [label] of failures) console.error(`- ${label}`);
  process.exit(1);
}

console.log(`V5 player-data guard passed (${requirements.length} data connections).`);
