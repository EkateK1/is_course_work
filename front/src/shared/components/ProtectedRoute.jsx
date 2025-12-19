import React from 'react';
import { Navigate, Outlet, useLocation, matchPath } from 'react-router-dom';
import { useAuthStore } from '../../app/store/authStore.js';
import { can } from '../../domain/auth.js';
import { routes } from '../../app/routes.js';

const ProtectedRoute = () => {
  const location = useLocation();
  const { token, role } = useAuthStore();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const matchedRoute = routes.find(r => matchPath(r.path, location.pathname));
  const allowed =
    !matchedRoute?.permissions ||
    matchedRoute.permissions.length === 0 ||
    matchedRoute.permissions.some(p => can(role, p));

  return allowed ? <Outlet /> : <Navigate to="/forbidden" replace />;
};

export default ProtectedRoute;
