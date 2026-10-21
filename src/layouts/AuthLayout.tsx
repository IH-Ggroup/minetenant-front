import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <main id="main-content" className="auth-layout" tabIndex={-1}>
      <header className="auth-layout__header">
        <strong>MineTenant</strong>
      </header>
      <Outlet />
    </main>
  );
}
