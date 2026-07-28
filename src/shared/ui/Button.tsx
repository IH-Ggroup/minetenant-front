import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

import { classNames } from '@/shared/lib/class-names';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface SharedButtonProps {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
}

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, SharedButtonProps {
  isLoading?: boolean;
}

function buttonClassName(
  variant: ButtonVariant,
  fullWidth: boolean,
  className?: string,
): string {
  return classNames(
    'button',
    `button--${variant}`,
    fullWidth && 'button--full',
    className,
  );
}

export function Button({
  children,
  variant = 'primary',
  fullWidth = false,
  leadingIcon,
  isLoading = false,
  disabled,
  className,
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={buttonClassName(variant, fullWidth, className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="button__spinner" aria-hidden="true" />
      ) : (
        leadingIcon
      )}
      <span>{isLoading ? '処理中…' : children}</span>
    </button>
  );
}

export interface ButtonLinkProps
  extends Omit<LinkProps, 'className'>, SharedButtonProps {
  className?: string;
}

export function ButtonLink({
  children,
  variant = 'primary',
  fullWidth = false,
  leadingIcon,
  className,
  ...props
}: PropsWithChildren<ButtonLinkProps>) {
  return (
    <Link className={buttonClassName(variant, fullWidth, className)} {...props}>
      {leadingIcon}
      <span>{children}</span>
    </Link>
  );
}
