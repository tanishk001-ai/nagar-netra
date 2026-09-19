import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getFlags, confirmFlag, dismissFlag, sendToReview } from '../api/client'

const FlagsContext = createContext(null)

export function FlagsProvider({ children }) {
  const [flags, setFlags] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    getFlags()
      .then((data) => {
        if (!cancelled) setFlags(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const applyUpdate = (updated) => {
    setFlags((prev) => prev.map((f) => (f.plot_id === updated.plot_id ? updated : f)))
  }

  const setStatus = async (plotId, action) => {
    const fn = action === 'confirmed' ? confirmFlag : action === 'dismissed' ? dismissFlag : sendToReview
    const updated = await fn(plotId)
    applyUpdate(updated)
    return updated
  }

  const value = useMemo(() => ({ flags, loading, error, setStatus }), [flags, loading, error])

  return <FlagsContext.Provider value={value}>{children}</FlagsContext.Provider>
}

export function useFlags() {
  const ctx = useContext(FlagsContext)
  if (!ctx) throw new Error('useFlags must be used within FlagsProvider')
  return ctx
}
