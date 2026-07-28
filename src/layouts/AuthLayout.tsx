import { Box } from 'lucide-react';
import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <main id="main-content" className="auth-layout" tabIndex={-1}>
      <header className="auth-layout__header">
        <span className="brand__mark" aria-hidden="true">
          <Box size={18} />
        </span>
        <strong>MineTenant</strong>
      </header>
      <p className="auth-layout__description">
        MineTenantの画面遷移サンプルです。
      </p>
      <Outlet />
    </main>
  );
}
