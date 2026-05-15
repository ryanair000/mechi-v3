#!/usr/bin/env node
import {
  assertBrand,
  graphRequest,
  parseBrandCaptionMediaArgs,
  resolveCaption,
  stagePublicMediaUrl,
  usageFor,
} from './social-media-utils.mjs';

const MAX_POLLS = 30;
const POLL_INTERVAL_MS = 4000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollContainerStatus(apiVersion, creationId, accessToken) {
  const url = new URL(`https://graph.facebook.com/${apiVersion}/${creationId}`);
  url.searchParams.set('fields', 'status_code,status');
  url.searchParams.set('access_token', accessToken);

  for (let attempt = 1; attempt <= MAX_POLLS; attempt += 1) {
    const body = await graphRequest(url, { method: 'GET' });
    const statusCode = String(body?.status_code || body?.status || '').toUpperCase();
    if (statusCode === 'FINISHED' || statusCode === 'PUBLISHED') {
      return body;
    }
    if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
      throw new Error(`Instagram video container failed with status ${statusCode}.`);
    }
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Instagram video container did not finish after ${MAX_POLLS} polls.`);
}

async function getPermalink(apiVersion, mediaId, accessToken) {
  const url = new URL(`https://graph.facebook.com/${apiVersion}/${mediaId}`);
  url.searchParams.set('fields', 'id,permalink');
  url.searchParams.set('access_token', accessToken);
  const body = await graphRequest(url, { method: 'GET' });
  return {
    id: body?.id ?? null,
    permalink: typeof body?.permalink === 'string' ? body.permalink : null,
  };
}

async function main() {
  const parsed = parseBrandCaptionMediaArgs(process.argv.slice(2));
  if (!parsed.media) {
    console.error(usageFor('publish-instagram-video.mjs', 'video'));
    process.exit(1);
  }

  const brandConfig = assertBrand(parsed);
  const accessToken = brandConfig.instagram.accessToken;
  const accountId = brandConfig.instagram.businessAccountId;
  if (!accessToken || !accountId) {
    throw new Error(`Instagram is not ready for ${brandConfig.label}. Missing access token or business account id.`);
  }

  const caption = await resolveCaption(parsed);
  const staged = await stagePublicMediaUrl(parsed.media, brandConfig, 'video');
  const apiVersion = brandConfig.facebook.graphApiVersion;
  const containerUrl = new URL(`https://graph.facebook.com/${apiVersion}/${accountId}/media`);
  const containerBody = new URLSearchParams();
  containerBody.set('media_type', 'REELS');
  containerBody.set('video_url', staged.publicUrl);
  containerBody.set('caption', caption);
  containerBody.set('share_to_feed', 'true');
  containerBody.set('access_token', accessToken);
  const container = await graphRequest(containerUrl, {
    method: 'POST',
    body: containerBody,
  });

  await pollContainerStatus(apiVersion, container?.id, accessToken);

  const publishUrl = new URL(`https://graph.facebook.com/${apiVersion}/${accountId}/media_publish`);
  const publishBody = new URLSearchParams();
  publishBody.set('creation_id', String(container?.id || ''));
  publishBody.set('access_token', accessToken);
  const published = await graphRequest(publishUrl, {
    method: 'POST',
    body: publishBody,
  });

  const permalink = await getPermalink(apiVersion, published?.id, accessToken);
  console.log(
    JSON.stringify(
      {
        ok: true,
        brand: brandConfig.brand,
        username: brandConfig.instagram.username,
        creationId: container?.id ?? null,
        mediaId: published?.id ?? null,
        permalink: permalink.permalink,
        stagedMediaUrl: staged.publicUrl,
        stagingProvider: staged.provider,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
