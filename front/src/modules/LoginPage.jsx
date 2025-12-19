import "./styles/auth.css";
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Roles } from '../domain/auth.js';
import { useAuthStore } from '../app/store/authStore.js';
import { ErrorWindow } from '../shared/components/ErrorWindow.jsx';
import { extractErrorMessage, normalizeErrorMessage } from '../shared/utils/errorMessage.js';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore(state => state.setAuth);
  const [form, setForm] = useState({ id: '', code: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE = import.meta.env.VITE_API_URL || '';
  const AUTH_URL = import.meta.env.VITE_AUTH_URL || `${API_BASE}/auth/login`;

  const normalizeRole = raw => {
    if (!raw) return null;
    const key = String(raw).toUpperCase();
    const map = {
      ADMIN: Roles.ADMIN,
      WAITER: Roles.WAITER,
      BARMAN: Roles.BARMAN,
      BARTENDER: Roles.BARMAN,
      COOK: Roles.COOK,
      CHEF: Roles.COOK,
    };
    return map[key] || null;
  };

  const decodeJwtRole = tokenStr => {
    try {
      const payload = tokenStr.split('.')[1];
      if (!payload) return null;
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
      const json = JSON.parse(atob(normalized));
      const roleCandidate =
        json.role ||
        json.roles?.[0] ||
        json.positions ||
        json.position ||
        json.authorities?.[0] ||
        json.authority ||
        null;
      return normalizeRole(roleCandidate);
    } catch (e) {
      return null;
    }
  };

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(form.id), code: form.code }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(extractErrorMessage(res, text) || 'Ошибка авторизации');

      const contentType = res.headers.get('content-type') || '';
      let data = {};
      if (text) {
        if (contentType.includes('application/json')) {
          try {
            data = JSON.parse(text);
          } catch (parseErr) {
            data = { token: text.trim() };
          }
        } else {
          data = { token: text.trim() };
        }
      }

      const token = data.token || data.accessToken;
      const roleFromApi = normalizeRole(data.role || data.user?.role || data.user?.positions);
      const roleFromToken = token ? decodeJwtRole(token) : null;
      const role = roleFromApi || roleFromToken || Roles.WAITER;
      const user = data.user || { name: String(form.id) };
      if (!token) throw new Error('Токен не получен от сервера');
      setAuth({ token, user, role });
      const fallbackPath =
        role === Roles.BARMAN
          ? '/bar'
          : role === Roles.COOK
            ? '/kitchen'
            : role === Roles.WAITER
              ? '/tables'
              : '/dashboard';
      const from = location.state?.from?.pathname || fallbackPath;
      navigate(from, { replace: true });
    } catch (err) {
      setError(normalizeErrorMessage(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">

      <form onSubmit={handleSubmit} className="container">
        <h1>Вход</h1>
        <label className="textbox">
          ID сотрудника
          <input name="id" value={form.id} onChange={handleChange} required />
        </label>
        <label className="textbox">
          Код
          <input name="code" type="password" value={form.code} onChange={handleChange} required />
        </label>
        {error && (
          <ErrorWindow
            message={error}
            style={{ width: '100%' }}
          />
        )}
        <button type="submit" disabled={loading}>
          {loading ? 'Входим...' : 'Войти'}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
