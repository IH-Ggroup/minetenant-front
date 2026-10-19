import { Navigate, Outlet } from 'react-router-dom';
import { useDemoStore } from '@/app/demo-store-context';
import { paths } from '@/app/paths';

export function RequireStore() {
  const { activeUser, authStatus } = useDemoStore();
  if (authStatus === 'loading') {
    return <p role="status">ログイン状態を確認しています...</p>;
  }
  if (authStatus === 'error') {
    return (
      <p role="alert">
        ログイン状態を確認できません。再読み込みしてお試しください。
      </p>
    );
  }
  if (authStatus === 'unauthenticated' || !activeUser) {
    return <Navigate to={paths.login} replace />;
  }
  if (activeUser.storeId === null) {
    return <Navigate to={paths.myPage} replace />;
  }
  return <Outlet />;
}
