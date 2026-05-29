import { supabase } from '@/services/supabase'
import { writeActivityLog } from '@/features/activityLogs/services/activityLogService'

const PRODUCT_SELECT = `
  *,
  categories(id, name, name_en, code),
  suppliers(id, name, code, phone, email)
`

const MOVEMENT_SELECT = `
  *,
  products(id, sku, product_name, product_name_en, unit),
  stock_locations(id, name, name_en, code),
  created_by_employee:employees!stock_movements_created_by_fkey(id, first_name, last_name, employee_code)
`

const REQUEST_SELECT = `
  *,
  products(id, sku, product_name, product_name_en, unit, stock_qty, image_url),
  requester:employees!stock_requests_requester_employee_id_fkey(id, first_name, last_name, employee_code, manager_id, branches(name), departments(name), positions(name)),
  approver:employees!stock_requests_approver_employee_id_fkey(id, first_name, last_name, employee_code),
  issuer:employees!stock_requests_issued_by_fkey(id, first_name, last_name, employee_code)
`

const ADJUSTMENT_SELECT = `
  *,
  products(id, sku, product_name, product_name_en, unit, stock_qty, image_url),
  stock_locations(id, name, name_en, code),
  counter:employees!stock_adjustments_counted_by_fkey(id, first_name, last_name, employee_code),
  approver:employees!stock_adjustments_approved_by_fkey(id, first_name, last_name, employee_code)
`

export const getInventoryOverview = async (companyId) => {
  const { data, error } = await supabase
    .from('inventory_product_summary')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle()

  if (error) throw error
  return data || { product_count: 0, low_stock_count: 0, inventory_value: 0 }
}

export const getCategories = async (companyId) => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('company_id', companyId)
    .eq('type', 'inventory')
    .order('name')

  if (error) throw error
  return data || []
}

export const getSuppliers = async (companyId) => {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('company_id', companyId)
    .order('name')

  if (error) throw error
  return data || []
}

export const getStockLocations = async (companyId) => {
  const { data, error } = await supabase
    .from('stock_locations')
    .select('*, branches(id, name, name_en, code)')
    .eq('company_id', companyId)
    .order('name')

  if (error) throw error
  return data || []
}

