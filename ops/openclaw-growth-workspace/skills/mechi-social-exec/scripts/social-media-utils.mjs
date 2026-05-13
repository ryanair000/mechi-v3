import { basename, extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { envFirst, getBrandConfig } from './social-brand-config.mjs';

function usageFor(program, mediaLabel) {
  return `Usage: node scripts/${program} --brand <chezahub|playmechi> (--caption "text" | --caption-file ./caption.txt) <${mediaLabel}-path-or-url>`;
}

function parseBrandCaptionMediaArgs(argv) {
  let brand = '';
  let caption = '';
  let captionFile = '';
  let media = '';

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--brand') {
      brand = argv[index + 1] || '';
      index += 1;
    } else if (arg === '--caption') {
      caption = argv[index + 1] || '';
      index += 1;
    } else if (arg === '--caption-file') {
      captionFile = argv[index + 1] || '';
      index += 1;
    } else if (!media) {
      media = arg;
    }
  }

  return { brand, caption, captionFile, media };
}

function isUrl(value) {
  return /^https?:\/\//i.test(value);
}

function isImagePath(pathLike) {
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extname(pathLike).toLowerCase());
}

function guessMimeType(pathLike) {
  switch (extname(pathLike).toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.mp4':
      return 'video/mp4';
    case '.mov':
      return 'video/quicktime';
    case '.m4v':
      return 'video/x-m4v';
    case '.webm':
      return 'video/webm';
    default:
      return 'application/octet-stream';
  }
}

function resolveXurlBin() {
  const home = process.env.HOME || '';
  const candidates = [
    process.env.XURL_BIN || '',
    home ? `${home}/.npm-global/bin/xurl` : '',
    '/usr/local/bin/xurl',
    '/usr/bin/xurl',
    'xurl',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === 'xurl' || existsSync(candidate)) {
      return candidate;
    }
  }

  return 'xurl';
}

async function resolveCaption(parsed) {
  if (parsed.caption) {
    return parsed.caption.trim();
  }

  if (parsed.captionFile) {
    return (await readFile(resolve(parsed.captionFile), 'utf8')).trim();
  }

  return '';
}

async function graphRequest(url, init) {
  const response = await fetch(url, init);
  const raw = await response.text();
  let body = raw;

  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {}

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && body.error && typeof body.error === 'object'
        ? body.error.message || `Meta request failed with ${response.status}`
        : `Meta request failed with ${response.status}`;
    throw new Error(message);
  }

  return body;
}

async function uploadToImgur(localPath, clientId) {
  if (!clientId) {
    throw new Error('IMGUR_CLIENT_ID is required to stage a local image when no public URL is provided.');
  }

  const bytes = await readFile(localPath);
  const form = new FormData();
  form.append('image', new Blob([bytes], { type: guessMimeType(localPath) }), basename(localPath));

  const response = await fetch('https://api.imgur.com/3/image', {
    method: 'POST',
    headers: {
      Authorization: `Client-ID ${clientId}`,
    },
    body: form,
  });
  const body = await response.json();
  if (!response.ok || !body?.data?.link) {
    throw new Error(body?.data?.error || body?.error || `Imgur upload failed with ${response.status}`);
  }

  return {
    provider: 'imgur',
    publicUrl: body.data.link,
    deleteHash: body.data.deletehash ?? null,
  };
}

function createCloudinarySignature(params, apiSecret) {
  const signatureBase = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return createHash('sha1').update(`${signatureBase}${apiSecret}`).digest('hex');
}

async function uploadToCloudinary(localPath, resourceType, cloudinaryConfig) {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'A local video or non-public media URL requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'openclaw/socio-staging';
  const params = {
    folder,
    timestamp,
    use_filename: 'true',
    unique_filename: 'true',
  };
  const signature = createCloudinarySignature(params, apiSecret);
  const bytes = await readFile(localPath);
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: guessMimeType(localPath) }), basename(localPath));
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('use_filename', 'true');
  form.append('unique_filename', 'true');
  form.append('signature', signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const response = await fetch(endpoint, {
    method: 'POST',
    body: form,
  });
  const body = await response.json();
  if (!response.ok || !body?.secure_url) {
    throw new Error(body?.error?.message || `Cloudinary upload failed with ${response.status}`);
  }

  return {
    provider: 'cloudinary',
    publicUrl: body.secure_url,
    publicId: body.public_id ?? null,
    resourceType,
  };
}

