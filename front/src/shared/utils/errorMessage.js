const isInvalidTokenMessage = value =>
  typeof value === 'string' && value.trim().toLowerCase() === 'invalid or expired token';

export const extractErrorMessage = (response, text) => {
  const raw = typeof text === 'string' ? text.trim() : '';
  const parsedMessage = (() => {
    if (!raw) return '';
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') return parsed;
      if (parsed && typeof parsed.message === 'string') return parsed.message;
    } catch {
      // ignore parse errors
    }
    return raw;
  })();

  if (response?.status === 500) {
    if (isInvalidTokenMessage(parsedMessage) || isInvalidTokenMessage(raw)) {
      return 'Ошибка авторизации, необходимо выйти из аккаунта и войти вновь';
    }
    return 'Внутренняя ошибка сервера';
  }

  if (!raw) {
    return response?.statusText || 'Произошла ошибка';
  }
  return parsedMessage;
};

export const normalizeErrorMessage = message => {
  if (!message) return 'Произошла ошибка';
  const raw = String(message).trim();
  if (!raw) return 'Произошла ошибка';
  if (raw.toLowerCase() === 'internal server error') return 'Внутренняя ошибка сервера';
  if (isInvalidTokenMessage(raw)) return 'Ошибка авторизации, необходимо выйти из аккаунта и войти вновь';
  return raw;
};
