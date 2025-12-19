import React, { useState } from 'react';
import { Permissions } from '../domain/auth.js';
import { useCan } from '../shared/hooks/useCan.js';
import { useAuthStore } from '../app/store/authStore.js';
import { ErrorWindow } from '../shared/components/ErrorWindow.jsx';
import { extractErrorMessage, normalizeErrorMessage } from '../shared/utils/errorMessage.js';

const BillsPage = () => {
  const canCreate = useCan(Permissions.BILLS_CREATE);
  const { token } = useAuthStore();
  const [createForm, setCreateForm] = useState({ tableNumber: 'T1', guestNumber: '', birthday: false });
  const [payId, setPayId] = useState('');
  const [getId, setGetId] = useState('');
  const [getBirthday, setGetBirthday] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || '';
  const baseUrl = `${API_BASE}/bills`;

  const fetcher = async (url, options = {}) => {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...options,
    });
    const text = await res.text();
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) throw new Error(extractErrorMessage(res, text));
    if (!text) return null;
    if (contentType.includes('application/json')) return JSON.parse(text);
    return text;
  };

  if (!canCreate) return <div>Нет доступа к счетам.</div>;

  const handleCreate = async e => {
    e.preventDefault();
    setError('');
    setResult('');
    setLoading(true);
    try {
      const payload = {
        tableNumber: createForm.tableNumber,
        guestNumber: Number(createForm.guestNumber),
        birthday: Boolean(createForm.birthday),
      };
      const data = await fetcher(`${baseUrl}/create`, { method: 'POST', body: JSON.stringify(payload) });
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(normalizeErrorMessage(err.message));
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async e => {
    e.preventDefault();
    if (!payId) return;
    setError('');
    setResult('');
    setLoading(true);
    try {
      const data = await fetcher(`${baseUrl}/pay/${payId}`, { method: 'POST' });
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(normalizeErrorMessage(err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGet = async e => {
    e.preventDefault();
    if (!getId) return;
    setError('');
    setResult('');
    setLoading(true);
    try {
      const data = await fetcher(`${baseUrl}/${getId}?birthday=${getBirthday}`);
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(normalizeErrorMessage(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Счета</h1>
      <p>Создание, просмотр и оплата счетов.</p>
      {loading && <div>Выполняется запрос...</div>}
      {error && (
        <ErrorWindow
          title="Ошибка запроса"
          message={error}
          style={{ marginTop: 8 }}
        />
      )}
      {result && (
        <pre
          style={{
            background: '#f6f6f6',
            padding: 12,
            borderRadius: 8,
            fontSize: 12,
            overflowX: 'auto',
          }}
        >
          {result}
        </pre>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 16 }}>
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Создать счет</h3>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              Стол
              <select
                value={createForm.tableNumber}
                onChange={e => setCreateForm(prev => ({ ...prev, tableNumber: e.target.value }))}
                style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc' }}
              >
                {['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10'].map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              Номер гостя
              <input
                type="number"
                value={createForm.guestNumber}
                onChange={e => setCreateForm(prev => ({ ...prev, guestNumber: e.target.value }))}
                required
                style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc' }}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={createForm.birthday}
                onChange={e => setCreateForm(prev => ({ ...prev, birthday: e.target.checked }))}
              />
              День рождения
            </label>
            <button type="submit" className="btn-create" disabled={loading}>
              Создать
            </button>
          </form>
        </div>

        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Получить счет</h3>
          <form onSubmit={handleGet} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              ID счета
              <input
                type="number"
                value={getId}
                onChange={e => setGetId(e.target.value)}
                required
                style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc' }}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={getBirthday}
                onChange={e => setGetBirthday(e.target.checked)}
              />
              День рождения
            </label>
            <button type="submit" disabled={loading}>
              Получить
            </button>
          </form>
        </div>

        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Оплатить счет</h3>
          <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              ID счета
              <input
                type="number"
                value={payId}
                onChange={e => setPayId(e.target.value)}
                required
                style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc' }}
              />
            </label>
            <button type="submit" disabled={loading}>
              Оплатить
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BillsPage;
