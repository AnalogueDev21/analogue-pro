export const escapeCsv = (value) => {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export const downloadCsv = (rows, fileName = 'activity-logs.csv') => {
  const headers = ['created_at', 'actor', 'action', 'target_type', 'target_id', 'description']
  const lines = [
    headers.map(escapeCsv).join(','),
    ...rows.map(row => headers.map(key => {
      if (key === 'actor') return escapeCsv(row.actor ? `${row.actor.first_name || ''} ${row.actor.last_name || ''}`.trim() : '')
      return escapeCsv(row[key])
    }).join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
