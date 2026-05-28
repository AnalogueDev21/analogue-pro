export const localeOf = (i18n) => i18n.language === 'en' ? 'en-US' : 'th-TH'

export const choose = (i18n, th, en) => i18n.language === 'en' ? en : th

export const fieldName = (i18n, row, fallback = '—') => {
  if (!row) return fallback
  if (i18n.language === 'en') return row.name_en || row.name || fallback
  return row.name || row.name_en || fallback
}

