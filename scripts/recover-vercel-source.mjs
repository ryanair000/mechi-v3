#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const API = 'https://api.vercel.com';

function parseArgs(argv) {
  const args = {
    project: 'new-mechi',
    team: 'qybrrblog-admins-projects',
    out: 'vercel-recovered-source',
    deployment: '',
    limit: '20',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;

    const [key, inlineValue] = arg.slice(2).split('=', 2);
    const value = inlineValue ?? argv[i + 1];
    if (inlineValue === undefined) i += 1;

    if (key in args) {
      args[key] = value;
    }
  }

  return args;
}

function makeQuery(args, extra = {}) {
  const query = new URLSearchParams(extra);
  if (args.team) query.set('slug', args.team);
  return query.toString();
}

async function vercelGet(endpoint, args, query = {}) {
  const qs = makeQuery(args, query);
  const url = `${API}${endpoint}${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_TOKEN || process.env.VERCEL_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} from ${url}\n${text}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return Buffer.from(text);
  }

  return text ? JSON.parse(text) : null;
}

function flattenFiles(nodes, parent = '') {
  const files = [];

  for (const node of nodes || []) {
    const rel = parent ? `${parent}/${node.name}` : node.name;
    if (node.type === 'directory' || Array.isArray(node.children)) {
      files.push(...flattenFiles(node.children, rel));
    } else if (node.type === 'file') {
      files.push({ path: rel, uid: node.uid || node.sha || node.id });
    }
  }

  return files;
}

function safeLocalPath(outDir, relativePath) {
  const parts = relativePath
    .split('/')
    .filter((part) => part && part !== '.' && part !== '..');
  return path.join(outDir, ...parts);
}

function decodeFileResponse(body) {
  if (Buffer.isBuffer(body)) return body;

  const candidate =
    body?.content?.data ??
    body?.file?.data ??
    body?.content ??
    body?.contents ??
    body?.data ??
    body?.body ??
    body?.file;

  if (typeof candidate !== 'string') {
    throw new Error(`Could not find a base64 content field. Response keys: ${Object.keys(body || {}).join(', ')}`);
  }

  return Buffer.from(candidate, 'base64');
}

async function findDeployment(args) {
  if (args.deployment) return args.deployment;

  const data = await vercelGet('/v7/deployments', args, {
    app: args.project,
    limit: args.limit,
    state: 'READY',
    target: 'production',
  });

  const deployment = data?.deployments?.find((item) => item.name === args.project && item.readyState === 'READY');
  if (!deployment) {
    throw new Error(`No ready production deployment found for project "${args.project}". Pass --deployment dpl_... explicitly.`);
  }

  console.log(`Using deployment ${deployment.uid} (${deployment.url})`);
  return deployment.uid;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const token = process.env.VERCEL_TOKEN || process.env.VERCEL_AUTH_TOKEN;
  if (!token) {
    throw new Error('Set VERCEL_TOKEN or VERCEL_AUTH_TOKEN before running this script.');
  }

  const deploymentId = await findDeployment(args);
  const tree = await vercelGet(`/v6/deployments/${deploymentId}/files`, args);
  const files = flattenFiles(tree);

  if (files.length === 0) {
    throw new Error('Vercel returned an empty file tree for this deployment.');
  }

  await mkdir(args.out, { recursive: true });
  console.log(`Recovering ${files.length} files into ${args.out}`);

  for (const file of files) {
    if (!file.uid) {
      console.warn(`Skipping ${file.path}: missing file uid`);
      continue;
    }

    const body = await vercelGet(`/v8/deployments/${deploymentId}/files/${encodeURIComponent(file.uid)}`, args);
    const localPath = safeLocalPath(args.out, file.path);
    await mkdir(path.dirname(localPath), { recursive: true });
    await writeFile(localPath, decodeFileResponse(body));
    console.log(`wrote ${file.path}`);
  }

  console.log(`Done: ${path.resolve(args.out)}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
