import Image from 'next/image';
import Link from 'next/link';
import styles from './V5Public.module.css';

export function V5Logo({ priority = false }: { priority?: boolean }) {
  return (
    <Link className={styles.brand} href="/" aria-label="PlayMechi home">
      <span className={styles.brandMark}>
        <Image
          src="/mechi-logo.png"
          alt=""
          width={940}
          height={1117}
          sizes="42px"
          style={{ height: 'auto' }}
          priority={priority}
        />
      </span>
      <span className={styles.brandName}>PLAY<span>MECHI</span></span>
    </Link>
  );
}
