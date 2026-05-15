#!/usr/bin/env node
import {
  assertBrand,
  envFirst,
  parseBrandCaptionMediaArgs,
  resolveCaption,
  usageFor,
} from './social-media-utils.mjs';
import { createXTweet, uploadXVideo } from './x-api-utils.mjs';

function inferPermalink(brandConfig, postBody) {
  const username = envFirst([`${brandConfig.brand.toUpperCase()}_X_USERNAME`]) || (brandConfig.brand === 'playmechi' ? 'playmechi' : '');
  const id =
    postBody?.data?.id ||
    postBody?.id ||
    postBody?.tweet?.id ||
    postBody?.tweet_id ||
    null;
  if (!username || !id) {
    return null;
  }
  return `https://x.com/${username}/status/${id}`;
}

async function main() {
  const parsed = parseBrandCaptionMediaArgs(process.argv.slice(2));
  if (!parsed.media) {
    console.error(usageFor('publish-x-video.mjs', 'video'));
    process.exit(1);
  }

  const brandConfig = assertBrand(parsed);
  const caption = await resolveCaption(parsed);
  const mediaBody = await uploadXVideo(parsed.media);
  const mediaId = mediaBody.mediaId;
  const postBody = await createXTweet({
    text: caption,
    mediaIds: [mediaId],
  });
  console.log(
    JSON.stringify(
      {
        ok: true,
        brand: brandConfig.brand,
        mediaId,
        permalink: inferPermalink(brandConfig, postBody),
        response: postBody,
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