export const getProducts = async (companyId, filters = {}) => {
  let query = supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('company_id', companyId)
    .order('product_name')

  if (filters.category_id) query = query.eq('category_id', filters.category_id)
  if (filters.supplier_id) query = query.eq('supplier_id', filters.supplier_id)
  if (filters.activeOnly) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export const createProduct = async ({ actorEmployeeId, ...payload }) => {
  const { data, error } = await supabase
    .from('products')
    .insert({ ...payload, created_by: actorEmployeeId })
    .select(PRODUCT_SELECT)
    .single()

  if (error) throw error

  await writeActivityLog({
    company_id: data.company_id,
    actor_employee_id: actorEmployeeId,
    action: 'create_product',
    target_type: 'product',
    target_id: data.id,
    description: `Created product ${data.sku}`,
  })

  return data
}

export const updateProduct = async (productId, updates, actorEmployeeId) => {
  const { data, error } = await supabase
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .select(PRODUCT_SELECT)
    .single()

  if (error) throw error

  await writeActivityLog({
    company_id: data.company_id,
    actor_employee_id: actorEmployeeId,
    action: 'update_product',
    target_type: 'product',
    target_id: data.id,
    description: `Updated product ${data.sku}`,
  })

  return data
}

export const createCategory = async (payload) => {
  const { data, error } = await supabase
    .from('categories')
    .insert({ ...payload, type: 'inventory' })
    .select()
    .single()

  if (error) throw error
  return data
}

export const createSupplier = async (payload) => {
  const { data, error } = await supabase
    .from('suppliers')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export const createStockLocation = async (payload) => {
  const { data, error } = await supabase
    .from('stock_locations')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export const getStockMovements = async (companyId, filters = {}) => {
  let query = supabase
    .from('stock_movements')
    .select(MOVEMENT_SELECT)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(filters.limit || 50)

  if (filters.product_id) query = query.eq('product_id', filters.product_id)
  if (filters.movement_type) query = query.eq('movement_type', filters.movement_type)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export const createStockMovement = async ({ actorEmployeeId, ...payload }) => {
  const { data, error } = await supabase
    .from('stock_movements')
    .insert({ ...payload, created_by: actorEmployeeId })
    .select(MOVEMENT_SELECT)
    .single()

  if (error) throw error

  const quantity = Number(payload.quantity || 0)
  const direction = ['issue', 'request_issue'].includes(payload.movement_type) ? -1 : 1

  const { data: product } = await supabase
    .from('products')
    .select('stock_qty')
    .eq('id', payload.product_id)
    .single()

  if (product) {
    await supabase
      .from('products')
      .update({
        stock_qty: Number(product.stock_qty || 0) + (quantity * direction),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.product_id)
  }

  await writeActivityLog({
    company_id: payload.company_id,
    actor_employee_id: actorEmployeeId,
    action: 'create_stock_movement',
    target_type: 'stock_movement',
    target_id: data.id,
    description: `Created ${payload.movement_type} movement`,
  })

  return data
}

export const getLowStockProducts = async (companyId) => {
  const products = await getProducts(companyId, { activeOnly: true })
  return products.filter(product => Number(product.stock_qty || 0) <= Number(product.min_stock || 0))
}

export const getStockRequests = async (companyId, filters = {}) => {
  let query = supabase
    .from('stock_requests')
    .select(REQUEST_SELECT)
    .eq('company_id', companyId)
    .order('request_date', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.requester_employee_id) query = query.eq('requester_employee_id', filters.requester_employee_id)
  if (filters.product_id) query = query.eq('product_id', filters.product_id)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export const createStockRequest = async ({ actorEmployeeId, ...payload }) => {
  const { data, error } = await supabase
    .from('stock_requests')
    .insert({
      ...payload,
      requester_employee_id: payload.requester_employee_id || actorEmployeeId,
      status: 'submitted',
    })
    .select(REQUEST_SELECT)
    .single()

  if (error) throw error

  await writeActivityLog({
    company_id: data.company_id,
    actor_employee_id: actorEmployeeId,
    action: 'create_stock_request',
    target_type: 'stock_request',
    target_id: data.id,
    description: `Requested stock item ${data.product_id}`,
  })

  return data
}

export const updateStockRequestStatus = async ({ requestId, companyId, actorEmployeeId, status, notes }) => {
  const updates = {
    status,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  }

  if (status === 'approved' || status === 'rejected') {
    updates.approver_employee_id = actorEmployeeId
    updates.approve_date = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('stock_requests')
    .update(updates)
    .eq('id', requestId)
    .eq('company_id', companyId)
    .select(REQUEST_SELECT)
    .single()

  if (error) throw error

  await writeActivityLog({
    company_id: companyId,
    actor_employee_id: actorEmployeeId,
    action: `stock_request_${status}`,
    target_type: 'stock_request',
    target_id: requestId,
    description: `Stock request ${status}`,
  })

  return data
}

export const issueStockRequest = async ({ request, companyId, actorEmployeeId, locationId, notes }) => {
  await createStockMovement({
    company_id: companyId,
    product_id: request.product_id,
    location_id: locationId || null,
    movement_type: 'request_issue',
    quantity: Number(request.quantity || 0),
    unit_cost: 0,
    reference_type: 'stock_request',
    reference_id: request.id,
    notes: notes || request.reason || null,
    actorEmployeeId,
  })

  const { data, error } = await supabase
    .from('stock_requests')
    .update({
      status: 'completed',
      issued_by: actorEmployeeId,
      issue_date: new Date().toISOString(),
      notes: notes || request.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.id)
    .eq('company_id', companyId)
    .select(REQUEST_SELECT)
    .single()

  if (error) throw error

  await writeActivityLog({
    company_id: companyId,
    actor_employee_id: actorEmployeeId,
    action: 'stock_request_completed',
    target_type: 'stock_request',
    target_id: request.id,
    description: 'Stock request issued and completed',
  })

  return data
}

export const getStockAdjustments = async (companyId, filters = {}) => {
  let query = supabase
    .from('stock_adjustments')
    .select(ADJUSTMENT_SELECT)
    .eq('company_id', companyId)
    .order('counted_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.product_id) query = query.eq('product_id', filters.product_id)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export const createStockAdjustment = async ({ actorEmployeeId, ...payload }) => {
  const { data, error } = await supabase
    .from('stock_adjustments')
    .insert({
      ...payload,
      counted_by: actorEmployeeId,
      status: payload.status || 'submitted',
    })
    .select(ADJUSTMENT_SELECT)
    .single()

  if (error) throw error

  await writeActivityLog({
    company_id: data.company_id,
    actor_employee_id: actorEmployeeId,
    action: 'submit_stock_count',
    target_type: 'stock_adjustment',
    target_id: data.id,
    description: `Submitted stock count for ${data.product_id}`,
  })

  return data
}

export const decideStockAdjustment = async ({ adjustment, companyId, actorEmployeeId, status, notes }) => {
  if (!['approved', 'rejected'].includes(status)) throw new Error('Invalid adjustment status')

  if (status === 'approved') {
    const difference = Number(adjustment.actual_qty || 0) - Number(adjustment.system_qty || 0)
    if (difference !== 0) {
      await createStockMovement({
        company_id: companyId,
        product_id: adjustment.product_id,
        location_id: adjustment.location_id || null,
        movement_type: 'adjust',
        quantity: difference,
        unit_cost: 0,
        reference_type: 'stock_adjustment',
        reference_id: adjustment.id,
        notes: notes || adjustment.reason || null,
        actorEmployeeId,
      })
    }

    await supabase
      .from('products')
      .update({
        stock_qty: Number(adjustment.actual_qty || 0),
        updated_at: new Date().toISOString(),
      })
      .eq('id', adjustment.product_id)
      .eq('company_id', companyId)
  }

  const { data, error } = await supabase
    .from('stock_adjustments')
    .update({
      status,
      approved_by: actorEmployeeId,
      approved_at: new Date().toISOString(),
      reason: notes || adjustment.reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', adjustment.id)
    .eq('company_id', companyId)
    .select(ADJUSTMENT_SELECT)
    .single()

  if (error) throw error

  await writeActivityLog({
    company_id: companyId,
    actor_employee_id: actorEmployeeId,
    action: `stock_adjustment_${status}`,
    target_type: 'stock_adjustment',
    target_id: adjustment.id,
    description: `Stock adjustment ${status}`,
  })

  return data
}
