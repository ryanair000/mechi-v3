'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, BadgeCheck, ShieldCheck, Trophy } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import styles from './V5AuthShell.module.css';

interface V5AuthShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  sideEyebrow?: string;
  sideTitle?: string;
  sideDescription?: string;
  sidePoints?: string[];
  backHref?: string;
  hideMainHeader?: boolean;
  hideSideEyebrow?: boolean;
}

const defaultPoints = [
  'One account for competition on Mechi',
  'Verified match history and competitive records',
  'Secure tournament entry and payment recovery',
];

function normalizeMechiCopy(value?: string) {
  return value?.replaceAll('PlayMechi', 'Mechi');
}

export function V5AuthShell({
  children,
  title,
  subtitle,
  sideEyebrow = 'Africa’s competitive gaming network',
  sideTitle = 'Your competition starts here.',
  sideDescription = 'Sign in once to find tournaments, compete, build your record, manage your team, or host competition for your community.',
  sidePoints = defaultPoints,
  backHref = '/',
  hideMainHeader = false,
  hideSideEyebrow = false,
}: V5AuthShellProps) {
  const normalizedSideTitle = normalizeMechiCopy(sideTitle) || sideTitle;
  const normalizedSideDescription = normalizeMechiCopy(sideDescription) || sideDescription;
  const normalizedSideEyebrow = normalizeMechiCopy(sideEyebrow) || sideEyebrow;
  const mainTitle = normalizeMechiCopy(title) || normalizedSideTitle;
  const mainSubtitle = normalizeMechiCopy(subtitle) || normalizedSideDescription;
  const points = (sidePoints.length ? sidePoints : defaultPoints).map(
    (point) => normalizeMechiCopy(point) || point
  );

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.brand} href="/" aria-label="Mechi home">
          <span className={styles.mark}>
            <Image src="/mechi-logo.png" alt="" width={940} height={1117} priority />
          </span>
          <span className={styles.wordmark}>MECHI</span>
        </Link>
        <div className={styles.topActions}>
          <ThemeToggle className={styles.themeToggle} />
          <Link className={styles.homeLink} href={backHref}>
            <ArrowLeft size={15} /> Home
          </Link>
        </div>
      </header>

      <div className={styles.shell}>
        <section className={styles.story} aria-labelledby="auth-story-title">
          <div className={styles.storyGlow} aria-hidden="true" />
          <div className={styles.storyContent}>
            {!hideSideEyebrow ? <p className={styles.eyebrow}>{normalizedSideEyebrow}</p> : null}
            <h1 id="auth-story-title">{normalizedSideTitle}</h1>
            <p className={styles.storyCopy}>{normalizedSideDescription}</p>

            <div className={styles.points}>
              {points.map((point, index) => {
                const Icon = index === 0 ? Trophy : index === 1 ? BadgeCheck : ShieldCheck;
                return (
                  <div className={styles.point} key={point}>
                    <span><Icon size={17} /></span>
                    <p>{point}</p>
                  </div>
                );
              })}
            </div>

            <div className={styles.workspaceStrip} aria-label="Core Mechi roles">
              <span>Player</span><span>Team</span><span>Organizer</span>
            </div>
          </div>
        </section>

        <section className={styles.formPanel} aria-label="Account access">
          <div className={styles.formInner}>
            {!hideMainHeader && (mainTitle || mainSubtitle) ? (
              <div className={styles.formHeader}>
                <p>MECHI</p>
                {mainTitle ? <h2>{mainTitle}</h2> : null}
                {mainSubtitle ? <span>{mainSubtitle}</span> : null}
              </div>
            ) : null}
            {children}
          </div>
        </section>
      </div>

      <footer className={styles.footer}>
        <span>© 2026 Mechi</span>
        <span>Find competition. Play. Build your record.</span>
      </footer>
    </main>
  );
}
