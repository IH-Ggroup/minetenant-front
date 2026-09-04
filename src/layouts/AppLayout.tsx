import { NavLink, Outlet } from 'react-router-dom';

import { paths } from '@/app/paths';
import { classNames } from '@/shared/lib/class-names';

const navItems = [
  { to: paths.products, label: '商品一覧' },
  { to: paths.sell, label: '商品を出品' },
  { to: paths.myPage, label: 'マイページ' },
];

export function AppLayout() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        本文へ移動
      </a>

      <header className="app-header">
        <div className="app-header__inner">
          <NavLink className="brand" to={paths.products}>
            <strong>MineTenant</strong>
          </NavLink>

          <nav className="main-nav" aria-label="メインナビゲーション">
            {navItems.map((item) => (
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
        </div>
      </header>

      <p className="prototype-note">
        画面設計用の土台です。デザインはこれから作成します。
      </p>

      <main id="main-content" className="app-main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
