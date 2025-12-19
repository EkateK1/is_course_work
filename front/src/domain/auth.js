export const Roles = {
  ADMIN: 'ADMIN',
  WAITER: 'WAITER',
  BARMAN: 'BARMAN',
  COOK: 'COOK',
};

export const Table = {
  T1: 'T1',
  T2: 'T2',
  T3: 'T3',
  T4: 'T4',
  T5: 'T5',
  T6: 'T6',
  T7: 'T7',
  T8: 'T8',
  T9: 'T9',
  T10: 'T10',
};

export const Permissions = {
  TABLES_VIEW: 'TABLES_VIEW',
  ORDERS_CREATE: 'ORDERS_CREATE',
  ORDERS_STATUS_CHANGE: 'ORDERS_STATUS_CHANGE',
  ORDERS_DELETE: 'ORDERS_DELETE',
  KITCHEN_ORDERS_VIEW: 'KITCHEN_ORDERS_VIEW',
  BAR_ORDERS_VIEW: 'BAR_ORDERS_VIEW',
  BILLS_CREATE: 'BILLS_CREATE',
  MENU_VIEW: 'MENU_VIEW',
  MENU_EDIT: 'MENU_EDIT',
  INGREDIENTS_VIEW: 'INGREDIENTS_VIEW',
  EMPLOYEES_EDIT: 'EMPLOYEES_EDIT',
  WALLET_VIEW: 'WALLET_VIEW',
};

export const permissionsMatrix = {
  ADMIN: [
    Permissions.TABLES_VIEW,
    Permissions.ORDERS_CREATE,
    Permissions.ORDERS_STATUS_CHANGE,
    Permissions.ORDERS_DELETE,
    Permissions.KITCHEN_ORDERS_VIEW,
    Permissions.BAR_ORDERS_VIEW,
    Permissions.BILLS_CREATE,
    Permissions.MENU_VIEW,
    Permissions.MENU_EDIT,
    Permissions.INGREDIENTS_VIEW,
    Permissions.EMPLOYEES_EDIT,
    Permissions.WALLET_VIEW,
  ],
  WAITER: [
    Permissions.TABLES_VIEW,
    Permissions.ORDERS_CREATE,
    Permissions.ORDERS_STATUS_CHANGE,
    Permissions.BILLS_CREATE,
    Permissions.MENU_VIEW,
    Permissions.WALLET_VIEW,
  ],
  BARMAN: [
    Permissions.BAR_ORDERS_VIEW,
    Permissions.ORDERS_STATUS_CHANGE,
    Permissions.BILLS_CREATE,
    Permissions.WALLET_VIEW,
  ],
  COOK: [Permissions.KITCHEN_ORDERS_VIEW, Permissions.ORDERS_STATUS_CHANGE, Permissions.INGREDIENTS_VIEW],
};

export const can = (role, permission) => {
  if (!role || !permission) return false;
  return permissionsMatrix[role]?.includes(permission) || false;
};
