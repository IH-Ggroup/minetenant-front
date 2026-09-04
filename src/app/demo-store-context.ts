import { createContext, useContext } from 'react';

import type { LoginInput, RegisterInput } from '@/api/auth';
import type { SessionUser, CreateProductInput } from '@/domain/models';

export const DemoStoreContext = createContext<{
  activeUser: SessionUser | null;
  authStatus: 'loading' | 'authenticated' | 'unauthenticated' | 'error';
  authError: string | null;
  restoreSession: () => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
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
