import { supabase } from '@/services/supabase'

export const verifyEmployeePin = async (pin) => {
  const { data, error } = await supabase.rpc('verify_employee_pin', { pin_input: pin })
  if (error) throw error
  return Boolean(data)
}

export const setEmployeePin = async (pin) => {
  const { error } = await supabase.rpc('set_employee_pin', { pin_input: pin })
  if (error) throw error
  return true
}
