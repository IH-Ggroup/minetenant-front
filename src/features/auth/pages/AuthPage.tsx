import {
  type FormEvent,
  type InputHTMLAttributes,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';

import { ApiError } from '@/api/client';
import { useDemoStore } from '@/app/demo-store-context';
import { paths } from '@/app/paths';
import { Button } from '@/shared/ui/Button';

type FieldName =
  'username' | 'displayName' | 'password' | 'passwordConfirmation';

type FieldErrors = Partial<Record<FieldName, string[]>>;

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  name: FieldName;
  label: string;
  required?: boolean;
  errors?: string[];
}

function AuthField({
  name,
  label,
  errors,
  required = true,
  ...props
}: AuthFieldProps) {
  const id = `auth-${name}`;
  const hasErrors = Boolean(errors?.length);

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <input
        {...props}
        id={id}
        className="input"
        name={name}
        required={required}
        aria-invalid={hasErrors || undefined}
        aria-describedby={hasErrors ? `${id}-error` : undefined}
      />
      {hasErrors ? (
        <p id={`${id}-error`} className="field__error">
          {errors?.join(' ')}
        </p>
      ) : null}
    </div>
  );
}

function loginDestination(from: unknown): string {
  if (
    typeof from !== 'string' ||
    !from.startsWith('/') ||
    from.startsWith('//') ||
    from.includes('\\')
  ) {
    return paths.products;
  }

  const pathname = from.split(/[?#]/, 1)[0].replace(/\/+$/, '').toLowerCase();

  return pathname === paths.login || pathname === paths.signup
    ? paths.products
    : from;
}

function AuthForm({ isSignup }: { isSignup: boolean }) {
  const location = useLocation();
  const { authStatus, authError, restoreSession, login, register } =
    useDemoStore();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [successfulDestination, setSuccessfulDestination] = useState<
    string | null
  >(null);
  const pending = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (pending.current || !event.currentTarget.checkValidity()) {
      return;
    }

    const data = new FormData(event.currentTarget);
    const username = String(data.get('username') ?? '');
    const password = String(data.get('password') ?? '');
    const passwordConfirmation = String(data.get('passwordConfirmation') ?? '');

    if (isSignup && password !== passwordConfirmation) {
      setFieldErrors({
        passwordConfirmation: ['パスワードが一致しません。'],
      });
      return;
    }
    pending.current = true;
    setIsSubmitting(true);
    setFieldErrors({});
    setSubmitError(null);

    try {
      if (isSignup) {
        await register({
          username: String(data.get('username') ?? ''),
          displayName: String(data.get('displayName') ?? '') || null,
          password,
          passwordConfirmation: String(data.get('passwordConfirmation') ?? ''),
        });
      } else {
        await login({ username, password });
      }

      if (mounted.current) {
        const from = (location.state as { from?: unknown } | null)?.from;
        setSuccessfulDestination(
          isSignup ? paths.products : loginDestination(from),
        );
      }
    } catch (error) {
      if (!mounted.current) {
        return;
      }

      const visibleFields: FieldName[] = isSignup
        ? ['username', 'displayName', 'password', 'passwordConfirmation']
        : ['username', 'password'];

      if (
        error instanceof ApiError &&
        error.status === 422 &&
        visibleFields.some((field) => error.errors[field]?.length)
      ) {
        setFieldErrors(error.errors);
      } else {
        setSubmitError(
          error instanceof ApiError
            ? error.message
            : '通信に失敗しました。接続を確認して、もう一度お試しください。',
        );
      }
    } finally {
      pending.current = false;
      if (mounted.current) {
        setIsSubmitting(false);
      }
    }
  };

  const handleRestore = async () => {
    if (pending.current) {
      return;
    }

    pending.current = true;
    setIsRestoring(true);
    setSubmitError(null);

    try {
      await restoreSession();
    } catch {
      if (mounted.current) {
        setSubmitError(
          '認証状態を確認できませんでした。もう一度お試しください。',
        );
      }
    } finally {
      pending.current = false;
      if (mounted.current) {
        setIsRestoring(false);
      }
    }
  };

  const handleSwitch = (event: MouseEvent<HTMLAnchorElement>) => {
    if (pending.current) {
      event.preventDefault();
    }
  };

  // 認証更新と送信完了が同時に描画されても、成功したフォームの戻り先を優先します。
  if (successfulDestination) {
    return <Navigate to={successfulDestination} replace />;
  }

  if (!isSubmitting && authStatus === 'loading') {
    return (
      <div className="auth-card">
        <p role="status">認証状態を確認しています…</p>
      </div>
    );
  }

  if (!isSubmitting && authStatus === 'authenticated') {
    return <Navigate to={paths.products} replace />;
  }

  if (!isSubmitting && authStatus === 'error') {
    return (
      <div className="auth-card">
        <div className="inline-alert inline-alert--error" role="alert">
          {submitError ?? authError ?? '認証状態を確認できませんでした。'}
        </div>
        <Button type="button" onClick={handleRestore} isLoading={isRestoring}>
          再試行
        </Button>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-card__heading">
        <h1>{isSignup ? '新規登録' : 'ログイン'}</h1>
        <p>
          {isSignup
            ? 'アカウント情報を入力してください。'
            : 'ユーザー名とパスワードを入力してください。'}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="auth-form"
        aria-busy={isSubmitting}
      >
        {submitError ? (
          <div className="inline-alert inline-alert--error" role="alert">
            {submitError}
          </div>
        ) : null}

        <AuthField
          name="username"
          label="ユーザー名"
          type="text"
          autoComplete="username"
          maxLength={120}
          disabled={isSubmitting}
          errors={fieldErrors.username}
        />

        {isSignup ? (
          <AuthField
            name="displayName"
            label="表示名"
            required={false}
            type="text"
            autoComplete="name"
            maxLength={120}
            disabled={isSubmitting}
            errors={fieldErrors.displayName}
          />
        ) : null}

        <AuthField
          name="password"
          label="パスワード"
          type="password"
          placeholder={
            isSignup ? '8文字以上で入力してください' : 'パスワードを入力'
          }
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          minLength={isSignup ? 8 : undefined}
          maxLength={72}
          disabled={isSubmitting}
          errors={fieldErrors.password}
        />

        {isSignup ? (
          <AuthField
            name="passwordConfirmation"
            label="パスワード（確認）"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            disabled={isSubmitting}
            errors={fieldErrors.passwordConfirmation}
          />
        ) : null}

        <Button type="submit" fullWidth isLoading={isSubmitting}>
          {isSignup ? '登録する' : 'ログインして商品を見る'}
        </Button>
      </form>

      <div className="auth-card__switch">
        <p>
          {isSignup
            ? 'すでにアカウントをお持ちですか？'
            : 'アカウントをお持ちでないですか？'}{' '}
          <Link
            to={isSignup ? paths.login : paths.signup}
            aria-disabled={isSubmitting || undefined}
            tabIndex={isSubmitting ? -1 : undefined}
            onClick={handleSwitch}
            onAuxClick={handleSwitch}
          >
            {isSignup ? 'ログイン' : '新規登録'}
          </Link>
        </p>
      </div>
    </div>
  );
}

export function AuthPage() {
  const { pathname } = useLocation();
  const isSignup = pathname === paths.signup;

  return <AuthForm key={isSignup ? 'signup' : 'login'} isSignup={isSignup} />;
}
