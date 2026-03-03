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

export function renderTemplate(templateBody: string, variables: TemplateVariables) {
  return templateBody
    .replaceAll('{{centre_name}}', variables.centreName ?? 'our centre')
    .replaceAll('{{child_name}}', variables.childName ?? 'your child')
    .replaceAll('{{parent_name}}', variables.parentName ?? 'parent')
    .replaceAll('{{application_number}}', variables.applicationNumber ?? 'your application')
    .replaceAll('{{status}}', toStatusLabel(variables.status))
}

export function buildWarmApplicationUpdateMessage({
  centreName,
  childName,
  parentName,
  applicationNumber,
  status,
}: TemplateVariables) {
  const name = parentName ?? 'there'
  const centre = centreName ?? 'your creche'
  const child = childName ?? 'your child'
  const appNo = applicationNumber ?? 'your application'

  if (status === 'approved') {
    return `Hello ${name}, great news from ${centre}. ${child}'s application (${appNo}) has been approved. Please open your Application Journey to confirm enrollment when ready.`
  }

  if (status === 'enrolled') {
    return `Hello ${name}, ${child} is now enrolled at ${centre}. We are excited to welcome your family.`
  }

  if (status === 'in_review') {
    return `Hello ${name}, ${centre} has started reviewing ${child}'s application (${appNo}). We will keep you informed at each step.`
  }

  if (status === 'partial') {
    return `Hello ${name}, ${child}'s application (${appNo}) at ${centre} is saved as partial. Please upload the remaining documents so our admissions team can continue.`
  }

  if (status === 'waitlisted') {
    return `Hello ${name}, ${child}'s application (${appNo}) is currently on the waitlist at ${centre}. We will contact you as soon as a place opens.`
  }

  if (status === 'rejected') {
    return `Hello ${name}, thank you for applying to ${centre}. ${child}'s application (${appNo}) was not successful this time.`
  }

  if (status === 'withdrawn') {
    return `Hello ${name}, ${child}'s application (${appNo}) was marked as withdrawn. If this was not expected, please contact ${centre}.`
  }

  return `Hello ${name}, ${child}'s application (${appNo}) at ${centre} has been updated to ${toStatusLabel(status)}.`
}
