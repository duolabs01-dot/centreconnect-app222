export function shouldHideParentBottomNav(pathname: string): boolean {
  if (!pathname) return false

  return (
    pathname === '/parent/profile' ||
    pathname.startsWith('/parent/profile/') ||
    pathname === '/parent/applications' ||
    pathname.startsWith('/parent/applications/')
  )
}
