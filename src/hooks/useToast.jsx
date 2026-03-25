import { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/ui/Toast';
const ToastContext = createContext();
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
export const ToastProvider = ({
  children
}) => {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, {
      id,
      message,
      type,
      duration
    }]);
  }, []);
  const removeToast = useCallback(id => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);
  const showSuccess = useCallback(message => {
    addToast(message, 'success');
  }, [addToast]);
  const showError = useCallback(message => {
    addToast(message, 'error', 5000);
  }, [addToast]);
  const showWarning = useCallback(message => {
    addToast(message, 'warning', 4000);
  }, [addToast]);
  const showInfo = useCallback(message => {
    addToast(message, 'info');
  }, [addToast]);
  return <ToastContext.Provider value={{
    showSuccess,
    showError,
    showWarning,
    showInfo
  }}>
      {children}

      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[200] flex max-h-[calc(100dvh-2rem)] w-[min(100vw-1.5rem,24rem)] flex-col-reverse gap-2 overflow-y-auto overscroll-contain sm:bottom-6 sm:right-6"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>;
};
