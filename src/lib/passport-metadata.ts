import { createHash } from 'node:crypto';
import type { Metadata } from 'next';
import { isPassportDiscoveryEligible } from '@/lib/passport-access-policy';
import { getPassportPathFromHandle } from '@/lib/passport-handle';
import type { PublicPassportData } from '@/lib/passport-types';
import { APP_URL } from '@/lib/urls';

const PRIVATE_IMAGE_URL = `${APP_URL}/api/og/passport-private`;
const PRIVATE_TITLE = 'Private Gamer Passport | PlayMechi';
const PRIVATE_DESCRIPTION = 'This PlayMechi Gamer Passport is private.';

function noIndexRobots(): Metadata['robots'] {
  return {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
    noimageindex: true,
    googleBot: {
      index: false,
      follow: false,
      noarchive: true,
      nocache: true,
      noimageindex: true,
      'max-image-preview': 'none',
    },
  };
}

function passportMetadataVersion(passport: PublicPassportData): string {
  const identity = passport.identity;
  return createHash('sha256')
    .update(JSON.stringify({
      updatedAt: identity.updated_at,
      publicationStatus: identity.publication_status,
      defaultVisibility: identity.default_visibility,
      fieldVisibility: identity.field_visibility,
    }))
    .digest('hex')
    .slice(0, 12);
}

function publicCardUrl(passport: PublicPassportData): string {
  const handle = encodeURIComponent(passport.identity.username);
  return `${APP_URL}/api/passport/cards/${handle}?format=horizontal&v=${passportMetadataVersion(passport)}`;
}

export function buildPassportMetadata(passport: PublicPassportData | null): Metadata {
  if (!passport) {
    return {
      title: 'Gamer Passport Not Found | PlayMechi',
      description: 'This PlayMechi Gamer Passport is unavailable.',
      robots: noIndexRobots(),
    };
  }

  const identity = passport.identity;
  const canonicalUrl = `${APP_URL}${getPassportPathFromHandle(identity.username)}`;

  if (passport.access !== 'public') {
    return {
      title: PRIVATE_TITLE,
      description: PRIVATE_DESCRIPTION,
      alternates: { canonical: canonicalUrl },
      robots: noIndexRobots(),
      openGraph: {
        title: PRIVATE_TITLE,
        description: PRIVATE_DESCRIPTION,
        type: 'website',
        url: canonicalUrl,
        siteName: 'PlayMechi',
        images: [{
          url: PRIVATE_IMAGE_URL,
          width: 1200,
          height: 630,
          alt: 'Private PlayMechi Gamer Passport',
        }],
      },
      twitter: {
        card: 'summary_large_image',
        title: PRIVATE_TITLE,
        description: PRIVATE_DESCRIPTION,
        images: [PRIVATE_IMAGE_URL],
      },
    };
  }

  const title = `${identity.display_name} (@${identity.username}) | PlayMechi Gamer Passport`;
  const description = `${identity.display_name}'s public PlayMechi Gamer Passport and gaming identity.`;
  const imageUrl = publicCardUrl(passport);
  const indexable = isPassportDiscoveryEligible(identity);

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    robots: indexable ? { index: true, follow: true, 'max-image-preview': 'large' } : noIndexRobots(),
    openGraph: {
      title,
      description,
      type: 'profile',
      url: canonicalUrl,
      siteName: 'PlayMechi',
      images: [{
        url: imageUrl,
        width: 1200,
        height: 630,
        alt: `${identity.display_name}'s Gamer Passport`,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}
