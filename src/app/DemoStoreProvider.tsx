import {
  type PropsWithChildren,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from 'react';
import {
  createProduct,
  getProducts,
  purchaseProduct as purchaseProductApi,
} from '@/api/products';

import { DemoStoreContext } from '@/app/demo-store-context';
import type {
  CreateProductInput,
  Product,
  PurchaseResult,
} from '@/domain/models';
import { createInitialDemoSnapshot, DEMO_USERS } from '@/mocks/fixtures';

/**
 * バックエンド実装前の、画面遷移を確認するためだけの簡易ストアです。
 * リロードすると初期データへ戻ります。
 */
export function DemoStoreProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState(createInitialDemoSnapshot);
  useEffect(() => {
    getProducts()
      .then((products) => {
        setState((current) => ({
          ...current,
          products,
        }));
      })
      .catch((error) => {
        console.error('商品取得×', error); //後で別のエラー処理
      });
  });

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

  const publishListing = useCallback(async (): Promise<Product | null> => {
    if (!state.listingDraft) {
      return null;
    }
    try {
      const input: CreateProductInput = {
        ...state.listingDraft,
        sellerId: activeUser.id,
        storeId: activeStore.id,
      };
      //↑認証処理できたらinput消す
      const product = await createProduct(input);
      setState((current) => ({
        ...current,
        products: [product, ...current.products],
        listingDraft: null,
      }));
      return product;
    } catch (error) {
      console.error('❌ 出品APIでエラー:', error); //後で別のエラー処理
      return null;
    }
  }, [activeStore.id, activeUser.id, state.listingDraft]);

  // 商品購入
  const purchaseProduct = useCallback(
    async (productId: string, requestId: string): Promise<PurchaseResult> => {
      try {
        const result = await purchaseProductApi(
          productId,
          activeUser.id,
          requestId,
        );
        return result;
      } catch (error) {
        console.error('❌ Provider: 購入APIでエラー:', error); //後で別のエラー処理
        return {
          ok: false,
          error: '商品の購入に失敗しました。',
        };
      }
    },
    [activeUser.id],
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
