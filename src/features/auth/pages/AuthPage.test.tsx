import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/api/client';
import { AuthPage } from '@/features/auth/pages/AuthPage';

const auth = vi.hoisted(() => ({
  authStatus: 'unauthenticated' as
    'loading' | 'authenticated' | 'unauthenticated' | 'error',
  authError: null as string | null,
  restoreSession: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
}));

vi.mock('@/app/demo-store-context', () => ({ useDemoStore: () => auth }));

function Destination() {
  const { pathname, search, hash } = useLocation();
  return <h1>{pathname + search + hash}</h1>;
}

function renderAuth(pathname = '/login', from?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname, state: { from } }]}>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage />} />
        <Route path="*" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillCredentials() {
  fireEvent.change(screen.getByLabelText('メールアドレス'), {
    target: { value: 'member@example.com' },
  });
  fireEvent.change(screen.getByLabelText('パスワード', { exact: true }), {
    target: { value: 'password123' },
  });
}

function fillRegistration() {
  fillCredentials();
  fireEvent.change(screen.getByLabelText('名前'), {
    target: { value: '山田 太郎' },
  });
  fireEvent.change(screen.getByLabelText('パスワード（確認）'), {
    target: { value: 'password123' },
  });
}

function deferred() {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  auth.authStatus = 'unauthenticated';
  auth.authError = null;
  auth.login.mockReset().mockResolvedValue(undefined);
  auth.register.mockReset().mockResolvedValue(undefined);
  auth.restoreSession.mockReset().mockResolvedValue(undefined);
});

afterEach(cleanup);

