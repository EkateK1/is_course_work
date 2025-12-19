import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Permissions } from '../domain/auth.js';
import { useCan } from '../shared/hooks/useCan.js';
import { useAuthStore } from '../app/store/authStore.js';
import { ErrorWindow } from '../shared/components/ErrorWindow.jsx';
import { extractErrorMessage, normalizeErrorMessage } from '../shared/utils/errorMessage.js';

const decodeSub = token => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const json = JSON.parse(atob(normalized));
    return json.sub ? Number(json.sub) : null;
  } catch {
    return null;
  }
};

const WalletPage = () => {
  const { token } = useAuthStore();
  const canView = useCan(Permissions.WALLET_VIEW);
  const queryClient = useQueryClient();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const API_BASE = import.meta.env.VITE_API_URL || '';
  const employeeId = useMemo(() => decodeSub(token), [token]);

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

  const balanceQuery = useQuery({
    queryKey: ['wallet', employeeId],
    queryFn: () => fetcher(`${API_BASE}/wallet/get-balance/${employeeId}`),
    enabled: canView && !!employeeId,
  });

  const withdrawMutation = useMutation({
    mutationFn: amount => fetcher(`${API_BASE}/wallet/withdraw/${amount}`, { method: 'GET' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wallet', employeeId] }),
  });

  if (!canView) return <div>Нет доступа к кошельку.</div>;
  if (!employeeId) return <div>Не удалось определить пользователя из токена.</div>;

  const balance = balanceQuery.data?.balance ?? balanceQuery.data?.Balance ?? balanceQuery.data ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1>Кошелек</h1>
      {balanceQuery.isLoading && <div>Загрузка баланса...</div>}
      {balanceQuery.isError && (
        <ErrorWindow
          title="Не удалось загрузить баланс"
          message={balanceQuery.error?.message || 'Повторите попытку позже.'}
          onRetry={balanceQuery.refetch}
        />
      )}
      {!balanceQuery.isLoading && !balanceQuery.isError && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Баланс: {balance != null ? `${balance}` : '-'}</div>
          <div style={{ fontSize: 12, color: '#666' }}>ID сотрудника: {employeeId}</div>
        </div>
      )}

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, maxWidth: 320, background: '#fff' }}>
        <h3 style={{ marginTop: 0 }}>Снять средства</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            type="number"
            placeholder="Сумма"
            value={withdrawAmount}
            onChange={e => setWithdrawAmount(e.target.value)}
            style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc' }}
          />
          <button
            onClick={() => {
              setError('');
              setMessage('');
              if (!withdrawAmount) {
                setError('Введите сумму');
                return;
              }
              withdrawMutation.mutate(Number(withdrawAmount), {
                onError: err => setError(normalizeErrorMessage(err.message)),
                onSuccess: data => {
                  setMessage(`Снято: ${withdrawAmount}`);
                  setWithdrawAmount('');
                },
              });
            }}
            disabled={withdrawMutation.isLoading}
          >
            {withdrawMutation.isLoading ? 'Выполняется...' : 'Снять'}
          </button>
          {error && (
            <ErrorWindow
              title="Ошибка операции"
              message={error}
              style={{ marginTop: 4 }}
            />
          )}
          {message && <div style={{ color: 'green' }}>{message}</div>}
        </div>
      </div>
    </div>
  );
};

export default WalletPage;
