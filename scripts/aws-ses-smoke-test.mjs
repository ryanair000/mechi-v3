import { createHash, createHmac } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function getArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function getFlag(name) {
  return process.argv.includes(name);
}

function parseIni(content) {
  const sections = {};
  let current = null;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;

    const sectionMatch = line.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      current = sectionMatch[1].trim();
      sections[current] ??= {};
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (!current || separatorIndex < 0) continue;

    sections[current][line.slice(0, separatorIndex).trim()] = line
      .slice(separatorIndex + 1)
      .trim();
  }

  return sections;
}

function getProfileName() {
  return process.env.AWS_PROFILE?.trim() || 'default';
}

function getSharedCredentials() {
  const credentialsPath =
    process.env.AWS_SHARED_CREDENTIALS_FILE?.trim() || join(homedir(), '.aws', 'credentials');
  if (!existsSync(credentialsPath)) return null;

  const credentials = parseIni(readFileSync(credentialsPath, 'utf8'))[getProfileName()];
  if (!credentials?.aws_access_key_id || !credentials?.aws_secret_access_key) return null;

  return {
    accessKeyId: credentials.aws_access_key_id,
    secretAccessKey: credentials.aws_secret_access_key,
    sessionToken: credentials.aws_session_token || undefined,
  };
}

function getSharedRegion() {
  const configPath = process.env.AWS_CONFIG_FILE?.trim() || join(homedir(), '.aws', 'config');
  if (!existsSync(configPath)) return null;

  const profile = getProfileName();
  const sections = parseIni(readFileSync(configPath, 'utf8'));
  return sections[`profile ${profile}`]?.region || sections[profile]?.region || null;
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 1500) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getInstanceRoleCredentials() {
  const tokenResponse = await fetchWithTimeout('http://169.254.169.254/latest/api/token', {
    method: 'PUT',
    headers: { 'X-aws-ec2-metadata-token-ttl-seconds': '21600' },
  });
  if (!tokenResponse.ok) throw new Error(`EC2 metadata token failed: ${tokenResponse.status}`);

  const metadataToken = await tokenResponse.text();
  const roleResponse = await fetchWithTimeout(
    'http://169.254.169.254/latest/meta-data/iam/security-credentials/',
    { headers: { 'X-aws-ec2-metadata-token': metadataToken } }
  );
  if (!roleResponse.ok) throw new Error(`EC2 role lookup failed: ${roleResponse.status}`);

  const roleName = (await roleResponse.text()).split('\n')[0]?.trim();
  if (!roleName) throw new Error('No EC2 IAM role is attached');

  const credentialsResponse = await fetchWithTimeout(
    `http://169.254.169.254/latest/meta-data/iam/security-credentials/${encodeURIComponent(roleName)}`,
    { headers: { 'X-aws-ec2-metadata-token': metadataToken } }
  );
  if (!credentialsResponse.ok) {
    throw new Error(`EC2 credential lookup failed: ${credentialsResponse.status}`);
  }

  const data = await credentialsResponse.json();
  return {
    accessKeyId: data.AccessKeyId,
    secretAccessKey: data.SecretAccessKey,
    sessionToken: data.Token,
  };
}

async function resolveCredentials() {
  if (process.env.AWS_SES_ACCESS_KEY_ID && process.env.AWS_SES_SECRET_ACCESS_KEY) {
    return {
      accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN || undefined,
    };
  }

  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN || undefined,
    };
  }

  const sharedCredentials = getSharedCredentials();
  if (sharedCredentials) return sharedCredentials;

  if (process.env.AWS_SES_USE_INSTANCE_ROLE === 'true') {
    return getInstanceRoleCredentials();
  }

  throw new Error('No AWS credentials found in env, shared credentials, or EC2 role mode');
}

function sha256Hex(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function hmac(key, value) {
  return createHmac('sha256', key).update(value, 'utf8').digest();
}

function hmacHex(key, value) {
  return createHmac('sha256', key).update(value, 'utf8').digest('hex');
}

function signatureKey(secretAccessKey, dateStamp, region) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, 'ses');
  return hmac(serviceKey, 'aws4_request');
}

function amzDate(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

async function signedSesFetch({ method, path, region, credentials, body }) {
  const endpoint = new URL(`https://email.${region}.amazonaws.com${path}`);
  const requestBody = body ? JSON.stringify(body) : '';
  const now = amzDate(new Date());
  const dateStamp = now.slice(0, 8);
  const hasBody = Boolean(body);
  const signedHeaders = [
    ...(hasBody ? ['content-type'] : []),
    'host',
    'x-amz-date',
    ...(credentials.sessionToken ? ['x-amz-security-token'] : []),
  ].join(';');
  const canonicalHeaders = [
    ...(hasBody ? ['content-type:application/json'] : []),
    `host:${endpoint.host}`,
    `x-amz-date:${now}`,
    ...(credentials.sessionToken ? [`x-amz-security-token:${credentials.sessionToken}`] : []),
    '',
  ].join('\n');
  const canonicalRequest = [
    method,
    endpoint.pathname,
    endpoint.searchParams.toString(),
    canonicalHeaders,
    signedHeaders,
    sha256Hex(requestBody),
  ].join('\n');
  const credentialScope = `${dateStamp}/${region}/ses/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    now,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');
  const signature = hmacHex(
    signatureKey(credentials.secretAccessKey, dateStamp, region),
    stringToSign
  );
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const response = await fetch(endpoint, {
    method,
    headers: {
      Authorization: authorization,
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      'X-Amz-Date': now,
      ...(credentials.sessionToken ? { 'X-Amz-Security-Token': credentials.sessionToken } : {}),
    },
    body: hasBody ? requestBody : undefined,
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${method} ${path} failed: ${response.status} ${text}`);
  }

  return text ? JSON.parse(text) : {};
}