function resolveAwsStagingConfig() {
  const bucket = envFirst([
    'SOCIO_S3_STAGING_BUCKET',
    'S3_SOCIAL_MEDIA_BUCKET',
    'MECHI_S3_SOCIAL_STAGING_BUCKET',
  ]);
  const prefix = envFirst(['SOCIO_S3_STAGING_PREFIX']) || 'openclaw-social';
  const region = envFirst(['AWS_REGION', 'AWS_DEFAULT_REGION']);

  return {
    bucket,
    prefix: prefix || 'openclaw-social',
    region,
  };
}

function runAws(args) {
  const result = spawnSync('aws', args, {
    encoding: 'utf8',
    shell: false,
  });

  if (result.error) {
    throw new Error(`AWS CLI failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    throw new Error(stderr || `AWS CLI failed with exit code ${result.status}`);
  }

  return (result.stdout || '').trim();
}

async function uploadToS3(localPath, kind, awsConfig) {
  const { bucket, prefix, region } = awsConfig;
  if (!bucket) {
    throw new Error('SOCIO_S3_STAGING_BUCKET is required for AWS CLI media staging.');
  }

  const safeBase = basename(localPath).replace(/[^A-Za-z0-9._-]+/g, '-');
  const key = `${prefix}/${kind}/${Date.now()}-${safeBase}`;
  const target = `s3://${bucket}/${key}`;
  const cpArgs = ['s3', 'cp', localPath, target, '--only-show-errors'];
  if (region) {
    cpArgs.push('--region', region);
  }
  runAws(cpArgs);

  const presignArgs = ['s3', 'presign', target, '--expires-in', '86400'];
  if (region) {
    presignArgs.push('--region', region);
  }
  const publicUrl = runAws(presignArgs);

  return {
    provider: 's3',
    publicUrl,
    bucket,
    key,
  };
}

async function resolveMediaToLocalPath(media, kind) {
  if (!isUrl(media)) {
    return resolve(media);
  }

  const response = await fetch(media);
  if (!response.ok) {
    throw new Error(`Failed to download remote ${kind}: ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const tempDir = await mkdtemp(join(tmpdir(), 'mechi-social-'));
  const extension = extname(new URL(media).pathname) || (kind === 'image' ? '.jpg' : '.mp4');
  const target = join(tempDir, `${kind}${extension}`);
  await writeFile(target, bytes);
  return target;
}

async function stagePublicMediaUrl(media, brandConfig, kind) {
  if (isUrl(media)) {
    return {
      provider: 'remote',
      publicUrl: media,
    };
  }

  const localPath = resolve(media);
  if (kind === 'image' && isImagePath(localPath) && brandConfig.imgurClientId) {
    return uploadToImgur(localPath, brandConfig.imgurClientId);
  }

  const awsConfig = resolveAwsStagingConfig();
  if (awsConfig.bucket) {
    return uploadToS3(localPath, kind, awsConfig);
  }

  return uploadToCloudinary(localPath, kind === 'image' ? 'image' : 'video', brandConfig.cloudinary);
}

function assertBrand(parsed) {
  if (!parsed.brand) {
    throw new Error('A brand is required. Use --brand chezahub or --brand playmechi.');
  }

  return getBrandConfig(parsed.brand);
}

export {
  assertBrand,
  envFirst,
  graphRequest,
  guessMimeType,
  isUrl,
  parseBrandCaptionMediaArgs,
  resolveCaption,
  resolveMediaToLocalPath,
  resolveXurlBin,
  stagePublicMediaUrl,
  usageFor,
};
