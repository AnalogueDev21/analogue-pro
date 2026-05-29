import { useCallback, useEffect, useState } from 'react'
import {
  getCategories,
  getInventoryOverview,
  getLowStockProducts,
  getProducts,
  getStockAdjustments,
  getStockLocations,
  getStockMovements,
  getStockRequests,
  getSuppliers,
} from '../services/inventoryService'

export const useInventory = (companyId, filters = {}) => {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [locations, setLocations] = useState([])
  const [movements, setMovements] = useState([])
  const [requests, setRequests] = useState([])
  const [adjustments, setAdjustments] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [overview, setOverview] = useState({ product_count: 0, low_stock_count: 0, inventory_value: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      const [productRows, categoryRows, supplierRows, locationRows, movementRows, requestRows, adjustmentRows, lowStockRows, overviewRow] = await Promise.all([
        getProducts(companyId, filters),
        getCategories(companyId),
        getSuppliers(companyId),
        getStockLocations(companyId),
        getStockMovements(companyId, { limit: 20 }),
        getStockRequests(companyId, { status: filters.request_status || '' }),
        getStockAdjustments(companyId, { status: filters.adjustment_status || '' }),
        getLowStockProducts(companyId),
        getInventoryOverview(companyId),
      ])
      setProducts(productRows)
      setCategories(categoryRows)
      setSuppliers(supplierRows)
      setLocations(locationRows)
      setMovements(movementRows)
      setRequests(requestRows)
      setAdjustments(adjustmentRows)
      setLowStock(lowStockRows)
      setOverview(overviewRow)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [companyId, filters.category_id, filters.supplier_id, filters.activeOnly, filters.request_status, filters.adjustment_status])

  useEffect(() => { load() }, [load])

  return {
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
    error,
    reload: load,
  }
}
