import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCurrentUser, login, logout, register } from '@/api/auth';
import { DemoStoreProvider } from '@/app/DemoStoreProvider';
import { useDemoStore } from '@/app/demo-store-context';
import type { SessionUser } from '@/domain/models';
import { DEMO_USERS, INITIAL_PRODUCTS } from '@/mocks/fixtures';

const notifications = vi.hoisted(() => ({ unauthorized: () => {} }));
vi.mock('@/api/auth');
vi.mock('@/api/client', () => ({
  onUnauthorized: (listener: () => void) => {
    notifications.unauthorized = listener;
    return () => {
      notifications.unauthorized = () => {};
    };
  },
}));

beforeEach(() => {
  vi.mocked(getCurrentUser).mockResolvedValue({ ...DEMO_USERS[0] });
  vi.mocked(logout).mockResolvedValue(undefined);
});

describe('Laravelセッションの状態管理', () => {
  it('初回は読み込み中にして、APIのユーザーを復元する', async () => {
    const { result } = renderHook(useDemoStore, { wrapper: DemoStoreProvider });
    expect(result.current.authStatus).toBe('loading');
    await waitFor(() =>
      expect(result.current.authStatus).toBe('authenticated'),
    );
    expect(result.current.activeUser?.id).toBe(DEMO_USERS[0].id);
  });

  it('401を受けたときはユーザーと出品下書きを破棄する', async () => {
    const { result } = renderHook(useDemoStore, { wrapper: DemoStoreProvider });
    await waitFor(() =>
      expect(result.current.authStatus).toBe('authenticated'),
    );
    act(() => result.current.saveListingDraft({ ...INITIAL_PRODUCTS[0] }));
    expect(result.current.listingDraft).not.toBeNull();
    act(() => notifications.unauthorized());
    expect(result.current.activeUser).toBeNull();
    expect(result.current.listingDraft).toBeNull();
    expect(result.current.authStatus).toBe('unauthenticated');
  });

  it('ログアウト時は別ユーザーに下書きを引き継がない', async () => {
    const { result } = renderHook(useDemoStore, { wrapper: DemoStoreProvider });
    await waitFor(() =>
      expect(result.current.authStatus).toBe('authenticated'),
    );
    act(() => result.current.saveListingDraft({ ...INITIAL_PRODUCTS[0] }));
    await act(() => result.current.logout());
    expect(result.current.activeUser).toBeNull();
    expect(result.current.listingDraft).toBeNull();
  });

  it('遅い復元応答で新しいログイン結果を上書きしない', async () => {
    let resolveSession!: (user: SessionUser | null) => void;
    vi.mocked(getCurrentUser).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSession = resolve;
      }),
    );
    vi.mocked(login).mockResolvedValueOnce({ ...DEMO_USERS[1] });
    const { result } = renderHook(useDemoStore, { wrapper: DemoStoreProvider });
    await act(() =>
      result.current.login({
        email: 'seller@minetenant.jp',
        password: 'password',
      }),
    );
    await act(async () => {
      resolveSession({ ...DEMO_USERS[0] });
    });
    expect(result.current.activeUser?.id).toBe(DEMO_USERS[1].id);
  });

  it('登録成功のユーザーをログイン状態にする', async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);
    vi.mocked(register).mockResolvedValueOnce({ ...DEMO_USERS[1] });
    const { result } = renderHook(useDemoStore, { wrapper: DemoStoreProvider });
    await waitFor(() =>
      expect(result.current.authStatus).toBe('unauthenticated'),
    );
    await act(() =>
      result.current.register({
        name: '出品者',
        email: 'new@example.com',
        password: 'password',
        password_confirmation: 'password',
      }),
    );
    expect(result.current.authStatus).toBe('authenticated');
    expect(result.current.activeUser?.id).toBe(DEMO_USERS[1].id);
  });

  it('ログイン中は別の認証操作を送らず、完了後はログアウトできる', async () => {
    let finishLogin!: (user: SessionUser) => void;
    vi.mocked(login).mockReturnValueOnce(
      new Promise((resolve) => {
        finishLogin = resolve;
      }),
    );
    const { result } = renderHook(useDemoStore, { wrapper: DemoStoreProvider });
    await waitFor(() =>
      expect(result.current.authStatus).toBe('authenticated'),
    );
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.login({
        email: 'seller@example.test',
        password: 'password',
      });
    });
    await expect(result.current.logout()).rejects.toThrow('認証処理中');
    await expect(
      result.current.register({
        name: '別の利用者',
        email: 'other@example.test',
        password: 'password',
        password_confirmation: 'password',
      }),
    ).rejects.toThrow('認証処理中');
    expect(logout).not.toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
    await act(async () => {
      finishLogin({ ...DEMO_USERS[1] });
      await pending;
    });
    expect(result.current.activeUser?.id).toBe(DEMO_USERS[1].id);
    await act(() => result.current.logout());
    expect(logout).toHaveBeenCalledOnce();
    expect(result.current.activeUser).toBeNull();
  });

  it('認証失敗後は再試行できる', async () => {
    vi.mocked(login)
      .mockRejectedValueOnce(new Error('通信失敗'))
      .mockResolvedValueOnce({ ...DEMO_USERS[1] });
    const { result } = renderHook(useDemoStore, { wrapper: DemoStoreProvider });
    await waitFor(() =>
      expect(result.current.authStatus).toBe('authenticated'),
    );
    const input = { email: 'seller@example.test', password: 'password' };
    await expect(result.current.login(input)).rejects.toThrow('通信失敗');
    await act(() => result.current.login(input));
    expect(result.current.activeUser?.id).toBe(DEMO_USERS[1].id);
  });
});
