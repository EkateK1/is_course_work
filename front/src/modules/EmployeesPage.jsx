import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Permissions } from '../domain/auth.js';
import { useCan } from '../shared/hooks/useCan.js';
import { useAuthStore } from '../app/store/authStore.js';
import { ErrorWindow } from '../shared/components/ErrorWindow.jsx';
import { extractErrorMessage, normalizeErrorMessage } from '../shared/utils/errorMessage.js';

const EmployeesPage = () => {
  const canEdit = useCan(Permissions.EMPLOYEES_EDIT);
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [editModal, setEditModal] = useState({ open: false, employee: null });
  const [createModal, setCreateModal] = useState(false);
  const [createModalError, setCreateModalError] = useState('');
  const [filter, setFilter] = useState({ search: '', position: '' });
  const [form, setForm] = useState({
    id: '',
    name: '',
    patronymic: '',
    secondName: '',
    positions: '',
    sex: '',
    birthDate: '',
  });
  const [createForm, setCreateForm] = useState({
    name: '',
    patronymic: '',
    secondName: '',
    positions: '',
    birthDate: '',
    sex: '',
  });
  const [error, setError] = useState('');
  const [lastCreatedCredentials, setLastCreatedCredentials] = useState(null);

  const API_BASE = import.meta.env.VITE_API_URL || '';
  const baseUrl = `${API_BASE}/employee`;

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

  const employeesQuery = useQuery({
    queryKey: ['employees'],
    queryFn: () => fetcher(`${baseUrl}/get-all`),
    enabled: canEdit,
  });

  const deleteMutation = useMutation({
    mutationFn: id => fetcher(`${baseUrl}/delete/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
    onError: err => setError(normalizeErrorMessage(err.message)),
  });

  const modifyMutation = useMutation({
    mutationFn: payload => fetcher(`${baseUrl}/modify`, { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  });

  const createMutation = useMutation({
    mutationFn: payload => fetcher(`${API_BASE}/auth/register`, { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      const parsed = data && typeof data === 'object' ? data : { message: data };
      setLastCreatedCredentials(parsed);
    },
  });

  const normalizeSex = val => {
    const v = typeof val === 'string' ? val.trim() : '';
    if (v.toUpperCase() === 'M') return 'M';
    if (v.toUpperCase() === 'F') return 'F';
    return undefined;
  };

  const formatBirthForDisplay = birth => {
    if (!birth) return '';
    if (typeof birth === 'string') {
      const digits = birth.replace(/\D/g, '');
      if (digits.length === 8) {
        const y = digits.slice(0, 4);
        const m = digits.slice(4, 6);
        const d = digits.slice(6, 8);
        return `${y}-${m}-${d}`;
      }
      return birth;
    }
    if (Array.isArray(birth) && birth.length >= 3) {
      return `${birth[0]}-${String(birth[1]).padStart(2, '0')}-${String(birth[2]).padStart(2, '0')}`;
    }
    return String(birth);
  };

  const normalized = useMemo(() => {
    const list = Array.isArray(employeesQuery.data) ? employeesQuery.data : employeesQuery.data?.employees || [];
    const mapped = list.map(emp => ({
      id: emp.id,
      name: emp.name || '',
      patronymic: emp.patronymic || '',
      secondName: emp.secondName || '',
      positions: emp.positions || '',
      sex: emp.sex || emp.gender || emp.sex?.code || emp.sex?.name || '',
      birthDate: emp.birthDate || emp.birthdate || emp.birth_date || emp.birth || '',
      birthDisplay: formatBirthForDisplay(emp.birthDate || emp.birthdate || emp.birth_date || emp.birth || ''),
      password: '',
      original: emp,
    }));
    return mapped
      .filter(emp => {
        const query = filter.search.trim().toLowerCase();
        if (!query) return true;
        return (
          emp.name.toLowerCase().includes(query) ||
          emp.secondName.toLowerCase().includes(query) ||
          emp.patronymic.toLowerCase().includes(query) ||
          String(emp.id).includes(query)
        );
      })
      .filter(emp => (filter.position ? emp.positions === filter.position : true));
  }, [employeesQuery.data, filter]);

  const openEdit = emp => {
    setError('');
    setForm({
      id: emp.id,
      name: emp.name || '',
      patronymic: emp.patronymic || '',
      secondName: emp.secondName || '',
      positions: emp.positions || '',
      sex: emp.sex || emp.gender || emp.sex?.code || emp.sex?.name || '',
      birthDate: emp.birthDate || emp.birthdate || emp.birth_date || emp.birth || '',
      original: emp,
    });
    setEditModal({ open: true, employee: emp });
  };

  const closeEdit = () => {
    setEditModal({ open: false, employee: null });
    setForm({
      id: '',
      name: '',
      patronymic: '',
      secondName: '',
      positions: '',
      sex: '',
      birthDate: '',
    });
  };

  const submitEdit = e => {
    e.preventDefault();
    if (!form.id) return;
    setError('');
    const payload = {
      id: Number(form.id),
      name: form.name,
      patronymic: form.patronymic,
      secondName: form.secondName,
      positions: form.positions,
      sex: form.sex || undefined,
      birthDate: form.birthDate || undefined,
    };
    modifyMutation.mutate(payload, {
      onError: err => setError(normalizeErrorMessage(err.message)),
      onSuccess: () => {
        closeEdit();
      },
    });
  };

  const submitCreate = e => {
    e.preventDefault();
    setError('');
    setCreateModalError('');
    const payload = {
      name: createForm.name,
      patronymic: createForm.patronymic || null,
      secondName: createForm.secondName,
      positions: createForm.positions,
      birthDate: createForm.birthDate || undefined,
      sex: normalizeSex(createForm.sex),
    };
    createMutation.mutate(payload, {
      onError: err => setCreateModalError(normalizeErrorMessage(err.message)),
      onSuccess: () => {
        setCreateModal(false);
        setCreateModalError('');
        setCreateForm({ name: '', patronymic: '', secondName: '', positions: '', birthDate: '', sex: '' });
      },
    });
  };

  if (!canEdit) return <div>Нет доступа к сотрудникам.</div>;
  if (employeesQuery.isLoading) return <div>Загрузка сотрудников...</div>;
  if (employeesQuery.isError) {
    return (
      <div>
        <h1>Сотрудники</h1>
        <ErrorWindow
          message={`Ошибка загрузки: ${employeesQuery.error?.message || 'Повторите попытку позже.'}`}
          onRetry={employeesQuery.refetch}
          style={{ marginTop: 12 }}
        />
      </div>
    );
  }

  return (
    <>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h1>Сотрудники</h1>
          <button
            className="btn-create"
            onClick={() => {
              setError('');
              setCreateModalError('');
              setCreateModal(true);
              setCreateForm({ name: '', patronymic: '', secondName: '', positions: '', birthDate: '', sex: '' });
            }}
          >
            Добавить сотрудника
          </button>
        </div>
        {lastCreatedCredentials && (
          <div style={{ padding: 10, border: '1px solid #27ae60', borderRadius: 8, background: '#e8f6ef', marginTop: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Пароль нового сотрудника</div>
            <div>ID: {lastCreatedCredentials.id ?? '—'}</div>
            {(lastCreatedCredentials.login || lastCreatedCredentials.username) && (
              <div>Логин: {lastCreatedCredentials.login ?? lastCreatedCredentials.username}</div>
            )}
            {lastCreatedCredentials.code && (
              <div style={{ marginTop: 4 }}>
                Код: <strong>{lastCreatedCredentials.code}</strong>
              </div>
            )}
            {lastCreatedCredentials.password && (
              <div style={{ marginTop: 4 }}>
                Пароль: <strong>{lastCreatedCredentials.password}</strong>
              </div>
            )}
            {!lastCreatedCredentials.password && lastCreatedCredentials.message && (
              <div style={{ marginTop: 4 }}>Ответ сервера: {String(lastCreatedCredentials.message)}</div>
            )}
          </div>
        )}
        {error && (
          <ErrorWindow
            title="Не удалось выполнить действие"
            message={error}
            style={{ marginBottom: 8 }}
          />
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <input
            placeholder="Поиск по имени/фамилии/ID"
            value={filter.search}
            onChange={e => setFilter(prev => ({ ...prev, search: e.target.value }))}
            style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc', minWidth: 220 }}
          />
          <select
            value={filter.position}
            onChange={e => setFilter(prev => ({ ...prev, position: e.target.value }))}
            style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc' }}
          >
            <option value="">Все должности</option>
            <option value="waiter">waiter</option>
            <option value="cook">cook</option>
            <option value="barman">barman</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                <th style={{ padding: '8px 6px' }}>ID</th>
                <th style={{ padding: '8px 6px' }}>Должность</th>
                <th style={{ padding: '8px 6px' }}>Фамилия</th>
                <th style={{ padding: '8px 6px' }}>Имя</th>
                <th style={{ padding: '8px 6px' }}>Отчество</th>
                <th style={{ padding: '8px 6px' }}>Дата рождения</th>
                <th style={{ padding: '8px 6px' }}>Пол</th>
                <th style={{ padding: '8px 6px', width: 180 }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {normalized.map(emp => (
                <tr key={emp.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px 6px', fontSize: 12, color: '#666' }}>{emp.id}</td>
                  <td style={{ padding: '8px 6px' }}>{emp.positions}</td>
                  <td style={{ padding: '8px 6px' }}>{emp.secondName}</td>
                  <td style={{ padding: '8px 6px' }}>{emp.name}</td>
                  <td style={{ padding: '8px 6px' }}>{emp.patronymic}</td>
                  <td style={{ padding: '8px 6px' }}>{emp.birthDisplay || '-'}</td>
                  <td style={{ padding: '8px 6px' }}>{emp.sex || '-'}</td>
                  <td style={{ padding: '8px 6px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn-edit" onClick={() => openEdit(emp)} style={{ padding: '6px 8px' }}>
                        Изменить
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => {
                          setError('');
                          deleteMutation.mutate(emp.id);
                        }}
                        style={{ padding: '6px 8px' }}
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {normalized.length === 0 && <div style={{ padding: 12 }}>Сотрудников нет.</div>}
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
              maxWidth: 480,
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Добавить сотрудника</h3>
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
            <form onSubmit={submitCreate} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Имя
                <input value={createForm.name} onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))} required />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Отчество
                <input value={createForm.patronymic} onChange={e => setCreateForm(prev => ({ ...prev, patronymic: e.target.value }))} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Фамилия
                <input value={createForm.secondName} onChange={e => setCreateForm(prev => ({ ...prev, secondName: e.target.value }))} required />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Должность
                <select
                  value={createForm.positions}
                  onChange={e => setCreateForm(prev => ({ ...prev, positions: e.target.value }))}
                  required
                >
                  <option value="">Выберите</option>
                  <option value="waiter">waiter</option>
                  <option value="cook">cook</option>
                  <option value="barman">barman</option>
                  <option value="admin">admin</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Дата рождения
                <input
                  type="date"
                  value={createForm.birthDate}
                  onChange={e => setCreateForm(prev => ({ ...prev, birthDate: e.target.value }))}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Пол
                <select value={createForm.sex} onChange={e => setCreateForm(prev => ({ ...prev, sex: e.target.value }))}>
                  <option value="">Не указано</option>
                  <option value="M">M</option>
                  <option value="F">F</option>
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
                title="Ошибка создания сотрудника"
                message={createModalError}
              />
            )}
          </div>
        </div>
      )}

      {editModal.open && (
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
              maxWidth: 480,
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Изменить сотрудника</h3>
              <button onClick={closeEdit} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#333' }}>
                X
              </button>
            </div>
            <form onSubmit={submitEdit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Имя
                <input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} required />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Отчество
                <input value={form.patronymic} onChange={e => setForm(prev => ({ ...prev, patronymic: e.target.value }))} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Фамилия
                <input value={form.secondName} onChange={e => setForm(prev => ({ ...prev, secondName: e.target.value }))} required />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Должность
                <select
                  value={form.positions}
                  onChange={e => setForm(prev => ({ ...prev, positions: e.target.value }))}
                  required
                >
                  <option value="">Выберите</option>
                  <option value="waiter">waiter</option>
                  <option value="cook">cook</option>
                  <option value="barman">barman</option>
                  <option value="admin">admin</option>
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Дата рождения
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={e => setForm(prev => ({ ...prev, birthDate: e.target.value }))}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Пол
                <select value={form.sex} onChange={e => setForm(prev => ({ ...prev, sex: e.target.value }))}>
                  <option value="">Не указано</option>
                  <option value="M">M</option>
                  <option value="F">F</option>
                </select>
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" onClick={closeEdit} style={{ padding: '8px 12px', borderRadius: 8 }}>
                  Отмена
                </button>
                <button type="submit">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default EmployeesPage;
