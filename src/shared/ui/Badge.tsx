import type { PropsWithChildren } from 'react';

import { classNames } from '@/shared/lib/class-names';

interface BadgeProps {
  tone?: 'neutral' | 'success' | 'warning' | 'info';
}

export function Badge({
  children,
  tone = 'neutral',
}: PropsWithChildren<BadgeProps>) {
  return (
    <span className={classNames('badge', `badge--${tone}`)}>{children}</span>
  );
}
