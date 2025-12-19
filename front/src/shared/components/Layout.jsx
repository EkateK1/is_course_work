import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../app/store/authStore.js';
import { getVisibleRoutes } from '../../app/routes.js';
import { can } from '../../domain/auth.js';

const Layout = ({ children }) => {
  const location = useLocation();
  const { role, clearAuth, token } = useAuthStore();

  const visibleRoutes = getVisibleRoutes(role).filter(r => {
    if (!r.permissions || r.permissions.length === 0) return true;
    return r.permissions.some(p => can(role, p));
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          background: '#f6f6f6',
          borderBottom: '1px solid #ddd',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h2 style={{ margin: 0 }}>КИПЕР</h2>
          {token ? (
            <nav style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {visibleRoutes.map(route => (
                <Link
                  key={route.path}
                  to={route.path}
                  style={{
                    color: location.pathname === route.path ? '#111' : '#333',
                    fontWeight: location.pathname === route.path ? 700 : 500,
                    textDecoration: 'none',
                    padding: '6px 10px',
                    borderRadius: 6,
                    backgroundColor: location.pathname === route.path ? '#e0e0e0' : 'transparent',
                  }}
                >
                  {route.label || route.path.replace('/', '') || 'route'}
                </Link>
              ))}
            </nav>
          ) : (
            <nav style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link to="/login">Вход</Link>
              <Link to="/feedback">Отзыв</Link>
            </nav>
          )}
        </div>
        {token && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#555' }}>Роль: {role || 'n/a'}</span>
            <button onClick={clearAuth}>Выйти</button>
          </div>
        )}
      </header>
      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
};

export default Layout;
