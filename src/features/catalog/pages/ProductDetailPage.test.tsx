import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { ProductDetailPage } from '@/features/catalog/pages/ProductDetailPage';
import { formatPrice } from '@/shared/lib/format';
import type { Product, Store } from '@/domain/models';

const api = vi.hoisted(() => ({
  getProduct: vi.fn(),
  getStore: vi.fn(),
}));

vi.mock('@/api/products', () => ({
  getProduct: api.getProduct,
  getStore: api.getStore,
}));

vi.mock('@/app/demo-store-context', () => ({
  useDemoStore: () => ({ activeUser: null }),
}));

function renderProductDetail() {
  return render(
    <MemoryRouter initialEntries={['/products/product-1']}>
      <Routes>
        <Route path="/products/:productId" element={<ProductDetailPage />} />
        <Route path="/products" element={<h1>商品一覧ページ</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

const product: Product = {
  id: 'product-1',
  storeId: 'store-1',
  sellerId: 'seller-1',
  name: 'テスト商品',
  description: '商品の説明テキスト',
  price: 1200,
  status: 'available',
  category: 'hobby',
  theme: 'ocean',
  emoji: '📦',
  createdAt: null,
};

const store: Store = {
  id: 'store-1',
  ownerId: 'seller-1',
  name: 'テスト店舗',
  description: '店舗の説明',
  level: 1,
  points: 0,
  syncStatus: 'connected',
};

beforeEach(() => {
  api.getProduct.mockReset();
  api.getStore.mockReset();
});

afterEach(cleanup);

describe('@/features/catalog/pages/ProductDetailPage', () => {
  it('商品404の場合、商品一覧へ戻れる', async () => {
    api.getProduct.mockRejectedValueOnce(
      new ApiError(404, '商品が見つかりません'),
    );
    renderProductDetail();
    expect(await screen.findByText('商品が見つかりません')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '商品一覧へ戻る' }),
    ).toHaveAttribute('href', '/products');
    expect(api.getStore).not.toHaveBeenCalled();
  });

  it('店舗GETが500でも商品情報を残し、店舗だけ再試行できる', async () => {
    api.getProduct.mockResolvedValue(product);
    api.getStore
      .mockRejectedValueOnce(new ApiError(500, 'サーバーエラー'))
      .mockResolvedValueOnce(store);
    renderProductDetail();
    expect(
      await screen.findByRole('heading', { name: 'テスト商品' }),
    ).toBeInTheDocument();
    expect(screen.getByText(formatPrice(product.price))).toBeInTheDocument();
    expect(screen.getByText('商品の説明テキスト')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '店舗情報を取得できませんでした。',
    );
    fireEvent.click(screen.getByRole('button', { name: '店舗情報を再試行' }));
    expect(await screen.findByText('テスト店舗')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'テスト商品' }),
    ).toBeInTheDocument();
    expect(screen.getByText('商品の説明テキスト')).toBeInTheDocument();
    expect(api.getProduct).toHaveBeenCalledTimes(1);
    expect(api.getStore).toHaveBeenCalledTimes(2);
  });
});
