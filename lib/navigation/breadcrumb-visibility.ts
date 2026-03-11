export type BreadcrumbAudience = 'public' | 'parent' | 'ecd' | 'admin'

const PUBLIC_ROOT_ROUTES = new Set(['/', '/directory', '/for-centres'])
const PARENT_ROOT_ROUTES = new Set(['/parent/dashboard'])
const ECD_ROOT_ROUTES = new Set(['/ecd/dashboard'])
const ADMIN_ROOT_ROUTES = new Set(['/admin/dashboard'])

function normalizePathname(pathname: string | null | undefined) {
  const value = String(pathname ?? '').trim()
  if (!value) return '/'
  return value.startsWith('/') ? value : `/${value}`
}

export function shouldShowBreadcrumbs(pathname: string | null | undefined, audience: BreadcrumbAudience) {
  const normalizedPathname = normalizePathname(pathname)

  if (audience === 'public') {
    return !PUBLIC_ROOT_ROUTES.has(normalizedPathname)
  }

  if (audience === 'parent') {
    return !PARENT_ROOT_ROUTES.has(normalizedPathname)
  }

  if (audience === 'ecd') {
    return !ECD_ROOT_ROUTES.has(normalizedPathname)
  }

  return !ADMIN_ROOT_ROUTES.has(normalizedPathname)
}

export function getBreadcrumbClassName(audience: BreadcrumbAudience) {
  return 'hidden md:flex'
}
