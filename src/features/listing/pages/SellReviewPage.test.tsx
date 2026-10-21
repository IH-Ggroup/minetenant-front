import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProduct, getStore } from '@/api/products';
import { useDemoStore } from '@/app/demo-store-context';
import { SellReviewPage } from './SellReviewPage';
const { navigateMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
}));
vi.mock('@/api/products', () => ({
  createProduct: vi.fn(),
  getStore: vi.fn(),
}));
vi.mock('@/app/demo-store-context', () => ({
  useDemoStore: vi.fn(),
}));
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});
vi.mock('@/shared/ui/Button', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui/Button')>();
  return actual;
});
const draft = {
  name: 'テスト商品',
  description: 'テスト用の商品説明',
  price: 100,
  stock: 1,
  category: 'building',
};
const activeUser = {
  id: 'user-1',
  username: 'test_user',
  displayName: 'テストユーザー',
  storeId: 'store-1',
};
function setup(storeId: string | null) {
  vi.mocked(useDemoStore).mockReturnValue({
    activeUser: { ...activeUser, storeId },
    listingDraft: draft,
  } as ReturnType<typeof useDemoStore>);
  return render(
    <MemoryRouter>
      <SellReviewPage />
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getStore).mockResolvedValue({
    id: 'store-1',
    name: 'テスト店舗',
  } as Awaited<ReturnType<typeof getStore>>);
  vi.mocked(createProduct).mockResolvedValue({
    id: 'product-1',
  } as Awaited<ReturnType<typeof createProduct>>);
});
describe('SellReviewPage', () => {
  it('店舗 ID が null の場合は店舗取得 API を呼ばない', async () => {
    setup(null);
    expect(
      await screen.findByRole('heading', { name: '出品内容を確認' }),
    ).toBeInTheDocument();
    expect(getStore).not.toHaveBeenCalled();
  });
  it('店舗 ID が null の場合は出品 API を呼ばない', async () => {
    setup(null);
    fireEvent.click(screen.getByRole('button', { name: /出品する/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '出品には店舗の登録が必要です。',
    );
    expect(createProduct).not.toHaveBeenCalled();
  });
  it('店舗 ID がある場合は店舗情報を表示する', async () => {
    setup('store-1');
    expect(await screen.findByText('テスト店舗')).toBeInTheDocument();
    expect(getStore).toHaveBeenCalledWith('store-1');
  });
  it('店舗 ID がある場合は出品 API を呼ぶ', async () => {
    setup('store-1');
    fireEvent.click(screen.getByRole('button', { name: /出品する/ }));
    await waitFor(() => {
      expect(createProduct).toHaveBeenCalledWith(draft);
    });
  });
});