function summarizeIdentities(response) {
  const identities = response.EmailIdentities ?? [];
  return identities.map((identity) => ({
    identity: identity.IdentityName,
    type: identity.IdentityType,
    sendingEnabled: identity.SendingEnabled,
    verificationStatus: identity.VerificationStatus,
  }));
}

function printDkimRecords(domain, response) {
  const tokens = response.DkimAttributes?.Tokens ?? [];
  if (tokens.length === 0) {
    console.log('No DKIM tokens returned.');
    return;
  }

  console.log('\nAdd these DKIM CNAME records in DNS:');
  for (const token of tokens) {
    console.log(`${token}._domainkey.${domain} CNAME ${token}.dkim.amazonses.com`);
  }
}

const region =
  getArg('--region') ||
  process.env.AWS_SES_REGION ||
  process.env.AWS_REGION ||
  process.env.AWS_DEFAULT_REGION ||
  getSharedRegion() ||
  'us-east-2';
const from = getArg('--from') || process.env.AWS_SES_FROM_EMAIL || process.env.EMAIL_FROM_ADDRESS;
const to = getArg('--to') || process.env.AWS_SES_TEST_TO;
const createDomain = getArg('--create-domain');
const requestProductionAccess = getFlag('--request-production-access');
const shouldSend = Boolean(to) && !getFlag('--no-send');

try {
  const credentials = await resolveCredentials();

  console.log(`Checking SES account in ${region}...`);
  console.log(JSON.stringify(await signedSesFetch({
    method: 'GET',
    path: '/v2/email/account',
    region,
    credentials,
  }), null, 2));

  console.log(`\nChecking SES identities in ${region}...`);
  console.log(JSON.stringify(summarizeIdentities(await signedSesFetch({
    method: 'GET',
    path: '/v2/email/identities',
    region,
    credentials,
  })), null, 2));

  if (createDomain) {
    console.log(`\nCreating SES domain identity for ${createDomain} in ${region}...`);
    const createResponse = await signedSesFetch({
      method: 'POST',
      path: '/v2/email/identities',
      region,
      credentials,
      body: {
        EmailIdentity: createDomain,
      },
    });
    console.log(JSON.stringify(createResponse, null, 2));
    printDkimRecords(createDomain, createResponse);
  }

  if (requestProductionAccess) {
    const websiteUrl = getArg('--website') || 'https://mechi.club';
    const contactEmail = getArg('--contact') || 'support@mechi.club';
    const useCaseDescription =
      getArg('--use-case') ||
      [
        'Mechi sends transactional authentication emails such as magic links and password resets,',
        'tournament registration and reminder emails, and opt-in client/game update campaigns.',
        'Bulk sends are admin-only, capped, logged, filtered against unsubscribe records, and include',
        'visible unsubscribe links plus List-Unsubscribe and List-Unsubscribe-Post headers.',
        'We monitor bounces and complaints through SES suppression and keep lists limited to registered',
        'users, client-provided recipients, and opted-in audience segments.',
      ].join(' ');

    console.log(`\nRequesting SES production access in ${region}...`);
    console.log(JSON.stringify(await signedSesFetch({
      method: 'POST',
      path: '/v2/email/account/details',
      region,
      credentials,
      body: {
        AdditionalContactEmailAddresses: [contactEmail],
        ContactLanguage: 'EN',
        MailType: 'MARKETING',
        ProductionAccessEnabled: true,
        UseCaseDescription: useCaseDescription,
        WebsiteURL: websiteUrl,
      },
    }), null, 2));
  }

  if (!shouldSend) {
    console.log('\nNo test email sent. Pass --to you@example.com or set AWS_SES_TEST_TO to send one.');
  } else {
    if (!from) throw new Error('--from or AWS_SES_FROM_EMAIL is required to send');
    const subject = `Mechi SES smoke test ${new Date().toISOString()}`;
    const body = {
      FromEmailAddress: from,
      Destination: { ToAddresses: [to] },
      Content: {
        Simple: {
          Subject: { Charset: 'UTF-8', Data: subject },
          Body: {
            Text: { Charset: 'UTF-8', Data: 'AWS SES accepted this Mechi smoke-test email.' },
            Html: { Charset: 'UTF-8', Data: '<p>AWS SES accepted this Mechi smoke-test email.</p>' },
          },
        },
      },
    };

    console.log(`\nSending SES smoke email from ${from} to ${to}...`);
    console.log(JSON.stringify(await signedSesFetch({
      method: 'POST',
      path: '/v2/email/outbound-emails',
      region,
      credentials,
      body,
    }), null, 2));
  }
} catch (error) {
  console.error(`\nSES smoke test failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
