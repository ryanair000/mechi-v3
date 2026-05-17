#!/usr/bin/env node
import {
  assertBrand,
  parseBrandCaptionMediaArgs,
  resolveCaption,
  usageFor,
} from './social-media-utils.mjs';
import { publishTikTokVideo } from './tiktok-api-utils.mjs';

async function main() {
  const parsed = parseBrandCaptionMediaArgs(process.argv.slice(2));
  if (!parsed.media) {
    console.error(usageFor('publish-tiktok-video.mjs', 'video'));
    process.exit(1);
  }

  const brandConfig = assertBrand(parsed);
  const caption = await resolveCaption(parsed);
  const response = await publishTikTokVideo({
    brandConfig,
    caption,
    media: parsed.media,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        brand: brandConfig.brand,
        publishId: response.publishId,
        privacyLevel: response.privacyLevel,
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
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
