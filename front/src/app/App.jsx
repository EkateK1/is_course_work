import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../shared/components/Layout.jsx';
import ProtectedRoute from '../shared/components/ProtectedRoute.jsx';
import { routes } from './routes.js';
import LoginPage from '../modules/LoginPage.jsx';
import FeedbackPage from '../modules/FeedbackPage.jsx';
import ForbiddenPage from '../modules/ForbiddenPage.jsx';

const App = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/feedback" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route element={<ProtectedRoute />}>
          {routes.map(route => (
            <Route key={route.path} path={route.path} element={<route.element />} />
          ))}
        </Route>
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="*" element={<Navigate to="/feedback" replace />} />
      </Routes>
    </Layout>
  );
};

export default App;
