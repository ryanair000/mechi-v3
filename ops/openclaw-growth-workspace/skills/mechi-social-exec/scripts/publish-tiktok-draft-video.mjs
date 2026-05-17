#!/usr/bin/env node
import {
  assertBrand,
  parseBrandCaptionMediaArgs,
  resolveCaption,
  usageFor,
} from './social-media-utils.mjs';
import { uploadTikTokDraftVideo } from './tiktok-api-utils.mjs';

async function main() {
  const parsed = parseBrandCaptionMediaArgs(process.argv.slice(2));
  if (!parsed.media) {
    console.error(usageFor('publish-tiktok-draft-video.mjs', 'video'));
    process.exit(1);
  }

  const brandConfig = assertBrand(parsed);
  const caption = await resolveCaption(parsed);
  const response = await uploadTikTokDraftVideo({
    brandConfig,
    media: parsed.media,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        brand: brandConfig.brand,
        mode: 'tiktok-draft',
        publishId: response.publishId,
        caption,
        handoff: response.handoff,
        response,
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
        mode: 'tiktok-draft',
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
