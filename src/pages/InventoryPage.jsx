import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/core/store/authStore'
import {
  createCategory,
  createProduct,
  createStockAdjustment,
  createStockLocation,
  createStockMovement,
  createStockRequest,
  createSupplier,
  decideStockAdjustment,
  downloadInventoryProductTemplate,
  exportInventoryProducts,
  exportStockMovements,
  issueStockRequest,
  parseInventoryProductWorkbook,
  ProductCard,
  updateStockRequestStatus,
  updateProduct,
  useInventory,
} from '@/features/inventory'
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from '@/components/ui/index.jsx'
import { fieldName } from '@/utils/lang'

const EMPTY_PRODUCT = {
  sku: '',
  product_code: '',
  product_name: '',
  product_name_en: '',
  category_id: '',
  supplier_id: '',
  image_url: '',
  unit: 'pcs',
  stock_qty: 0,
  min_stock: 0,
  cost_price: 0,
  selling_price: 0,
  is_active: true,
}

const EMPTY_MOVEMENT = {
  movement_type: 'receive',
  quantity: 1,
  unit_cost: 0,
  location_id: '',
  notes: '',
}

const EMPTY_REQUEST = {
  product_id: '',
  quantity: 1,
  reason: '',
}

const EMPTY_COUNT = {
  product_id: '',
  location_id: '',
  actual_qty: 0,
  reason: '',
  image_url: '',
}

const text = (i18n, th, en) => (i18n.language === 'th' || i18n.language?.startsWith('th') ? th : en)

