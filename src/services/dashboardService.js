import { supabase } from './supabase'

export const countRows = async (table, companyId, filters = {}) => {
  let query = supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query = query.eq(key, value)
  })

  const { count, error } = await query
  if (error) return 0
  return count || 0
}

