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

export function buildWarmApplicationUpdateMessage({
  centreName,
  childName,
  parentName,
  applicationNumber,
  status,
}: TemplateVariables) {
  const name = parentName ?? 'there'
  const centre = centreName ?? 'your centre'
  const child = childName ?? 'your child'
  const appNo = applicationNumber ?? 'your application'

  if (status === 'approved') {
    return `Hi ${name} 🎉 Wonderful news from ${centre}: ${child}'s application (${appNo}) has been approved! Open your Application Journey when you're ready to accept and secure the spot 😊.`
  }

  if (status === 'enrolled') {
    return `Hi ${name} 🌟 ${child} is now enrolled at ${centre}. We’re so excited to welcome your family! You can open the app anytime for daily updates 💙.`
  }

  if (status === 'in_review') {
    return `Hi ${name} 👋 ${centre} has started reviewing ${child}'s application (${appNo}). We’ll keep you posted at every step ✨.`
  }

  if (status === 'partial') {
    return `Hi ${name} 💛 ${child}'s application (${appNo}) at ${centre} is saved as partial. Upload the missing documents when you can, and we’ll move it forward right away 📄.`
  }

  if (status === 'waitlisted') {
    return `Hi ${name} 🙂 ${child}'s application (${appNo}) is currently on the waitlist at ${centre}. We’ll notify you as soon as a place opens up.`
  }

  if (status === 'rejected') {
    return `Hi ${name}, thank you for applying to ${centre}. ${child}'s application (${appNo}) was not successful this time. We’re still here to help you find a great fit nearby 💙.`
  }

  if (status === 'withdrawn') {
    return `Hi ${name}, ${child}'s application (${appNo}) was marked as withdrawn. If this wasn’t expected, please contact ${centre} and we’ll help 🤝.`
  }

  return `Hi ${name} 👋 ${child}'s application (${appNo}) at ${centre} has been updated to ${toStatusLabel(status)}.`
}
