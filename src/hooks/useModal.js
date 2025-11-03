import { useState, useCallback } from 'react'

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
  })

  const showModal = useCallback(({
    title,
    message,
    type = 'info',
    confirmText = 'OK',
    cancelText = 'Cancelar',
    showCancel = false,
    onConfirm = null
  }) => {
    setModalState({
      isOpen: true,
      title,
      message,
      type,
      confirmText,
      cancelText,
      showCancel,
      onConfirm
    })
  }, [])

  const showSuccess = useCallback((message, title = 'Sucesso') => {
    showModal({ title, message, type: 'success' })
  }, [showModal])

  const showError = useCallback((message, title = 'Erro') => {
    showModal({ title, message, type: 'error' })
  }, [showModal])

  const showWarning = useCallback((message, title = 'Atenção') => {
    showModal({ title, message, type: 'warning' })
  }, [showModal])

  const showInfo = useCallback((message, title = 'Informação') => {
    showModal({ title, message, type: 'info' })
  }, [showModal])

  const showConfirm = useCallback((message, onConfirm, title = 'Confirmação') => {
    showModal({ 
      title, 
      message, 
      type: 'warning', 
      showCancel: true,
      confirmText: 'Confirmar',
      onConfirm 
    })
  }, [showModal])

  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }))
  }, [])

  return {
    modalState,
    showModal,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
    closeModal
  }
}
