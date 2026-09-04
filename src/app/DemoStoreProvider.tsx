import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  getCurrentUser,
  login as loginApi,
  register as registerApi,
  logout as logoutApi,
  type LoginInput,
  type RegisterInput,
} from '@/api/auth';
import { onUnauthorized } from '@/api/client';
import { DemoStoreContext } from '@/app/demo-store-context';
import type { SessionUser, CreateProductInput } from '@/domain/models';

// 既存ページへの影響を抑えるため名前を維持しています。認証情報はLaravelが管理します。
export function DemoStoreProvider({ children }: PropsWithChildren) {
  const [activeUser, setActiveUser] = useState<SessionUser | null>(null);
  const [authStatus, setAuthStatus] = useState<
    'loading' | 'authenticated' | 'unauthenticated' | 'error'
  >('loading');
  const [authError, setAuthError] = useState<string | null>(null);
  const [listingDraft, setListingDraft] = useState<CreateProductInput | null>(
    null,
  );
  // 遅れて返った復元リクエストがログイン・ログアウト結果を上書きするのを防ぎます。
  const sessionRequest = useRef(0);
  // 別画面や複数のボタンから認証操作を同時送信しないようにします。
  const authMutation = useRef(false);

  const clearSession = useCallback(() => {
    sessionRequest.current += 1;
    setActiveUser(null);
    setListingDraft(null);
    setAuthError(null);
    setAuthStatus('unauthenticated');
  }, []);

  const loadSession = useCallback(() => {
    const request = ++sessionRequest.current;
    return getCurrentUser()
      .then((user) => {
        if (request !== sessionRequest.current) return;
        setActiveUser(user);
        setAuthStatus(user ? 'authenticated' : 'unauthenticated');
        setAuthError(null);
        if (!user) setListingDraft(null);
      })
      .catch((error: unknown) => {
        if (request !== sessionRequest.current) return;
        setAuthStatus('error');
        setAuthError(
          error instanceof Error
            ? error.message
            : 'ログイン状態を確認できませんでした。',
        );
      });
  }, []);

  useEffect(() => {
    const unsubscribe = onUnauthorized(clearSession);
    void loadSession();
    return () => {
      sessionRequest.current += 1;
      unsubscribe();
    };
  }, [clearSession, loadSession]);

  const restoreSession = useCallback(async () => {
    setAuthStatus('loading');
    setAuthError(null);
    await loadSession();
  }, [loadSession]);

  const authenticate = useCallback(
    async (requestUser: () => Promise<SessionUser>) => {
      if (authMutation.current)
        throw new Error('認証処理中です。完了までお待ちください。');
      authMutation.current = true;
      const request = ++sessionRequest.current;
      try {
        const user = await requestUser();
        if (request !== sessionRequest.current) return;
        setListingDraft(null);
        setActiveUser(user);
        setAuthError(null);
        setAuthStatus('authenticated');
      } finally {
        authMutation.current = false;
      }
    },
    [],
  );

  const login = useCallback(
    (input: LoginInput) => authenticate(() => loginApi(input)),
    [authenticate],
  );
  const register = useCallback(
    (input: RegisterInput) => authenticate(() => registerApi(input)),
    [authenticate],
  );

  const logout = useCallback(async () => {
    if (authMutation.current)
      throw new Error('認証処理中です。完了までお待ちください。');
    authMutation.current = true;
    sessionRequest.current += 1;
    // 通信失敗時にログアウト済みと見せないよう、サーバーの成功を待ちます。
    try {
      await logoutApi();
      clearSession();
    } finally {
      authMutation.current = false;
    }
  }, [clearSession]);

  const saveListingDraft = useCallback((draft: CreateProductInput) => {
    setListingDraft(draft);
  }, []);

  return (
    <DemoStoreContext.Provider
      value={{
        activeUser,
        authStatus,
        authError,
        restoreSession,
        login,
        register,
        logout,
        saveListingDraft,
        listingDraft,
      }}
    >
      {children}
    </DemoStoreContext.Provider>
  );
}
