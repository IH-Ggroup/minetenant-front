import { type PropsWithChildren, useCallback, useMemo, useState } from 'react';

import { DemoStoreContext } from '@/app/demo-store-context';
import type {
  CreateProductInput,
  Product,
  PurchaseResult,
  Transaction,
} from '@/domain/models';
import { createInitialDemoSnapshot, DEMO_USERS } from '@/mocks/fixtures';

/**
 * バックエンド実装前の、画面遷移を確認するためだけの簡易ストアです。
 * リロードすると初期データへ戻ります。
 */
export function DemoStoreProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState(createInitialDemoSnapshot);

  const activeUser =
    DEMO_USERS.find((user) => user.id === state.currentUserId) ?? DEMO_USERS[0];
  const activeStore =
    state.stores.find((store) => store.id === activeUser.storeId) ??
    state.stores[0];

  const login = useCallback((userId: string) => {
    setState((current) => ({ ...current, currentUserId: userId }));
  }, []);

  const saveListingDraft = useCallback((draft: CreateProductInput | null) => {
    setState((current) => ({ ...current, listingDraft: draft }));
  }, []);

  const publishListing = useCallback((): Product | null => {
    if (!state.listingDraft) return null;

    const product: Product = {
      ...state.listingDraft,
      id: `product-${crypto.randomUUID()}`,
      storeId: activeStore.id,
      sellerId: activeUser.id,
      createdAt: new Date().toISOString(),
    };

    setState((current) => ({
      ...current,
      products: [product, ...current.products],
      listingDraft: null,
    }));
    return product;
  }, [activeStore.id, activeUser.id, state.listingDraft]);

  const purchaseProduct = useCallback(
    (productId: string): PurchaseResult => {
      const product = state.products.find((item) => item.id === productId);
      if (
        !product ||
        product.stock <= 0 ||
        product.sellerId === activeUser.id
      ) {
        return { ok: false, error: 'この商品は購入できません。' };
      }

      const transaction: Transaction = {
        id: `transaction-${crypto.randomUUID()}`,
        productId: product.id,
        buyerId: activeUser.id,
        sellerId: product.sellerId,
        source: 'web',
        amount: product.price,
        status: 'paid',
        createdAt: new Date().toISOString(),
      };

      setState((current) => ({
        ...current,
        products: current.products.map((item) =>
          item.id === product.id
            ? { ...item, stock: Math.max(0, item.stock - 1) }
            : item,
        ),
        transactions: [transaction, ...current.transactions],
      }));
      return { ok: true, transactionId: transaction.id };
    },
    [activeUser.id, state.products],
  );

  const value = useMemo(
    () => ({
      state,
      activeUser,
      activeStore,
      login,
      saveListingDraft,
      publishListing,
      purchaseProduct,
    }),
    [
      activeStore,
      activeUser,
      login,
      publishListing,
      purchaseProduct,
      saveListingDraft,
      state,
    ],
  );

  return (
    <DemoStoreContext.Provider value={value}>
      {children}
    </DemoStoreContext.Provider>
  );
}
