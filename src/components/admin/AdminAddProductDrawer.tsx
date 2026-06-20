import { useState, type FormEvent } from 'react'
import { SideDrawer } from '../SideDrawer'
import { Button } from '../primitives'
import { TextField } from '../TextField'
import type { NewAdminProduct } from '../../hooks/useAdminProducts'

interface AdminAddProductDrawerProps {
  open: boolean
  onClose: () => void
  onAddProduct: (product: NewAdminProduct) => Promise<string>
  onCreated: (id: string) => void
}

const inputClassName =
  'mt-2 h-12 w-full border border-cream/30 bg-obsidian px-4 py-3 font-mono text-sm text-cream transition-colors duration-300 focus:border-gold focus:outline-none'

const textareaClassName =
  'mt-2 w-full resize-none border border-cream/30 bg-obsidian px-4 py-3 font-mono text-sm text-cream transition-colors duration-300 focus:border-gold focus:outline-none'

export function AdminAddProductDrawer({
  open,
  onClose,
  onAddProduct,
  onCreated,
}: AdminAddProductDrawerProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('T-Shirts')
  const [numericPrice, setNumericPrice] = useState(450)
  const [discount, setDiscount] = useState(0)
  const [description, setDescription] = useState('')
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [inStock, setInStock] = useState(true)
  const [stockCount, setStockCount] = useState(10)
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setName('')
    setCategory('T-Shirts')
    setNumericPrice(450)
    setDiscount(0)
    setDescription('')
    setSelectedColors([])
    setInStock(true)
    setStockCount(10)
    setError(null)
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Product name is required.')
      return
    }

    void (async () => {
      try {
        const id = await onAddProduct({
          name: trimmedName,
          category: category.trim() || 'T-Shirts',
          numericPrice: Math.max(0, numericPrice),
          discount: Math.min(100, Math.max(0, discount)),
          description: description.trim(),
          colors: selectedColors,
          inStock,
          stockCount: Math.max(0, stockCount),
        })

        resetForm()
        onCreated(id)
        onClose()
      } catch {
        setError('Failed to create product. Please try again.')
      }
    })()
  }

  return (
    <SideDrawer
      open={open}
      onClose={handleClose}
      side="right"
      width="w-full max-w-xl"
      className="flex flex-col border-l border-cream/20 bg-charcoal"
      role="dialog"
      aria-modal
      aria-label="Add product"
    >
      <form
        onSubmit={handleSubmit}
        className="flex h-full flex-col overflow-y-auto"
      >
        <div className="border-b border-cream/20 px-6 py-6 md:px-8">
          <h2 className="font-display text-3xl uppercase tracking-wide text-cream">
            Add Product
          </h2>
          <p className="mt-2 font-mono text-sm text-cream/60">
            Create a new catalog entry. Add images and colors after saving.
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-8 px-6 py-8 md:px-8">
          <TextField
            label="Product name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <div>
            <label
              htmlFor="admin-new-product-category"
              className="font-mono text-sm uppercase tracking-widest text-cream/80"
            >
              Category
            </label>
            <input
              id="admin-new-product-category"
              type="text"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={inputClassName}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="admin-new-product-price"
                className="font-mono text-sm uppercase tracking-widest text-cream/80"
              >
                Price (EGP)
              </label>
              <input
                id="admin-new-product-price"
                type="number"
                min={0}
                step={10}
                value={numericPrice}
                onChange={(event) =>
                  setNumericPrice(Math.max(0, Number(event.target.value)))
                }
                className={inputClassName}
              />
            </div>
            <div>
              <label
                htmlFor="admin-new-product-discount"
                className="font-mono text-sm uppercase tracking-widest text-cream/80"
              >
                Discount (%)
              </label>
              <input
                id="admin-new-product-discount"
                type="number"
                min={0}
                max={100}
                step={5}
                value={discount}
                onChange={(event) =>
                  setDiscount(
                    Math.min(100, Math.max(0, Number(event.target.value)))
                  )
                }
                className={inputClassName}
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="admin-new-product-stock-status"
                className="font-mono text-sm uppercase tracking-widest text-cream/80"
              >
                Stock status
              </label>
              <label
                htmlFor="admin-new-product-stock-status"
                className="mt-2 flex h-12 cursor-pointer items-center justify-between border border-cream/20 bg-obsidian px-4 transition-colors duration-300 focus-within:ring-2 focus-within:ring-gold"
              >
                <span className="font-mono text-sm text-cream/80">
                  {inStock ? 'In stock' : 'Out of stock'}
                </span>
                <span
                  className={`relative inline-flex h-6 w-11 border transition-colors duration-300 ${
                    inStock ? 'border-gold bg-gold' : 'border-cream/40 bg-obsidian'
                  }`}
                >
                  <input
                    id="admin-new-product-stock-status"
                    type="checkbox"
                    className="sr-only"
                    checked={inStock}
                    onChange={(event) => setInStock(event.target.checked)}
                  />
                  <span
                    className={`absolute top-0.5 h-4 w-5 bg-cream transition-transform duration-300 ${
                      inStock ? 'translate-x-[22px]' : 'translate-x-0.5'
                    }`}
                  />
                </span>
              </label>
            </div>
            <div>
              <label
                htmlFor="admin-new-product-stock-count"
                className="font-mono text-sm uppercase tracking-widest text-cream/80"
              >
                Stock count
              </label>
              <input
                id="admin-new-product-stock-count"
                type="number"
                min={0}
                value={stockCount}
                onChange={(event) =>
                  setStockCount(Math.max(0, Number(event.target.value)))
                }
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="admin-new-product-description"
              className="font-mono text-sm uppercase tracking-widest text-cream/80"
            >
              Description
            </label>
            <textarea
              id="admin-new-product-description"
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={textareaClassName}
            />
          </div>

          <AdminColorPicker
            availableColors={colorOptions}
            selectedColors={selectedColors}
            onToggleColor={handleToggleColor}
            onAddColor={handleAddColor}
          />

          {error && (
            <p className="font-mono text-sm text-gold" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-3 border-t border-cream/20 px-6 py-6 sm:flex-row sm:justify-end md:px-8">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit">Create product</Button>
        </div>
      </form>
    </SideDrawer>
  )
}