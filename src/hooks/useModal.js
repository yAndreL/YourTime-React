import { useState, useCallback } from 'react';

/** Modal apenas para confirmações e diálogos que exigem ação do usuário. Feedback de sucesso/erro: use useToast. */
export const useModal = () => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'OK',
    cancelText: 'Cancelar',
    showCancel: false,
    onConfirm: null
  });

  const showModal = useCallback(
    ({ title, message, type = 'info', confirmText = 'OK', cancelText = 'Cancelar', showCancel = false, onConfirm = null }) => {
      setModalState({
        isOpen: true,
        title,
        message,
        type,
        confirmText,
        cancelText,
        showCancel,
        onConfirm
      });
    },
    []
  );

  const showConfirm = useCallback(
    (message, onConfirm, title = 'Confirmação') => {
      showModal({
        title,
        message,
        type: 'warning',
        showCancel: true,
        confirmText: 'Confirmar',
        onConfirm
      });
    },
    [showModal]
  );

  const closeModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      isOpen: false
    }));
  }, []);

  return {
    modalState,
    showModal,
    showConfirm,
    closeModal
  };
};
