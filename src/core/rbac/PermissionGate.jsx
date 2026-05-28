// src/core/rbac/PermissionGate.jsx
import { useAuthStore } from '@/core/store/authStore'

/**
 * PermissionGate — show children only if user has permission
 *
 * Usage:
 * <PermissionGate perm="employee.view_all">
 *   <AdminPanel />
 * </PermissionGate>
 *
 * <PermissionGate level={40} fallback={<NoAccess />}>
 *   <ManagerPanel />
 * </PermissionGate>
 */
export function PermissionGate({ perm, perms, level, fallback = null, children }) {
  const { can, canAny, isLevel } = useAuthStore()

  let hasAccess = true

  if (perm) hasAccess = can(perm)
  if (perms) hasAccess = canAny(...perms)
  if (level) hasAccess = isLevel(level)

  return hasAccess ? children : fallback
}

/**
 * usePermission hook
 */
export function usePermission() {
  const { can, canAny, isLevel, permissions, roleLevel } = useAuthStore()
  return { can, canAny, isLevel, permissions, roleLevel }
}
