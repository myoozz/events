import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function RoleGate({ allowedRoles = [], fallback = null, children }) {
  const [role, setRole] = useState(null)
  const [platformRole, setPlatformRole] = useState(null)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        if (!cancelled) setResolved(true)
        return
      }

      const platform = session.user.app_metadata?.platform_role ?? null

      const { data: row } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', session.user.id)
        .single()

      if (cancelled) return
      setPlatformRole(platform)
      setRole(row?.role ?? null)
      setResolved(true)
    }

    resolve()
    return () => { cancelled = true }
  }, [])

  if (!resolved) return null

  const allowed =
    (role && allowedRoles.includes(role)) ||
    (platformRole === 'super_admin' && allowedRoles.includes('super_admin'))

  return allowed ? children : fallback
}
