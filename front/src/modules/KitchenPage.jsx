import React, { useEffect, useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Permissions } from '../domain/auth.js';
import { useCan } from '../shared/hooks/useCan.js';
import { useAuthStore } from '../app/store/authStore.js';
import { ErrorWindow } from '../shared/components/ErrorWindow.jsx';
import { extractErrorMessage } from '../shared/utils/errorMessage.js';

const KitchenPage = () => {
  const allowed = useCan(Permissions.KITCHEN_ORDERS_VIEW);
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [buttonStates, setButtonStates] = useState(() => ({}));

  const API_BASE = import.meta.env.VITE_API_URL || '';
  const baseUrl = `${API_BASE}/order`;

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
    throw new Error(`Expected JSON, got ${contentType || 'unknown content-type'}`);
  };

  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: () => fetcher(`${baseUrl}/get-all`),
    enabled: allowed,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      fetcher(`${baseUrl}/change-status/${id}?status=${encodeURIComponent(status)}`, {
        method: 'POST',
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  const orders = Array.isArray(ordersQuery.data) ? ordersQuery.data : ordersQuery.data?.orders || [];
  const kitchenOrders = useMemo(
    () => orders.filter(o => o.dish?.kitchen && (o.orderStatus || o.status) === 'accepted'),
    [orders],
  );

  useEffect(() => {
    setButtonStates(prev => {
      const next = { ...prev };
      let changed = false;
      kitchenOrders.forEach(order => {
        if (!(order.id in next)) {
          next[order.id] = false;
          changed = true;
        }
      });
      Object.keys(next).forEach(id => {
        if (!kitchenOrders.some(order => order.id === Number(id))) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [kitchenOrders]);

  const handleCooked = id => {
    setButtonStates(prev => ({ ...prev, [id]: true }));
    statusMutation.mutate({ id, status: 'cooked' });
  };

  if (!allowed) return <div>Нет доступа к кухне.</div>;
  if (ordersQuery.isLoading) return <div>Загрузка кухонных заказов...</div>;
  if (ordersQuery.isError) {
    return (
      <div>
        <h1>Кухня</h1>
        <ErrorWindow
          message={`Ошибка загрузки: ${ordersQuery.error?.message || 'Попробуйте обновить страницу.'}`}
          onRetry={ordersQuery.refetch}
          style={{ marginTop: 12 }}
        />
      </div>
    );
  }

  return (
    <div>
      <h1>Кухня</h1>
     {kitchenOrders.length === 0 ? (
        <div>Заказов со статусом accepted нет.</div>
      ) : (
        <div style={{ marginTop: 12, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                <th style={{ padding: '8px 6px' }}>ID</th>
                <th style={{ padding: '8px 6px' }}>Стол</th>
                <th style={{ padding: '8px 6px' }}>Гость</th>
                <th style={{ padding: '8px 6px' }}>Блюдо</th>
                <th style={{ padding: '8px 6px' }}>Время</th>
                <th style={{ padding: '8px 6px' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {kitchenOrders.map(order => (
                <tr key={order.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px 6px', fontSize: 12, color: '#666' }}>{order.id}</td>
                  <td style={{ padding: '8px 6px' }}>{order.journalLog?.tableNumber || order.table || '-'}</td>
                  <td style={{ padding: '8px 6px' }}>{order.guestNumber ?? order.guest ?? '-'}</td>
                  <td style={{ padding: '8px 6px' }}>{order.dish?.name || '-'}</td>
                  <td style={{ padding: '8px 6px', fontSize: 12, color: '#666' }}>
                    {order.time ? new Date(order.time * 1000).toLocaleString() : '-'}
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    <button
                      onClick={() => handleCooked(order.id)}
                      disabled={statusMutation.isLoading}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: `1px solid ${buttonStates[order.id] ? '#2ecc71' : '#e74c3c'}`,
                        background: buttonStates[order.id] ? '#2ecc71' : '#e74c3c',
                        color: '#fff',
                        cursor: statusMutation.isLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {buttonStates[order.id] ? 'Готово' : 'Готовится'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default KitchenPage;
