export type TemplateVariables = {
  centreName?: string | null
  childName?: string | null
  parentName?: string | null
  applicationNumber?: string | null
  status?: string | null
}

export function toStatusLabel(status: string | null | undefined) {
  if (!status) return 'updated'
  return status.replaceAll('_', ' ')
}

export function renderTemplate(
  templateBody: string,
  variables: TemplateVariables
) {
  return templateBody
    .replaceAll('{{centre_name}}', variables.centreName ?? 'our centre')
    .replaceAll('{{child_name}}', variables.childName ?? 'your child')
    .replaceAll('{{parent_name}}', variables.parentName ?? 'parent')
    .replaceAll('{{application_number}}', variables.applicationNumber ?? 'your application')
    .replaceAll('{{status}}', toStatusLabel(variables.status))
}

