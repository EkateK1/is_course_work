import { useAuthStore } from '../../app/store/authStore.js';
import { can } from '../../domain/auth.js';

export const useCan = permission => {
  const { role } = useAuthStore();
  return can(role, permission);
};
