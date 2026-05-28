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
