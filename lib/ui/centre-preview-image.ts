export function buildCentrePreviewImage({
  name,
  suburb,
  isClaimed,
}: {
  name: string
  suburb?: string | null
  isClaimed: boolean
}) {
  const themes = [
    { sky: '#F6E7D8', accent: '#D4935A', accentSoft: '#FDF0E6', panel: '#FFF9F2', text: '#24413B' },
    { sky: '#E8F4EF', accent: '#0D9488', accentSoft: '#DDF2EC', panel: '#F8FFFD', text: '#173B37' },
    { sky: '#F7E9EE', accent: '#C65B7C', accentSoft: '#FCEEF3', panel: '#FFF8FB', text: '#3D2430' },
    { sky: '#EAF0FA', accent: '#4D7DBF', accentSoft: '#EDF4FF', panel: '#F9FBFF', text: '#20354F' },
  ]

  const seed = `${name}|${suburb ?? ''}|${isClaimed ? 'claimed' : 'preview'}`
    .split('')
    .reduce((total, char) => total + char.charCodeAt(0), 0)
  const theme = themes[seed % themes.length]
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'CC'
  const statusLine = isClaimed ? 'Preview image' : 'Not yet on CentreConnect'
  const locationLine = suburb?.trim() || 'Johannesburg'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 825" role="img" aria-label="${name}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${theme.sky}" />
          <stop offset="100%" stop-color="#FFFFFF" />
        </linearGradient>
      </defs>
      <rect width="1200" height="825" fill="url(#bg)" />
      <circle cx="1040" cy="140" r="145" fill="${theme.accentSoft}" opacity="0.9" />
      <circle cx="160" cy="110" r="105" fill="${theme.accentSoft}" opacity="0.8" />
      <rect x="72" y="96" width="250" height="56" rx="28" fill="${theme.panel}" opacity="0.96" />
      <text x="104" y="132" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${theme.accent}">${statusLine}</text>
      <rect x="76" y="520" width="1048" height="240" rx="40" fill="${theme.panel}" opacity="0.95" />
      <rect x="84" y="290" width="270" height="270" rx="54" fill="${theme.accent}" />
      <text x="219" y="450" text-anchor="middle" font-family="Arial, sans-serif" font-size="112" font-weight="700" fill="#FFFFFF">${initials}</text>
      <text x="392" y="382" font-family="Arial, sans-serif" font-size="64" font-weight="700" fill="${theme.text}">${name}</text>
      <text x="392" y="440" font-family="Arial, sans-serif" font-size="28" font-weight="600" fill="${theme.accent}">${locationLine}</text>
      <text x="92" y="618" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="${theme.text}">Centre photos have not been uploaded yet.</text>
      <text x="92" y="666" font-family="Arial, sans-serif" font-size="24" fill="${theme.text}">This preview helps parents recognise the listing before real images are added.</text>
      <text x="92" y="706" font-family="Arial, sans-serif" font-size="24" fill="${theme.text}">Use the status and buttons below to see whether applications happen online or directly.</text>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}
