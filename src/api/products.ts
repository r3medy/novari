import { apiRequest } from '../lib/apiClient'
import { resolveMediaUrl, toApiMediaPath } from '../lib/mediaUrl'
import type { Product } from '../data/products'
import type { ApiProduct } from './types'

export function toProduct(apiProduct: ApiProduct): Product {
  const colors =
    apiProduct.colors ??
    (apiProduct.color ? [apiProduct.color] : [])

  const rawImages =
    apiProduct.images ??
    (apiProduct.image ? [apiProduct.image] : [])

  const images = rawImages.map(resolveMediaUrl)

  return {
    id: String(apiProduct.id).padStart(2, '0'),
    name: apiProduct.name,
    numericPrice: apiProduct.price,
    discount: apiProduct.discount,
    description: apiProduct.description,
    category: apiProduct.category ?? 'Uncategorized',
    colors,
    images,
  }
}

export interface AdminProduct extends Product {
  inStock: boolean
  stockCount: number
  sales: number
}

export function toAdminProduct(apiProduct: ApiProduct): AdminProduct {
  const product = toProduct(apiProduct)
  return {
    ...product,
    inStock: apiProduct.in_stock ?? true,
    stockCount: apiProduct.stock_count ?? 0,
    sales: apiProduct.sales ?? 0,
  }
}

export function toApiProductPayload(
  product: Partial<AdminProduct>
): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  if (product.name !== undefined) payload.name = product.name
  if (product.description !== undefined) payload.description = product.description
  if (product.numericPrice !== undefined) payload.price = product.numericPrice
  if (product.discount !== undefined) payload.discount = product.discount
  if (product.category !== undefined) payload.category = product.category
  if (product.colors !== undefined) payload.colors = product.colors
  if (product.images !== undefined) {
    payload.images = product.images.map(toApiMediaPath)
  }
  if (product.inStock !== undefined) payload.in_stock = product.inStock
  if (product.stockCount !== undefined) payload.stock_count = product.stockCount
  if (product.sales !== undefined) payload.sales = product.sales

  return payload
}

export async function fetchProducts(): Promise<Product[]> {
  const data = await apiRequest<ApiProduct[]>('/api/products/')
  return data.map(toProduct)
}

export async function fetchProductById(id: string | number): Promise<Product> {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id
  const data = await apiRequest<ApiProduct>(`/api/products/${numericId}/`)
  return toProduct(data)
}
