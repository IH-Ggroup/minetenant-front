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
it.each([
  ['', '有効な説明', '3200'],
  ['商品名', '', '3200'],
  ['商品名', '有効な説明', '0'],
  ['商品名', '有効な説明', '-1'],
  ['商品名', '有効な説明', '1.5'],
  ['商品名', '有効な説明', '9007199254740992'],
])(
  '必須不足・不正価格では下書きを保存せず遷移しない',
  (name, description, price) => {
    renderSellPage();

    fireEvent.change(screen.getByLabelText('商品名'), {
      target: { value: name },
    });
    fireEvent.change(screen.getByLabelText('商品説明'), {
      target: { value: description },
    });
    fireEvent.change(screen.getByLabelText(/^価格/), {
      target: { value: price },
    });

    // handleSubmit側の検証を確認する
    fireEvent.submit(
      screen
        .getByRole('button', {
          name: /内容を確認する/,
        })
        .closest('form')!,
    );

    expect(demoStore.saveListingDraft).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('heading', {
        name: '/sell/review',
      }),
    ).not.toBeInTheDocument();
  },
);
