import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function AdminTenantsNewPage() {
  redirect('/admin/tenants')
}
