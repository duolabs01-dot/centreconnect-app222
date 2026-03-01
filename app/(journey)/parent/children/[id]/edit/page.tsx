import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Edit Child Profile | Parent Portal | CentreConnect',
  description: 'Update child profile information for applications and enrolment.',
}

type EditChildPageProps = {
  params: {
    id: string
  }
}

export default async function EditChildPage({ params }: EditChildPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/parent/children/${params.id}/edit`)
  }

  const { data: child } = await supabase
    .from('children')
    .select('id,parent_id,first_name,last_name,date_of_birth,gender')
    .eq('id', params.id)
    .eq('parent_id', user.id)
    .maybeSingle()

  if (!child) {
    notFound()
  }

  async function updateChild(formData: FormData) {
    'use server'

    const serverClient = await createClient()
    const {
      data: { user: actionUser },
    } = await serverClient.auth.getUser()

    if (!actionUser) {
      redirect(`/login?next=/parent/children/${params.id}/edit`)
    }

    const firstName = String(formData.get('first_name') ?? '').trim()
    const lastName = String(formData.get('last_name') ?? '').trim()
    const dateOfBirth = String(formData.get('date_of_birth') ?? '').trim()
    const gender = String(formData.get('gender') ?? '').trim()

    if (!firstName || !lastName || !dateOfBirth || !gender) {
      redirect(`/parent/children/${params.id}/edit`)
    }

    const { error } = await serverClient
      .from('children')
      .update({
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        gender,
      })
      .eq('id', params.id)
      .eq('parent_id', actionUser.id)

    if (error) {
      redirect(`/parent/children/${params.id}/edit`)
    }

    redirect('/parent/children?success=child-updated')
  }

  return (
    <main className="mx-auto w-full max-w-3xl pb-6">
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Edit Child Profile</CardTitle>
          <CardDescription>Update this child profile used in your applications.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateChild} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="first_name" className="text-sm font-medium text-slate-700">
                  First Name
                </label>
                <input id="first_name" name="first_name" defaultValue={child.first_name ?? ''} required className="cc-native-field" />
              </div>
              <div className="space-y-2">
                <label htmlFor="last_name" className="text-sm font-medium text-slate-700">
                  Last Name
                </label>
                <input id="last_name" name="last_name" defaultValue={child.last_name ?? ''} required className="cc-native-field" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="date_of_birth" className="text-sm font-medium text-slate-700">
                  Date of Birth
                </label>
                <input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  defaultValue={child.date_of_birth ?? ''}
                  required
                  className="cc-native-field"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="gender" className="text-sm font-medium text-slate-700">
                  Gender
                </label>
                <select id="gender" name="gender" defaultValue={child.gender ?? ''} required className="cc-native-field">
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit">Save Changes</Button>
              <Button variant="outline" asChild>
                <Link href="/parent/children">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
