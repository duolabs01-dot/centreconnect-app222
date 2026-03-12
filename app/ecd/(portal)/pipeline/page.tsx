import { redirect } from 'next/navigation'

export default function EcdPipelineRedirectPage() {
  redirect('/ecd/applications?view=board')
}
