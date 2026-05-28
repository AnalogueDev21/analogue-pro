import { useState } from 'react'
import { confirmPayrollImport, fetchPayrollEmployees, getPayrollImportStats, validatePayrollRows } from '../services/payrollImportService'
import { parsePayrollWorkbook } from '../utils/payrollExcel'

export function usePayrollImport({ companyId, employeeId, onImported }) {
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const stats = getPayrollImportStats(rows)

  const reset = () => {
    setFileName('')
    setRows([])
    setError('')
  }

  const loadFile = async (file) => {
    if (!file) return
    if (!companyId) {
      setError('Company context is missing')
      return
    }
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError('Only .xlsx files are supported')
      return
    }
    setLoading(true)
    setError('')
    try {
      const [parsedRows, employees] = await Promise.all([
        parsePayrollWorkbook(file),
        fetchPayrollEmployees(companyId),
      ])
      setFileName(file.name)
      setRows(validatePayrollRows(parsedRows, employees))
    } catch (e) {
      setError(e.message)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const confirm = async () => {
    if (!companyId || !employeeId) {
      const message = 'Company or employee context is missing'
      setError(message)
      throw new Error(message)
    }
    if (rows.length === 0) {
      const message = 'Upload and preview a file before importing'
      setError(message)
      throw new Error(message)
    }
    if (stats.validRows === 0) {
      const message = 'No valid rows to import'
      setError(message)
      throw new Error(message)
    }
    setSaving(true)
    setError('')
    try {
      const result = await confirmPayrollImport({
        companyId,
        employeeId,
        fileName,
        rows,
      })
      onImported?.(result)
      reset()
      return result
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setSaving(false)
    }
  }

  return {
    fileName,
    rows,
    stats,
    loading,
    saving,
    error,
    loadFile,
    confirm,
    reset,
  }
}
