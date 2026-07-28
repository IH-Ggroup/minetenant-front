import { type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useDemoStore } from '@/app/demo-store-context';
import { paths } from '@/app/paths';
import { DEMO_USERS } from '@/mocks/fixtures';
import { Button } from '@/shared/ui/Button';

export function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useDemoStore();
  const isSignup = location.pathname === paths.signup;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login(DEMO_USERS[0].id);
    navigate(paths.products);
  };

  return (
    <div className="auth-card">
      <div className="auth-card__heading">
        <h1>{isSignup ? '新規登録' : 'ログイン'}</h1>
        <p>
          {isSignup
            ? 'アカウント情報を入力してください。'
            : 'メールアドレスとパスワードを入力してください。'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <label className="field">
          <span className="field__label">メールアドレス</span>
          <input
            className="input"
            name="email"
            type="email"
            placeholder="demo@minetenant.jp"
            autoComplete="email"
          />
        </label>

        <label className="field">
          <span className="field__label">パスワード</span>
          <input
            className="input"
            name="password"
            type="password"
            placeholder="入力しなくても進めます"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
          />
        </label>

        <Button type="submit" fullWidth>
          {isSignup ? '登録する' : 'ログインして商品を見る'}
        </Button>
      </form>

      <div className="auth-card__switch">
        {isSignup ? (
          <p>
            すでにアカウントをお持ちですか？{' '}
            <Link to={paths.login}>ログイン</Link>
          </p>
        ) : (
          <p>
            アカウントをお持ちでないですか？{' '}
            <Link to={paths.signup}>新規登録</Link>
          </p>
        )}
      </div>
    </div>
  );
}
