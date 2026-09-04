import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <main id="main-content" className="auth-layout" tabIndex={-1}>
      <header className="auth-layout__header">
        <strong>MineTenant</strong>
      </header>
      <p className="auth-layout__description">
        画面設計用の土台です。デザインはこれから作成します。
      </p>
      <Outlet />
    </main>
  );
}
