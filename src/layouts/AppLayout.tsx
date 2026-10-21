import { NavLink, Outlet } from 'react-router-dom';

import { paths } from '@/app/paths';
import { useDemoStore } from '@/app/demo-store-context';
import { LogoutButton } from '@/features/auth/components/LogoutButton';
import { classNames } from '@/shared/lib/class-names';

const navItems = [
  { to: paths.products, label: 'ホーム' },
  { to: paths.sell, label: '出品', requiresStore: true },
  { to: paths.myPage, label: 'マイページ' },
];

export function AppLayout() {
  const { activeUser, authStatus } = useDemoStore();

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        本文へ移動
      </a>

      <header className="app-header">
        <div className="app-header__inner">
          <NavLink className="brand" to={paths.products}>
            <strong className="app-logo">MineTenant</strong>
          </NavLink>

          <nav className="main-nav" aria-label="メインナビゲーション">
            {navItems
              .filter(
                (item) => !item.requiresStore || activeUser?.storeId != null,
              )
              .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    classNames('main-nav__link', isActive && 'is-active')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
          </nav>
          {activeUser ? (
            <div className="header-user">
              <span className="username">{activeUser.displayName}</span>
              <LogoutButton />
            </div>
          ) : authStatus === 'unauthenticated' ? (
            <NavLink className="login-button" to={paths.login}>
              ログイン
            </NavLink>
          ) : null}
        </div>
      </header>

      <main id="main-content" className="app-main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
