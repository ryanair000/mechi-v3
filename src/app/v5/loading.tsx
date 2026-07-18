import styles from '@/components/v5/V5Public.module.css';

export default function Loading() {
  return (
    <div className={styles.page}>
      <div className={styles.announcement}>Loading PlayMechi…</div>
      <main className={styles.container} style={{ padding: '72px 0' }}>
        <p className={styles.eyebrow}>Preparing your workspace</p>
        <h1 style={{ maxWidth: 700, fontSize: 'clamp(38px, 5vw, 64px)', lineHeight: 1 }}>Competition is loading.</h1>
        <div className={styles.metrics} aria-label="Loading content">
          {[1, 2, 3].map((item) => <div className={styles.metric} key={item}><span>Loading</span><strong>—</strong><small>Please wait a moment</small></div>)}
        </div>
      </main>
    </div>
  );
}
