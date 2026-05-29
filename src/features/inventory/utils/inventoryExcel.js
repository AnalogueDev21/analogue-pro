const PRODUCT_COLUMNS = [
  'sku',
  'product_code',
  'product_name',
  'product_name_en',
  'category_code',
  'supplier_code',
  'unit',
  'stock_qty',
  'min_stock',
  'cost_price',
  'selling_price',
  'image_url',
]

const loadXlsx = async () => import('xlsx')

const toKey = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '_')

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0
  const n = Number(String(value).replace(/,/g, ''))
  return Number.isFinite(n) ? n : NaN
}

export const normalizeInventoryProductRow = (row) => {
  const normalized = {}
  Object.entries(row || {}).forEach(([key, value]) => {
    normalized[toKey(key)] = typeof value === 'string' ? value.trim() : value
  })

  return {
    sku: String(normalized.sku || '').trim(),
    product_code: String(normalized.product_code || '').trim(),
    product_name: String(normalized.product_name || '').trim(),
    product_name_en: String(normalized.product_name_en || '').trim(),
    category_code: String(normalized.category_code || '').trim(),
    supplier_code: String(normalized.supplier_code || '').trim(),
    unit: String(normalized.unit || 'pcs').trim(),
    stock_qty: toNumber(normalized.stock_qty),
    min_stock: toNumber(normalized.min_stock),
    cost_price: toNumber(normalized.cost_price),
    selling_price: toNumber(normalized.selling_price),
    image_url: String(normalized.image_url || '').trim(),
    raw: normalized,
  }
}

export const parseInventoryProductWorkbook = async (file) => {
  const XLSX = await loadXlsx()
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' })
  return rows.map(normalizeInventoryProductRow)
}

export const downloadInventoryProductTemplate = async () => {
  const XLSX = await loadXlsx()
  const worksheet = XLSX.utils.json_to_sheet([
    {
      sku: 'SKU-0001',
      product_code: 'PRD-0001',
      product_name: 'Sample Product',
      product_name_en: 'Sample Product',
      category_code: 'CAT-001',
      supplier_code: 'SUP-001',
      unit: 'pcs',
      stock_qty: 10,
      min_stock: 3,
      cost_price: 100,
      selling_price: 150,
      image_url: '',
    },
  ], { header: PRODUCT_COLUMNS })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products')
  XLSX.writeFile(workbook, 'inventory-product-template.xlsx')
}

export const exportInventoryProducts = async (products, fileName = 'inventory-products.xlsx') => {
  const XLSX = await loadXlsx()
  const rows = products.map(product => ({
    sku: product.sku,
    product_code: product.product_code || '',
    product_name: product.product_name,
    product_name_en: product.product_name_en || '',
    category: product.categories?.name || '',
    supplier: product.suppliers?.name || '',
    unit: product.unit,
    stock_qty: Number(product.stock_qty || 0),
    min_stock: Number(product.min_stock || 0),
    cost_price: Number(product.cost_price || 0),
    selling_price: Number(product.selling_price || 0),
    inventory_value: Number(product.stock_qty || 0) * Number(product.cost_price || 0),
    status: product.is_active ? 'active' : 'inactive',
  }))
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products')
  XLSX.writeFile(workbook, fileName)
}

export const exportStockMovements = async (movements, fileName = 'stock-movements.xlsx') => {
  const XLSX = await loadXlsx()
  const rows = movements.map(movement => ({
    date: movement.created_at,
    sku: movement.products?.sku || '',
    product_name: movement.products?.product_name || '',
    movement_type: movement.movement_type,
    quantity: Number(movement.quantity || 0),
    unit: movement.products?.unit || '',
    location: movement.stock_locations?.name || '',
    notes: movement.notes || '',
  }))
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Movements')
  XLSX.writeFile(workbook, fileName)
}
