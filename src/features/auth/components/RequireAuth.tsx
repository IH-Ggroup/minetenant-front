import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useDemoStore } from '@/app/demo-store-context';
import { paths } from '@/app/paths';
import { Button } from '@/shared/ui/Button';

export function RequireAuth() {
  const { authStatus, authError, restoreSession } = useDemoStore();
  const location = useLocation();

  if (authStatus === 'loading') {
    return <p role="status">ログイン状態を確認しています...</p>;
  }
  if (authStatus === 'error') {
    return (
      <div className="page-stack">
        <p role="alert">{authError}</p>
        <Button type="button" onClick={() => void restoreSession()}>
          再試行する
        </Button>
      </div>
    );
  }
  if (authStatus === 'unauthenticated') {
    return (
      <Navigate
        to={paths.login}
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }
  return <Outlet />;
}
