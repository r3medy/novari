import { AnimatePresence, m } from 'framer-motion'
import type { AdminOrderStatus } from '../../api/types'
import type { ApiOrder } from '../../api/types'
import { formatPrice } from '../../data/products'
import { AdminOrderStatusSelect } from './AdminOrderStatusSelect'

interface AdminOrderRowProps {
  order: ApiOrder
  expanded: boolean
  saving?: boolean
  onToggle: () => void
  onStatusChange: (orderId: number, status: AdminOrderStatus) => void
}

const chevron = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="square"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

function formatOrderDate(iso: string): string {
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return '—'

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function customerName(order: ApiOrder): string {
  return `${order.firstname} ${order.lastname}`.trim() || '—'
}

function formatProductId(productId: number): string {
  return String(productId).padStart(2, '0')
}

export function AdminOrderRow({
  order,
  expanded,
  saving = false,
  onToggle,
  onStatusChange,
}: AdminOrderRowProps) {
  return (
    <>
      <tr className="border-b border-cream/10 bg-obsidian transition-colors duration-300 last:border-b-0 hover:bg-charcoal/50">
        <td className="px-6 py-4">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse order details' : 'Expand order details'}
            className="flex w-full items-center gap-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <span className="font-mono text-sm text-cream">#{order.id}</span>
            <span
              className={`ml-auto text-cream/60 transition-transform duration-300 ${
                expanded ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            >
              {chevron}
            </span>
          </button>
        </td>
        <td className="px-6 py-4 align-middle">
          <p className="font-mono text-sm uppercase tracking-wide text-cream">
            {customerName(order)}
          </p>
          <p className="font-mono text-xs text-cream/60">{order.email}</p>
        </td>
        <td className="px-6 py-4 align-middle">
          <p className="font-mono text-sm text-cream/80">{formatOrderDate(order.created_at)}</p>
        </td>
        <td className="px-6 py-4 align-middle">
          <p className="font-mono text-sm text-cream/80">
            {order.item_count} {order.item_count === 1 ? 'item' : 'items'}
          </p>
        </td>
        <td className="px-6 py-4 align-middle">
          <p className="font-mono text-sm text-cream/80">{formatPrice(order.total)}</p>
        </td>
        <td className="px-6 py-4 align-middle">
          <AdminOrderStatusSelect
            orderId={order.id}
            status={order.status}
            disabled={saving}
            onChange={onStatusChange}
          />
        </td>
      </tr>

      <AnimatePresence initial={false}>
        {expanded && (
          <m.tr
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="border-b border-cream/10 bg-charcoal/30"
          >
            <td colSpan={6} className="p-0">
              <div className="grid gap-8 px-6 py-8 md:grid-cols-2 md:px-10">
                <section>
                  <h3 className="mb-4 font-mono text-nav uppercase tracking-widest text-gold">
                    Customer
                  </h3>
                  <dl className="space-y-3 font-mono text-sm text-cream/80">
                    <div>
                      <dt className="text-cream/60">Name</dt>
                      <dd>{customerName(order)}</dd>
                    </div>
                    <div>
                      <dt className="text-cream/60">Email</dt>
                      <dd>{order.email}</dd>
                    </div>
                    <div>
                      <dt className="text-cream/60">Phone</dt>
                      <dd>{order.phone}</dd>
                    </div>
                    <div>
                      <dt className="text-cream/60">Payment</dt>
                      <dd className="uppercase tracking-wide">{order.payment_method}</dd>
                    </div>
                  </dl>
                </section>

                <section>
                  <h3 className="mb-4 font-mono text-nav uppercase tracking-widest text-gold">
                    Shipping
                  </h3>
                  <dl className="space-y-3 font-mono text-sm text-cream/80">
                    <div>
                      <dt className="text-cream/60">Address</dt>
                      <dd>{order.address || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-cream/60">City</dt>
                      <dd>{order.city}</dd>
                    </div>
                    {order.order_notes && (
                      <div>
                        <dt className="text-cream/60">Notes</dt>
                        <dd>{order.order_notes}</dd>
                      </div>
                    )}
                  </dl>
                </section>

                <section className="md:col-span-2">
                  <h3 className="mb-4 font-mono text-nav uppercase tracking-widest text-gold">
                    Line items
                  </h3>
                  {order.items.length === 0 ? (
                    <p className="font-mono text-sm text-cream/60">No line items recorded.</p>
                  ) : (
                    <div className="overflow-x-auto border border-cream/20">
                      <table className="w-full min-w-[36rem] border-collapse">
                        <thead>
                          <tr className="border-b border-cream/20 bg-charcoal">
                            <th className="px-4 py-3 text-left font-mono text-nav uppercase tracking-widest text-cream/60">
                              ID
                            </th>
                            <th className="px-4 py-3 text-left font-mono text-nav uppercase tracking-widest text-cream/60">
                              Product
                            </th>
                            <th className="px-4 py-3 text-left font-mono text-nav uppercase tracking-widest text-cream/60">
                              Color
                            </th>
                            <th className="px-4 py-3 text-left font-mono text-nav uppercase tracking-widest text-cream/60">
                              Size
                            </th>
                            <th className="px-4 py-3 text-right font-mono text-nav uppercase tracking-widest text-cream/60">
                              Qty
                            </th>
                            <th className="px-4 py-3 text-right font-mono text-nav uppercase tracking-widest text-cream/60">
                              Unit
                            </th>
                            <th className="px-4 py-3 text-right font-mono text-nav uppercase tracking-widest text-cream/60">
                              Subtotal
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item, index) => {
                            const lineTotal = item.unit_price * item.quantity
                            return (
                              <tr
                                key={`${order.id}-${item.product_id}-${index}`}
                                className="border-b border-cream/10 last:border-b-0"
                              >
                                <td className="px-4 py-3 font-mono text-sm text-cream/80">
                                  {formatProductId(item.product_id)}
                                </td>
                                <td className="px-4 py-3 font-mono text-sm text-cream">
                                  {item.name || `Product #${item.product_id}`}
                                </td>
                                <td className="px-4 py-3 font-mono text-sm text-cream/80">
                                  {item.color || '—'}
                                </td>
                                <td className="px-4 py-3 font-mono text-sm text-cream/80">
                                  {item.size || '—'}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-sm text-cream/80">
                                  {item.quantity}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-sm text-cream/80">
                                  {formatPrice(item.unit_price)}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-sm text-cream">
                                  {formatPrice(lineTotal)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-cream/20 bg-charcoal/50">
                            <td
                              colSpan={6}
                              className="px-4 py-3 text-right font-mono text-nav uppercase tracking-widest text-gold"
                            >
                              Total
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-sm text-cream">
                              {formatPrice(order.total)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            </td>
          </m.tr>
        )}
      </AnimatePresence>
    </>
  )
}
