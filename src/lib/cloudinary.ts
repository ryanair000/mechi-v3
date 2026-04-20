import { v2 as cloudinary } from 'cloudinary';
import { APP_URL } from '@/lib/urls';
import { isMockProviderMode, shouldCaptureProviderTranscripts } from '@/lib/provider-mode';
import { captureProviderTranscript } from '@/lib/provider-transcript';

type UploadImageDataUriParams = {
  dataUri: string;
  folder: string;
  publicId: string;
  transformation?: ReadonlyArray<unknown>;
};

type UploadImageDataUriResult = {
  public_id: string;
  secure_url: string;
};

let cloudinaryConfigured = false;

function getCloudinaryClient() {
  if (!cloudinaryConfigured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    cloudinaryConfigured = true;
  }

  return cloudinary;
}

export async function uploadImageDataUri(
  params: UploadImageDataUriParams
): Promise<UploadImageDataUriResult> {
  if (isMockProviderMode()) {
    const mockResult = {
      public_id: params.publicId,
      secure_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    };

    await captureProviderTranscript({
      provider: 'cloudinary',
      operation: 'upload',
      request: {
        folder: params.folder,
        publicId: params.publicId,
        transformation: params.transformation ? [...params.transformation] : [],
      },
      response: mockResult,
      metadata: {
        appUrl: APP_URL,
      },
    });

    return mockResult;
  }

  const uploadResult = await getCloudinaryClient().uploader.upload(params.dataUri, {
    folder: params.folder,
    public_id: params.publicId,
    transformation: params.transformation ? [...params.transformation] : undefined,
  });

  if (shouldCaptureProviderTranscripts()) {
    await captureProviderTranscript({
      provider: 'cloudinary',
      operation: 'upload',
      request: {
        folder: params.folder,
        publicId: params.publicId,
        transformation: params.transformation ? [...params.transformation] : [],
      },
      response: {
        public_id: uploadResult.public_id,
        secure_url: uploadResult.secure_url,
      },
    });
  }

  return {
    public_id: uploadResult.public_id,
    secure_url: uploadResult.secure_url,
  };
}
