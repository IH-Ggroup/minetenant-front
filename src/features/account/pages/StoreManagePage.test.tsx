import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { ApiError } from '@/api/client';
import { getStoreDashboard } from '@/api/products';
import { useDemoStore } from '@/app/demo-store-context';
import type { Product, SessionUser, StoreDashboard } from '@/domain/models';

import { StoreManagePage } from './StoreManagePage';

vi.mock('@/api/products', () => ({
  getStoreDashboard: vi.fn(),
}));

vi.mock('@/app/demo-store-context', () => ({
  useDemoStore: vi.fn(),
}));

const mockGetStoreDashboard = vi.mocked(getStoreDashboard);
const mockUseDemoStore = vi.mocked(useDemoStore);

const activeUser = {
  id: 'seller-1',
  username: 'seller',
  displayName: '店舗オーナー',
  role: 'seller',
  roleLabel: '出品者',
  avatarInitial: 'S',
  storeId: 'store-mine',
} as SessionUser;

const dashboard = {
  store: {
    id: 'store-mine',
    ownerId: 'seller-1',
    name: 'テスト店舗',
    description: 'テスト店舗の説明',
    level: 2,
    points: 100,
    syncStatus: 'connected',
  },
  products: [
    {
      id: 'product-1',
      storeId: 'store-mine',
      sellerId: 'seller-1',
      name: 'りんご',
      description: '青森県産のりんご',
      price: 500,
      status: 'available',
      category: 'hobby',
      theme: 'forest',
      emoji: '🍎',
      createdAt: null,
    },
    {
      id: 'product-2',
      storeId: 'store-mine',
      sellerId: 'seller-1',
      name: 'みかん',
      description: '愛媛県産のみかん',
      price: 300,
      status: 'sold',
      category: 'hobby',
      theme: 'sunset',
      emoji: '🍊',
      createdAt: null,
    },
  ] as Product[],
  stats: {
    productCount: 2,
    availableProductCount: 1,
    soldOutProductCount: 1,
    totalStock: 0,
    salesCount: 1,
    salesAmount: 300,
    webSalesCount: 1,
    minecraftSalesCount: 0,
    nextLevelPoints: 200,
    levelProgressPercent: 50,
  },
  recentTransactions: [],
} as StoreDashboard;

function renderPage() {
  return render(
    <MemoryRouter>
      <StoreManagePage />
    </MemoryRouter>,
  );
}

describe('StoreManagePage', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockUseDemoStore.mockReturnValue({
      activeUser,
    } as ReturnType<typeof useDemoStore>);
  });

  it('初回取得中はローディングを表示する', () => {
    mockGetStoreDashboard.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent(
      '店舗情報を読み込んでいます...',
    );
  });

  it('取得失敗時はエラーを表示し、再試行成功後に店舗情報を表示する', async () => {
    mockGetStoreDashboard
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce(dashboard);

    renderPage();

    expect(
      await screen.findByText('店舗情報を取得できませんでした'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '再試行' }));

    expect(
      await screen.findByRole('heading', { name: 'テスト店舗' }),
    ).toBeInTheDocument();

    expect(mockGetStoreDashboard).toHaveBeenCalledTimes(2);
  });

  it('403の場合は権限エラーを表示する', async () => {
    mockGetStoreDashboard.mockRejectedValue(new ApiError(403, 'Forbidden'));

    renderPage();

    expect(
      await screen.findByText('店舗情報を表示できません'),
    ).toBeInTheDocument();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'この店舗情報を閲覧する権限がありません。',
    );

    expect(screen.queryByText('テスト店舗')).not.toBeInTheDocument();
  });

  it('商品0件の場合は商品なしを表示し、取得失敗とは区別する', async () => {
    mockGetStoreDashboard.mockResolvedValue({
      ...dashboard,
      products: [],
      stats: {
        ...dashboard.stats,
        productCount: 0,
      },
    });

    renderPage();

    expect(
      await screen.findByText('まだ出品商品はありません。'),
    ).toBeInTheDocument();

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      screen.queryByText('店舗情報を取得できませんでした'),
    ).not.toBeInTheDocument();
  });

  it('販売状態を正しく表示する', async () => {
    mockGetStoreDashboard.mockResolvedValue(dashboard);

    renderPage();

    await screen.findByText('りんご');

    expect(screen.getByText('販売中')).toBeInTheDocument();
    expect(screen.getByText('売却済み')).toBeInTheDocument();
  });
});
