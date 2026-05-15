'use client';

import type { ComponentPropsWithoutRef, ElementType, ReactNode, RefObject } from 'react';

type TimelineContentProps<T extends ElementType> = {
  as?: T;
  animationNum?: number;
  timelineRef?: RefObject<Element | null>;
  customVariants?: unknown;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, 'children'>;

export function TimelineContent<T extends ElementType = 'div'>({
  as,
  animationNum,
  timelineRef,
  customVariants,
  children,
  ...props
}: TimelineContentProps<T>) {
  void animationNum;
  void timelineRef;
  void customVariants;
  const Component = (as ?? 'div') as ElementType;

  return <Component {...props}>{children}</Component>;
}
