export function shouldHideParentBottomNav(pathname: string): boolean {
  if (!pathname) return false

  return (
    pathname.startsWith('/parent/profile/') ||
    pathname === '/parent/applications' ||
    pathname.startsWith('/parent/applications/')
  )
}
