import type { PassportPublicCompetitiveResume } from '@/lib/passport-resume-types';

function ascii(value: string) {
  return value.normalize('NFKD').replace(/[^\x20-\x7E]/g, '').replace(/[\\()]/g, '\\$&');
}

function wrap(value: string, width = 86) {
  const words = ascii(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (`${line} ${word}`.trim().length > width && line) { lines.push(line); line = word; }
    else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line);
  return lines;
}

export function buildGamerCvPdf(resume: PassportPublicCompetitiveResume, origin = 'https://mechi.club') {
  const lines: string[] = [
    'PLAYMECHI GAMER CV',
    `${resume.identity.display_name} (@${resume.identity.username})`,
    resume.presentation.headline || 'Verified competitive and event profile',
    '',
    'COMPETITIVE GAMES',
    ...resume.games.flatMap((game) => wrap(`${game.label}: ${game.matches} matches, ${game.wins} wins, ${game.win_rate}% win rate, rating ${game.current_rating}, peak ${game.peak_rating}, ${game.tournament_entries} tournament entries, ${game.tournament_wins} titles.`)),
    ...(resume.seasons.length ? ['', 'SEASON HISTORY', ...resume.seasons.slice(0, 12).flatMap((season) => wrap(`${season.title} | ${season.game} | ${season.matches} matches | peak ${season.peak_rating} | ${season.tournament_wins} titles`))] : []),
    '',
    'VERIFIED MATCH SUMMARY',
    `${resume.matches.length} recent authoritative completed matches included.`,
    ...resume.matches.slice(0, 12).map((match) => `${match.completed_at.slice(0, 10)} | ${match.game} | ${match.result.toUpperCase()} vs @${match.opponent_username}${match.score ? ` | ${match.score}` : ''}`),
  ];
  if (resume.events.length) lines.push('', 'EVENT PASSPORT', ...resume.events.slice(0, 16).flatMap((event) => wrap(`${event.occurred_at.slice(0, 10)} | ${event.event_title} | ${event.stamp_type.replace('_', ' ')}${event.placement ? ` #${event.placement}` : ''} | Verify: ${origin}/verify/passport/${event.verification_token}`)));
  if (resume.teams.length) lines.push('', 'TEAM HISTORY', ...resume.teams.slice(0, 12).map((team) => `${team.name} | ${team.role} | ${team.membership_status} | joined ${team.joined_at.slice(0, 10)}`));
  lines.push('', `PUBLIC PASSPORT: ${origin}/@${resume.identity.username}`, `GENERATED: ${resume.generated_at}`, 'No private contact details are included.');
  if (resume.presentation.inquiry_url) lines.push(`INQUIRIES: ${resume.presentation.inquiry_url}`);

  const pages = Array.from({ length: Math.ceil(lines.length / 42) }, (_, index) => lines.slice(index * 42, index * 42 + 42));
  const objects: string[] = [];
  const pageRefs = pages.map((_, index) => `${4 + index * 2} 0 R`).join(' ');
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push(`<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>`);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  pages.forEach((page, index) => {
    const pageObject = 4 + index * 2;
    const contentObject = pageObject + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObject} 0 R >>`);
    const body = `BT\n/F1 10 Tf\n54 744 Td\n15 TL\n${page.map((line) => `(${ascii(line)}) Tj T*`).join('\n')}\nET`;
    objects.push(`<< /Length ${Buffer.byteLength(body)} >>\nstream\n${body}\nendstream`);
  });
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}
