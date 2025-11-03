import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../config/supabase'

function ProtectedRoute({ children, requireAdmin = false }) {
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setIsAuthorized(false)
          setLoading(false)
          return
        }

        // Se não requer admin, apenas estar autenticado é suficiente
        if (!requireAdmin) {
          setIsAuthorized(true)
          setLoading(false)
          return
        }

        // Se requer admin, SEMPRE buscar do banco (não usar cache)
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (error) {

          setIsAuthorized(false)
          setLoading(false)
          return
        }

        const isAdmin = profile?.role === 'admin'

        setIsAuthorized(isAdmin)
        setLoading(false)
      } catch (error) {

        setIsAuthorized(false)
        setLoading(false)
      }
    }

    checkAccess()
  }, [requireAdmin])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando acesso...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    // Se não está autenticado, redireciona para login
    // Se está autenticado mas não é admin, redireciona para acesso negado
    if (requireAdmin) {
      return <Navigate to="/acesso-negado" replace />
    }
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
