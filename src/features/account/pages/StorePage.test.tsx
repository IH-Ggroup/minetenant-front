import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { ApiError } from '@/api/client';
import { getProducts, getStore } from '@/api/products';
import { INITIAL_PRODUCTS, INITIAL_STORES } from '@/mocks/fixtures';

import { StorePage } from './StorePage';

vi.mock('@/api/products', () => ({
  getProducts: vi.fn(),
  getStore: vi.fn(),
}));

const store = INITIAL_STORES.find((item) => item.id === 'store-mine')!;

const products = INITIAL_PRODUCTS.filter((item) => item.storeId === store.id);

function renderStorePage() {
  return render(
    <MemoryRouter initialEntries={[`/stores/${store.id}`]}>
      <Routes>
        <Route path="/stores/:storeId" element={<StorePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('StorePage', () => {
  it('店舗情報の読み込み中はローディングを表示する', () => {
    vi.mocked(getStore).mockReturnValue(new Promise(() => {}));

    renderStorePage();

    expect(screen.getByRole('status')).toHaveTextContent(
      '店舗情報を読み込んでいます',
    );
  });

  it('店舗が404の場合は店舗が見つからないと表示する', async () => {
    vi.mocked(getStore).mockRejectedValue(new ApiError(404, 'Not Found'));

    renderStorePage();

    expect(await screen.findByText('店舗が見つかりません')).toBeInTheDocument();

    expect(getProducts).not.toHaveBeenCalled();
  });

  it('店舗取得が404以外で失敗した場合はエラーを表示する', async () => {
    vi.mocked(getStore).mockRejectedValue(
      new ApiError(500, 'Internal Server Error'),
    );

    renderStorePage();

    expect(
      await screen.findByText('店舗情報を取得できませんでした'),
    ).toBeInTheDocument();

    expect(getProducts).not.toHaveBeenCalled();
  });

  it('商品が0件の場合は商品がありませんと表示する', async () => {
    vi.mocked(getStore).mockResolvedValue(store);
    vi.mocked(getProducts).mockResolvedValue([]);

    renderStorePage();

    expect(await screen.findByText('まだ商品がありません')).toBeInTheDocument();

    expect(screen.getByText(store.description)).toBeInTheDocument();

    expect(screen.getByText('0件')).toBeInTheDocument();
  });

  it('商品取得に失敗した場合は店舗情報を残し、商品GETだけ再試行する', async () => {
    vi.mocked(getStore).mockResolvedValue(store);

    vi.mocked(getProducts)
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce(products);

    renderStorePage();

    expect(
      await screen.findByText('商品を取得できませんでした'),
    ).toBeInTheDocument();

    expect(screen.getByText(store.description)).toBeInTheDocument();

    expect(getStore).toHaveBeenCalledTimes(1);
    expect(getProducts).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '再試行' }));

    await waitFor(() => {
      expect(getProducts).toHaveBeenCalledTimes(2);
    });

    expect(getStore).toHaveBeenCalledTimes(1);

    expect(await screen.findByText(products[0].name)).toBeInTheDocument();

    expect(screen.getByText(store.description)).toBeInTheDocument();
  });
});
