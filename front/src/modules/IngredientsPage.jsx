import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Permissions, Roles } from '../domain/auth.js';
import { useCan } from '../shared/hooks/useCan.js';
import { useAuthStore } from '../app/store/authStore.js';
import { ErrorWindow } from '../shared/components/ErrorWindow.jsx';
import { extractErrorMessage, normalizeErrorMessage } from '../shared/utils/errorMessage.js';

const IngredientsPage = () => {
  const { token, role } = useAuthStore();
  const canView = useCan(Permissions.INGREDIENTS_VIEW);
  const isAdmin = role === Roles.ADMIN;
  const isCook = role === Roles.COOK;
  const canIncreaseAmount = isAdmin || isCook;
  const queryClient = useQueryClient();
  const [dishId, setDishId] = useState('');
  const [dishIngredients, setDishIngredients] = useState(null);
  const [createForm, setCreateForm] = useState({ name: '', amount: '', price: '' });
  const [actionError, setActionError] = useState('');
  const [sort, setSort] = React.useState({ key: 'id', dir: 'asc' });
  const [createModal, setCreateModal] = useState(false);
  const [actionModal, setActionModal] = useState({ open: false, mode: null, ing: null });
  const [actionForm, setActionForm] = useState({ name: '', amount: '', price: '', unit: '' });

  const API_BASE = import.meta.env.VITE_API_URL || '';
  const baseUrl = `${API_BASE}/ingredient`;

  const invalidateIngredients = () => {
    queryClient.invalidateQueries({ queryKey: ['ingredients'] });
  };

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
    if (!text) return [];
    if (contentType.includes('application/json')) return JSON.parse(text);
    throw new Error(`Ожидался JSON, получено: ${contentType || 'unknown'}`);
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => fetcher(`${baseUrl}/get-all`),
    enabled: canView,
  });

  const createMutation = useMutation({
    mutationFn: payload => fetcher(`${baseUrl}/create`, { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => invalidateIngredients(),
  });

  const modifyMutation = useMutation({
    mutationFn: payload => fetcher(`${baseUrl}/modify`, { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => invalidateIngredients(),
  });

  const deleteMutation = useMutation({
    mutationFn: id => fetcher(`${baseUrl}/delete/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateIngredients(),
  });

  const increaseMutation = useMutation({
    mutationFn: payload => fetcher(`${baseUrl}/increase-amount`, { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => invalidateIngredients(),
  });

  if (!canView) return <div>Нет доступа к ингредиентам.</div>;
  if (isLoading) return <div>Загрузка ингредиентов...</div>;
  if (isError) {
    return (
      <div>
        <h1>Ингредиенты</h1>
        <ErrorWindow
          message={`Ошибка загрузки ингредиентов: ${error?.message || 'Попробуйте обновить страницу.'}`}
          onRetry={refetch}
          style={{ marginTop: 12 }}
        />
      </div>
    );
  }

  const normalize = item => ({
    id: item.id,
    name: item.name || item.title || '',
    amount: item.amount ?? item.quantity ?? item.qty ?? '',
    unit: item.unit || item.measure || item.unitName || '-',
    price: item.price ?? item.cost ?? item.primeCost ?? item.costPerUnit ?? item.amountCost ?? null,
    cost: item.cost ?? item.price ?? item.primeCost ?? item.costPerUnit ?? item.amountCost ?? null,
  });

  const ingredients = (Array.isArray(data) ? data : data?.ingredients || []).map(normalize);
  const sortedIngredients = [...ingredients].sort((a, b) => {
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

  const handleRowEdit = ing => {
    if (!isAdmin) return;
    setActionError('');
    setActionModal({ open: true, mode: 'edit', ing });
    setActionForm({
      name: ing.name ?? '',
      amount: ing.amount ?? '',
      price: ing.price ?? ing.cost ?? '',
      unit: ing.unit ?? '',
    });
  };

  const handleRowIncrease = ing => {
    if (!canIncreaseAmount) return;
    setActionError('');
    setActionModal({ open: true, mode: 'increase', ing });
    setActionForm({
      name: ing.name ?? '',
      amount: '',
      price: ing.price ?? ing.cost ?? '',
      unit: ing.unit ?? '',
    });
  };

  return (
    <>
      <div>
        <h1>Ингредиенты</h1>

        {isAdmin && (
          <div style={{ textAlign: 'right', marginBottom: 12 }}>
            <button
              className="btn-create"
              onClick={() => {
                setActionError('');
                setCreateModal(true);
              }}
            >
              Создать ингредиент
            </button>
          </div>
        )}
      {actionError && (
        <ErrorWindow
          title="Не удалось выполнить действие"
          message={actionError}
          style={{ marginBottom: 12 }}
        />
      )}
      <div style={{ marginTop: 16, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: '8px 6px' }}>{header('ID', 'id')}</th>
              <th style={{ padding: '8px 6px' }}>{header('Название', 'name')}</th>
              <th style={{ padding: '8px 6px' }}>{header('Количество', 'amount')}</th>
              <th style={{ padding: '8px 6px' }}>{header('Цена', 'price')}</th>
              {(isAdmin || isCook) && <th style={{ padding: '8px 6px', width: 380 }}>Действия</th>}
            </tr>
          </thead>
          <tbody>
            {sortedIngredients.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px 6px', fontSize: 12, color: '#666' }}>{item.id}</td>
                <td style={{ padding: '8px 6px' }}>{item.name}</td>
                <td style={{ padding: '8px 6px' }}>{item.amount || item.amount === 0 ? item.amount : '-'}</td>
                <td style={{ padding: '8px 6px' }}>{item.price || item.price === 0 ? item.price : '-'}</td>
                {(isAdmin || isCook) && (
                  <td style={{ padding: '8px 6px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {isAdmin && (
                        <button
                          className="btn-edit"
                          onClick={() => handleRowEdit(item)}
                          style={{ padding: '6px 8px' }}
                        >
                          Изменить
                        </button>
                      )}
                      <button className="btn-create" onClick={() => handleRowIncrease(item)} style={{ padding: '6px 8px' }}>
                        Пополнить
                      </button>
                      {isAdmin && (
                        <button
                          className="btn-danger"
                          onClick={() => {
                            setActionError('');
                            deleteMutation.mutate(item.id, {
                              onError: err => setActionError(normalizeErrorMessage(err.message)),
                            });
                          }}
                          style={{ padding: '6px 8px' }}
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {ingredients.length === 0 && (
              <tr>
                <td colSpan={isAdmin || isCook ? 5 : 4} style={{ padding: 12 }}>
                  Ингредиенты отсутствуют.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
              <h3 style={{ margin: 0 }}>Создать ингредиент</h3>
              <button
                onClick={() => setCreateModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#333' }}
              >
                X
              </button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                setActionError('');
                createMutation.mutate(
                  { name: createForm.name, amount: Number(createForm.amount), price: Number(createForm.price) },
                  {
        onError: err => setActionError(normalizeErrorMessage(err.message)),
                    onSuccess: () => {
                      setCreateForm({ name: '', amount: '', price: '' });
                      setCreateModal(false);
                    },
                  },
                );
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Название
                <input
                  placeholder="Например, Мука"
                  value={createForm.name}
                  onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ccc' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Количество
                <input
                  placeholder="Количество"
                  type="number"
                  value={createForm.amount}
                  onChange={e => setCreateForm(prev => ({ ...prev, amount: e.target.value }))}
                  required
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ccc' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Цена (price_per_100g)
                <input
                  placeholder="Например, 100"
                  type="number"
                  value={createForm.price}
                  onChange={e => setCreateForm(prev => ({ ...prev, price: e.target.value }))}
                  required
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ccc' }}
                />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => setCreateModal(false)} style={{ padding: '8px 12px', borderRadius: 8 }}>
                  Отмена
                </button>
                <button type="submit" className="btn-create" disabled={createMutation.isLoading}>
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {(isAdmin || isCook) && actionModal.open && (
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
              <h3 style={{ margin: 0 }}>
                {actionModal.mode === 'edit' && 'Изменить ингредиент'}
                {actionModal.mode === 'increase' && 'Пополнить'}
              </h3>
              <button
                onClick={() => setActionModal({ open: false, mode: null, ing: null })}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#333' }}
              >
                X
              </button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                setActionError('');
                const id = Number(actionModal.ing.id);
                if (actionModal.mode === 'edit') {
                  if (!isAdmin) {
                    setActionError('Недостаточно прав для изменения ингредиента');
                    return;
                  }
                  const amount = Number(actionForm.amount);
                  const price = Number(actionForm.price);
                  if (Number.isNaN(amount) || Number.isNaN(price)) {
                    setActionError('Количество и цена должны быть числом');
                    return;
                  }
                  modifyMutation.mutate(
                    { id, name: actionForm.name, amount, price },
                    {
        onError: err => setActionError(normalizeErrorMessage(err.message)),
                      onSuccess: () => {
                        setActionModal({ open: false, mode: null, ing: null });
                      },
                    },
                  );
                } else if (actionModal.mode === 'increase') {
                  if (!canIncreaseAmount) {
                    setActionError('Недостаточно прав для изменения количества');
                    return;
                  }
                  const delta = Number(actionForm.amount);
                  if (Number.isNaN(delta)) {
                    setActionError('Введите число для пополнения');
                    return;
                  }
                  increaseMutation.mutate(
                    { id, amount: delta },
                    {
                      onError: err => setActionError(normalizeErrorMessage(err.message)),
                      onSuccess: () => {
                        setActionModal({ open: false, mode: null, ing: null });
                      },
                    },
                  );
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
            >
              {actionModal.mode === 'edit' && (
                <>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    Название
                    <input
                      value={actionForm.name}
                      onChange={e => setActionForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ccc' }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    Количество
                    <input
                      type="number"
                      value={actionForm.amount}
                      onChange={e => setActionForm(prev => ({ ...prev, amount: e.target.value }))}
                      required
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ccc' }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    Цена (price_per_100g)
                    <input
                      type="number"
                      value={actionForm.price}
                      onChange={e => setActionForm(prev => ({ ...prev, price: e.target.value }))}
                      required
                      style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ccc' }}
                    />
                  </label>
                </>
              )}
              {actionModal.mode === 'increase' && (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  Сколько добавить
                  <input
                    type="number"
                    value={actionForm.amount}
                    onChange={e => setActionForm(prev => ({ ...prev, amount: e.target.value }))}
                    required
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ccc' }}
                  />
                </label>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setActionModal({ open: false, mode: null, ing: null })}
                  style={{ padding: '8px 12px', borderRadius: 8 }}
                >
                  Отмена
                </button>
                <button type="submit" disabled={modifyMutation.isLoading || increaseMutation.isLoading}>
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default IngredientsPage;
