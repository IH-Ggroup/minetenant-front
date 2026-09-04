import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProducts, getuser } from '@/api/products';
import { DEMO_USERS, INITIAL_PRODUCTS } from '@/mocks/fixtures';
import { renderApp } from '@/test/render-app';

// 画面遷移のテストなので API 境界を置き換えます。Laravel / MySQL は不要です。
vi.mock('@/api/products');

beforeEach(() => {
  vi.mocked(getuser).mockResolvedValue({ ...DEMO_USERS[0] });
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
    fireEvent.click(loginButton);

    expect(
      await screen.findByRole('heading', { name: '商品を探す' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: INITIAL_PRODUCTS[0].name }),
    ).toBeInTheDocument();
    expect(getuser).toHaveBeenCalledOnce();
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
    renderApp('/sell');

    expect(await screen.findByLabelText('商品名')).toBeRequired();
    expect(screen.getByLabelText('商品説明')).toBeRequired();
    expect(screen.getByLabelText(/^価格/)).toBeRequired();
    expect(screen.getByLabelText(/^在庫数/)).toBeRequired();
  });
});