export default function InventoryPage() {
  const { i18n } = useTranslation()
  const { company, employee, can } = useAuthStore()
  const { show: toast, el: ToastEl } = useToast()
  const importInputRef = useRef(null)
  const canManage = can('stock.manage') || can('stock.receive') || can('stock.adjust')
  const canRequest = can('stock.request') || canManage
  const canApprove = can('stock.approve') || canManage
  const canIssue = can('stock.issue') || canManage
  const canCount = can('stock.count') || canManage
  const canAdjust = can('stock.adjust') || canManage

  const [tab, setTab] = useState('products')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ category_id: '', supplier_id: '', activeOnly: true })
  const [showProductForm, setShowProductForm] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT)
  const [stockProduct, setStockProduct] = useState(null)
  const [movementForm, setMovementForm] = useState(EMPTY_MOVEMENT)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestForm, setRequestForm] = useState(EMPTY_REQUEST)
  const [requestAction, setRequestAction] = useState(null)
  const [requestNotes, setRequestNotes] = useState('')
  const [issueLocationId, setIssueLocationId] = useState('')
  const [showCountForm, setShowCountForm] = useState(false)
  const [countForm, setCountForm] = useState(EMPTY_COUNT)
  const [adjustmentAction, setAdjustmentAction] = useState(null)
  const [adjustmentNotes, setAdjustmentNotes] = useState('')
  const [quickCreate, setQuickCreate] = useState(null)
  const [quickForm, setQuickForm] = useState({ code: '', name: '', name_en: '', phone: '', email: '', branch_id: '' })
  const [importRows, setImportRows] = useState([])
  const [importFileName, setImportFileName] = useState('')
  const [saving, setSaving] = useState(false)

  const {
    products,
    categories,
    suppliers,
    locations,
    movements,
    requests,
    adjustments,
    lowStock,
    overview,
    loading,
    reload,
  } = useInventory(company?.id, filters)

  const ui = useMemo(() => ({
    title: text(i18n, 'คลังสินค้า', 'Inventory'),
    subtitle: text(i18n, 'สินค้า ยอดคงเหลือ ซัพพลายเออร์ และประวัติสต็อก', 'Products, stock balance, suppliers, and stock history'),
    countStock: text(i18n, 'นับสต็อก', 'Count Stock'),
    requestItem: text(i18n, 'ขอเบิกของ', 'Request Item'),
    addProduct: text(i18n, 'เพิ่มสินค้า', 'Add Product'),
    products: text(i18n, 'สินค้า', 'Products'),
    lowStock: text(i18n, 'สต็อกต่ำ', 'Low Stock'),
    requests: text(i18n, 'คำขอเบิก', 'Requests'),
    counts: text(i18n, 'รายการนับสต็อก', 'Counts'),
    inventoryValue: text(i18n, 'มูลค่าสต็อก', 'Inventory Value'),
    stockCount: text(i18n, 'นับสต็อก', 'Stock Count'),
    history: text(i18n, 'ประวัติ', 'History'),
    masters: text(i18n, 'ข้อมูลตั้งต้น', 'Masters'),
    searchProducts: text(i18n, 'ค้นหาสินค้า...', 'Search products...'),
    allCategories: text(i18n, 'ทุกหมวดหมู่', 'All Categories'),
    allSuppliers: text(i18n, 'ทุกซัพพลายเออร์', 'All Suppliers'),
    noProducts: text(i18n, 'ยังไม่มีสินค้า', 'No products yet'),
    noProductsSub: text(i18n, 'เริ่มสร้างสินค้าแรกในคลัง', 'Create your first inventory product.'),
    noLowStock: text(i18n, 'ไม่มีสินค้าสต็อกต่ำ', 'No low stock products'),
    noLowStockSub: text(i18n, 'สินค้าทั้งหมดยังมากกว่าขั้นต่ำ', 'Everything is above minimum stock.'),
    stockRequests: text(i18n, 'คำขอเบิกสินค้า', 'Stock Requests'),
    stockRequestsFlow: text(i18n, 'พนักงาน / หัวหน้างาน / ผู้จัดการคลัง / เสร็จสิ้น', 'Employee / Supervisor / Inventory Manager / Completed'),
    newRequest: text(i18n, 'คำขอใหม่', 'New Request'),
    approve: text(i18n, 'อนุมัติ', 'Approve'),
    reject: text(i18n, 'ไม่อนุมัติ', 'Reject'),
    issueComplete: text(i18n, 'จ่ายของและปิดงาน', 'Issue & Complete'),
    noRequests: text(i18n, 'ยังไม่มีคำขอเบิก', 'No stock requests yet'),
    stockCountSub: text(i18n, 'นับสต็อก แนบหลักฐาน และอนุมัติส่วนต่าง', 'Count stock, submit evidence, approve adjustment'),
    newCount: text(i18n, 'นับใหม่', 'New Count'),
    evidence: text(i18n, 'หลักฐาน', 'Evidence'),
    approveAdjustment: text(i18n, 'อนุมัติปรับสต็อก', 'Approve Adjustment'),
    noCounts: text(i18n, 'ยังไม่มีรายการนับสต็อก', 'No stock count records yet'),
    stockHistory: text(i18n, 'ประวัติสต็อก', 'Stock History'),
    noMovements: text(i18n, 'ยังไม่มีประวัติสต็อก', 'No stock movement yet'),
    cancel: text(i18n, 'ยกเลิก', 'Cancel'),
    save: text(i18n, 'บันทึก', 'Save'),
    submit: text(i18n, 'ส่งคำขอ', 'Submit'),
    confirm: text(i18n, 'ยืนยัน', 'Confirm'),
    productRequired: text(i18n, 'กรุณาระบุ SKU และชื่อสินค้า', 'SKU and product name are required'),
    nameRequired: text(i18n, 'กรุณากรอกชื่อ', 'Name is required'),
    quantityRequired: text(i18n, 'จำนวนต้องมากกว่า 0', 'Quantity must be greater than zero'),
    productQuantityRequired: text(i18n, 'กรุณาเลือกสินค้าและระบุจำนวน', 'Product and quantity are required'),
    productOnlyRequired: text(i18n, 'กรุณาเลือกสินค้า', 'Product is required'),
    productUpdated: text(i18n, 'อัปเดตสินค้าแล้ว', 'Product updated'),
    productCreated: text(i18n, 'สร้างสินค้าแล้ว', 'Product created'),
    saved: text(i18n, 'บันทึกแล้ว', 'Saved'),
    stockMovementSaved: text(i18n, 'บันทึกความเคลื่อนไหวสต็อกแล้ว', 'Stock movement saved'),
    stockRequestSubmitted: text(i18n, 'ส่งคำขอเบิกแล้ว', 'Stock request submitted'),
    requestUpdated: text(i18n, 'อัปเดตคำขอแล้ว', 'Request updated'),
    stockCountSubmitted: text(i18n, 'ส่งผลนับสต็อกแล้ว', 'Stock count submitted'),
    stockCountUpdated: text(i18n, 'อัปเดตรายการนับสต็อกแล้ว', 'Stock count updated'),
    productCode: text(i18n, 'รหัสสินค้า', 'Product Code'),
    productName: text(i18n, 'ชื่อสินค้า', 'Product Name'),
    productNameEn: text(i18n, 'ชื่อสินค้า EN', 'Product Name EN'),
    category: text(i18n, 'หมวดหมู่', 'Category'),
    supplier: text(i18n, 'ซัพพลายเออร์', 'Supplier'),
    unit: text(i18n, 'หน่วย', 'Unit'),
    imageUrl: text(i18n, 'URL รูปภาพ', 'Image URL'),
    stockQty: text(i18n, 'จำนวนคงเหลือ', 'Stock Qty'),
    minStock: text(i18n, 'สต็อกขั้นต่ำ', 'Min Stock'),
    costPrice: text(i18n, 'ต้นทุน', 'Cost Price'),
    sellingPrice: text(i18n, 'ราคาขาย', 'Selling Price'),
    editProduct: text(i18n, 'แก้ไขสินค้า', 'Edit Product'),
    selectCategory: text(i18n, 'เลือกหมวดหมู่', 'Select category'),
    selectSupplier: text(i18n, 'เลือกซัพพลายเออร์', 'Select supplier'),
    movementType: text(i18n, 'ประเภทความเคลื่อนไหว', 'Movement Type'),
    receive: text(i18n, 'รับเข้า', 'Receive'),
    issue: text(i18n, 'จ่ายออก', 'Issue'),
    adjustPlus: text(i18n, 'ปรับเพิ่ม', 'Adjust +'),
    location: text(i18n, 'สถานที่เก็บ', 'Location'),
    noLocation: text(i18n, 'ไม่ระบุสถานที่', 'No location'),
    quantity: text(i18n, 'จำนวน', 'Quantity'),
    unitCost: text(i18n, 'ต้นทุนต่อหน่วย', 'Unit Cost'),
    notes: text(i18n, 'หมายเหตุ', 'Notes'),
    product: text(i18n, 'สินค้า', 'Product'),
    selectProduct: text(i18n, 'เลือกสินค้า', 'Select product'),
    reason: text(i18n, 'เหตุผล', 'Reason'),
    issueStockRequest: text(i18n, 'จ่ายสินค้าตามคำขอ', 'Issue Stock Request'),
    approveStockRequest: text(i18n, 'อนุมัติคำขอเบิก', 'Approve Stock Request'),
    rejectStockRequest: text(i18n, 'ไม่อนุมัติคำขอเบิก', 'Reject Stock Request'),
    requestedBy: text(i18n, 'ขอโดย', 'requested by'),
    issueLocation: text(i18n, 'สถานที่จ่ายของ', 'Issue Location'),
    systemQty: text(i18n, 'จำนวนในระบบ', 'System Qty'),
    actualQty: text(i18n, 'จำนวนที่นับได้', 'Actual Qty'),
    evidencePhotoUrl: text(i18n, 'URL รูปหลักฐาน', 'Evidence Photo URL'),
    submitCount: text(i18n, 'ส่งผลนับสต็อก', 'Submit Count'),
    approveStockCount: text(i18n, 'อนุมัติผลนับสต็อก', 'Approve Stock Count'),
    rejectStockCount: text(i18n, 'ไม่อนุมัติผลนับสต็อก', 'Reject Stock Count'),
    add: text(i18n, 'เพิ่ม', 'Add'),
    code: text(i18n, 'รหัส', 'Code'),
    name: text(i18n, 'ชื่อ', 'Name'),
    nameEn: text(i18n, 'ชื่อ EN', 'Name EN'),
    phone: text(i18n, 'โทรศัพท์', 'Phone'),
    email: text(i18n, 'อีเมล', 'Email'),
    noData: text(i18n, 'ยังไม่มีข้อมูล', 'No data yet'),
    categories: text(i18n, 'หมวดหมู่', 'Categories'),
    suppliers: text(i18n, 'ซัพพลายเออร์', 'Suppliers'),
    locations: text(i18n, 'สถานที่เก็บ', 'Locations'),
    system: text(i18n, 'ระบบ', 'System'),
    actual: text(i18n, 'นับจริง', 'Actual'),
    diff: text(i18n, 'ส่วนต่าง', 'Diff'),
    available: text(i18n, 'คงเหลือ', 'Available'),
    unknown: text(i18n, 'ไม่ทราบชื่อ', 'Unknown'),
    low: text(i18n, 'ต่ำ', 'Low'),
    ok: text(i18n, 'ปกติ', 'OK'),
    stock: text(i18n, 'สต็อก', 'Stock'),
    min: text(i18n, 'ขั้นต่ำ', 'Min'),
    cost: text(i18n, 'ต้นทุน', 'Cost'),
    sell: text(i18n, 'ขาย', 'Sell'),
    uncategorized: text(i18n, 'ไม่ระบุหมวดหมู่', 'Uncategorized'),
    edit: text(i18n, 'แก้ไข', 'Edit'),
    stockAction: text(i18n, 'สต็อก', 'Stock'),
    importExport: text(i18n, 'นำเข้า/ส่งออก', 'Import/Export'),
    excelImport: text(i18n, 'นำเข้าสินค้าจาก Excel', 'Product Excel Import'),
    excelImportSub: text(i18n, 'อัปโหลด .xlsx เพื่อตรวจสอบข้อมูลก่อนบันทึกจริง', 'Upload .xlsx, preview and validate rows before saving.'),
    template: text(i18n, 'ไฟล์ตัวอย่าง', 'Template'),
    uploadExcel: text(i18n, 'อัปโหลด Excel', 'Upload Excel'),
    preview: text(i18n, 'ตัวอย่างข้อมูล', 'Preview'),
    confirmImport: text(i18n, 'ยืนยันนำเข้า', 'Confirm Import'),
    clear: text(i18n, 'ล้าง', 'Clear'),
    validRows: text(i18n, 'แถวที่ถูกต้อง', 'Valid rows'),
    invalidRows: text(i18n, 'แถวที่ผิด', 'Invalid rows'),
    duplicateSku: text(i18n, 'SKU ซ้ำ', 'Duplicate SKU'),
    row: text(i18n, 'แถว', 'Row'),
    status: text(i18n, 'สถานะ', 'Status'),
    errors: text(i18n, 'ข้อผิดพลาด', 'Errors'),
    valid: text(i18n, 'ถูกต้อง', 'Valid'),
    invalid: text(i18n, 'ผิด', 'Invalid'),
    exportProducts: text(i18n, 'ส่งออกสินค้า', 'Export Products'),
    exportLowStock: text(i18n, 'ส่งออกสต็อกต่ำ', 'Export Low Stock'),
    exportMovements: text(i18n, 'ส่งออกประวัติสต็อก', 'Export Movements'),
    importSuccess: text(i18n, 'นำเข้าสินค้าสำเร็จ', 'Products imported successfully'),
    selectExcelFile: text(i18n, 'กรุณาเลือกไฟล์ Excel', 'Please select an Excel file'),
  }), [i18n.language])

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter(product => [
      product.sku,
      product.product_code,
      product.product_name,
      product.product_name_en,
      product.categories?.name,
      product.suppliers?.name,
    ].filter(Boolean).join(' ').toLowerCase().includes(q))
  }, [products, search])

  const importStats = useMemo(() => ({
    validRows: importRows.filter(row => row.is_valid).length,
    invalidRows: importRows.filter(row => !row.is_valid).length,
    duplicateSkus: importRows.filter(row => row.errors.includes('duplicate_sku')).length,
  }), [importRows])

  const validateImportRows = (rows) => {
    const existingSkus = new Set(products.map(product => String(product.sku || '').toLowerCase()))
    const seenSkus = new Set()
    return rows.map((row, index) => {
      const errors = []
      const skuKey = row.sku.toLowerCase()
      if (!row.sku) errors.push('missing_sku')
      if (!row.product_name) errors.push('missing_product_name')
      if (!Number.isFinite(row.stock_qty) || row.stock_qty < 0) errors.push('invalid_stock_qty')
      if (!Number.isFinite(row.min_stock) || row.min_stock < 0) errors.push('invalid_min_stock')
      if (!Number.isFinite(row.cost_price) || row.cost_price < 0) errors.push('invalid_cost_price')
      if (!Number.isFinite(row.selling_price) || row.selling_price < 0) errors.push('invalid_selling_price')
      if (skuKey && (existingSkus.has(skuKey) || seenSkus.has(skuKey))) errors.push('duplicate_sku')
      if (skuKey) seenSkus.add(skuKey)

      return {
        ...row,
        row_number: index + 2,
        errors,
        is_valid: errors.length === 0,
      }
    })
  }

  const openAddProduct = () => {
    setEditProduct(null)
    setProductForm(EMPTY_PRODUCT)
    setShowProductForm(true)
  }

  const openEditProduct = (product) => {
    setEditProduct(product)
    setProductForm({
      sku: product.sku || '',
      product_code: product.product_code || '',
      product_name: product.product_name || '',
      product_name_en: product.product_name_en || '',
      category_id: product.category_id || '',
      supplier_id: product.supplier_id || '',
      image_url: product.image_url || '',
      unit: product.unit || 'pcs',
      stock_qty: product.stock_qty || 0,
      min_stock: product.min_stock || 0,
      cost_price: product.cost_price || 0,
      selling_price: product.selling_price || 0,
      is_active: product.is_active,
    })
    setShowProductForm(true)
  }

  const saveProduct = async () => {
    if (!productForm.sku.trim() || !productForm.product_name.trim()) {
      toast(ui.productRequired, 'warning')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...productForm,
        company_id: company.id,
        sku: productForm.sku.trim(),
        product_code: productForm.product_code.trim() || null,
        product_name: productForm.product_name.trim(),
        product_name_en: productForm.product_name_en.trim() || null,
        category_id: productForm.category_id || null,
        supplier_id: productForm.supplier_id || null,
        image_url: productForm.image_url.trim() || null,
        stock_qty: Number(productForm.stock_qty || 0),
        min_stock: Number(productForm.min_stock || 0),
        cost_price: Number(productForm.cost_price || 0),
        selling_price: Number(productForm.selling_price || 0),
      }

      if (editProduct) await updateProduct(editProduct.id, payload, employee.id)
      else await createProduct({ ...payload, actorEmployeeId: employee.id })

      setShowProductForm(false)
      await reload()
      toast(editProduct ? ui.productUpdated : ui.productCreated)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const saveQuickCreate = async () => {
    if (!quickForm.name.trim()) {
      toast(ui.nameRequired, 'warning')
      return
    }

    setSaving(true)
    try {
      const payload = {
        company_id: company.id,
        code: quickForm.code.trim() || null,
        name: quickForm.name.trim(),
        name_en: quickForm.name_en.trim() || null,
      }

      if (quickCreate === 'category') await createCategory(payload)
      if (quickCreate === 'supplier') await createSupplier({ ...payload, phone: quickForm.phone || null, email: quickForm.email || null })
      if (quickCreate === 'location') await createStockLocation({ ...payload, branch_id: quickForm.branch_id || null })

      setQuickCreate(null)
      setQuickForm({ code: '', name: '', name_en: '', phone: '', email: '', branch_id: '' })
      await reload()
      toast(ui.saved)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const openStockMovement = (product) => {
    setStockProduct(product)
    setMovementForm({ ...EMPTY_MOVEMENT, unit_cost: product.cost_price || 0 })
  }

  const saveStockMovement = async () => {
    if (!stockProduct || Number(movementForm.quantity || 0) <= 0) {
      toast(ui.quantityRequired, 'warning')
      return
    }

    setSaving(true)
    try {
      await createStockMovement({
        company_id: company.id,
        product_id: stockProduct.id,
        location_id: movementForm.location_id || null,
        movement_type: movementForm.movement_type,
        quantity: Number(movementForm.quantity || 0),
        unit_cost: Number(movementForm.unit_cost || 0),
        notes: movementForm.notes.trim() || null,
        actorEmployeeId: employee.id,
      })
      setStockProduct(null)
      await reload()
      toast(ui.stockMovementSaved)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const saveStockRequest = async () => {
    if (!requestForm.product_id || Number(requestForm.quantity || 0) <= 0) {
      toast(ui.productQuantityRequired, 'warning')
      return
    }

    setSaving(true)
    try {
      await createStockRequest({
        company_id: company.id,
        product_id: requestForm.product_id,
        requester_employee_id: employee.id,
        quantity: Number(requestForm.quantity || 0),
        reason: requestForm.reason.trim() || null,
        actorEmployeeId: employee.id,
      })
      setShowRequestForm(false)
      setRequestForm(EMPTY_REQUEST)
      await reload()
      toast(ui.stockRequestSubmitted)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const openRequestAction = (request, action) => {
    setRequestAction({ request, action })
    setRequestNotes('')
    setIssueLocationId('')
  }

  const confirmRequestAction = async () => {
    if (!requestAction) return
    setSaving(true)
    try {
      if (requestAction.action === 'issue') {
        await issueStockRequest({
          request: requestAction.request,
          companyId: company.id,
          actorEmployeeId: employee.id,
          locationId: issueLocationId,
          notes: requestNotes.trim() || null,
        })
      } else {
        await updateStockRequestStatus({
          requestId: requestAction.request.id,
          companyId: company.id,
          actorEmployeeId: employee.id,
          status: requestAction.action,
          notes: requestNotes.trim() || null,
        })
      }
      setRequestAction(null)
      await reload()
      toast(ui.requestUpdated)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const selectedCountProduct = products.find(product => product.id === countForm.product_id)

  const saveStockCount = async () => {
    if (!selectedCountProduct) {
      toast(ui.productOnlyRequired, 'warning')
      return
    }

    setSaving(true)
    try {
      await createStockAdjustment({
        company_id: company.id,
        product_id: selectedCountProduct.id,
        location_id: countForm.location_id || null,
        system_qty: Number(selectedCountProduct.stock_qty || 0),
        actual_qty: Number(countForm.actual_qty || 0),
        reason: countForm.reason.trim() || null,
        image_url: countForm.image_url.trim() || null,
        status: 'submitted',
        actorEmployeeId: employee.id,
      })
      setShowCountForm(false)
      setCountForm(EMPTY_COUNT)
      await reload()
      toast(ui.stockCountSubmitted)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const openAdjustmentAction = (adjustment, action) => {
    setAdjustmentAction({ adjustment, action })
    setAdjustmentNotes('')
  }

  const confirmAdjustmentAction = async () => {
    if (!adjustmentAction) return
    setSaving(true)
    try {
      await decideStockAdjustment({
        adjustment: adjustmentAction.adjustment,
        companyId: company.id,
        actorEmployeeId: employee.id,
        status: adjustmentAction.action,
        notes: adjustmentNotes.trim() || null,
      })
      setAdjustmentAction(null)
      await reload()
      toast(ui.stockCountUpdated)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const rows = await parseInventoryProductWorkbook(file)
      setImportRows(validateImportRows(rows))
      setImportFileName(file.name)
      setTab('import')
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const confirmImportProducts = async () => {
    const validRows = importRows.filter(row => row.is_valid)
    if (!validRows.length) {
      toast(ui.selectExcelFile, 'warning')
      return
    }

    setSaving(true)
    try {
      const categoriesByCode = new Map(categories.map(category => [String(category.code || '').toLowerCase(), category]))
      const suppliersByCode = new Map(suppliers.map(supplier => [String(supplier.code || '').toLowerCase(), supplier]))

      for (const row of validRows) {
        await createProduct({
          company_id: company.id,
          sku: row.sku,
          product_code: row.product_code || null,
          product_name: row.product_name,
          product_name_en: row.product_name_en || null,
          category_id: categoriesByCode.get(row.category_code.toLowerCase())?.id || null,
          supplier_id: suppliersByCode.get(row.supplier_code.toLowerCase())?.id || null,
          image_url: row.image_url || null,
          unit: row.unit || 'pcs',
          stock_qty: Number(row.stock_qty || 0),
          min_stock: Number(row.min_stock || 0),
          cost_price: Number(row.cost_price || 0),
          selling_price: Number(row.selling_price || 0),
          is_active: true,
          actorEmployeeId: employee.id,
        })
      }

      setImportRows([])
      setImportFileName('')
      await reload()
      toast(ui.importSuccess)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {ToastEl}
      <PageHeader
        title={ui.title}
        subtitle={ui.subtitle}
        action={
          <div className="flex gap-2">
            {canCount && <Button variant="secondary" onClick={() => setShowCountForm(true)}>{ui.countStock}</Button>}
            {canRequest && <Button variant="secondary" onClick={() => setShowRequestForm(true)}>{ui.requestItem}</Button>}
            {canManage && <Button icon="+" onClick={openAddProduct}>{ui.addProduct}</Button>}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          [ui.products, overview.product_count || products.length],
          [ui.lowStock, overview.low_stock_count || lowStock.length],
          [ui.requests, requests.length],
          [ui.counts, adjustments.length],
          [ui.inventoryValue, Number(overview.inventory_value || 0).toLocaleString()],
        ].map(([label, value]) => (
          <Card key={label} className="text-center">
            <p className="text-2xl font-bold text-primary-700">{value}</p>
            <p className="text-xs text-slate-500 mt-1">{label}</p>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {[
          ['products', ui.products],
          ['requests', ui.requests],
          ['counts', ui.stockCount],
          ['low', ui.lowStock],
          ['movements', ui.history],
          ['import', ui.importExport],
          ['masters', ui.masters],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold ${tab === key ? 'bg-primary-700 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'products' && (
        <>
          <Card className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <SearchInput value={search} onChange={setSearch} placeholder={ui.searchProducts} />
              </div>
              <Select value={filters.category_id} onChange={e => setFilters(p => ({ ...p, category_id: e.target.value }))}>
                <option value="">{ui.allCategories}</option>
                {categories.map(category => <option key={category.id} value={category.id}>{fieldName(i18n, category)}</option>)}
              </Select>
              <Select value={filters.supplier_id} onChange={e => setFilters(p => ({ ...p, supplier_id: e.target.value }))}>
                <option value="">{ui.allSuppliers}</option>
                {suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </Select>
            </div>
          </Card>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-80" />)}
            </div>
          ) : filteredProducts.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  i18n={i18n}
                  canManage={canManage}
                  onEdit={openEditProduct}
                  onMove={openStockMovement}
                  labels={ui}
                />
              ))}
            </div>
          ) : (
            <EmptyState title={ui.noProducts} subtitle={ui.noProductsSub} action={canManage ? <Button onClick={openAddProduct}>{ui.addProduct}</Button> : null} />
          )}
        </>
      )}

      {tab === 'low' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {lowStock.map(product => (
            <ProductCard key={product.id} product={product} i18n={i18n} canManage={canManage} onEdit={openEditProduct} onMove={openStockMovement} labels={ui} />
          ))}
          {!lowStock.length && <EmptyState title={ui.noLowStock} subtitle={ui.noLowStockSub} />}
        </div>
      )}

      {tab === 'requests' && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-700">{ui.stockRequests}</p>
              <p className="text-xs text-slate-400">{ui.stockRequestsFlow}</p>
            </div>
            {canRequest && <Button size="sm" onClick={() => setShowRequestForm(true)}>{ui.newRequest}</Button>}
          </div>
          <div className="divide-y divide-slate-50">
            {requests.map(request => {
              const canApproveRequest = canApprove && ['submitted', 'pending_approval'].includes(request.status)
              const canIssueRequest = canIssue && request.status === 'approved'
              return (
                <div key={request.id} className="px-5 py-4">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-800">{request.products?.product_name || '-'}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{request.status}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {request.requester ? `${request.requester.first_name || ''} ${request.requester.last_name || ''}`.trim() : ui.unknown} / {new Date(request.request_date).toLocaleString()}
                      </p>
                      {request.reason && <p className="text-sm text-slate-600 mt-2 break-words">{request.reason}</p>}
                    </div>
                    <div className="lg:text-right">
                      <p className="text-xs text-slate-400">{ui.quantity}</p>
                      <p className="text-xl font-bold text-primary-700">{Number(request.quantity || 0)} {request.products?.unit}</p>
                      <p className="text-xs text-slate-400 mt-1">{ui.available} {Number(request.products?.stock_qty || 0)} {request.products?.unit}</p>
                    </div>
                  </div>
                  {(canApproveRequest || canIssueRequest) && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {canApproveRequest && (
                        <>
                          <Button size="sm" onClick={() => openRequestAction(request, 'approved')}>{ui.approve}</Button>
                          <Button size="sm" variant="danger" onClick={() => openRequestAction(request, 'rejected')}>{ui.reject}</Button>
                        </>
                      )}
                      {canIssueRequest && <Button size="sm" onClick={() => openRequestAction(request, 'issue')}>{ui.issueComplete}</Button>}
                    </div>
                  )}
                </div>
              )
            })}
            {!requests.length && <div className="py-12 text-center text-sm text-slate-400">{ui.noRequests}</div>}
          </div>
        </Card>
      )}

      {tab === 'counts' && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-700">{ui.stockCount}</p>
              <p className="text-xs text-slate-400">{ui.stockCountSub}</p>
            </div>
            {canCount && <Button size="sm" onClick={() => setShowCountForm(true)}>{ui.newCount}</Button>}
          </div>
          <div className="divide-y divide-slate-50">
            {adjustments.map(adjustment => {
              const difference = Number(adjustment.actual_qty || 0) - Number(adjustment.system_qty || 0)
              const canDecide = canAdjust && adjustment.status === 'submitted'
              return (
                <div key={adjustment.id} className="px-5 py-4">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-800">{adjustment.products?.product_name || '-'}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{adjustment.status}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {adjustment.counter ? `${adjustment.counter.first_name || ''} ${adjustment.counter.last_name || ''}`.trim() : ui.unknown} / {new Date(adjustment.counted_at).toLocaleString()}
                      </p>
                      {adjustment.reason && <p className="text-sm text-slate-600 mt-2 break-words">{adjustment.reason}</p>}
                      {adjustment.image_url && (
                        <a href={adjustment.image_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary-700 mt-2 inline-block">
                          {ui.evidence}
                        </a>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 min-w-full lg:min-w-80">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">{ui.system}</p>
                        <p className="font-bold text-slate-900">{Number(adjustment.system_qty || 0)}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">{ui.actual}</p>
                        <p className="font-bold text-slate-900">{Number(adjustment.actual_qty || 0)}</p>
                      </div>
                      <div className={`rounded-xl p-3 ${difference === 0 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                        <p className="text-xs text-slate-500">{ui.diff}</p>
                        <p className={`font-bold ${difference === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>{difference}</p>
                      </div>
                    </div>
                  </div>
                  {canDecide && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button size="sm" onClick={() => openAdjustmentAction(adjustment, 'approved')}>{ui.approveAdjustment}</Button>
                      <Button size="sm" variant="danger" onClick={() => openAdjustmentAction(adjustment, 'rejected')}>{ui.reject}</Button>
                    </div>
                  )}
                </div>
              )
            })}
            {!adjustments.length && <div className="py-12 text-center text-sm text-slate-400">{ui.noCounts}</div>}
          </div>
        </Card>
      )}

      {tab === 'movements' && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="font-semibold text-slate-700">{ui.stockHistory}</p>
          </div>
          <div className="divide-y divide-slate-50">
            {movements.map(movement => (
              <div key={movement.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800">{movement.products?.product_name || '-'}</p>
                  <p className="text-xs text-slate-500">{movement.movement_type} / {movement.stock_locations?.name || ui.noLocation}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-bold text-primary-700">{Number(movement.quantity || 0)} {movement.products?.unit}</p>
                  <p className="text-xs text-slate-400">{new Date(movement.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {!movements.length && <div className="py-12 text-center text-sm text-slate-400">{ui.noMovements}</div>}
          </div>
        </Card>
      )}

      {tab === 'import' && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-800">{ui.excelImport}</p>
                <p className="text-sm text-slate-500 mt-1">{ui.excelImportSub}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="secondary" onClick={downloadInventoryProductTemplate}>{ui.template}</Button>
                <Button onClick={() => importInputRef.current?.click()}>{ui.uploadExcel}</Button>
                <input ref={importInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImportFile} />
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="bg-emerald-50">
              <p className="text-xs text-slate-500">{ui.validRows}</p>
              <p className="text-2xl font-bold text-emerald-700">{importStats.validRows}</p>
            </Card>
            <Card className="bg-red-50">
              <p className="text-xs text-slate-500">{ui.invalidRows}</p>
              <p className="text-2xl font-bold text-red-700">{importStats.invalidRows}</p>
            </Card>
            <Card className="bg-amber-50">
              <p className="text-xs text-slate-500">{ui.duplicateSku}</p>
              <p className="text-2xl font-bold text-amber-700">{importStats.duplicateSkus}</p>
            </Card>
          </div>

          {importRows.length > 0 && (
            <Card padding={false}>
              <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-800">{ui.preview}: {importFileName}</p>
                  <p className="text-xs text-slate-400">{ui.confirmImport}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => { setImportRows([]); setImportFileName('') }}>{ui.clear}</Button>
                  <Button loading={saving} disabled={importStats.validRows === 0} onClick={confirmImportProducts}>{ui.confirmImport}</Button>
                </div>
              </div>
              <div className="divide-y divide-slate-50">
                {importRows.slice(0, 50).map(row => (
                  <div key={row.row_number} className="px-5 py-4 flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{ui.row} {row.row_number}: {row.sku || '-'}</p>
                      <p className="text-sm text-slate-500">{row.product_name || '-'}</p>
                      {row.errors.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {row.errors.map(error => <span key={error} className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">{error}</span>)}
                        </div>
                      )}
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.is_valid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {row.is_valid ? ui.valid : ui.invalid}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <h2 className="text-lg font-bold text-slate-900 mb-3">{ui.importExport}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button variant="secondary" onClick={() => exportInventoryProducts(products)}>{ui.exportProducts}</Button>
              <Button variant="secondary" onClick={() => exportInventoryProducts(lowStock, 'low-stock-report.xlsx')}>{ui.exportLowStock}</Button>
              <Button variant="secondary" onClick={() => exportStockMovements(movements)}>{ui.exportMovements}</Button>
            </div>
          </Card>
        </div>
      )}

      {tab === 'masters' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[
            ['category', ui.categories, categories],
            ['supplier', ui.suppliers, suppliers],
            ['location', ui.locations, locations],
          ].map(([type, label, rows]) => (
            <Card key={type}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-lg font-bold text-slate-900">{label}</h2>
                {canManage && <Button size="sm" variant="secondary" onClick={() => setQuickCreate(type)}>{ui.add}</Button>}
              </div>
              <div className="space-y-2">
                {rows.map(row => (
                  <div key={row.id} className="rounded-xl bg-slate-50 p-3">
                    <p className="font-semibold text-sm text-slate-800">{fieldName(i18n, row) || row.name}</p>
                    <p className="text-xs text-slate-500">{row.code || '-'}</p>
                  </div>
                ))}
                {!rows.length && <p className="text-sm text-slate-400">{ui.noData}</p>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showProductForm && (
        <Modal title={editProduct ? ui.editProduct : ui.addProduct} onClose={() => setShowProductForm(false)} size="lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="SKU" required><Input value={productForm.sku} onChange={e => setProductForm(p => ({ ...p, sku: e.target.value }))} /></Field>
            <Field label={ui.productCode}><Input value={productForm.product_code} onChange={e => setProductForm(p => ({ ...p, product_code: e.target.value }))} /></Field>
            <Field label={ui.productName} required><Input value={productForm.product_name} onChange={e => setProductForm(p => ({ ...p, product_name: e.target.value }))} /></Field>
            <Field label={ui.productNameEn}><Input value={productForm.product_name_en} onChange={e => setProductForm(p => ({ ...p, product_name_en: e.target.value }))} /></Field>
            <Field label={ui.category}>
              <Select value={productForm.category_id} onChange={e => setProductForm(p => ({ ...p, category_id: e.target.value }))}>
                <option value="">{ui.selectCategory}</option>
                {categories.map(category => <option key={category.id} value={category.id}>{fieldName(i18n, category)}</option>)}
              </Select>
            </Field>
            <Field label={ui.supplier}>
              <Select value={productForm.supplier_id} onChange={e => setProductForm(p => ({ ...p, supplier_id: e.target.value }))}>
                <option value="">{ui.selectSupplier}</option>
                {suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </Select>
            </Field>
            <Field label={ui.unit}><Input value={productForm.unit} onChange={e => setProductForm(p => ({ ...p, unit: e.target.value }))} /></Field>
            <Field label={ui.imageUrl}><Input value={productForm.image_url} onChange={e => setProductForm(p => ({ ...p, image_url: e.target.value }))} /></Field>
            <Field label={ui.stockQty}><Input type="number" value={productForm.stock_qty} onChange={e => setProductForm(p => ({ ...p, stock_qty: e.target.value }))} /></Field>
            <Field label={ui.minStock}><Input type="number" value={productForm.min_stock} onChange={e => setProductForm(p => ({ ...p, min_stock: e.target.value }))} /></Field>
            <Field label={ui.costPrice}><Input type="number" value={productForm.cost_price} onChange={e => setProductForm(p => ({ ...p, cost_price: e.target.value }))} /></Field>
            <Field label={ui.sellingPrice}><Input type="number" value={productForm.selling_price} onChange={e => setProductForm(p => ({ ...p, selling_price: e.target.value }))} /></Field>
          </div>
          <div className="flex gap-3 mt-5">
            <Button variant="secondary" className="flex-1" onClick={() => setShowProductForm(false)}>{ui.cancel}</Button>
            <Button className="flex-1" loading={saving} onClick={saveProduct}>{ui.save}</Button>
          </div>
        </Modal>
      )}

      {stockProduct && (
        <Modal title={`${ui.stockQty}: ${stockProduct.product_name}`} onClose={() => setStockProduct(null)} size="md">
          <div className="space-y-3">
            <Field label={ui.movementType}>
              <Select value={movementForm.movement_type} onChange={e => setMovementForm(p => ({ ...p, movement_type: e.target.value }))}>
                <option value="receive">{ui.receive}</option>
                <option value="issue">{ui.issue}</option>
                <option value="adjust">{ui.adjustPlus}</option>
              </Select>
            </Field>
            <Field label={ui.location}>
              <Select value={movementForm.location_id} onChange={e => setMovementForm(p => ({ ...p, location_id: e.target.value }))}>
                <option value="">{ui.noLocation}</option>
                {locations.map(location => <option key={location.id} value={location.id}>{fieldName(i18n, location)}</option>)}
              </Select>
            </Field>
            <Field label={ui.quantity}><Input type="number" value={movementForm.quantity} onChange={e => setMovementForm(p => ({ ...p, quantity: e.target.value }))} /></Field>
            <Field label={ui.unitCost}><Input type="number" value={movementForm.unit_cost} onChange={e => setMovementForm(p => ({ ...p, unit_cost: e.target.value }))} /></Field>
            <Field label={ui.notes}><Textarea value={movementForm.notes} onChange={e => setMovementForm(p => ({ ...p, notes: e.target.value }))} rows={3} /></Field>
          </div>
          <div className="flex gap-3 mt-5">
            <Button variant="secondary" className="flex-1" onClick={() => setStockProduct(null)}>{ui.cancel}</Button>
            <Button className="flex-1" loading={saving} onClick={saveStockMovement}>{ui.save}</Button>
          </div>
        </Modal>
      )}

      {showRequestForm && (
        <Modal title={ui.requestItem} onClose={() => setShowRequestForm(false)} size="md">
          <div className="space-y-3">
            <Field label={ui.product} required>
              <Select value={requestForm.product_id} onChange={e => setRequestForm(p => ({ ...p, product_id: e.target.value }))}>
                <option value="">{ui.selectProduct}</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.sku} - {product.product_name} ({Number(product.stock_qty || 0)} {product.unit})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={ui.quantity} required>
              <Input type="number" value={requestForm.quantity} onChange={e => setRequestForm(p => ({ ...p, quantity: e.target.value }))} />
            </Field>
            <Field label={ui.reason}>
              <Textarea value={requestForm.reason} onChange={e => setRequestForm(p => ({ ...p, reason: e.target.value }))} rows={3} />
            </Field>
          </div>
          <div className="flex gap-3 mt-5">
            <Button variant="secondary" className="flex-1" onClick={() => setShowRequestForm(false)}>{ui.cancel}</Button>
            <Button className="flex-1" loading={saving} onClick={saveStockRequest}>{ui.submit}</Button>
          </div>
        </Modal>
      )}

      {requestAction && (
        <Modal
          title={requestAction.action === 'issue' ? ui.issueStockRequest : requestAction.action === 'approved' ? ui.approveStockRequest : ui.rejectStockRequest}
          onClose={() => setRequestAction(null)}
          size="md"
        >
          <div className="rounded-2xl bg-slate-50 p-4 mb-4">
            <p className="font-semibold text-slate-800">{requestAction.request.products?.product_name}</p>
            <p className="text-sm text-slate-500">
              {Number(requestAction.request.quantity || 0)} {requestAction.request.products?.unit} {ui.requestedBy}{' '}
              {requestAction.request.requester ? `${requestAction.request.requester.first_name || ''} ${requestAction.request.requester.last_name || ''}`.trim() : ui.unknown}
            </p>
          </div>
          {requestAction.action === 'issue' && (
            <Field label={ui.issueLocation}>
              <Select value={issueLocationId} onChange={e => setIssueLocationId(e.target.value)}>
                <option value="">{ui.noLocation}</option>
                {locations.map(location => <option key={location.id} value={location.id}>{fieldName(i18n, location)}</option>)}
              </Select>
            </Field>
          )}
          <Field label={ui.notes}>
            <Textarea value={requestNotes} onChange={e => setRequestNotes(e.target.value)} rows={3} />
          </Field>
          <div className="flex gap-3 mt-5">
            <Button variant="secondary" className="flex-1" onClick={() => setRequestAction(null)}>{ui.cancel}</Button>
            <Button
              className="flex-1"
              variant={requestAction.action === 'rejected' ? 'danger' : 'primary'}
              loading={saving}
              onClick={confirmRequestAction}
            >
              {ui.confirm}
            </Button>
          </div>
        </Modal>
      )}

      {showCountForm && (
        <Modal title={ui.stockCount} onClose={() => setShowCountForm(false)} size="md">
          <div className="space-y-3">
            <Field label={ui.product} required>
              <Select
                value={countForm.product_id}
                onChange={e => {
                  const product = products.find(item => item.id === e.target.value)
                  setCountForm(p => ({
                    ...p,
                    product_id: e.target.value,
                    actual_qty: product?.stock_qty || 0,
                  }))
                }}
              >
                <option value="">{ui.selectProduct}</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.sku} - {product.product_name} ({Number(product.stock_qty || 0)} {product.unit})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={ui.location}>
              <Select value={countForm.location_id} onChange={e => setCountForm(p => ({ ...p, location_id: e.target.value }))}>
                <option value="">{ui.noLocation}</option>
                {locations.map(location => <option key={location.id} value={location.id}>{fieldName(i18n, location)}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={ui.systemQty}>
                <Input value={Number(selectedCountProduct?.stock_qty || 0)} disabled />
              </Field>
              <Field label={ui.actualQty} required>
                <Input type="number" value={countForm.actual_qty} onChange={e => setCountForm(p => ({ ...p, actual_qty: e.target.value }))} />
              </Field>
            </div>
            <Field label={ui.evidencePhotoUrl}>
              <Input value={countForm.image_url} onChange={e => setCountForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://..." />
            </Field>
            <Field label={ui.reason}>
              <Textarea value={countForm.reason} onChange={e => setCountForm(p => ({ ...p, reason: e.target.value }))} rows={3} />
            </Field>
          </div>
          <div className="flex gap-3 mt-5">
            <Button variant="secondary" className="flex-1" onClick={() => setShowCountForm(false)}>{ui.cancel}</Button>
            <Button className="flex-1" loading={saving} onClick={saveStockCount}>{ui.submitCount}</Button>
          </div>
        </Modal>
      )}

      {adjustmentAction && (
        <Modal
          title={adjustmentAction.action === 'approved' ? ui.approveStockCount : ui.rejectStockCount}
          onClose={() => setAdjustmentAction(null)}
          size="md"
        >
          <div className="rounded-2xl bg-slate-50 p-4 mb-4">
            <p className="font-semibold text-slate-800">{adjustmentAction.adjustment.products?.product_name}</p>
            <p className="text-sm text-slate-500">
              {ui.system} {Number(adjustmentAction.adjustment.system_qty || 0)} / {ui.actual} {Number(adjustmentAction.adjustment.actual_qty || 0)}
            </p>
          </div>
          <Field label={ui.notes}>
            <Textarea value={adjustmentNotes} onChange={e => setAdjustmentNotes(e.target.value)} rows={3} />
          </Field>
          <div className="flex gap-3 mt-5">
            <Button variant="secondary" className="flex-1" onClick={() => setAdjustmentAction(null)}>{ui.cancel}</Button>
            <Button
              className="flex-1"
              variant={adjustmentAction.action === 'rejected' ? 'danger' : 'primary'}
              loading={saving}
              onClick={confirmAdjustmentAction}
            >
              {ui.confirm}
            </Button>
          </div>
        </Modal>
      )}

      {quickCreate && (
        <Modal title={`${ui.add} ${quickCreate === 'category' ? ui.category : quickCreate === 'supplier' ? ui.supplier : ui.location}`} onClose={() => setQuickCreate(null)} size="sm">
          <div className="space-y-3">
            <Field label={ui.code}><Input value={quickForm.code} onChange={e => setQuickForm(p => ({ ...p, code: e.target.value }))} /></Field>
            <Field label={ui.name} required><Input value={quickForm.name} onChange={e => setQuickForm(p => ({ ...p, name: e.target.value }))} /></Field>
            <Field label={ui.nameEn}><Input value={quickForm.name_en} onChange={e => setQuickForm(p => ({ ...p, name_en: e.target.value }))} /></Field>
            {quickCreate === 'supplier' && (
              <>
                <Field label={ui.phone}><Input value={quickForm.phone} onChange={e => setQuickForm(p => ({ ...p, phone: e.target.value }))} /></Field>
                <Field label={ui.email}><Input value={quickForm.email} onChange={e => setQuickForm(p => ({ ...p, email: e.target.value }))} /></Field>
              </>
            )}
          </div>
          <div className="flex gap-3 mt-5">
            <Button variant="secondary" className="flex-1" onClick={() => setQuickCreate(null)}>{ui.cancel}</Button>
            <Button className="flex-1" loading={saving} onClick={saveQuickCreate}>{ui.save}</Button>
          </div>
        </Modal>
      )}
    </>
  )
}
