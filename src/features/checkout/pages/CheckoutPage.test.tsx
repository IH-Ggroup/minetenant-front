import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { CheckoutPage } from '@/features/checkout/pages/CheckoutPage';
import type { Product } from '@/domain/models';

const api = vi.hoisted(() => ({
  getProduct: vi.fn(),
}));

vi.mock('@/api/products', () => ({
  getProduct: api.getProduct,
}));

vi.mock('@/app/demo-store-context', () => ({
  useDemoStore: () => ({
    activeUser: {
      id: 'seller-1',
      displayName: 'テストユーザー',
    },
  }),
}));

function renderCheckout() {
  return render(
    <MemoryRouter initialEntries={['/checkout/product-1']}>
      <Routes>
        <Route path="/checkout/:productId" element={<CheckoutPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const product: Product = {
  id: 'product-1',
  storeId: 'store-1',
  sellerId: 'seller-2',
  name: 'テスト商品',
  description: '商品の説明テキスト',
  price: 1200,
  status: 'available',
  category: 'hobby',
  theme: 'ocean',
  emoji: '📦',
  createdAt: null,
};

beforeEach(() => {
  api.getProduct.mockReset();
});

afterEach(cleanup);

describe('@/features/checkout/pages/CheckoutPage', () => {
  it('商品404の場合、商品が見つからないメッセージを表示する', async () => {
    api.getProduct.mockRejectedValueOnce(
      new ApiError(404, '商品が見つかりません'),
    );

    renderCheckout();

    expect(await screen.findByText('商品が見つかりません')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: '商品一覧へ' })).toHaveAttribute(
      'href',
      '/products',
    );
  });

  it('通信失敗の場合、再試行ボタンを表示する', async () => {
    api.getProduct.mockRejectedValueOnce(new ApiError(500, 'サーバーエラー'));

    renderCheckout();

    expect(
      await screen.findByText('商品情報を取得できませんでした'),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        '通信またはサーバーで問題が発生しました。時間をおいて再度お試しください。',
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: '再試行する' }),
    ).toBeInTheDocument();
  });

  it('売却済みの場合、購入できないメッセージとボタンを表示する', async () => {
    api.getProduct.mockResolvedValueOnce({
      ...product,
      status: 'sold',
    });

    renderCheckout();

    expect(
      await screen.findByText('この商品は売却済みです。'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('現在購入することはできません。'),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: '内容を確認する' }),
    ).toBeDisabled();
  });

  it('自己出品の場合、購入できないメッセージとボタンを表示する', async () => {
    api.getProduct.mockResolvedValueOnce({
      ...product,
      sellerId: 'seller-1',
      status: 'available',
    });

    renderCheckout();

    expect(
      await screen.findByText('自分が出品した商品です。'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('自分の商品を購入することはできません。'),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: '内容を確認する' }),
    ).toBeDisabled();
  });
});
