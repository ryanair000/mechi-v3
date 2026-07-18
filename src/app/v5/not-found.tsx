import Link from 'next/link';
import { V5Shell } from '@/components/v5/V5Public';
import styles from '@/components/v5/V5Public.module.css';

export default function NotFound() {
  return (
    <V5Shell>
      <section className={styles.container} style={{ maxWidth: 760, padding: '90px 0' }}>
        <p className={styles.eyebrow}>404 · Screen not found</p>
        <h1 style={{ fontSize: 'clamp(38px, 6vw, 68px)', lineHeight: 1 }}>That competition screen has moved.</h1>
        <p className={styles.screenDescription}>Return home or browse the approved tournaments currently available on PlayMechi.</p>
        <div className={styles.heroActions}>
          <Link className={styles.button} href="/v5">V5 home</Link>
          <Link className={styles.buttonOutline} href="/v5/tournaments">Browse tournaments</Link>
        </div>
      </section>
    </V5Shell>
  );
}
