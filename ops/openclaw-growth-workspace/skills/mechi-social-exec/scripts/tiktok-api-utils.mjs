import { readFile, stat } from 'node:fs/promises';
import { getBrandConfig } from './social-brand-config.mjs';
import { guessMimeType, resolveMediaToLocalPath } from './social-media-utils.mjs';

const TIKTOK_API_BASE = 'https://open.tiktokapis.com';
const DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024;

function assertOkBody(body, fallback) {
  if (body?.error && body.error.code && body.error.code !== 'ok') {
    throw new Error(body.error.message || body.error.code);
  }
  if (!body?.data) {
    throw new Error(fallback);
  }
  return body.data;
}

async function tiktokRequest(path, accessToken, body) {
  if (!accessToken) {
    throw new Error('TIKTOK_ACCESS_TOKEN or <BRAND>_TIKTOK_ACCESS_TOKEN is required.');
  }

  const response = await fetch(`${TIKTOK_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(body ?? {}),
  });
  const raw = await response.text();
  let parsed = raw;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {}

  if (!response.ok) {
    const message =
      parsed?.error?.message ||
      parsed?.message ||
      `TikTok request failed with ${response.status}`;
    throw new Error(message);
  }

  return parsed;
}

async function queryTikTokCreatorInfo(brandOrConfig) {
  const brandConfig =
    typeof brandOrConfig === 'string' ? getBrandConfig(brandOrConfig) : brandOrConfig;
  const body = await tiktokRequest(
    '/v2/post/publish/creator_info/query/',
    brandConfig.tiktok.accessToken
  );
  return assertOkBody(body, 'TikTok creator info response was missing data.');
}

function choosePrivacyLevel(brandConfig, creatorInfo) {
  const requested = brandConfig.tiktok.privacyLevel || 'SELF_ONLY';
  const options = Array.isArray(creatorInfo?.privacy_level_options)
    ? creatorInfo.privacy_level_options
    : [];

  if (!options.length || options.includes(requested)) {
    return requested;
  }
  if (options.includes('SELF_ONLY')) {
    return 'SELF_ONLY';
  }
  return options[0];
}

async function initTikTokVideoPublish(brandConfig, caption, localPath, size) {
  const creatorInfo = await queryTikTokCreatorInfo(brandConfig);
  const privacyLevel = choosePrivacyLevel(brandConfig, creatorInfo);
  const chunkSize = Math.min(DEFAULT_CHUNK_SIZE, size);
  const totalChunkCount = Math.ceil(size / chunkSize);

  const body = await tiktokRequest(
    '/v2/post/publish/video/init/',
    brandConfig.tiktok.accessToken,
    {
      post_info: {
        title: caption || '',
        privacy_level: privacyLevel,
        disable_duet: brandConfig.tiktok.disableDuet,
        disable_stitch: brandConfig.tiktok.disableStitch,
        disable_comment: brandConfig.tiktok.disableComment,
        brand_content_toggle: brandConfig.tiktok.brandContentToggle,
        brand_organic_toggle: brandConfig.tiktok.brandOrganicToggle,
        is_aigc: brandConfig.tiktok.isAigc,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: size,
        chunk_size: chunkSize,
        total_chunk_count: totalChunkCount,
      },
    }
  );

  return {
    ...assertOkBody(body, 'TikTok video init response was missing data.'),
    creatorInfo,
    privacyLevel,
    chunkSize,
    totalChunkCount,
    localPath,
  };
}

async function initTikTokInboxVideoUpload(brandConfig, localPath, size) {
  const chunkSize = Math.min(DEFAULT_CHUNK_SIZE, size);
  const totalChunkCount = Math.ceil(size / chunkSize);

  const body = await tiktokRequest(
    '/v2/post/publish/inbox/video/init/',
    brandConfig.tiktok.accessToken,
    {
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: size,
        chunk_size: chunkSize,
        total_chunk_count: totalChunkCount,
      },
    }
  );

  return {
    ...assertOkBody(body, 'TikTok inbox upload init response was missing data.'),
    chunkSize,
    totalChunkCount,
    localPath,
  };
}

async function uploadTikTokVideoFile(uploadUrl, localPath, size, chunkSize) {
  const bytes = await readFile(localPath);
  const mimeType = guessMimeType(localPath);

  for (let start = 0; start < size; start += chunkSize) {
    const end = Math.min(start + chunkSize, size) - 1;
    const chunk = bytes.subarray(start, end + 1);
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(chunk.length),
        'Content-Range': `bytes ${start}-${end}/${size}`,
      },
      body: chunk,
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `TikTok upload failed with ${response.status}`);
    }
  }
}

async function publishTikTokVideo({ brandConfig, caption, media }) {
  const localPath = await resolveMediaToLocalPath(media, 'video');
  const stats = await stat(localPath);
  const init = await initTikTokVideoPublish(brandConfig, caption, localPath, stats.size);
  if (!init.upload_url) {
    throw new Error('TikTok did not return an upload_url for FILE_UPLOAD.');
  }

  await uploadTikTokVideoFile(init.upload_url, localPath, stats.size, init.chunkSize);

  return {
    publishId: init.publish_id,
    privacyLevel: init.privacyLevel,
    upload: {
      source: 'FILE_UPLOAD',
      chunks: init.totalChunkCount,
      size: stats.size,
    },
  };
}

async function uploadTikTokDraftVideo({ brandConfig, media }) {
  const localPath = await resolveMediaToLocalPath(media, 'video');
  const stats = await stat(localPath);
  const init = await initTikTokInboxVideoUpload(brandConfig, localPath, stats.size);
  if (!init.upload_url) {
    throw new Error('TikTok did not return an upload_url for inbox FILE_UPLOAD.');
  }

  await uploadTikTokVideoFile(init.upload_url, localPath, stats.size, init.chunkSize);

  return {
    publishId: init.publish_id,
    upload: {
      source: 'FILE_UPLOAD',
      chunks: init.totalChunkCount,
      size: stats.size,
    },
    handoff:
      'Open TikTok on the authorized phone/account, tap the inbox notification, finish edits, add sound, and post manually.',
  };
}

async function fetchTikTokPostStatus(brandOrConfig, publishId) {
  const brandConfig =
    typeof brandOrConfig === 'string' ? getBrandConfig(brandOrConfig) : brandOrConfig;
  const body = await tiktokRequest(
    '/v2/post/publish/status/fetch/',
    brandConfig.tiktok.accessToken,
    { publish_id: publishId }
  );
  return assertOkBody(body, 'TikTok post status response was missing data.');
}

export {
  fetchTikTokPostStatus,
  publishTikTokVideo,
  queryTikTokCreatorInfo,
  uploadTikTokDraftVideo,
};
