import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCurrentUser, login, logout } from '@/api/auth';
import { ApiError } from '@/api/client';
import { getProducts } from '@/api/products';
import { DEMO_USERS, INITIAL_PRODUCTS } from '@/mocks/fixtures';
import { renderApp } from '@/test/render-app';

// 画面遷移のテストなので API 境界を置き換えます。Laravel / MySQL は不要です。
vi.mock('@/api/products');
vi.mock('@/api/auth');

beforeEach(() => {
  vi.mocked(getCurrentUser).mockResolvedValue(null);
  vi.mocked(login).mockResolvedValue({ ...DEMO_USERS[0] });
  vi.mocked(logout).mockResolvedValue(undefined);
  vi.mocked(getProducts).mockResolvedValue(
    INITIAL_PRODUCTS.map((product) => ({ ...product })),
  );
});

describe('MineTenant routes', () => {
  it('ログインボタンから商品一覧へ遷移できる', async () => {
    renderApp('/login');

    const loginButton = await screen.findByRole('button', {
      name: 'ログインして商品を見る',
    });
    fireEvent.change(screen.getByLabelText('メールアドレス'), {
      target: { value: 'demo@minetenant.jp' },
    });
    fireEvent.change(screen.getByLabelText('パスワード'), {
      target: { value: 'password' },
    });
    fireEvent.click(loginButton);

    expect(
      await screen.findByRole('heading', { name: '商品を探す' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: INITIAL_PRODUCTS[0].name }),
    ).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith({
      email: 'demo@minetenant.jp',
      password: 'password',
    });
    expect(getProducts).toHaveBeenCalledOnce();
  });

  it('存在しないURLで次の操作が分かる404を表示する', async () => {
    renderApp('/this-page-does-not-exist');

    expect(
      await screen.findByRole('heading', { name: 'ページが見つかりません' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '商品一覧へ戻る' }),
    ).toHaveAttribute('href', '/products');
  });

  it('出品フォームに基本の必須項目がある', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ ...DEMO_USERS[0] });
    renderApp('/sell');

    expect(await screen.findByLabelText('商品名')).toBeRequired();
    expect(screen.getByLabelText('商品説明')).toBeRequired();
    expect(screen.getByLabelText(/^価格/)).toBeRequired();
    expect(screen.getByLabelText(/^在庫数/)).toBeRequired();
  });

  it('未ログインで保護画面を開くとログイン後に元の画面へ戻る', async () => {
    const { router } = renderApp('/sell');
    await screen.findByLabelText('メールアドレス');
    expect(router.state.location.pathname).toBe('/login');
    fireEvent.change(screen.getByLabelText('メールアドレス'), {
      target: { value: 'demo@minetenant.jp' },
    });
    fireEvent.change(screen.getByLabelText('パスワード'), {
      target: { value: 'password' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'ログインして商品を見る' }),
    );
    await screen.findByLabelText('商品名');
    expect(router.state.location.pathname).toBe('/sell');
  });

  it('認証情報が間違っている場合は画面遷移しない', async () => {
    vi.mocked(login).mockRejectedValueOnce(
      new ApiError(422, '入力内容を確認してください。', undefined, {
        email: ['メールアドレスまたはパスワードが正しくありません。'],
      }),
    );
    const { router } = renderApp('/login');
    await screen.findByLabelText('メールアドレス');
    fireEvent.change(screen.getByLabelText('メールアドレス'), {
      target: { value: 'demo@minetenant.jp' },
    });
    fireEvent.change(screen.getByLabelText('パスワード'), {
      target: { value: 'wrong-password' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'ログインして商品を見る' }),
    );
    expect(
      await screen.findByText(
        'メールアドレスまたはパスワードが正しくありません。',
      ),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('セッション復元の通信失敗を未ログイン扱いにせず再試行できる', async () => {
    vi.mocked(getCurrentUser)
      .mockRejectedValueOnce(new Error('APIに接続できません。'))
      .mockResolvedValueOnce({ ...DEMO_USERS[0] });
    const { router } = renderApp('/sell');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'APIに接続できません。',
    );
    expect(router.state.location.pathname).toBe('/sell');
    fireEvent.click(screen.getByRole('button', { name: '再試行する' }));
    expect(await screen.findByLabelText('商品名')).toBeInTheDocument();
  });

  it('ログアウトはAPI成功後にログイン画面へ戻る', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ ...DEMO_USERS[0] });
    const { router } = renderApp('/sell');
    fireEvent.click(await screen.findByRole('button', { name: 'ログアウト' }));
    await screen.findByLabelText('メールアドレス');
    expect(logout).toHaveBeenCalledOnce();
    expect(router.state.location.pathname).toBe('/login');
    expect(screen.queryByLabelText('商品名')).not.toBeInTheDocument();
  });

  it('ログアウトの通信失敗時はログイン状態を維持する', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ ...DEMO_USERS[0] });
    vi.mocked(logout).mockRejectedValueOnce(
      new Error('ログアウトできませんでした。'),
    );
    const { router } = renderApp('/sell');
    fireEvent.click(await screen.findByRole('button', { name: 'ログアウト' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ログアウトできませんでした。',
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'ログアウト' })).toBeEnabled(),
    );
    expect(router.state.location.pathname).toBe('/sell');
  });
});
