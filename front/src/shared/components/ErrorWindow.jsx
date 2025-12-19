import React, { useEffect, useState } from 'react';

export const ErrorWindow = ({
  title = 'Ошибка',
  message,
  children,
  onRetry,
  retryLabel = 'Повторить попытку',
  onClose,
  className = '',
  style,
}) => {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [message]);

  if ((!message && !children) || dismissed) return null;

  const handleClose = () => {
    setDismissed(true);
    if (onClose) onClose();
  };

  return (
    <div className={`error-window ${className}`.trim()} style={style}>
      <button type="button" className="error-window__close" aria-label="Закрыть уведомление" onClick={handleClose}>
        ×
      </button>
      <div className="error-window__icon" aria-hidden="true">
        !
      </div>
      <div className="error-window__body">
        <p className="error-window__title">{title}</p>
        {message && <p className="error-window__text">{message}</p>}
        {children}
        {onRetry && (
          <div className="error-window__actions">
            <button type="button" className="btn-light" onClick={onRetry}>
              {retryLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorWindow;
