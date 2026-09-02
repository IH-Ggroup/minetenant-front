import { type PropsWithChildren, useCallback, useState } from 'react';
import { getuser } from '@/api/products';

import { DemoStoreContext } from '@/app/demo-store-context';
import type { SessionUser, CreateProductInput } from '@/domain/models';

export function DemoStoreProvider({ children }: PropsWithChildren) {
  const [activeUser, setactiveUser] = useState<SessionUser | null>(null);
  const [listingDraft, setListingDraft] = useState<CreateProductInput | null>(
    null,
  );
  const login = useCallback(async () => {
    const user = await getuser();
    setactiveUser(user);
  }, []);

  const saveListingDraft = useCallback((draft: CreateProductInput) => {
    setListingDraft(draft);
  }, []);

  const value = {
    activeUser,
    login,
    saveListingDraft,
    listingDraft,
  };

  return (
    <DemoStoreContext.Provider value={value}>
      {children}
    </DemoStoreContext.Provider>
  );
}
