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
        <linearGradient id="ground" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="${theme.panel}" />
          <stop offset="100%" stop-color="${theme.accentSoft}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="825" fill="url(#bg)" />
      <circle cx="1040" cy="140" r="145" fill="${theme.accentSoft}" opacity="0.9" />
      <circle cx="160" cy="110" r="105" fill="${theme.accentSoft}" opacity="0.8" />
      <rect x="72" y="96" width="250" height="56" rx="28" fill="${theme.panel}" opacity="0.96" />
      <text x="104" y="132" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${theme.accent}">${statusLine}</text>
      <rect x="0" y="520" width="1200" height="305" fill="url(#ground)" />
      <rect x="112" y="360" width="240" height="184" rx="40" fill="${theme.accent}" opacity="0.94" />
      <rect x="214" y="286" width="36" height="96" rx="18" fill="${theme.accent}" opacity="0.94" />
      <rect x="402" y="328" width="164" height="216" rx="34" fill="${theme.panel}" opacity="0.98" />
      <rect x="432" y="364" width="104" height="142" rx="24" fill="${theme.accentSoft}" />
      <rect x="618" y="388" width="168" height="156" rx="32" fill="${theme.accent}" opacity="0.78" />
      <rect x="820" y="346" width="252" height="198" rx="38" fill="${theme.panel}" opacity="0.96" />
      <circle cx="946" cy="430" r="42" fill="${theme.accentSoft}" />
      <circle cx="915" cy="410" r="10" fill="${theme.accent}" opacity="0.75" />
      <circle cx="978" cy="410" r="10" fill="${theme.accent}" opacity="0.75" />
      <path d="M906 464c18 22 58 22 76 0" stroke="${theme.accent}" stroke-width="12" stroke-linecap="round" fill="none" opacity="0.8" />
      <rect x="94" y="612" width="320" height="30" rx="15" fill="${theme.panel}" opacity="0.92" />
      <rect x="94" y="660" width="440" height="24" rx="12" fill="${theme.panel}" opacity="0.72" />
      <rect x="94" y="700" width="360" height="24" rx="12" fill="${theme.panel}" opacity="0.56" />
      <rect x="786" y="612" width="270" height="128" rx="32" fill="${theme.panel}" opacity="0.94" />
      <text x="922" y="690" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" font-weight="700" fill="${theme.accent}">${initials}</text>
    </svg>
  `
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}
