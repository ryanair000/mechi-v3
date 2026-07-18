'use client';

import Link from 'next/link';
import styles from '@/components/v5/V5Public.module.css';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className={styles.page}>
      <main className={styles.container} style={{ maxWidth: 760, padding: '90px 0' }}>
        <p className={styles.eyebrow}>Something went wrong</p>
        <h1 style={{ fontSize: 'clamp(38px, 6vw, 68px)', lineHeight: 1 }}>We could not load this screen.</h1>
        <p className={styles.screenDescription}>Your account and tournament data are safe. Retry the screen or return to V5 home.</p>
        <div className={styles.heroActions}>
          <button className={styles.button} type="button" onClick={reset}>Try again</button>
          <Link className={styles.buttonOutline} href="/v5">Return home</Link>
        </div>
      </main>
    </div>
  );
}
