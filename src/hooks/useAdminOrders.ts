import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchAdminOrders, updateAdminOrderStatus } from '../api/admin'
import type { AdminOrderStatus, ApiOrder } from '../api/types'
import { useAdminAuth } from './useAdminAuth'

export type OrderSortKey = 'id' | 'date' | 'customer' | 'total'
export type OrderSortDir = 'asc' | 'desc'

function compareOrders(a: ApiOrder, b: ApiOrder, sortKey: OrderSortKey): number {
  switch (sortKey) {
    case 'id':
      return a.id - b.id
    case 'date':
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    case 'customer': {
      const nameA = `${a.firstname} ${a.lastname}`.trim().toLowerCase()
      const nameB = `${b.firstname} ${b.lastname}`.trim().toLowerCase()
      return nameA.localeCompare(nameB)
    }
    case 'total':
      return a.total - b.total
    default:
      return 0
  }
}

export function filterAdminOrders(
  orders: ApiOrder[],
  searchQuery: string,
  sortKey: OrderSortKey,
  sortDir: OrderSortDir
): ApiOrder[] {
  let result = [...orders]

  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase()
    result = result.filter((order) => {
      const customer = `${order.firstname} ${order.lastname}`.toLowerCase()
      return (
        String(order.id).includes(query) ||
        order.email.toLowerCase().includes(query) ||
        order.phone.includes(query) ||
        customer.includes(query)
      )
    })
  }

  result.sort((a, b) => {
    const comparison = compareOrders(a, b, sortKey)
    return sortDir === 'asc' ? comparison : -comparison
  })

  return result
}

export function useAdminOrders() {
  const { token } = useAdminAuth()
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set())

  const loadOrders = useCallback(() => {
    if (!token) return

    setIsLoading(true)
    setError(null)

    void fetchAdminOrders(token)
      .then((data) => {
        setOrders(data)
        setIsLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load orders')
        setOrders([])
        setIsLoading(false)
      })
  }, [token])

  useEffect(() => {
    if (!token) return

    let cancelled = false

    void fetchAdminOrders(token)
      .then((data) => {
        if (!cancelled) {
          setOrders(data)
          setError(null)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load orders')
          setOrders([])
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const orderCount = useMemo(() => orders.length, [orders])

  const updateOrderStatus = useCallback(
    (orderId: number, status: AdminOrderStatus) => {
      if (!token) return

      let previousStatus: string | undefined

      setOrders((prev) => {
        previousStatus = prev.find((order) => order.id === orderId)?.status
        return prev.map((order) => (order.id === orderId ? { ...order, status } : order))
      })

      setSavingIds((prev) => new Set(prev).add(orderId))

      void updateAdminOrderStatus(token, orderId, status)
        .catch((err) => {
          if (previousStatus !== undefined) {
            const rollbackStatus = previousStatus
            setOrders((prev) =>
              prev.map((order) =>
                order.id === orderId ? { ...order, status: rollbackStatus } : order
              )
            )
          }
          setError(err instanceof Error ? err.message : 'Failed to update order status')
        })
        .finally(() => {
          setSavingIds((prev) => {
            const next = new Set(prev)
            next.delete(orderId)
            return next
          })
        })
    },
    [token]
  )

  return {
    orders,
    orderCount,
    isLoading,
    error,
    savingIds,
    reload: loadOrders,
    updateOrderStatus,
  }
}
