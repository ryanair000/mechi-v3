import {
  CreateEmailIdentityCommand,
  GetAccountCommand,
  ListEmailIdentitiesCommand,
  PutAccountDetailsCommand,
  SendEmailCommand,
  SESv2Client,
} from '@aws-sdk/client-sesv2';

function getArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function getFlag(name) {
  return process.argv.includes(name);
}

function getRegion() {
  return (
    getArg('--region') ||
    process.env.AWS_SES_REGION ||
    process.env.AWS_REGION ||
    process.env.AWS_DEFAULT_REGION ||
    'us-east-2'
  );
}

function getEndpoint() {
  const rawEndpoint = process.env.AWS_SES_ENDPOINT_URL?.trim();
  if (!rawEndpoint) return undefined;

  try {
    const endpoint = new URL(rawEndpoint);
    if (endpoint.pathname.startsWith('/v2/email')) {
      endpoint.pathname = '';
      endpoint.search = '';
      endpoint.hash = '';
    }
    return endpoint.toString().replace(/\/$/, '');
  } catch {
    return rawEndpoint;
  }
}

function getCredentials() {
  const accessKeyId =
    process.env.AWS_SES_ACCESS_KEY_ID?.trim() || process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey =
    process.env.AWS_SES_SECRET_ACCESS_KEY?.trim() || process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const sessionToken =
    process.env.AWS_SES_SESSION_TOKEN?.trim() || process.env.AWS_SESSION_TOKEN?.trim();

  if (!accessKeyId || !secretAccessKey) {
    return undefined;
  }

  return {
    accessKeyId,
    secretAccessKey,
    sessionToken: sessionToken || undefined,
  };
}

function getClient(region) {
  const endpoint = getEndpoint();
  const credentials = getCredentials();

  return new SESv2Client({
    region,
    ...(endpoint ? { endpoint } : {}),
    ...(credentials ? { credentials } : {}),
  });
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

const region = getRegion();
const from = getArg('--from') || process.env.AWS_SES_FROM_EMAIL;
const to = getArg('--to') || process.env.AWS_SES_TEST_TO;
const createDomain = getArg('--create-domain');
const requestProductionAccess = getFlag('--request-production-access');
const shouldSend = Boolean(to) && !getFlag('--no-send');

try {
  const client = getClient(region);

  console.log(`Checking SES account in ${region}...`);
  console.log(JSON.stringify(await client.send(new GetAccountCommand({})), null, 2));

  console.log(`\nChecking SES identities in ${region}...`);
  console.log(
    JSON.stringify(
      summarizeIdentities(await client.send(new ListEmailIdentitiesCommand({}))),
      null,
      2
    )
  );

  if (createDomain) {
    console.log(`\nCreating SES domain identity for ${createDomain} in ${region}...`);
    const createResponse = await client.send(
      new CreateEmailIdentityCommand({
        EmailIdentity: createDomain,
      })
    );
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
    console.log(
      JSON.stringify(
        await client.send(
          new PutAccountDetailsCommand({
            AdditionalContactEmailAddresses: [contactEmail],
            ContactLanguage: 'EN',
            MailType: 'MARKETING',
            ProductionAccessEnabled: true,
            UseCaseDescription: useCaseDescription,
            WebsiteURL: websiteUrl,
          })
        ),
        null,
        2
      )
    );
  }

  if (!shouldSend) {
    console.log('\nNo test email sent. Pass --to you@example.com or set AWS_SES_TEST_TO to send one.');
  } else {
    if (!from) throw new Error('--from or AWS_SES_FROM_EMAIL is required to send');
    const subject = `Mechi SES smoke test ${new Date().toISOString()}`;

    console.log(`\nSending SES smoke email from ${from} to ${to}...`);
    console.log(
      JSON.stringify(
        await client.send(
          new SendEmailCommand({
            FromEmailAddress: from,
            Destination: { ToAddresses: [to] },
            Content: {
              Simple: {
                Subject: { Charset: 'UTF-8', Data: subject },
                Body: {
                  Text: { Charset: 'UTF-8', Data: 'AWS SES accepted this Mechi smoke-test email.' },
                  Html: {
                    Charset: 'UTF-8',
                    Data: '<p>AWS SES accepted this Mechi smoke-test email.</p>',
                  },
                },
              },
            },
          })
        ),
        null,
        2
      )
    );
  }
} catch (error) {
  console.error(`\nSES smoke test failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
