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
    {
      skyTop: '#FFF1DE',
      skyBottom: '#FFF9F1',
      accent: '#E08B4F',
      accentSoft: '#FFE2C5',
      accentDeep: '#B85C38',
      leaf: '#5D927C',
      floor: '#F7E7D2',
      wall: '#FFFDF9',
      line: '#8B5E3C',
    },
    {
      skyTop: '#E7F8F2',
      skyBottom: '#FCFFFD',
      accent: '#15A38D',
      accentSoft: '#D8F6EE',
      accentDeep: '#0F766E',
      leaf: '#6B9E6F',
      floor: '#E8F3EC',
      wall: '#FAFEFC',
      line: '#2D5C54',
    },
    {
      skyTop: '#FFF0F3',
      skyBottom: '#FFFBFC',
      accent: '#D86C8A',
      accentSoft: '#FFDDE7',
      accentDeep: '#A94A66',
      leaf: '#7F9B6B',
      floor: '#F8E8EA',
      wall: '#FFF9FB',
      line: '#6D4250',
    },
    {
      skyTop: '#EEF5FF',
      skyBottom: '#FBFDFF',
      accent: '#5A8FD8',
      accentSoft: '#DCEAFF',
      accentDeep: '#3D68B3',
      leaf: '#6DA081',
      floor: '#E8EEF8',
      wall: '#FAFCFF',
      line: '#3A557A',
    },
  ]

  const seed = `${name}|${suburb ?? ''}|${isClaimed ? 'claimed' : 'preview'}`
    .split('')
    .reduce((total, char, index) => total + char.charCodeAt(0) * (index + 1), 0)
  const theme = themes[Math.abs(seed) % themes.length]
  const isPreviewOnly = !isClaimed
  const cloudOffset = seed % 40
  const buntingShift = seed % 18
  const toyColorA = theme.accent
  const toyColorB = theme.accentDeep
  const toyColorC = theme.leaf
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 825" role="img" aria-label="${name}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${theme.skyTop}" />
          <stop offset="100%" stop-color="${theme.skyBottom}" />
        </linearGradient>
        <linearGradient id="sunGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95" />
          <stop offset="100%" stop-color="${theme.accentSoft}" stop-opacity="0.35" />
        </linearGradient>
        <linearGradient id="floorGlow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${theme.floor}" />
          <stop offset="100%" stop-color="#FFFFFF" />
        </linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#5b4635" flood-opacity="0.08" />
        </filter>
      </defs>

      <rect width="1200" height="825" fill="url(#bg)" />
      <circle cx="1010" cy="126" r="136" fill="url(#sunGlow)" />
      <circle cx="176" cy="110" r="88" fill="#FFFFFF" opacity="0.65" />
      <circle cx="232" cy="128" r="60" fill="#FFFFFF" opacity="0.78" />
      <circle cx="152" cy="140" r="54" fill="#FFFFFF" opacity="0.78" />
      <circle cx="864" cy="112" r="70" fill="#FFFFFF" opacity="0.48" />
      <circle cx="918" cy="132" r="48" fill="#FFFFFF" opacity="0.62" />
      <circle cx="832" cy="138" r="44" fill="#FFFFFF" opacity="0.62" />

      <path d="M120 ${145 + buntingShift} C 220 ${192 + buntingShift}, 340 ${104 + buntingShift}, 468 ${158 + buntingShift} S 744 ${202 + buntingShift}, 1080 ${138 + buntingShift}" fill="none" stroke="#FFFFFF" stroke-opacity="0.78" stroke-width="7" stroke-linecap="round" />
      <path d="M186 ${156 + buntingShift} l26 34 l26 -34 z" fill="${toyColorA}" opacity="0.82" />
      <path d="M294 ${148 + buntingShift} l24 30 l24 -30 z" fill="${toyColorB}" opacity="0.88" />
      <path d="M398 ${164 + buntingShift} l28 36 l28 -36 z" fill="${toyColorC}" opacity="0.82" />
      <path d="M524 ${150 + buntingShift} l26 32 l26 -32 z" fill="${toyColorA}" opacity="0.78" />
      <path d="M650 ${170 + buntingShift} l24 30 l24 -30 z" fill="${toyColorB}" opacity="0.82" />
      <path d="M770 ${158 + buntingShift} l26 34 l26 -34 z" fill="${toyColorC}" opacity="0.78" />
      <path d="M900 ${148 + buntingShift} l28 35 l28 -35 z" fill="${toyColorA}" opacity="0.82" />

      <rect x="0" y="470" width="1200" height="355" fill="url(#floorGlow)" />
      <rect x="108" y="520" width="984" height="220" rx="46" fill="${theme.wall}" filter="url(#softShadow)" />
      <rect x="164" y="554" width="260" height="144" rx="30" fill="${theme.accentSoft}" opacity="0.92" />
      <rect x="452" y="546" width="302" height="152" rx="34" fill="#FFFFFF" opacity="0.97" />
      <rect x="780" y="558" width="246" height="136" rx="30" fill="${theme.accentSoft}" opacity="0.78" />

      <rect x="182" y="578" width="224" height="96" rx="24" fill="#FFF7EF" stroke="#F0D5B5" stroke-width="4" />
      <path d="M214 604 l42 0 l18 28 l-18 28 l-42 0 l-18 -28 z" fill="${toyColorA}" opacity="0.86" />
      <path d="M286 604 l42 0 l18 28 l-18 28 l-42 0 l-18 -28 z" fill="${toyColorB}" opacity="0.86" />
      <path d="M250 618 h36 v28 h-36 z" fill="${theme.accentSoft}" opacity="0.9" />
      <circle cx="332" cy="632" r="24" fill="${toyColorC}" opacity="0.86" />
      <circle cx="332" cy="632" r="10" fill="#FFF8F1" opacity="0.92" />

      <g transform="translate(494 570)">
        <rect x="0" y="0" width="228" height="100" rx="26" fill="#FFF9F4" stroke="#EADAC3" stroke-width="4" />
        <rect x="18" y="18" width="58" height="58" rx="14" fill="${toyColorA}" />
        <rect x="86" y="18" width="58" height="58" rx="14" fill="${toyColorB}" />
        <rect x="154" y="18" width="58" height="58" rx="14" fill="${toyColorC}" />
        <text x="47" y="56" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#FFFDF9">A</text>
        <text x="115" y="56" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#FFFDF9">B</text>
        <text x="183" y="56" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#FFFDF9">C</text>
      </g>

      <g transform="translate(822 578)">
        <rect x="0" y="42" width="124" height="58" rx="28" fill="${toyColorA}" opacity="0.84" />
        <rect x="20" y="0" width="26" height="94" rx="13" fill="${toyColorB}" opacity="0.86" />
        <rect x="76" y="6" width="26" height="88" rx="13" fill="${toyColorC}" opacity="0.86" />
        <circle cx="62" cy="78" r="16" fill="#FFF9F4" opacity="0.94" />
      </g>

      <g transform="translate(906 286)">
        <circle cx="0" cy="0" r="58" fill="#F8E7D8" />
        <circle cx="-32" cy="-42" r="24" fill="#F8E7D8" />
        <circle cx="32" cy="-42" r="24" fill="#F8E7D8" />
        <circle cx="-16" cy="-6" r="6" fill="${theme.line}" opacity="0.72" />
        <circle cx="16" cy="-6" r="6" fill="${theme.line}" opacity="0.72" />
        <ellipse cx="0" cy="16" rx="14" ry="11" fill="#FFF4EA" opacity="0.92" />
        <path d="M-18 30 C -8 40, 8 40, 18 30" fill="none" stroke="${theme.line}" stroke-width="6" stroke-linecap="round" opacity="0.7" />
      </g>

      <g transform="translate(170 286)">
        <path d="M0 86 C 0 22, 86 18, 86 86" fill="none" stroke="${toyColorA}" stroke-width="20" stroke-linecap="round" opacity="0.82" />
        <path d="M18 86 C 18 38, 86 38, 86 86" fill="none" stroke="${toyColorB}" stroke-width="20" stroke-linecap="round" opacity="0.78" />
        <path d="M36 86 C 36 54, 86 54, 86 86" fill="none" stroke="${toyColorC}" stroke-width="20" stroke-linecap="round" opacity="0.82" />
      </g>

      <g opacity="${isPreviewOnly ? '0.95' : '0.86'}">
        <rect x="92" y="96" width="292" height="54" rx="27" fill="#FFFFFF" opacity="0.88" />
        <circle cx="126" cy="123" r="12" fill="${toyColorA}" />
        <circle cx="154" cy="123" r="12" fill="${toyColorB}" />
        <circle cx="182" cy="123" r="12" fill="${toyColorC}" />
        <path d="M232 123 h112" stroke="${theme.line}" stroke-opacity="0.24" stroke-width="10" stroke-linecap="round" />
      </g>

      <rect x="120" y="744" width="320" height="18" rx="9" fill="#FFFFFF" opacity="0.65" />
      <rect x="760" y="744" width="220" height="18" rx="9" fill="#FFFFFF" opacity="0.52" />
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}