describe('AuthPage', () => {
  it('ログインに必須の入力とバックエンドに沿った入力属性を表示する', () => {
    renderAuth();

    const email = screen.getByLabelText('メールアドレス');
    const password = screen.getByLabelText('パスワード');
    expect(email).toBeRequired();
    expect(email).toHaveAttribute('type', 'email');
    expect(email).toHaveAttribute('maxlength', '255');
    expect(password).toBeRequired();
    expect(password).toHaveAttribute('maxlength', '72');
    expect(password).not.toHaveAttribute('minlength');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.queryByLabelText('名前')).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'ログインして商品を見る' }),
    );
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('入力値でログインし成功時にだけ商品一覧へ遷移する', async () => {
    const request = deferred();
    auth.login.mockReturnValueOnce(request.promise);
    renderAuth();
    fillCredentials();

    fireEvent.click(
      screen.getByRole('button', { name: 'ログインして商品を見る' }),
    );

    expect(auth.login).toHaveBeenCalledWith({
      email: 'member@example.com',
      password: 'password123',
    });
    expect(
      screen.getByRole('heading', { name: 'ログイン' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '処理中…' })).toBeDisabled();
    expect(screen.getByLabelText('メールアドレス')).toBeDisabled();

    await act(async () => request.resolve());
    expect(
      await screen.findByRole('heading', { name: '/products' }),
    ).toBeInTheDocument();
  });

  it('通信中にsubmitイベントが重なっても二重送信しない', async () => {
    const request = deferred();
    auth.login.mockReturnValueOnce(request.promise);
    const { container } = renderAuth();
    fillCredentials();
    const form = container.querySelector('form');
    expect(form).not.toBeNull();

    fireEvent.submit(form!);
    fireEvent.submit(form!);

    expect(auth.login).toHaveBeenCalledOnce();
    await act(async () => request.resolve());
  });

  it.each(['/login', '/signup'])(
    '%s の送信中はフォーム切り替えを無効にして認証リクエストを重ねない',
    async (pathname) => {
      const isSignup = pathname === '/signup';
      const request = deferred();
      (isSignup ? auth.register : auth.login).mockReturnValueOnce(
        request.promise,
      );
      renderAuth(pathname);
      if (isSignup) fillRegistration();
      else fillCredentials();

      fireEvent.click(
        screen.getByRole('button', {
          name: isSignup ? '登録する' : 'ログインして商品を見る',
        }),
      );
      const switchLink = screen.getByRole('link', {
        name: isSignup ? 'ログイン' : '新規登録',
      });
      expect(switchLink).toHaveAttribute('aria-disabled', 'true');
      expect(switchLink).toHaveAttribute('tabindex', '-1');

      fireEvent.click(switchLink);

      expect(
        screen.getByRole('heading', {
          name: isSignup ? '新規登録' : 'ログイン',
        }),
      ).toBeInTheDocument();
      expect(isSignup ? auth.login : auth.register).not.toHaveBeenCalled();
      await act(async () => request.resolve());
    },
  );

  it('送信失敗後はフォーム切り替えを再び操作できる', async () => {
    const request = deferred();
    auth.login.mockReturnValueOnce(request.promise);
    renderAuth();
    fillCredentials();
    fireEvent.click(
      screen.getByRole('button', { name: 'ログインして商品を見る' }),
    );

    await act(async () =>
      request.reject(new ApiError(0, '通信に失敗しました。')),
    );

    const switchLink = screen.getByRole('link', { name: '新規登録' });
    expect(switchLink).not.toHaveAttribute('aria-disabled');
    expect(switchLink).not.toHaveAttribute('tabindex');
    fireEvent.click(switchLink);
    expect(
      screen.getByRole('heading', { name: '新規登録' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード', { exact: true })).toHaveValue(
      '',
    );
  });

  it('新規登録の4項目を送信し登録成功後は商品一覧へ遷移する', async () => {
    renderAuth('/signup', '/mypage');
    const name = screen.getByLabelText('名前');
    const password = screen.getByLabelText('パスワード', { exact: true });
    const confirmation = screen.getByLabelText('パスワード（確認）');
    expect(name).toBeRequired();
    expect(name).toHaveAttribute('maxlength', '120');
    expect(password).toHaveAttribute('minlength', '8');
    expect(password).toHaveAttribute('autocomplete', 'new-password');
    expect(confirmation).toBeRequired();
    expect(confirmation).toHaveAttribute('maxlength', '72');
    fillRegistration();

    fireEvent.click(screen.getByRole('button', { name: '登録する' }));

    expect(auth.register).toHaveBeenCalledWith({
      name: '山田 太郎',
      email: 'member@example.com',
      password: 'password123',
      password_confirmation: 'password123',
    });
    expect(auth.login).not.toHaveBeenCalled();
    expect(
      await screen.findByRole('heading', { name: '/products' }),
    ).toBeInTheDocument();
  });

  it('422の各入力エラーをaria-invalidとaria-describedbyで紐付ける', async () => {
    auth.register.mockRejectedValueOnce(
      new ApiError(422, '入力内容を確認してください。', undefined, {
        name: ['名前を確認してください。'],
        email: ['このメールアドレスは既に登録されています。'],
        password: ['パスワードは72バイト以内で入力してください。'],
        password_confirmation: ['確認用パスワードが一致しません。'],
      }),
    );
    renderAuth('/signup');
    fillRegistration();
    fireEvent.click(screen.getByRole('button', { name: '登録する' }));

    await screen.findByText('確認用パスワードが一致しません。');
    for (const [label, message] of [
      ['名前', '名前を確認してください。'],
      ['メールアドレス', 'このメールアドレスは既に登録されています。'],
      ['パスワード', 'パスワードは72バイト以内で入力してください。'],
      ['パスワード（確認）', '確認用パスワードが一致しません。'],
    ]) {
      const input = screen.getByLabelText(label, { exact: true });
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAccessibleDescription(message);
    }
    expect(
      screen.getByRole('heading', { name: '新規登録' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登録する' })).toBeEnabled();
  });

  it('通信エラーを全体alertで表示して同じ入力値で再試行できる', async () => {
    auth.login.mockRejectedValueOnce(
      new ApiError(0, '通信に失敗しました。', 'NETWORK_ERROR'),
    );
    renderAuth();
    fillCredentials();
    fireEvent.click(
      screen.getByRole('button', { name: 'ログインして商品を見る' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '通信に失敗しました。',
    );
    expect(screen.getByLabelText('メールアドレス')).toHaveValue(
      'member@example.com',
    );
    expect(screen.getByLabelText('パスワード')).toHaveValue('password123');
    expect(
      screen.getByRole('heading', { name: 'ログイン' }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'ログインして商品を見る' }),
    );
    expect(
      await screen.findByRole('heading', { name: '/products' }),
    ).toBeInTheDocument();
    expect(auth.login).toHaveBeenCalledTimes(2);
  });

  it('フォーム切り替えで以前のパスワードと入力エラーを持ち越さない', async () => {
    auth.login.mockRejectedValueOnce(
      new ApiError(422, '入力エラー', undefined, {
        email: ['メールアドレスまたはパスワードが正しくありません。'],
      }),
    );
    renderAuth();
    fillCredentials();
    fireEvent.click(
      screen.getByRole('button', { name: 'ログインして商品を見る' }),
    );
    await screen.findByText(
      'メールアドレスまたはパスワードが正しくありません。',
    );

    fireEvent.click(screen.getByRole('link', { name: '新規登録' }));
    expect(screen.getByLabelText('パスワード', { exact: true })).toHaveValue(
      '',
    );
    expect(screen.getByLabelText('パスワード（確認）')).toHaveValue('');
    expect(screen.getByLabelText('メールアドレス')).not.toHaveAttribute(
      'aria-invalid',
    );
    expect(
      screen.queryByText('メールアドレスまたはパスワードが正しくありません。'),
    ).not.toBeInTheDocument();

    fillRegistration();
    fireEvent.click(screen.getByRole('link', { name: 'ログイン' }));
    expect(screen.getByLabelText('パスワード')).toHaveValue('');
  });

  it('復元中はログインフォームではなく確認中を表示する', () => {
    auth.authStatus = 'loading';
    renderAuth();
    expect(screen.getByRole('status')).toHaveTextContent(
      '認証状態を確認しています',
    );
    expect(screen.queryByLabelText('メールアドレス')).not.toBeInTheDocument();
  });

  it('認証復元のエラーから再試行して未認証フォームに戻れる', async () => {
    auth.authStatus = 'error';
    auth.authError = 'サーバーに接続できませんでした。';
    auth.restoreSession.mockImplementationOnce(async () => {
      auth.authStatus = 'unauthenticated';
      auth.authError = null;
    });
    renderAuth();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'サーバーに接続できませんでした。',
    );
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));

    expect(auth.restoreSession).toHaveBeenCalledOnce();
    expect(await screen.findByLabelText('メールアドレス')).toBeInTheDocument();
  });

  it('認証済みユーザーはフォームを表示せず商品一覧へ移動する', async () => {
    auth.authStatus = 'authenticated';
    renderAuth('/login', '/mypage');
    expect(
      await screen.findByRole('heading', { name: '/products' }),
    ).toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('ログイン成功時に保護ページの内部URLへ戻る', async () => {
    renderAuth('/login', '/mypage?tab=purchases#history');
    fillCredentials();
    fireEvent.click(
      screen.getByRole('button', { name: 'ログインして商品を見る' }),
    );
    expect(
      await screen.findByRole('heading', {
        name: '/mypage?tab=purchases#history',
      }),
    ).toBeInTheDocument();
  });

  it('ログイン処理中に認証状態が変わっても元の保護ページへの遷移を優先する', async () => {
    auth.login.mockImplementationOnce(async () => {
      auth.authStatus = 'authenticated';
    });
    renderAuth('/login', '/sell');
    fillCredentials();
    fireEvent.click(
      screen.getByRole('button', { name: 'ログインして商品を見る' }),
    );

    expect(
      await screen.findByRole('heading', { name: '/sell' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: '/products' }),
    ).not.toBeInTheDocument();
  });

  it.each([
    'https://example.com',
    '//example.com',
    '/\\example.com',
    '/login',
    '/signup?next=/mypage',
    '/LOGIN/',
    { pathname: '/mypage' },
  ])('安全でない、または認証画面への戻り先 %j を採用しない', async (from) => {
    renderAuth('/login', from);
    fillCredentials();
    fireEvent.click(
      screen.getByRole('button', { name: 'ログインして商品を見る' }),
    );
    expect(
      await screen.findByRole('heading', { name: '/products' }),
    ).toBeInTheDocument();
  });
});
