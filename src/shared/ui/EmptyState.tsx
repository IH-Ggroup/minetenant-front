import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <section className="empty-state">
      {icon && <div className="empty-state__icon">{icon}</div>}
      <h2>{title}</h2>
      <p>{description}</p>
      {action && <div>{action}</div>}
    </section>
  );
}
