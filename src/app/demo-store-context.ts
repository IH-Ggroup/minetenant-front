import { createContext, useContext } from 'react';

import type { SessionUser, CreateProductInput } from '@/domain/models';

export const DemoStoreContext = createContext<{
  activeUser: SessionUser | null;
  login: () => Promise<void>;
  saveListingDraft(draft: CreateProductInput): void;
  listingDraft: CreateProductInput | null;
} | null>(null);

export function useDemoStore() {
  const context = useContext(DemoStoreContext);

  if (!context) {
    throw new Error('useDemoStore must be used within DemoStoreProvider');
  }

  return context;
}
