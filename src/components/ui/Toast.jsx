import { useEffect } from 'react';
import { FiCheckCircle, FiXCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi';

function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <FiCheckCircle className="w-5 h-5 shrink-0 text-green-600 dark:text-green-400" />,
    error: <FiXCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />,
    warning: <FiAlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />,
    info: <FiInfo className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400" />
  };

  const shell = {
    success:
      'bg-white dark:bg-gray-900 border-green-200 dark:border-green-800 shadow-lg shadow-green-900/10 dark:shadow-black/40',
    error:
      'bg-white dark:bg-gray-900 border-red-200 dark:border-red-800 shadow-lg shadow-red-900/10 dark:shadow-black/40',
    warning:
      'bg-white dark:bg-gray-900 border-amber-200 dark:border-amber-800 shadow-lg shadow-amber-900/10 dark:shadow-black/40',
    info: 'bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-800 shadow-lg shadow-blue-900/10 dark:shadow-black/40'
  };

  return (
    <div
      role="status"
      className={`pointer-events-auto flex w-full max-w-[min(100vw-2rem,24rem)] items-start gap-3 rounded-xl border p-3.5 sm:p-4 ${shell[type]} animate-slide-in`}
    >
      {icons[type]}
      <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-gray-900 dark:text-gray-100 whitespace-pre-line break-words">
        {message}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded-md p-0.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        aria-label="Fechar notificação"
      >
        <FiX className="h-4 w-4" />
      </button>
    </div>
  );
}

export default Toast;
