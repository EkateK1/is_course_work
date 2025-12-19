import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../app/store/authStore.js';
import { Roles } from '../domain/auth.js';
import { ErrorWindow } from '../shared/components/ErrorWindow.jsx';
import { extractErrorMessage } from '../shared/utils/errorMessage.js';

const DashboardPage = () => {
  const { role, token } = useAuthStore();
  const isAdmin = role === Roles.ADMIN;
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const API_BASE = import.meta.env.VITE_API_URL || '';
  const fetcher = async url => {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const text = await res.text();
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) throw new Error(extractErrorMessage(res, text));
    if (!text) return null;
    if (contentType.includes('application/json')) return JSON.parse(text);
    throw new Error(`Ожидался JSON, получено: ${contentType || 'unknown'}`);
  };

  const mainReportQuery = useQuery({
    queryKey: ['report', 'main', date],
    queryFn: () => fetcher(`${API_BASE}/report/main/${date}`),
    enabled: isAdmin,
  });

  const employeeAllQuery = useQuery({
    queryKey: ['report', 'employee-all', date],
    queryFn: () => fetcher(`${API_BASE}/report/employee-all/${date}`),
    enabled: isAdmin,
  });

  const employeeOwnQuery = useQuery({
    queryKey: ['report', 'employee-own', date],
    queryFn: () => fetcher(`${API_BASE}/report/employee-own/${date}`),
    enabled: !!role && !isAdmin,
  });

  const mainReport = mainReportQuery.data;
  const employeeAll = employeeAllQuery.data;
  const employeeOwn = employeeOwnQuery.data;
  const employeesQuery = useQuery({
    queryKey: ['employees'],
    queryFn: () => fetcher(`${API_BASE}/employee/get-all`),
    enabled: isAdmin,
  });
  const employeesById = useMemo(() => {
    if (!employeesQuery.data || !Array.isArray(employeesQuery.data)) return {};
    return employeesQuery.data.reduce((acc, e) => {
      acc[e.id] = e;
      return acc;
    }, {});
  }, [employeesQuery.data]);

  const renderMainReport = report => {
    if (!report) return null;
    const items = [
      { label: 'Выручка', value: report.ordersSum },
      { label: 'Себестоимость', value: report.primeCostSum },
      { label: 'Прибыль', value: report.earnings },
      { label: 'Заказов', value: report.ordersAmount },
      { label: 'Оплачено', value: report.paidOrdersAmount },
      { label: 'Не оплачено', value: report.notPaidOrdersAmount },
    ];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
        {items.map(item => (
          <div key={item.label} style={{ border: '1px solid #eee', borderRadius: 8, padding: 10, background: '#fafafa' }}>
            <div style={{ fontSize: 12, color: '#666' }}>{item.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{item.value ?? '—'}</div>
          </div>
        ))}
      </div>
    );
  };

  const renderOwnReport = data => {
    if (!data) return null;
    const items = [
      { label: 'Заказов', value: data.ordersAmount },
      { label: 'Столов', value: data.tableAmount },
      { label: 'Выручка', value: data.ordersSum },
      { label: 'Рейтинг', value: data.rating },
      { label: 'Комментарии', value: data.comments ? String(data.comments).replace(/;\s*/g, '\n') : '—' },
    ];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
        {items.map(item => (
          <div key={item.label} style={{ border: '1px solid #eee', borderRadius: 8, padding: 10, background: '#fafafa' }}>
            <div style={{ fontSize: 12, color: '#666' }}>{item.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{item.value ?? '—'}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1>Статистика</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 14 }}>
          Дата отчёта:
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ marginLeft: 8, padding: '4px 6px' }}
          />
        </label>
      </div>

      {isAdmin ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, background: '#fff' }}>
            <h3 style={{ marginTop: 0 }}>Главный отчёт</h3>
            {mainReportQuery.isLoading && <div>Загрузка...</div>}
            {mainReportQuery.isError && (
              <ErrorWindow
                title="Ошибка получения отчёта"
                message={mainReportQuery.error?.message || 'Попробуйте обновить страницу.'}
                onRetry={mainReportQuery.refetch}
                style={{ marginTop: 8 }}
              />
            )}
            {mainReport && renderMainReport(mainReport)}
          </div>
          <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, background: '#fff' }}>
            <h3 style={{ marginTop: 0 }}>Отчёт по сотрудникам</h3>
            {employeeAllQuery.isLoading && <div>Загрузка...</div>}
            {employeeAllQuery.isError ? (
              <ErrorWindow
                title="Ошибка получения отчёта"
                message={employeeAllQuery.error?.message || 'Попробуйте обновить страницу.'}
                onRetry={employeeAllQuery.refetch}
                style={{ marginTop: 8 }}
              />
            ) : (
              <>
                {employeesQuery.isError && (
                  <ErrorWindow
                    title="Ошибка загрузки сотрудников"
                    message={employeesQuery.error?.message || 'Не удалось получить список сотрудников.'}
                    onRetry={employeesQuery.refetch}
                    style={{ marginTop: 8 }}
                  />
                )}
                {employeeAll && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                    {Object.entries(employeeAll).map(([id, stats]) => {
                      const info = employeesById[id] || {};
                      return (
                        <div key={id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 10, background: '#fafafa' }}>
                          <div style={{ fontWeight: 700, marginBottom: 6 }}>
                            ID: {id}
                            {info.name || info.secondName ? (
                              <div style={{ fontSize: 13, color: '#333', fontWeight: 500 }}>
                                {info.name || ''} {info.patronymic || ''} {info.secondName || ''}
                              </div>
                            ) : null}
                            {info.positions && (
                              <div style={{ fontSize: 12, color: '#666' }}>Должность: {info.positions}</div>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: '#333' }}>Заказов: {stats.ordersAmount ?? '—'}</div>
                          <div style={{ fontSize: 13, color: '#333' }}>Сумма: {stats.ordersSum ?? '—'}</div>
                          <div style={{ fontSize: 13, color: '#333' }}>Столов: {stats.tableAmount ?? '—'}</div>
                          <div style={{ fontSize: 13, color: '#333' }}>Рейтинг: {stats.rating ?? '—'}</div>
                          <div style={{ fontSize: 12, color: '#666', marginTop: 4, whiteSpace: 'pre-line' }}>
                            Комментарии: {stats.comments ? String(stats.comments).replace(/;\s*/g, '\n') : '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, background: '#fff' }}>
          <h3 style={{ marginTop: 0 }}>Мой отчёт</h3>
          {employeeOwnQuery.isLoading && <div>Загрузка...</div>}
          {employeeOwnQuery.isError && (
            <ErrorWindow
              title="Ошибка получения отчёта"
              message={employeeOwnQuery.error?.message || 'Попробуйте обновить страницу.'}
              onRetry={employeeOwnQuery.refetch}
              style={{ marginTop: 8 }}
            />
          )}
          {employeeOwn && renderOwnReport(employeeOwn)}
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
