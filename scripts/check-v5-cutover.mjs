import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const canonicalRoots = [
  'src/components/v5',
  'src/app/app',
  'src/app/page.tsx',
  'src/app/(app)/tournaments/page.tsx',
  'src/app/(app)/tournaments/[slug]/page.tsx',
];
const ignoredCatalog = new Set([
  path.normalize('src/components/v5/v5-screen-catalog.ts'),
]);
const forbidden = [
  { label: 'legacy dashboard route', pattern: /["'`]\/dashboard(?:\/|["'`?])/ },
  { label: 'legacy match route', pattern: /["'`]\/(?:s\/)?match\// },
  { label: 'legacy challenge route', pattern: /["'`]\/challenges(?:\/|["'`?])/ },
  { label: 'legacy tournament share route', pattern: /["'`]\/s\/t\// },
  { label: 'legacy tournament create route', pattern: /["'`]\/tournaments\/create/ },
  { label: 'legacy admin presentation route', pattern: /["'`]\/admin(?:\/|["'`?])/ },
  { label: 'legacy moderator presentation route', pattern: /["'`]\/moderators(?:\/|["'`?])/ },
  { label: 'Figma/gallery route used as product route', pattern: /["'`]\/v5(?:\/|["'`?])/ },
  { label: 'legacy app shell import', pattern: /from\s+["']@\/components\/(?:AppShell|DashboardShell|AdminShell)/ },
  { label: 'missing public watch route', pattern: /href=["'{`]\/watch(?:["'}`?/]|$)/ },
  { label: 'missing public players route', pattern: /href=["'{`]\/players(?:["'}`?/]|$)/ },
  { label: 'missing public contact route', pattern: /href=["'{`]\/contact(?:["'}`?/]|$)/ },
  { label: 'missing public legal route', pattern: /href=["'{`]\/legal(?:["'}`?/]|$)/ },
];

async function collect(target) {
  const absolute = path.join(root, target);
  try {
    const entries = await readdir(absolute, { withFileTypes: true });
    const nested = await Promise.all(entries.map((entry) => collect(path.join(target, entry.name))));
    return nested.flat();
  } catch {
    return [target];
  }
}

const files = (await Promise.all(canonicalRoots.map(collect)))
  .flat()
  .filter((file) => /\.(?:ts|tsx|js|jsx)$/.test(file) && !ignoredCatalog.has(path.normalize(file)));
const violations = [];
for (const file of files) {
  const source = await readFile(path.join(root, file), 'utf8');
  source.split(/\r?\n/).forEach((line, index) => {
    for (const rule of forbidden) {
      if (rule.pattern.test(line)) violations.push({ file, line: index + 1, rule: rule.label, source: line.trim() });
    }
  });
}

if (violations.length) {
  console.error('V5 cutover guard failed. Canonical UI references transitional V4 routes or shells.');
  for (const violation of violations) console.error(`${violation.file}:${violation.line} [${violation.rule}] ${violation.source}`);
  process.exit(1);
}
console.log(`V5 cutover guard passed across ${files.length} canonical source files.`);
