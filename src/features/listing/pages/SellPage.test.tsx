import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SellPage } from '@/features/listing/pages/SellPage';

const demoStore = vi.hoisted(() => ({
  activeUser: {
    id: 'user-1',
    storeId: 'store-1',
  },
  saveListingDraft: vi.fn(),
}));

vi.mock('@/app/demo-store-context', () => ({
  useDemoStore: () => demoStore,
}));

function Destination() {
  const { pathname } = useLocation();
  return <h1>{pathname}</h1>;
}

function renderSellPage() {
  return render(
    <MemoryRouter initialEntries={['/sell']}>
      <Routes>
        <Route path="/sell" element={<SellPage />} />
        <Route path="*" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  demoStore.saveListingDraft.mockReset();
  demoStore.activeUser = {
    id: 'user-1',
    storeId: 'store-1',
  };
});

afterEach(cleanup);

describe('SellPage', () => {
  it('正常入力で下書きを保存し /sell/review へ遷移する', () => {
    renderSellPage();
    fireEvent.change(screen.getByLabelText('商品名'), {
      target: { value: '鉱石モチーフのペンダント' },
    });
    fireEvent.change(screen.getByLabelText('商品説明'), {
      target: { value: '青い鉱石をイメージした手作りペンダントです。' },
    });
    fireEvent.change(screen.getByLabelText(/^価格/), {
      target: { value: '3200' },
    });
    fireEvent.change(screen.getByLabelText('カテゴリ'), {
      target: { value: 'accessory' },
    });
    fireEvent.click(screen.getByRole('button', { name: /内容を確認する/ }));
    expect(demoStore.saveListingDraft).toHaveBeenCalledOnce();
    expect(demoStore.saveListingDraft).toHaveBeenCalledWith({
      name: '鉱石モチーフのペンダント',
      description: '青い鉱石をイメージした手作りペンダントです。',
      price: 3200,
      category: 'accessory',
      theme: 'forest',
      emoji: '📦',
    });
    expect(
      screen.getByRole('heading', { name: '/sell/review' }),
    ).toBeInTheDocument();
  });
});
