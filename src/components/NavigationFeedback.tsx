'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';

const FALLBACK_HIDE_MS = 12_000;

function isPlainPrimaryClick(event: MouseEvent) {
  return event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;
}

export function NavigationFeedback() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentLocation = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ''}`;
  const [destinationLocation, setDestinationLocation] = useState<string | null>(null);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    function startNavigation(event: MouseEvent) {
      if (!isPlainPrimaryClick(event) || event.defaultPrevented) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      const current = new URL(window.location.href);
      const sameDocument =
        destination.pathname === current.pathname &&
        destination.search === current.search;
      if (sameDocument) return;

      setDestinationLocation(`${destination.pathname}${destination.search}`);
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => {
        setDestinationLocation(null);
        hideTimer.current = null;
      }, FALLBACK_HIDE_MS);
    }

    document.addEventListener('click', startNavigation, true);
    return () => {
      document.removeEventListener('click', startNavigation, true);
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    };
  }, []);

  const visible = Boolean(destinationLocation && destinationLocation !== currentLocation);

  return (
    <div
      aria-live="polite"
      aria-label="Opening the next PlayMechi screen"
      aria-hidden={!visible}
      role="status"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483646,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(244, 247, 251, 0.96)',
        color: '#0b1121',
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        visibility: visible ? 'visible' : 'hidden',
        transition: 'opacity 120ms ease',
      }}
    >
      <div
        style={{
          display: 'grid',
          minWidth: 240,
          gap: 12,
          justifyItems: 'center',
          border: '1px solid rgba(11, 17, 33, 0.09)',
          borderRadius: 18,
          background: '#ffffff',
          padding: '24px 28px',
          boxShadow: '0 20px 55px rgba(15, 23, 42, 0.10)',
          textAlign: 'center',
        }}
      >
        <Image src="/mechi-logo.png" alt="" width={42} height={42} priority />
        <strong style={{ fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Opening PlayMechi
        </strong>
        <span style={{ maxWidth: 280, color: '#607086', fontSize: 13, lineHeight: 1.5 }}>
          Taking you to the next screen…
        </span>
      </div>
    </div>
  );
}
