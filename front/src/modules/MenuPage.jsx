import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Permissions } from '../domain/auth.js';
import { useCan } from '../shared/hooks/useCan.js';
import { useAuthStore } from '../app/store/authStore.js';
import { ErrorWindow } from '../shared/components/ErrorWindow.jsx';
import { extractErrorMessage, normalizeErrorMessage } from '../shared/utils/errorMessage.js';

const MenuPage = () => {
  const { token } = useAuthStore();
  const canView = useCan(Permissions.MENU_VIEW);
  const canEdit = useCan(Permissions.MENU_EDIT);
  const queryClient = useQueryClient();

  const API_BASE = import.meta.env.VITE_API_URL || '';
  const baseUrl = `${API_BASE}/dish`;
  const ingredientUrl = `${API_BASE}/ingredient`;

  const [sort, setSort] = useState({ key: 'id', dir: 'asc' });
  const [selectedDish, setSelectedDish] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [ingredients, setIngredients] = useState([]);
  const [ingredientsLoading, setIngredientsLoading] = useState(false);
  const [ingredientsError, setIngredientsError] = useState('');
  const [dishForm, setDishForm] = useState({ name: '', preparingTime: '', kitchen: true });
  const [costInput, setCostInput] = useState('');
  const [ingredientForm, setIngredientForm] = useState({ ingredientId: '', amount: '' });
  const [allIngredients, setAllIngredients] = useState([]);
  const [allIngredientsLoading, setAllIngredientsLoading] = useState(false);
  const [allIngredientsError, setAllIngredientsError] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalTab, setModalTab] = useState('composition');
  const [createModal, setCreateModal] = useState(false);
  const [createDishForm, setCreateDishForm] = useState({ name: '', cost: '', preparingTime: '', kitchen: true });
  const [createIngredients, setCreateIngredients] = useState([]);
  const [createIngredientForm, setCreateIngredientForm] = useState({ ingredientId: '', amount: '' });
  const [createError, setCreateError] = useState('');
  const [createMessage, setCreateMessage] = useState('');
  const [pageError, setPageError] = useState('');

  const fetcher = async (url, options = {}) => {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
    const text = await res.text();
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      throw new Error(extractErrorMessage(res, text));
    }
    if (!text) return [];
    if (contentType.includes('application/json')) return JSON.parse(text);
    throw new Error(`Ожидался JSON, получено: ${contentType || 'unknown'}`);
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dishes'],
    queryFn: () => fetcher(`${baseUrl}/get-all`),
  });

  const loadIngredients = async dishId => {
    setIngredientsLoading(true);
    setIngredientsError('');
    try {
      const payload = await fetcher(`${ingredientUrl}/get-for-dish/${dishId}`);
      setIngredients(Array.isArray(payload) ? payload : []);
    } catch (e) {
      setIngredients([]);
      setIngredientsError(normalizeErrorMessage(e.message));
    } finally {
      setIngredientsLoading(false);
    }
  };

  const openDetails = (dish, tab = 'composition') => {
    setSelectedDish(dish);
    setModalTab(tab);
    setDishForm({
      name: dish.name ?? '',
      preparingTime: dish.preparingTime ?? '',
      kitchen: Boolean(dish.kitchen),
    });
    setCostInput(dish.cost ?? '');
    setIngredientForm({ ingredientId: '', amount: '' });
    setModalError('');
    setModalMessage('');
    setShowModal(true);
    loadIngredients(dish.id);
    if (canEdit) loadAllIngredients();
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDish(null);
    setIngredients([]);
    setIngredientsError('');
    setModalError('');
    setModalMessage('');
    setModalTab('composition');
  };

  const openCreateDishModal = () => {
    if (!canEdit) return;
    setCreateDishForm({ name: '', cost: '', preparingTime: '', kitchen: true });
    setCreateIngredients([]);
    setCreateIngredientForm({ ingredientId: '', amount: '' });
    setCreateError('');
    setCreateMessage('');
    setCreateModal(true);
    loadAllIngredients();
  };

  const closeCreateDishModal = () => {
    setCreateModal(false);
    setCreateError('');
    setCreateMessage('');
  };

  const loadAllIngredients = async () => {
    if (!canEdit) return;
    setAllIngredientsLoading(true);
    setAllIngredientsError('');
    try {
      const payload = await fetcher(`${ingredientUrl}/get-all`);
      const list = Array.isArray(payload) ? payload : payload?.ingredients || [];
      setAllIngredients(list);
    } catch (e) {
      setAllIngredients([]);
      setAllIngredientsError(normalizeErrorMessage(e.message));
    } finally {
      setAllIngredientsLoading(false);
    }
  };

  useEffect(() => {
    if (!showModal) {
      setModalError('');
      setModalMessage('');
    }
  }, [showModal]);

  const invalidateDishes = () => {
    queryClient.invalidateQueries({ queryKey: ['dishes'] });
  };

  const modifyDishMutation = useMutation({
    mutationFn: payload => fetcher(`${baseUrl}/modify-dish`, { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => invalidateDishes(),
  });

  const resetCostMutation = useMutation({
    mutationFn: payload => fetcher(`${baseUrl}/reset-cost`, { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => invalidateDishes(),
  });

  const addIngredientMutation = useMutation({
    mutationFn: payload => fetcher(`${baseUrl}/add-ingredient`, { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => invalidateDishes(),
  });

  const removeIngredientMutation = useMutation({
    mutationFn: payload => fetcher(`${baseUrl}/remove-ingredient`, { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => invalidateDishes(),
  });

  const deleteDishMutation = useMutation({
    mutationFn: id => fetcher(`${baseUrl}/delete/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateDishes(),
  });

  const createDishMutation = useMutation({
    mutationFn: payload => fetcher(`${baseUrl}/create`, { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => invalidateDishes(),
  });

  const handleDishUpdate = e => {
    e.preventDefault();
    if (!selectedDish) return;
    setModalError('');
    const name = dishForm.name.trim();
    const currentCost = selectedDish.cost ?? 0;
    const costValue = Number(currentCost);
    const preparingTimeValue = Number(dishForm.preparingTime);
    if (!name) {
      setModalError('Название обязательно');
      return;
    }
    if (Number.isNaN(costValue) || costValue <= 0) {
      setModalError('Стоимость должна быть положительным числом');
      return;
    }
    if (Number.isNaN(preparingTimeValue) || preparingTimeValue <= 0) {
      setModalError('Время должно быть положительным числом');
      return;
    }
    modifyDishMutation.mutate(
      {
        id: selectedDish.id,
        name,
        cost: costValue,
        kitchen: Boolean(dishForm.kitchen),
        preparingTime: preparingTimeValue,
      },
      {
        onSuccess: () => {
          setModalMessage('Блюдо обновлено.');
          setSelectedDish(prev =>
            prev
              ? {
                  ...prev,
                  name,
                  cost: costValue,
                  preparingTime: preparingTimeValue,
                  kitchen: dishForm.kitchen,
                }
              : prev,
          );
        },
        onError: err => setModalError(normalizeErrorMessage(err.message)),
      },
    );
  };

  const handleCostUpdate = e => {
    e.preventDefault();
    if (!selectedDish) return;
    const cost = Number(costInput);
    if (Number.isNaN(cost)) {
      setModalError('Стоимость должна быть числом');
      return;
    }
    setModalError('');
    resetCostMutation.mutate(
      { id: selectedDish.id, cost },
      {
        onSuccess: () => {
          setModalMessage('Стоимость успешно обновлена.');
          setSelectedDish(prev => (prev ? { ...prev, cost } : prev));
          loadIngredients(selectedDish.id);
        },
        onError: err => setModalError(normalizeErrorMessage(err.message)),
      },
    );
  };

  const handleAddIngredient = e => {
    e.preventDefault();
    if (!selectedDish) return;
    const amount = Number(ingredientForm.amount);
    if (!ingredientForm.ingredientId) {
      setModalError('Выберите ингредиент');
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      setModalError('Количество должно быть положительным числом');
      return;
    }
    addIngredientMutation.mutate(
      { dishId: selectedDish.id, ingredientId: Number(ingredientForm.ingredientId), amount },
      {
        onSuccess: () => {
          setModalMessage('Ингредиент добавлен.');
          setIngredientForm({ ingredientId: '', amount: '' });
          loadIngredients(selectedDish.id);
        },
        onError: err => setModalError(normalizeErrorMessage(err.message)),
      },
    );
  };

  const handleRemoveIngredientClick = ingredientId => {
    if (!selectedDish) return;
    removeIngredientMutation.mutate(
      { dishId: selectedDish.id, ingredientId },
      {
        onSuccess: () => {
          setModalMessage('Ингредиент удален.');
          loadIngredients(selectedDish.id);
        },
        onError: err => setModalError(normalizeErrorMessage(err.message)),
      },
    );
  };

  const handleDeleteDish = dish => {
    const target = dish || selectedDish;
    if (!target) return;
    const useModal = !dish;
    if (useModal) setModalError('');
    else setPageError('');
    deleteDishMutation.mutate(target.id, {
      onSuccess: () => {
        if (useModal) {
          setModalMessage('Блюдо удалено.');
          closeModal();
        } else {
          setPageError('');
        }
      },
      onError: err => {
        const message = normalizeErrorMessage(err.message) || 'Не удалось удалить блюдо';
        if (useModal) setModalError(message);
        else setPageError(message);
      },
    });
  };

  const handleAddIngredientToNewDish = () => {
    if (!createIngredientForm.ingredientId) {
      setCreateError('Выберите ингредиент');
      return;
    }
    const amount = Number(createIngredientForm.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      setCreateError('Количество должно быть положительным');
      return;
    }
    setCreateIngredients(prev => {
      const exists = prev.find(item => item.ingredientId === Number(createIngredientForm.ingredientId));
      if (exists) {
        return prev.map(item =>
          item.ingredientId === Number(createIngredientForm.ingredientId)
            ? { ...item, amount: item.amount + amount }
            : item,
        );
      }
      const ing = allIngredients.find(ing => Number(ing.id) === Number(createIngredientForm.ingredientId));
      return [
        ...prev,
        {
          ingredientId: Number(createIngredientForm.ingredientId),
          name: ing?.name || ing?.title || `#${ing?.id}`,
          amount,
        },
      ];
    });
    setCreateIngredientForm({ ingredientId: '', amount: '' });
    setCreateError('');
  };

  const handleRemoveIngredientFromNewDish = ingredientId => {
    setCreateIngredients(prev => prev.filter(item => item.ingredientId !== ingredientId));
  };

  const handleCreateDish = e => {
    e.preventDefault();
    setCreateError('');
    setCreateMessage('');
    const name = createDishForm.name.trim();
    const cost = Number(createDishForm.cost);
    const preparingTimeValue = Number(createDishForm.preparingTime);
    if (!name) {
      setCreateError('Введите название блюда');
      return;
    }
    if (Number.isNaN(cost) || cost <= 0) {
      setCreateError('Стоимость должна быть положительным числом');
      return;
    }
    if (Number.isNaN(preparingTimeValue) || preparingTimeValue <= 0) {
      setCreateError('Время должно быть положительным числом');
      return;
    }
    if (createIngredients.length === 0) {
      setCreateError('Добавьте хотя бы один ингредиент');
      return;
    }
    const payload = {
      dish: {
        name,
        cost,
        kitchen: Boolean(createDishForm.kitchen),
        preparingTime: preparingTimeValue,
      },
      ingredients: createIngredients.map(item => ({
        ingredientId: item.ingredientId,
        amount: item.amount,
      })),
    };
    createDishMutation.mutate(payload, {
      onSuccess: () => {
        setCreateMessage('Блюдо создано.');
        setCreateDishForm({ name: '', cost: '', preparingTime: '', kitchen: true });
        setCreateIngredients([]);
        setCreateIngredientForm({ ingredientId: '', amount: '' });
      },
      onError: err => setCreateError(normalizeErrorMessage(err.message)),
    });
  };

  if (!canView) return <div>Нет доступа к меню.</div>;
  if (isLoading) return <div>Загрузка меню...</div>;
  if (isError) {
    return (
      <div>
        <h1>Меню</h1>
        <ErrorWindow
          message={`Ошибка загрузки меню: ${error?.message || 'Попробуйте обновить страницу.'}`}
          onRetry={refetch}
          style={{ marginTop: 12 }}
        />
      </div>
    );
  }

  const dishes = Array.isArray(data) ? data : data?.dishes || [];
  const sortedDishes = [...dishes].sort((a, b) => {
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

  const renderHeader = (label, key) => (
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

  return (
    <div>
      <h1>Меню</h1>
      {pageError && (
        <ErrorWindow
          title="Ошибка удаления блюда"
          message={pageError}
          onClose={() => setPageError('')}
          style={{ marginBottom: 12 }}
        />
      )}
      {canEdit && (
        <div style={{ textAlign: 'right', marginBottom: 12 }}>
          <button className="btn-create" onClick={openCreateDishModal}>
            Добавить блюдо
          </button>
        </div>
      )}
      <div style={{ marginTop: 16, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: '8px 6px' }}>{renderHeader('ID', 'id')}</th>
              <th style={{ padding: '8px 6px' }}>{renderHeader('Название', 'name')}</th>
              <th style={{ padding: '8px 6px' }}>{renderHeader('Цена', 'cost')}</th>
              <th style={{ padding: '8px 6px' }}>{renderHeader('Себестоимость', 'primeCost')}</th>
              <th style={{ padding: '8px 6px' }}>{renderHeader('Время (мин)', 'preparingTime')}</th>
              <th style={{ padding: '8px 6px' }}>{renderHeader('Тип', 'kitchen')}</th>
              <th style={{ padding: '8px 6px' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {sortedDishes.map(dish => (
              <tr key={dish.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px 6px', fontSize: 12, color: '#666' }}>{dish.id}</td>
                <td style={{ padding: '8px 6px' }}>{dish.name}</td>
                <td style={{ padding: '8px 6px' }}>{dish.cost ?? '-'}</td>
                <td style={{ padding: '8px 6px' }}>{dish.primeCost ?? '-'}</td>
                <td style={{ padding: '8px 6px' }}>{dish.preparingTime ?? '-'}</td>
                <td style={{ padding: '8px 6px' }}>{dish.kitchen ? 'Кухня' : 'Бар'}</td>
                <td style={{ padding: '8px 6px' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn-composition" onClick={() => openDetails(dish, 'composition')} style={{ padding: '4px 8px' }}>
                      Состав
                    </button>
                    {canEdit && (
                      <>
                        <button className="btn-edit" onClick={() => openDetails(dish, 'edit')} style={{ padding: '4px 8px' }}>
                          Изменить
                        </button>
                        <button className="btn-danger" onClick={() => handleDeleteDish(dish)} style={{ padding: '4px 8px' }}>
                          Удалить
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {dishes.length === 0 && (
              <tr>
                <td colSpan="7" style={{ padding: 12 }}>
                  Блюд нет.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 1000,
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: '#fff',
              minWidth: 320,
              maxWidth: 520,
              width: '100%',
              borderRadius: 10,
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              padding: 18,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{selectedDish?.name || 'Блюдо'}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={closeModal} aria-label="Закрыть">
                  x
                </button>
              </div>
            </div>

            {modalTab === 'composition' && (
              <div>
                {ingredientsLoading && <div>Загружаем ингредиенты...</div>}
                {ingredientsError && (
                  <ErrorWindow
                    title="Не удалось получить состав"
                    message={ingredientsError}
                    style={{ marginBottom: 8 }}
                  />
                )}
                {!ingredientsLoading && !ingredientsError && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {ingredients.map(ing => (
                      <div
                        key={ing.id}
                        style={{
                          padding: '8px 6px',
                          border: '1px solid #eee',
                          borderRadius: 6,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{ing.name}</div>
                          <div style={{ fontSize: 12, color: '#555' }}>
                            Цена за 100г: {ing.price ?? '—'}, остаток: {ing.amount ?? '—'}
                          </div>
                        </div>
                        {canEdit && (
                          <button
                            className="btn-warning"
                            onClick={() => handleRemoveIngredientClick(Number(ing.id))}
                            style={{ padding: '4px 8px' }}
                          >
                            Удалить
                          </button>
                        )}
                      </div>
                    ))}
                    {ingredients.length === 0 && <div style={{ color: '#666' }}>Список пуст.</div>}
                  </div>
                )}
                {canEdit && (
                  <div style={{ marginTop: 16 }}>
                    <h4 style={{ margin: '0 0 8px' }}>Добавить ингредиент</h4>
                    {allIngredientsLoading && <div>Загружаем список ингредиентов...</div>}
                    {allIngredientsError && (
                      <ErrorWindow
                        title="Ошибка загрузки ингредиентов"
                        message={allIngredientsError}
                        style={{ marginBottom: 8 }}
                      />
                    )}
                    {!allIngredientsLoading && !allIngredientsError && (
                      <form onSubmit={handleAddIngredient} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <select
                          value={ingredientForm.ingredientId}
                          onChange={e => setIngredientForm(prev => ({ ...prev, ingredientId: e.target.value }))}
                          style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc', flex: '1 1 160px' }}
                        >
                          <option value="">Выберите ингредиент</option>
                          {allIngredients.map(ing => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name || ing.title || `#${ing.id}`}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="Количество"
                          value={ingredientForm.amount}
                          onChange={e => setIngredientForm(prev => ({ ...prev, amount: e.target.value }))}
                          style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc', flex: '1 1 120px' }}
                        />
                        <button type="submit" className="btn-create" disabled={addIngredientMutation.isLoading}>
                          {addIngredientMutation.isLoading ? 'Добавляем...' : 'Добавить'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}

            {modalTab === 'edit' && canEdit && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
                  <h4 style={{ margin: '0 0 8px' }}>Изменить блюдо</h4>
                  <form onSubmit={handleDishUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      Название
                      <input
                        value={dishForm.name}
                        onChange={e => setDishForm(prev => ({ ...prev, name: e.target.value }))}
                        required
                        style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc' }}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      Время приготовления (мин)
                      <input
                        type="number"
                        value={dishForm.preparingTime}
                        onChange={e => setDishForm(prev => ({ ...prev, preparingTime: e.target.value }))}
                        style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc' }}
                      />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={dishForm.kitchen}
                        onChange={e => setDishForm(prev => ({ ...prev, kitchen: e.target.checked }))}
                      />
                      Блюдо кухни (иначе Бар)
                    </label>
                    <button type="submit" disabled={modifyDishMutation.isLoading}>
                      {modifyDishMutation.isLoading ? 'Сохраняем...' : 'Сохранить'}
                    </button>
                  </form>
                </div>

                <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
                  <h4 style={{ margin: '0 0 8px' }}>Изменить стоимость</h4>
                  <form onSubmit={handleCostUpdate} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input
                      type="number"
                      value={costInput}
                      onChange={e => setCostInput(e.target.value)}
                      placeholder="Новая цена"
                      style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc', flex: '1 1 160px' }}
                    />
                    <button type="submit" className="btn-secondary" disabled={resetCostMutation.isLoading}>
                      {resetCostMutation.isLoading ? 'Сохраняем...' : 'Обновить'}
                    </button>
                  </form>
                </div>

                <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
                  <button className="btn-danger" onClick={handleDeleteDish} disabled={deleteDishMutation.isLoading} style={{ width: '100%' }}>
                    {deleteDishMutation.isLoading ? 'Удаляем...' : 'Удалить блюдо'}
                  </button>
                </div>
              </div>
            )}

            {modalError && (
              <ErrorWindow
                title="Не удалось выполнить действие"
                message={modalError}
                style={{ marginTop: 12 }}
              />
            )}
            {modalMessage && <div style={{ color: '#2ecc71', marginTop: 8 }}>{modalMessage}</div>}
          </div>
        </div>
      )}

      {createModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 1100,
          }}
          onClick={closeCreateDishModal}
        >
          <div
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: 520,
              borderRadius: 10,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Новое блюдо</h3>
              <button
                onClick={closeCreateDishModal}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#333' }}
              >
                x
              </button>
            </div>
            <form onSubmit={handleCreateDish} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Название
                <input
                  value={createDishForm.name}
                  onChange={e => setCreateDishForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Стоимость
                <input
                  type="number"
                  value={createDishForm.cost}
                  onChange={e => setCreateDishForm(prev => ({ ...prev, cost: e.target.value }))}
                  required
                  style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc' }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                Время приготовления (мин)
                <input
                  type="number"
                  value={createDishForm.preparingTime}
                  onChange={e => setCreateDishForm(prev => ({ ...prev, preparingTime: e.target.value }))}
                  style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc' }}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={createDishForm.kitchen}
                  onChange={e => setCreateDishForm(prev => ({ ...prev, kitchen: e.target.checked }))}
                />
                Блюдо кухни (иначе Бар)
              </label>
              <div style={{ borderTop: '1px solid #eee', paddingTop: 10 }}>
                <h4 style={{ margin: '0 0 8px' }}>Ингредиенты блюда</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {createIngredients.map(item => (
                    <div
                      key={item.ingredientId}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', border: '1px solid #eee', borderRadius: 6 }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>Количество: {item.amount}</div>
                      </div>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => handleRemoveIngredientFromNewDish(item.ingredientId)}
                        style={{ padding: '4px 8px' }}
                      >
                        Удалить
                      </button>
                    </div>
                  ))}
                  {createIngredients.length === 0 && <div style={{ color: '#888' }}>Ингредиенты не добавлены</div>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  <select
                    value={createIngredientForm.ingredientId}
                    onChange={e => setCreateIngredientForm(prev => ({ ...prev, ingredientId: e.target.value }))}
                    style={{ flex: '1 1 180px', padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc' }}
                  >
                    <option value="">Выберите ингредиент</option>
                    {allIngredients.map(ing => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name || ing.title || `#${ing.id}`}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Количество"
                    value={createIngredientForm.amount}
                    onChange={e => setCreateIngredientForm(prev => ({ ...prev, amount: e.target.value }))}
                    style={{ flex: '1 1 120px', padding: '6px 8px', borderRadius: 6, border: '1px solid #ccc' }}
                  />
                  <button type="button" className="btn-create" onClick={handleAddIngredientToNewDish}>
                    Добавить
                  </button>
                </div>
              </div>
              <button type="submit" className="btn-create" disabled={createDishMutation.isLoading}>
                {createDishMutation.isLoading ? 'Создаем...' : 'Создать блюдо'}
              </button>
            </form>
            {createError && (
              <ErrorWindow
                title="Не удалось создать блюдо"
                message={createError}
                style={{ marginTop: 4 }}
              />
            )}
            {createMessage && <div style={{ color: '#2ecc71' }}>{createMessage}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuPage;
