import { createContext, useContext } from 'react';

import type {
  CreateProductInput,
  DemoSnapshot,
  Product,
  PurchaseResult,
  SessionUser,
  Store,
} from '@/domain/models';

export interface DemoStoreValue {
  state: DemoSnapshot;
  activeUser: SessionUser;
  activeStore: Store;
  login(userId: string): void;
  saveListingDraft(draft: CreateProductInput | null): void;
  publishListing(): Product | null;
  purchaseProduct(productId: string): PurchaseResult;
}

export const DemoStoreContext = createContext<DemoStoreValue | null>(null);

export function useDemoStore(): DemoStoreValue {
  const value = useContext(DemoStoreContext);
  if (!value) {
    throw new Error('useDemoStore must be used within DemoStoreProvider');
  }
  return value;
}
