import { apiFormDataRequest, apiRequest, apiUploadFile } from '../lib/apiClient'
import {
  toAdminProduct,
  toApiProductPayload,
  type AdminProduct,
} from './products'
import type {
  AdminOrderStatus,
  ApiAdminLoginResponse,
  ApiOrder,
  ApiOrderResponse,
  ApiProduct,
} from './types'

export async function adminLogin(
  email: string,
  password: string
): Promise<ApiAdminLoginResponse> {
  return apiRequest<ApiAdminLoginResponse>('/api/admin/login/', {
    method: 'POST',
    body: { email, password },
  })
}

export async function adminLogout(token: string): Promise<void> {
  await apiRequest('/api/admin/logout/', {
    method: 'POST',
    token,
  })
}

export async function fetchAdminProducts(token: string): Promise<AdminProduct[]> {
  const data = await apiRequest<ApiProduct[]>('/api/admin/products/', { token })
  return data.map(toAdminProduct)
}

export async function createAdminProduct(
  token: string,
  product: Omit<AdminProduct, 'id' | 'sales'>
): Promise<AdminProduct> {
  const data = await apiRequest<ApiProduct>('/api/admin/products/', {
    method: 'POST',
    token,
    body: toApiProductPayload(product),
  })
  return toAdminProduct(data)
}

export async function updateAdminProduct(
  token: string,
  id: string,
  updates: Partial<AdminProduct>
): Promise<AdminProduct> {
  const numericId = parseInt(id, 10)
  const response = await apiRequest<{ product: ApiProduct }>(
    `/api/admin/products/${numericId}/`,
    {
      method: 'PATCH',
      token,
      body: toApiProductPayload(updates),
    }
  )
  return toAdminProduct(response.product)
}

export async function deleteAdminProduct(
  token: string,
  id: string
): Promise<void> {
  const numericId = parseInt(id, 10)
  await apiRequest(`/api/admin/products/${numericId}/`, {
    method: 'DELETE',
    token,
  })
}

export async function uploadProductImage(
  token: string,
  productId: string,
  file: File
): Promise<{ url: string; id: number }> {
  const numericId = parseInt(productId, 10)
  return apiUploadFile<{ url: string; id: number }>(
    '/api/admin/upload/',
    file,
    token,
    { product_id: numericId }
  )
}

export async function fetchAdminOrders(token: string): Promise<ApiOrder[]> {
  return apiRequest<ApiOrder[]>('/api/admin/orders/', { token })
}

export async function updateAdminOrderStatus(
  token: string,
  orderId: number,
  status: AdminOrderStatus
): Promise<void> {
  await apiFormDataRequest<ApiOrderResponse>(`/api/admin/orders/${orderId}/`, { status }, {
    method: 'PATCH',
    token,
  })
}
