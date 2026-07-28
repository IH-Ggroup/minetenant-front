import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderApp } from '@/test/render-app';

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
