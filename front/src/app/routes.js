import { Permissions, Roles, can } from '../domain/auth.js';
import DashboardPage from '../modules/DashboardPage.jsx';
import TablesPage from '../modules/TablesPage.jsx';
import OrdersPage from '../modules/OrdersPage.jsx';
import KitchenPage from '../modules/KitchenPage.jsx';
import BarPage from '../modules/BarPage.jsx';
import MenuPage from '../modules/MenuPage.jsx';
import IngredientsPage from '../modules/IngredientsPage.jsx';
import EmployeesPage from '../modules/EmployeesPage.jsx';
import WalletPage from '../modules/WalletPage.jsx';

export const routes = [
  { path: '/dashboard', element: DashboardPage, label: 'Статистика', permissions: [] },
  { path: '/tables', element: TablesPage, label: 'Столы', permissions: [Permissions.TABLES_VIEW] },
  {
    path: '/orders',
    element: OrdersPage,
    label: 'Заказы',
    permissions: [Permissions.ORDERS_CREATE, Permissions.ORDERS_STATUS_CHANGE],
  },
  { path: '/kitchen', element: KitchenPage, label: 'Кухня', permissions: [Permissions.KITCHEN_ORDERS_VIEW] },
  { path: '/bar', element: BarPage, label: 'Бар', permissions: [Permissions.BAR_ORDERS_VIEW] },
  { path: '/menu', element: MenuPage, label: 'Меню', permissions: [Permissions.MENU_VIEW] },
  { path: '/ingredients', element: IngredientsPage, label: 'Ингредиенты', permissions: [Permissions.INGREDIENTS_VIEW] },
  { path: '/employees', element: EmployeesPage, label: 'Сотрудники', permissions: [Permissions.EMPLOYEES_EDIT] },
  { path: '/wallet', element: WalletPage, label: 'Кошелек', permissions: [Permissions.WALLET_VIEW] },
];

export const getVisibleRoutes = role =>
  routes.filter(route => {
    if ((role === Roles.BARMAN || role === Roles.COOK) && ['/dashboard', '/wallet', '/orders'].includes(route.path)) {
      return false;
    }
    if (!route.permissions || route.permissions.length === 0) return true;
    return route.permissions.some(perm => can(role, perm));
  });
