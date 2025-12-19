import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Permissions, Table } from '../domain/auth.js';
import { useCan } from '../shared/hooks/useCan.js';
import { useAuthStore } from '../app/store/authStore.js';
import { ErrorWindow } from '../shared/components/ErrorWindow.jsx';
import { extractErrorMessage, normalizeErrorMessage } from '../shared/utils/errorMessage.js';

const statusLabels = {
  free: 'Свободен',
  occupied: 'Занят',
  not_paid: 'Не оплачен',
  paid: 'Оплачен',
};

const statusColors = {
  free: '#2ecc71',
  occupied: '#f39c12',
  not_paid: '#e74c3c',
  paid: '#3498db',
};

const BILLS_STORAGE_KEY = 'tables-bills-state';
const ORDERS_STORAGE_KEY = 'tables-orders-count';

const decodeEmployeeId = token => {
  try {
    if (!token) return null;
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const json = JSON.parse(atob(normalized));
    return json.sub ? Number(json.sub) : null;
  } catch {
    return null;
  }
};

const TablesPage = () => {
  const { token, user } = useAuthStore();
  const navigate = useNavigate();
  const canView = useCan(Permissions.TABLES_VIEW);
  const canFree = useCan(Permissions.ORDERS_STATUS_CHANGE);
  const queryClient = useQueryClient();

  const tableList = useMemo(
    () =>
      Object.keys(Table).map(key => ({
        id: key,
        code: Table[key],
        label: key,
      })),
    [],
  );

  const [tablesState, setTablesState] = useState(() =>
    tableList.reduce((acc, table) => {
      acc[table.id] = { ordersCount: 0, unpaidBills: 0, paidBills: 0, manualStatus: null };
      return acc;
    }, {}),
  );
  const [ordersModal, setOrdersModal] = useState({ open: false, tableId: null });
  const [billsState, setBillsState] = useState(() => {
    try {
      const stored = localStorage.getItem(BILLS_STORAGE_KEY);
      if (!stored) return {};
      const parsed = JSON.parse(stored);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  });
  const [billActionError, setBillActionError] = useState('');
  const [billActionNotice, setBillActionNotice] = useState('');
  const [statusErrors, setStatusErrors] = useState({});
  const [pendingStatuses, setPendingStatuses] = useState({});
  const [ordersPerTable, setOrdersPerTable] = useState(() => {
    try {
      const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (!stored) return {};
      const parsed = JSON.parse(stored);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  });
  const [tableOwners, setTableOwners] = useState({});
  const [initialOrdersLoaded, setInitialOrdersLoaded] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || '';
  const ordersBaseUrl = `${API_BASE}/order`;
  const employeeId = useMemo(() => {
    const decoded = decodeEmployeeId(token);
    if (decoded != null) return decoded;
    const fallback = user?.id ?? user?.employeeId ?? null;
    return fallback != null ? Number(fallback) : null;
  }, [token, user]);

  const authorizedHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const fetcher = async url => {
    const res = await fetch(url, {
      headers: authorizedHeaders(),
    });
    const text = await res.text();
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) throw new Error(extractErrorMessage(res, text));
    if (!text) return [];
    if (contentType.includes('application/json')) return JSON.parse(text);
    throw new Error(`Ожидался JSON, получено: ${contentType || 'unknown'}`);
  };

  const parseOwnerId = payload => {
    if (payload == null) return null;
    if (typeof payload === 'number') return Number.isNaN(payload) ? null : payload;
    if (typeof payload === 'string') {
      if (!payload.trim()) return null;
      const numeric = Number(payload);
      return Number.isNaN(numeric) ? null : numeric;
    }
    if (typeof payload === 'object') {
      if (payload.employeeId != null) {
        const numeric = Number(payload.employeeId);
        return Number.isNaN(numeric) ? null : numeric;
      }
      if (payload.employee?.id != null) {
        const numeric = Number(payload.employee.id);
        return Number.isNaN(numeric) ? null : numeric;
      }
      if (payload.id != null) {
        const numeric = Number(payload.id);
        return Number.isNaN(numeric) ? null : numeric;
      }
    }
    return null;
  };

  const parseTableStatusPayload = payload => {
    if (!payload) return null;
    if (typeof payload === 'string') {
      const trimmed = payload.trim();
      return trimmed || null;
    }
    if (typeof payload === 'object') {
      return payload.tableStatus || payload.status || payload.value || null;
    }
    return null;
  };

  const fetchTableOwner = async tableId => {
    try {
      const res = await fetch(`${API_BASE}/journal/get-employee/${tableId}`, {
        headers: authorizedHeaders(),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(extractErrorMessage(res, text));
      if (!text) return null;
      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? JSON.parse(text) : text;
      return parseOwnerId(data);
    } catch (error) {
      console.error(`Ошибка получения сотрудника для стола ${tableId}`, error);
      return null;
    }
  };

  const refreshTableStatus = async tableId => {
    if (!tableId) return;
    try {
      const res = await fetch(`${API_BASE}/journal/get-table-status/${tableId}`, {
        headers: authorizedHeaders(),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(extractErrorMessage(res, text));
      const contentType = res.headers.get('content-type') || '';
      const payload = contentType.includes('application/json') ? JSON.parse(text) : text;
      const status = parseTableStatusPayload(payload);
      if (status) {
        setStatusCache(tableId, status);
        if (status === 'free') {
          applyOwnerForStatus(tableId, status, null);
        } else {
          applyOwnerForStatus(tableId, status);
        }
      }
    } catch (error) {
      console.error(`Не удалось обновить статус стола ${tableId}`, error);
    }
  };

  const tableStatusesQuery = useQuery({
    queryKey: ['table-statuses'],
    queryFn: () => fetcher(`${API_BASE}/journal/get-all-statuses`),
    enabled: canView,
  });

  const tableStatuses = useMemo(() => {
    if (!tableStatusesQuery.data || Array.isArray(tableStatusesQuery.data)) return {};
    return tableStatusesQuery.data;
  }, [tableStatusesQuery.data]);
  const tableStatusesErrorMessage = tableStatusesQuery.isError
    ? normalizeErrorMessage(tableStatusesQuery.error?.message) || 'Не удалось загрузить статусы столов'
    : '';

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    const loadOwners = async () => {
      const entries = await Promise.all(
        tableList.map(async table => {
          const statusValue = tableStatuses?.[table.id];
          if (!statusValue || statusValue === 'free') return [table.id, null];
          const owner = await fetchTableOwner(table.id);
          return [table.id, owner];
        }),
      );
      if (!cancelled) {
        setTableOwners(prev => {
          const next = { ...prev };
          entries.forEach(([tableId, ownerId]) => {
            if (ownerId == null) {
              delete next[tableId];
            } else {
              next[tableId] = ownerId;
            }
          });
          return next;
        });
      }
    };
    loadOwners();
    return () => {
      cancelled = true;
    };
  }, [canView, tableList, tableStatuses, employeeId, token]);

  const tableOrdersQuery = useQuery({
    queryKey: ['table-orders', ordersModal.tableId],
    queryFn: () => fetcher(`${ordersBaseUrl}/get-orders-by-table/${ordersModal.tableId}`),
    enabled: canView && ordersModal.open && !!ordersModal.tableId,
  });

  useEffect(() => {
    try {
      localStorage.setItem(BILLS_STORAGE_KEY, JSON.stringify(billsState));
    } catch {
      // ignore quota errors
    }
  }, [billsState]);

  useEffect(() => {
    setTablesState(prev => {
      let changed = false;
      const next = { ...prev };
      tableList.forEach(table => {
        const entries = billsState[table.id];
        const counts = { paid: 0, unpaid: 0 };
        if (entries && typeof entries === 'object') {
          Object.values(entries).forEach(info => {
            if (!info || info.inferred) return;
            if (info.status === 'paid') counts.paid += 1;
            else counts.unpaid += 1;
          });
        }
        const current =
          next[table.id] || {
            ordersCount: 0,
            unpaidBills: 0,
            paidBills: 0,
            manualStatus: null,
          };
        if (current.unpaidBills !== counts.unpaid || current.paidBills !== counts.paid) {
          next[table.id] = { ...current, unpaidBills: counts.unpaid, paidBills: counts.paid };
          changed = true;
        } else if (!next[table.id]) {
          next[table.id] = current;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [billsState, tableList]);

  useEffect(() => {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(ordersPerTable));
    } catch {
      // ignore storage issues
    }
  }, [ordersPerTable]);

  useEffect(() => {
    if (!canView || initialOrdersLoaded) return;
    let cancelled = false;
    const loadOrdersCounts = async () => {
      try {
        const entries = await Promise.all(
          tableList.map(async table => {
            try {
              const res = await fetch(`${ordersBaseUrl}/get-orders-by-table/${table.id}`, {
                headers: authorizedHeaders(),
              });
              const text = await res.text();
              if (!res.ok) throw new Error(extractErrorMessage(res, text));
              const contentType = res.headers.get('content-type') || '';
              const data = !text
                ? []
                : contentType.includes('application/json')
                  ? JSON.parse(text)
                  : [];
              const list = Array.isArray(data) ? data : data?.orders || [];
              return [table.id, list.length];
            } catch (error) {
              console.error(`Не удалось получить количество заказов для стола ${table.id}`, error);
              return [table.id, null];
            }
          }),
        );
        if (cancelled) return;
        setOrdersPerTable(prev => {
          let changed = false;
          const next = { ...prev };
          entries.forEach(([tableId, count]) => {
            if (count == null) return;
            if (next[tableId] !== count) {
              next[tableId] = count;
              changed = true;
            }
          });
          return changed ? next : prev;
        });
        setInitialOrdersLoaded(true);
      } catch (error) {
        console.error('Не удалось загрузить количества заказов по столам', error);
      }
    };
    loadOrdersCounts();
    return () => {
      cancelled = true;
    };
  }, [canView, initialOrdersLoaded, tableList, ordersBaseUrl]);

  const setStatusCache = (tableId, status) => {
    queryClient.setQueryData(['table-statuses'], prev => ({
      ...(prev && !Array.isArray(prev) ? prev : {}),
      [tableId]: status,
    }));
  };

  const markPendingStatus = (tableId, status) => {
    setPendingStatuses(prev => ({ ...prev, [tableId]: status }));
  };

  const clearPendingStatus = tableId => {
    setPendingStatuses(prev => {
      const next = { ...prev };
      delete next[tableId];
      return next;
    });
  };

  const clearStatusErrorForTable = tableId => {
    setStatusErrors(prev => {
      const next = { ...prev };
      delete next[tableId];
      return next;
    });
  };
  const applyOwnerForStatus = (tableId, status, ownerId = employeeId) => {
    setTableOwners(prev => {
      const next = { ...prev };
      if (!ownerId || status === 'free') {
        delete next[tableId];
      } else {
        next[tableId] = ownerId;
      }
      return next;
    });
  };
  const clearBillsForTable = tableId => {
    setBillsState(prev => {
      if (!prev[tableId]) return prev;
      const next = { ...prev };
      delete next[tableId];
      return next;
    });
  };

  const hasBackendOpenBill = tableId => tableStatuses?.[tableId] === 'not_paid';

  const deriveLocalStatus = (entry = {}, tableId) => {
    const totalOrders = (entry.ordersCount || 0) + (ordersPerTable[tableId] || 0);
    if ((entry.unpaidBills || 0) > 0) return 'not_paid';
    if (totalOrders > 0) return 'occupied';
    if ((entry.paidBills || 0) > 0) return 'paid';
    return 'free';
  };

  const syncLocalStatus = (tableId, entry) => {
    const status = deriveLocalStatus(entry, tableId);
    setStatusCache(tableId, status);
    applyOwnerForStatus(tableId, status);
  };

  const getStatus = (table, tableId, apiOrdersCount = 0) => {
    if (pendingStatuses[tableId]) return pendingStatuses[tableId];
    const totalOrders = (table?.ordersCount || 0) + apiOrdersCount;
    const backendStatus = tableStatuses?.[tableId];
    if (backendStatus) return backendStatus;
    // manual override with guard for paid correctness
    if (table?.manualStatus) {
      if (table.manualStatus === 'paid') {
        if (table.unpaidBills > 0) return 'not_paid';
        if (totalOrders > 0) return 'occupied';
      }
      return table.manualStatus;
    }
    const hasUnpaid = (table?.unpaidBills || 0) > 0;
    if (hasUnpaid) return 'not_paid';
    if (totalOrders > 0) return 'occupied';
    if ((table?.paidBills || 0) > 0) return 'paid';
    return 'free';
  };

  const recordStatusChange = async (tableId, status) => {
    if (!employeeId) {
      console.error('Не удалось определить ID сотрудника для смены статуса стола.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/journal/make-record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ employeeId, tableNumber: tableId, tableStatus: status }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(extractErrorMessage(res, text));
      setStatusCache(tableId, status);
      applyOwnerForStatus(tableId, status);
      clearPendingStatus(tableId);
      clearStatusErrorForTable(tableId);
    } catch (e) {
      console.error('Ошибка смены статуса стола', e);
      setStatusErrors(prev => ({
        ...prev,
        [tableId]: normalizeErrorMessage(e.message) || 'Не удалось сменить статус стола',
      }));
      clearPendingStatus(tableId);
    }
  };

  const modalOrders = useMemo(() => {
    if (!ordersModal.open || !ordersModal.tableId) return [];
    const raw = tableOrdersQuery.data;
    let orders = [];
    if (Array.isArray(raw)) orders = raw;
    else if (raw?.orders) orders = raw.orders;
    return orders.filter(o => (o.journalLog?.tableNumber || o.table) === ordersModal.tableId);
  }, [ordersModal.open, ordersModal.tableId, tableOrdersQuery.data]);

  useEffect(() => {
    if (!ordersModal.open || !ordersModal.tableId) return;
    setOrdersPerTable(prev => {
      const prevCount = prev[ordersModal.tableId];
      const nextCount = modalOrders.length;
      if (prevCount === nextCount) return prev;
      return { ...prev, [ordersModal.tableId]: nextCount };
    });
  }, [ordersModal.open, ordersModal.tableId, modalOrders.length]);

  const ordersLoading = tableOrdersQuery.isLoading;
  const ordersError = tableOrdersQuery.error;
  const ordersErrorMessage = ordersError?.message || '';
  const modalTableData = ordersModal.tableId ? tablesState[ordersModal.tableId] : null;
  const modalStatus =
    ordersModal.open && ordersModal.tableId
      ? getStatus(modalTableData, ordersModal.tableId, modalOrders.length)
      : null;
  const modalTableHasBill = modalTableData ? (modalTableData.unpaidBills ?? 0) > 0 : false;
  const modalHasBackendBill = ordersModal.tableId ? hasBackendOpenBill(ordersModal.tableId) : false;
  const disableModalNewOrder =
    modalStatus !== 'occupied' || modalTableHasBill || modalHasBackendBill || modalStatus === 'paid';

  if (!canView) return <div>Нет доступа к столам.</div>;

  const handleFree = async tableId => {
    setTablesState(prev => ({
      ...prev,
      [tableId]: { ordersCount: 0, unpaidBills: 0, paidBills: 0, manualStatus: 'free' },
    }));
    clearBillsForTable(tableId);
    setOrdersPerTable(prev => {
      if (!prev[tableId]) return prev;
      const next = { ...prev };
      delete next[tableId];
      return next;
    });
    markPendingStatus(tableId, 'free');
    await recordStatusChange(tableId, 'free');
  };

  const handleManualStatus = async (tableId, status, apiOrdersCount) => {
    const current = tablesState[tableId] || {};
    if (status === 'free') {
      if (current.unpaidBills > 0 || apiOrdersCount > 0) return;
      setTablesState(prev => ({
        ...prev,
        [tableId]: { ordersCount: 0, unpaidBills: 0, paidBills: 0, manualStatus: 'free' },
      }));
      clearBillsForTable(tableId);
      setOrdersPerTable(prev => {
        if (!prev[tableId]) return prev;
        const next = { ...prev };
        delete next[tableId];
        return next;
      });
      markPendingStatus(tableId, 'free');
      await recordStatusChange(tableId, 'free');
      return;
    }
    if (status === 'occupied') {
      setTablesState(prev => ({
        ...prev,
        [tableId]: { ordersCount: 0, unpaidBills: 0, paidBills: 0, manualStatus: 'occupied' },
      }));
      clearBillsForTable(tableId);
      setOrdersPerTable(prev => {
        if (!prev[tableId]) return prev;
        const next = { ...prev };
        delete next[tableId];
        return next;
      });
      markPendingStatus(tableId, 'occupied');
      await recordStatusChange(tableId, 'occupied');
    }
  };

  const goToOrders = (tableId, openCreate = false) => {
    const params = new URLSearchParams();
    params.set('table', tableId);
    if (openCreate) params.set('create', '1');
    navigate(`/orders?${params.toString()}`);
  };

  const openOrdersModal = tableId => {
    setBillActionError('');
    setBillActionNotice('');
    setOrdersModal({ open: true, tableId });
  };
  const closeOrdersModal = () => {
    setOrdersModal({ open: false, tableId: null });
    setBillActionError('');
    setBillActionNotice('');
  };

  const safeParseJson = text => {
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  };

  const createBillForGuest = async (tableId, guestNumber) => {
    const numGuest = Number(guestNumber);
    if (Number.isNaN(numGuest)) return;
    try {
      const res = await fetch(`${API_BASE}/bills/create`, {
        method: 'POST',
        headers: authorizedHeaders(),
        body: JSON.stringify({ tableNumber: tableId, guestNumber: numGuest, birthday: false }),
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(extractErrorMessage(res, text));
      }
      const data = safeParseJson(text) || {};
      const billId = data.billId;
      const bonusPoints = Number(data.bonusPoints);
      setBillsState(prev => ({
        ...prev,
        [tableId]: {
          ...(prev[tableId] || {}),
          [guestNumber]: { billId, status: 'not_paid' },
        },
      }));
      let updatedEntry = null;
      setTablesState(prev => {
        const current = prev[tableId] || { ordersCount: 0, unpaidBills: 0, paidBills: 0, manualStatus: null };
        updatedEntry = {
          ...current,
          unpaidBills: (current.unpaidBills || 0) + 1,
        };
        return {
          ...prev,
          [tableId]: updatedEntry,
        };
      });
      if (updatedEntry) syncLocalStatus(tableId, updatedEntry);
      await refreshTableStatus(tableId);
      setBillActionError('');
      if (!Number.isNaN(bonusPoints) && bonusPoints > 0) {
        setBillActionNotice(`Гость №${guestNumber} получает комплимент: ${bonusPoints} бонусов.`);
      } else {
        setBillActionNotice('');
      }
    } catch (e) {
      console.error('Ошибка создания счета', e);
      setBillActionError(normalizeErrorMessage(e.message) || 'Не удалось создать счёт');
      setBillActionNotice('');
    }
  };

  const payBillForGuest = async (tableId, guestNumber) => {
    const billInfo = billsState[tableId]?.[guestNumber];
    if (!billInfo?.billId) return;
    try {
      const res = await fetch(`${API_BASE}/bills/pay/${billInfo.billId}`, {
        method: 'POST',
        headers: authorizedHeaders(),
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(extractErrorMessage(res, text));
      }
      setBillsState(prev => ({
        ...prev,
        [tableId]: {
          ...(prev[tableId] || {}),
          [guestNumber]: { ...billInfo, status: 'paid' },
        },
      }));
      let updatedEntry = null;
      setTablesState(prev => {
        const current = prev[tableId] || { ordersCount: 0, unpaidBills: 0, paidBills: 0, manualStatus: null };
        updatedEntry = {
          ...current,
          unpaidBills: Math.max(0, (current.unpaidBills || 0) - 1),
          paidBills: (current.paidBills || 0) + 1,
        };
        return {
          ...prev,
          [tableId]: updatedEntry,
        };
      });
      if (updatedEntry) syncLocalStatus(tableId, updatedEntry);
      await refreshTableStatus(tableId);
      setBillActionError('');
      setBillActionNotice('');
    } catch (e) {
      console.error('Ошибка оплаты счета', e);
      setBillActionError(normalizeErrorMessage(e.message) || 'Не удалось оплатить счёт');
    }
  };

  const getBillInfo = (tableId, guestNumber) => {
    if (!tableId) return null;
    const tableBills = billsState[tableId] || {};
    const guestKey = guestNumber ?? '-';
    if (tableBills[guestKey]) return tableBills[guestKey];
    if (hasBackendOpenBill(tableId)) {
      return { status: 'not_paid', inferred: true };
    }
    return null;
  };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1>Столы</h1>
        {tableStatusesQuery.isError && (
          <ErrorWindow
            title="Ошибка загрузки статусов"
            message={tableStatusesErrorMessage}
            onRetry={tableStatusesQuery.refetch}
          />
        )}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(160px, 1fr))',
            gap: 16,
          }}
        >
          {tableList.map(table => {
            const tableData = tablesState[table.id];
            const apiOrdersCount = ordersPerTable[table.id] || 0;
            const status = getStatus(tableData, table.id, apiOrdersCount);
            const tableStatusError = statusErrors[table.id];
            const tableOwnerId = tableOwners[table.id];
            const highlight =
              status !== 'free' &&
              employeeId != null &&
              tableOwnerId != null &&
              Number(tableOwnerId) === Number(employeeId);
            const tableHasBill = (tableData.unpaidBills ?? 0) > 0 || hasBackendOpenBill(table.id);
            const disableAddOrder = status !== 'occupied' || tableHasBill || status === 'paid';
            return (
              <div
                key={table.id}
                style={{
                  border: highlight ? '2px solid #f39c12' : '1px solid #ddd',
                  borderRadius: 8,
                  padding: 12,
                  background: highlight ? '#fff6e5' : '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700 }}>{table.label}</div>
                  <div
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      background: statusColors[status] || '#eee',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {statusLabels[status] || status}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#666' }}>Код стола: {table.code}</div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  Заказы: {tableData.ordersCount + apiOrdersCount} · Неоплаченные счета: {tableData.unpaidBills} · Оплаченные: {tableData.paidBills}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    className="btn-light"
                    onClick={() => handleManualStatus(table.id, 'occupied', apiOrdersCount)}
                    disabled={status !== 'free'}
                    style={{ padding: '4px 6px', fontSize: 12 }}
                  >
                    Занят
                  </button>
                </div>
                {tableStatusError && (
                  <ErrorWindow
                    title="Ошибка смены статуса"
                    message={tableStatusError}
                    style={{ fontSize: 13 }}
                  />
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <button
                    className="btn-create"
                    onClick={() => goToOrders(table.id, true)}
                    disabled={disableAddOrder}
                    style={{ flex: '1 1 45%', minWidth: 0, padding: '6px 8px' }}
                  >
                    Добавить заказ
                  </button>
                  {(status === 'paid' || status === 'occupied') && canFree && (
                    <button className="btn-create" onClick={() => handleFree(table.id)} style={{ flex: '1 1 45%', minWidth: 0 }}>
                      Освободить
                    </button>
                  )}
                </div>
                <button
                  onClick={() => openOrdersModal(table.id)}
                  disabled={status === 'free'}
                  style={{ marginTop: 4, padding: '8px 10px' }}
                >
                  К заказам стола
                </button>
              </div>
            );
          })}
        </div>
      </div>
      {ordersModal.open && (
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
              maxWidth: 500,
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Заказы стола {ordersModal.tableId}</h3>
              <button
                onClick={closeOrdersModal}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#333' }}
              >
                X
              </button>
            </div>
            {ordersLoading && <div>Загрузка заказов...</div>}
            {ordersError && (
              <ErrorWindow
                message={`Ошибка загрузки заказов: ${ordersErrorMessage || 'Попробуйте обновить страницу.'}`}
                onRetry={tableOrdersQuery.refetch}
              />
            )}
            {!ordersLoading && !ordersError && (
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                      <th style={{ padding: '8px 6px' }}>ID</th>
                      <th style={{ padding: '8px 6px' }}>Гость</th>
                      <th style={{ padding: '8px 6px' }}>Блюдо</th>
                      <th style={{ padding: '8px 6px' }}>Стоимость</th>
                      <th style={{ padding: '8px 6px' }}>Время</th>
                      <th style={{ padding: '8px 6px' }}>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalOrders.map(order => {
                      const statusText = order.orderStatus || order.status || '-';
                      const isCooked =
                        typeof statusText === 'string' && statusText.toLowerCase() === 'cooked';
                      return (
                        <tr key={order.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '8px 6px', fontSize: 12, color: '#666' }}>{order.id}</td>
                          <td style={{ padding: '8px 6px' }}>{order.guestNumber ?? order.guest ?? '-'}</td>
                          <td style={{ padding: '8px 6px' }}>{order.dish?.name || '-'}</td>
                          <td style={{ padding: '8px 6px' }}>
                            {order.dish?.cost != null ? `${order.dish.cost}` : order.cost ?? '—'}
                          </td>
                          <td style={{ padding: '8px 6px', fontSize: 12, color: '#666' }}>
                            {order.time ? new Date(order.time * 1000).toLocaleString() : '-'}
                          </td>
                          <td
                            style={{
                              padding: '8px 6px',
                              color: isCooked ? '#27ae60' : undefined,
                              fontWeight: isCooked ? 600 : undefined,
                            }}
                          >
                            {statusText}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {!ordersLoading && !ordersError && (
              <div style={{ marginTop: 12 }}>
                <h4 style={{ margin: '8px 0' }}>Счета по гостям</h4>
                {billActionError && (
                  <ErrorWindow
                    title="Ошибка работы со счетом"
                    message={billActionError}
                    style={{ marginBottom: 8 }}
                  />
                )}
                {billActionNotice && (
                  <div
                    style={{
                      marginBottom: 8,
                      padding: 10,
                      borderRadius: 8,
                      background: '#eafaf1',
                      border: '1px solid #c7e6d2',
                      color: '#1f7a3d',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {billActionNotice}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Array.from(new Set(modalOrders.map(o => o.guestNumber ?? o.guest))).map(guest => {
                    const guestNumber = guest ?? '-';
                    const guestOrders = modalOrders.filter(
                      order => (order.guestNumber ?? order.guest ?? '-') === guestNumber,
                    );
                    const billTotal = guestOrders.reduce((sum, order) => {
                      const cost = order.dish?.cost ?? order.cost;
                      return cost != null ? sum + Number(cost) : sum;
                    }, 0);
                    const billInfo = getBillInfo(ordersModal.tableId, guestNumber);
                    const statusLabel =
                      billInfo?.status === 'paid'
                        ? 'Оплачен'
                        : billInfo
                          ? billInfo.inferred
                            ? 'Не оплачен (по данным журнала)'
                            : 'Не оплачен'
                          : 'Нет счета';
                    const hasRealBill = !!billInfo && !billInfo.inferred;
                    const disableCreate = modalStatus === 'paid' || hasRealBill;
                    const disablePay =
                      !billInfo || billInfo.inferred || billInfo.status === 'paid' || !billInfo.billId;
                    return (
                      <div
                        key={guestNumber}
                        style={{
                          border: '1px solid #eee',
                          borderRadius: 8,
                          padding: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>Гость №{guestNumber}</span>
                          <span style={{ fontSize: 12, color: '#666' }}>{statusLabel}</span>
                          {billInfo?.billId && (
                            <span style={{ fontSize: 12, color: '#999' }}>ID счета: {billInfo.billId}</span>
                          )}
                          <span style={{ fontSize: 12, color: '#999' }}>
                            Сумма: {billTotal ? `${billTotal.toFixed(2)}` : '—'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn-create"
                            onClick={() => createBillForGuest(ordersModal.tableId, guestNumber)}
                            disabled={disableCreate}
                            style={{ padding: '6px 10px' }}
                          >
                            Создать счёт
                          </button>
                          <button className="btn-create" onClick={() => payBillForGuest(ordersModal.tableId, guestNumber)} disabled={disablePay} style={{ padding: '6px 10px' }}>
                            Оплатить
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                className="btn-create"
                onClick={() => {
                  closeOrdersModal();
                  goToOrders(ordersModal.tableId, true);
                }}
                disabled={disableModalNewOrder}
                style={{ padding: '8px 12px' }}
              >
                Новый заказ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TablesPage;
