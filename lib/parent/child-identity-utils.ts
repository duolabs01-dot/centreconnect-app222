export function getMatchDescription(matchFields: string[]): string {
  const fieldLabels: Record<string, string> = {
    name: 'child name',
    dob: 'date of birth',
    gender: 'gender',
    suburb: 'area/suburb',
  }

  if (matchFields.length >= 3) {
    return `${matchFields.map(f => fieldLabels[f] || f).join(', ')} match`
  }

  if (matchFields.length === 2) {
    return `Both ${fieldLabels[matchFields[0]]} and ${fieldLabels[matchFields[1]]} match`
  }

  return `${fieldLabels[matchFields[0]] || matchFields[0]} matches`
}
