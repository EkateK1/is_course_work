import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Permissions, Table, Roles } from '../domain/auth.js';
import { useCan } from '../shared/hooks/useCan.js';
import { useAuthStore } from '../app/store/authStore.js';
import { useSearchParams } from 'react-router-dom';
import { ErrorWindow } from '../shared/components/ErrorWindow.jsx';
import { extractErrorMessage, normalizeErrorMessage } from '../shared/utils/errorMessage.js';

const STATUS_OPTIONS = ['accepted', 'cooked', 'delivered'];

const statusLabels = {
  accepted: 'Принят',
  cooked: 'Приготовлен',
  delivered: 'Доставлен',
};

const nextStatus = {
  accepted: 'cooked',
  cooked: 'delivered',
  delivered: null,
};

const OrdersPage = () => {
  const { token, role } = useAuthStore();
  const queryClient = useQueryClient();
  const canCreate = useCan(Permissions.ORDERS_CREATE);
  const canChangeStatus = useCan(Permissions.ORDERS_STATUS_CHANGE);
  const canDelete = useCan(Permissions.ORDERS_DELETE) && role === Roles.ADMIN;
  const canEditGuest = role === Roles.ADMIN;
  const isAdmin = role === Roles.ADMIN;
  const [sort, setSort] = useState({ key: 'id', dir: 'asc' });
  const [searchParams, setSearchParams] = useSearchParams();
  const [tableFilter, setTableFilter] = useState('');
  const isWaiter = role === Roles.WAITER;
  const [startDate, setStartDate] = useState('');

  const API_BASE = import.meta.env.VITE_API_URL || '';
  const baseUrl = `${API_BASE}/order`;

  const fetcher = async (url, options = {}) => {
    const authToken = token && token !== 'demo-token' ? token : null;
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      ...options,
    });
    const text = await res.text();
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      throw new Error(extractErrorMessage(res, text));
    }
    if (!text) return null;
    if (contentType.includes('application/json')) {
      return JSON.parse(text);
    }
    throw new Error(
      `Expected JSON, got ${contentType || 'unknown content-type'}. Response: ${text.slice(0, 200)}`,
    );
  };

  const ordersQuery = useQuery({
    queryKey: ['orders', isWaiter ? tableFilter || 'none' : 'all'],
    queryFn: () => {
      if (isWaiter) {
        return fetcher(`${baseUrl}/get-orders-by-table/${tableFilter}`);
      }
      return fetcher(`${baseUrl}/get-all`);
    },
    enabled: !isWaiter || !!tableFilter,
  });

  const dishesQuery = useQuery({
    queryKey: ['dishes'],
    queryFn: () => fetcher(`${API_BASE}/dish/get-all`),
  });

  const [createModal, setCreateModal] = useState(false);
  const [createModalError, setCreateModalError] = useState('');
  const [form, setForm] = useState({ table: Table.T1, guest: '', dishId: '', status: 'accepted' });
  const [statusError, setStatusError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const getAllowedStatuses = current => {
    const next = nextStatus[current];
    return next ? [current, next] : [current];
  };

  const createMutation = useMutation({
    mutationFn: payload => fetcher(`${baseUrl}/create`, { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      fetcher(`${baseUrl}/change-status/${id}?status=${encodeURIComponent(status)}`, {
        method: 'POST',
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: id => fetcher(`${baseUrl}/delete/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  const guestMutation = useMutation({
    mutationFn: ({ id, guest }) =>
      fetcher(`${baseUrl}/modify/${id}`, { method: 'PUT', body: JSON.stringify({ guest }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  const loadError = ordersQuery.isError
    ? String(ordersQuery.error?.message || '').toLowerCase().includes('forbidden') ||
      String(ordersQuery.error?.message || '').includes('403')
      ? 'У вас нет доступа к этому списку заказов. Используйте работу через столы/модалки.'
      : `Ошибка загрузки заказов: ${ordersQuery.error?.message || ''}`
    : null;

  const ordersRaw = ordersQuery.data || [];
  const orders = Array.isArray(ordersRaw) ? ordersRaw : ordersRaw.orders || [];
  const normalizedOrders = orders.map(o => ({
    id: o.id,
    table: o.journalLog?.tableNumber || o.table || '',
    guest: String(o.guestNumber ?? o.guest ?? ''),
    guestNumber: o.guestNumber ?? o.guest ?? '',
    status: o.orderStatus || o.status || 'accepted',
    dish: o.dish?.name || '',
    dishKitchen: o.dish?.kitchen ?? false,
    dishBar: o.dish?.kitchen === false,
    time: o.time,
  }));

  const updateOrdersCache = updater => {
    queryClient.setQueryData(['orders'], old => {
      const current = Array.isArray(old) ? old : [];
      return updater(current);
    });
  };

  const handleStatusChange = (orderId, status) => {
    if (!canChangeStatus) return;
    const currentOrder = normalizedOrders.find(o => o.id === orderId);
    if (!currentOrder) return;
    const previousStatus = currentOrder.status;
    const allowed = getAllowedStatuses(currentOrder.status);
    if (!allowed.includes(status)) return;
    setStatusError('');
    updateOrdersCache(prev => prev.map(o => (o.id === orderId ? { ...o, status, orderStatus: status } : o)));
    statusMutation.mutate(
      { id: orderId, status },
      {
        onError: err => {
          setStatusError(normalizeErrorMessage(err.message));
          updateOrdersCache(prev =>
            prev.map(o => (o.id === orderId ? { ...o, status: previousStatus, orderStatus: previousStatus } : o)),
          );
        },
        onSuccess: () => {
          setStatusError('');
        },
      },
    );
  };

  const handleDelete = orderId => {
    if (!canDelete) return;
    const deletedOrder = normalizedOrders.find(o => o.id === orderId);
    setDeleteError('');
    updateOrdersCache(prev => prev.filter(o => o.id !== orderId));
    deleteMutation.mutate(orderId, {
      onError: err => {
        setDeleteError(normalizeErrorMessage(err.message) || 'Не удалось удалить заказ');
        if (deletedOrder) {
          updateOrdersCache(prev => [...prev, deletedOrder]);
        } else {
          ordersQuery.refetch();
        }
      },
    });
  };

  const handleGuestEdit = (orderId, guest) => {
    if (!canEditGuest) return;
    const value = guest === '' ? '' : Number(guest);
    updateOrdersCache(prev =>
      prev.map(o => (o.id === orderId ? { ...o, guest: String(guest), guestNumber: value } : o)),
    );
    guestMutation.mutate({ id: orderId, guest: value });
  };

  const handleCreateOrder = e => {
    e.preventDefault();
    if (!form.guest.trim()) {
      setCreateModalError('Укажите номер гостя.');
      return;
    }
    if (!form.dishId) {
      setCreateModalError('Выберите блюдо.');
      return;
    }
    setCreateModalError('');
    createMutation.mutate(
      {
        tableNumber: form.table,
        guestNumber: Number(form.guest),
        dishId: Number(form.dishId),
      },
      {
        onSuccess: () => {
          setCreateModal(false);
          setForm({
            table: tableFilter || Table.T1,
            guest: '',
            dishId: '',
            status: 'accepted',
          });
          setCreateModalError('');
        },
        onError: err => {
          setCreateModalError(normalizeErrorMessage(err.message) || 'Не удалось создать заказ');
        },
      },
    );
  };

  const sortedOrders = [...normalizedOrders].sort((a, b) => {
    const va = a?.[sort.key];
    const vb = b?.[sort.key];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    const numA = typeof va === 'number' ? va : Number(va);
    const numB = typeof vb === 'number' ? vb : Number(vb);
    const bothNum = !Number.isNaN(numA) && !Number.isNaN(numB) && va !== '' && vb !== '';
    const cmp = bothNum ? numA - numB : String(va).localeCompare(String(vb), 'ru', { sensitivity: 'base' });
    return sort.dir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = key => {
    setSort(prev => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const header = (label, key) => (
    <button
      onClick={() => toggleSort(key)}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontWeight: 600,
      }}
    >
      {label}
      <span style={{ fontSize: 11, color: '#666' }}>{sort.key === key ? (sort.dir === 'asc' ? '^' : 'v') : ''}</span>
    </button>
  );

  useEffect(() => {
    const tableParam = searchParams.get('table');
    const createParam = searchParams.get('create');
    if (tableParam) {
      setForm(prev => ({ ...prev, table: tableParam }));
      setTableFilter(tableParam);
    }
    if (createParam === '1') {
      setCreateModal(true);
      setCreateModalError('');
      setSearchParams(prev => {
        const p = new URLSearchParams(prev);
        p.delete('create');
        return p;
      });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!tableFilter) return;
    setForm(prev => (prev.table === tableFilter ? prev : { ...prev, table: tableFilter }));
  }, [tableFilter]);

  if (ordersQuery.isLoading) return <div>Загрузка заказов...</div>;

  const startDateValue = startDate ? new Date(startDate) : null;
  if (startDateValue) startDateValue.setHours(0, 0, 0, 0);

  const filteredOrders = sortedOrders.filter(order => {
    const matchesTable = tableFilter ? order.table === tableFilter : true;
    if (!matchesTable) return false;
    if (!isAdmin || !startDateValue) return true;
    if (!order.time) return false;
    const orderDate = new Date(order.time * 1000);
    return orderDate >= startDateValue;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Заказы</h1>
        {canCreate && (
          <button
            className="btn-create"
            onClick={() => {
              setCreateModal(true);
              setCreateModalError('');
              if (tableFilter) {
                setForm(prev => ({ ...prev, table: tableFilter }));
              }
            }}
          >
            Создать заказ
          </button>
        )}
      </div>
      {loadError && (
        <ErrorWindow
          title="Не удалось загрузить заказы"
          message={loadError}
          onRetry={ordersQuery.refetch}
          style={{ marginBottom: 8 }}
        />
      )}
      {isWaiter && !tableFilter && (
        <div style={{ marginBottom: 8, color: '#666' }}>
          Выберите стол, чтобы увидеть связанные с ним заказы.
        </div>
      )}
      {statusError && (
        <ErrorWindow
          title="Не удалось изменить статус"
          message={statusError}
          style={{ marginBottom: 8 }}
        />
      )}
      {deleteError && (
        <ErrorWindow
          title="Не удалось удалить заказ"
          message={deleteError}
          style={{ marginBottom: 8 }}
        />
      )}
      <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 14 }}>
          Стол:
          <select
            value={tableFilter}
            onChange={e => setTableFilter(e.target.value)}
            style={{ marginLeft: 6, padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc' }}
          >
            <option value="">Все</option>
            {Object.values(Table).map(t => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        {isAdmin && (
          <label style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            Показать с:
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc' }}
              max={new Date().toISOString().slice(0, 10)}
            />
          </label>
        )}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: '8px 6px' }}>{header('ID', 'id')}</th>
              <th style={{ padding: '8px 6px' }}>{header('Стол', 'table')}</th>
              <th style={{ padding: '8px 6px' }}>{header('Гость №', 'guestNumber')}</th>
              <th style={{ padding: '8px 6px' }}>{header('Блюдо', 'dish')}</th>
              <th style={{ padding: '8px 6px' }}>{header('Время', 'time')}</th>
              <th style={{ padding: '8px 6px' }}>{header('Статус', 'status')}</th>
              <th style={{ padding: '8px 6px', width: 180 }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
                <tr key={order.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px 6px', fontSize: 12, color: '#666' }}>{order.id}</td>
                  <td style={{ padding: '8px 6px' }}>{order.table}</td>
                  <td style={{ padding: '8px 6px' }}>
                    <input
                      value={order.guest}
                      onChange={e => handleGuestEdit(order.id, e.target.value)}
                      disabled={!canEditGuest}
                      type="number"
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc' }}
                    />
                  </td>
                  <td style={{ padding: '8px 6px' }}>{order.dish || '-'}</td>
                  <td style={{ padding: '8px 6px', fontSize: 12, color: '#666' }}>
                    {order.time ? new Date(order.time * 1000).toLocaleString() : '-'}
                  </td>
                  <td style={{ padding: '8px 6px' }}>
                    <select
                      value={order.status}
                      onChange={e => handleStatusChange(order.id, e.target.value)}
                      disabled={!canChangeStatus || order.status === 'delivered'}
                      style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc' }}
                    >
                      {getAllowedStatuses(order.status).map(s => (
                        <option key={s} value={s}>
                          {statusLabels[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '8px 6px', display: 'flex', gap: 8 }}>
                    <button className="btn-danger" onClick={() => handleDelete(order.id)} disabled={!canDelete}>
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {filteredOrders.length === 0 && <div style={{ padding: 12 }}>Заказов пока нет.</div>}
      </div>

      {createModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 20,
              width: '100%',
              maxWidth: 420,
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Создать заказ</h3>
              <button
                onClick={() => {
                  setCreateModal(false);
                  setCreateModalError('');
                }}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#333' }}
              >
                X
              </button>
            </div>
            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                Стол
                <select
                  value={form.table}
                  onChange={e => setForm(prev => ({ ...prev, table: e.target.value }))}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ccc' }}
                >
                  {Object.values(Table).map(table => (
                    <option key={table} value={table}>
                      {table}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                Номер гостя
                <input
                  value={form.guest}
                  onChange={e => setForm(prev => ({ ...prev, guest: e.target.value }))}
                  placeholder="Например, 1"
                  type="number"
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ccc' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                Блюдо
                <select
                  value={form.dishId}
                  onChange={e => setForm(prev => ({ ...prev, dishId: e.target.value }))}
                  required
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ccc' }}
                >
                  <option value="">Выберите блюдо</option>
                  {(Array.isArray(dishesQuery.data) ? dishesQuery.data : dishesQuery.data?.dishes || []).map(dish => (
                    <option key={dish.id} value={dish.id}>
                      {dish.name} (ID: {dish.id})
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setCreateModal(false);
                    setCreateModalError('');
                  }}
                  style={{ padding: '8px 12px', borderRadius: 8 }}
                >
                  Отмена
                </button>
                <button type="submit" className="btn-create">
                  Создать
                </button>
              </div>
            </form>
            {createModalError && (
              <ErrorWindow
                title="Не удалось создать заказ"
                message={createModalError}
                style={{ marginTop: 8 }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
