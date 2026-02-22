import { redirect } from 'next/navigation'

export default function CentreRedirect({ params }: { params: { slug: string } }) {
  redirect(`/c/${params.slug}`)
}
