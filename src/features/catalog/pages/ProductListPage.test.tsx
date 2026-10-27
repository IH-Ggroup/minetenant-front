import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { getProducts } from '@/api/products';
import type { Product } from '@/domain/models';
import { ProductListPage } from '@/features/catalog/pages/ProductListPage';
import { DemoStoreProvider } from '@/app/DemoStoreProvider';

vi.mock('@/api/products', () => ({
  getProducts: vi.fn(),
}));

vi.mock('@/features/catalog/components/ProductCard', () => ({
  ProductCard: ({ product }: { product: { id: string; name: string } }) => (
    <article data-testid="product-card">{product.name}</article>
  ),
}));

const mockGetProducts = vi.mocked(getProducts);

const productA = {
  id: '1',
  name: 'りんご',
  description: '青森県産のりんご',
} as Product;

const productB = {
  id: '2',
  name: 'みかん',
  description: '愛媛県産のみかん',
} as Product;

function renderPage() {
  return render(
    <MemoryRouter>
      <DemoStoreProvider>
        <ProductListPage />
      </DemoStoreProvider>
    </MemoryRouter>,
  );
}

describe('ProductListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('初回取得中はローディング表示を行う', () => {
    mockGetProducts.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent(
      '商品を読み込んでいます...',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('取得成功時に空配列なら商品なしを表示する', async () => {
    mockGetProducts.mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByText('出品中の商品はありません'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('取得失敗時はエラーを表示し、再試行成功後に商品を表示する', async () => {
    mockGetProducts
      .mockRejectedValueOnce(new Error('HTTP 500'))
      .mockResolvedValueOnce([productA]);

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '商品を取得できませんでした。',
    );

    fireEvent.click(screen.getByRole('button', { name: '再試行' }));

    expect(await screen.findByTestId('product-card')).toHaveTextContent(
      'りんご',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mockGetProducts).toHaveBeenCalledTimes(2);
  });

  it('再試行も失敗した場合はエラーを表示し続ける', async () => {
    mockGetProducts
      .mockRejectedValueOnce(new Error('NETWORK_ERROR'))
      .mockRejectedValueOnce(new Error('HTTP 500'));

    renderPage();

    expect(await screen.findByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '再試行' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '商品を取得できませんでした。',
    );
    expect(mockGetProducts).toHaveBeenCalledTimes(2);
  });

  it('検索結果が0件なら検索解除で取得済み商品に戻る', async () => {
    mockGetProducts.mockResolvedValue([productA, productB]);

    renderPage();

    await screen.findByText('りんご');
    await screen.findByText('みかん');

    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'バナナ' },
    });

    expect(
      await screen.findByText('条件に合う商品がありません'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '検索を解除する' }));

    expect(await screen.findByText('りんご')).toBeInTheDocument();
    expect(screen.getByText('みかん')).toBeInTheDocument();
    expect(mockGetProducts).toHaveBeenCalledTimes(1);
  });
});
