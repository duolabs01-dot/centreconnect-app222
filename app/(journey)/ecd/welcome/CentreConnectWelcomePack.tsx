'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'

type Scenario = {
  id: string
  emoji: string
  color: string
  bg: string
  accent: string
  title: string
  shortTitle: string
  pain: string
  solution: string
  steps: string[]
  ctaLabel: string
  ctaHref: string
  quote: string
  quoteAuthor: string
}

type Tip = {
  emoji: string
  tip: string
}

const scenarios: Scenario[] = [
  {
    id: 'applications',
    emoji: '📋',
    color: '#0D9488',
    bg: '#F0FDFA',
    accent: '#CCFBF1',
    title: 'No more chasing parents on WhatsApp',
    shortTitle: 'Applications',
    pain:
      'You post in WhatsApp, wait, and then chase parents again. Documents arrive in many messages and your day gets interrupted.',
    solution:
      'When a parent applies through CentreConnect, all details arrive in one clean place. You accept or decline in one tap and the parent is notified automatically.',
    steps: [
      'A parent finds your centre and applies',
      'You get a notification in your dashboard',
      'Review the child details quickly',
      'Accept, decline, or waitlist with one tap',
      'Parent gets the update automatically',
    ],
    ctaLabel: 'See the Applications Board',
    ctaHref: '/ecd/pipeline',
    quote: '"I used to spend hours sorting messages. Now it is minutes."',
    quoteAuthor: 'Mama Thandi, Soweto ECD Centre',
  },
  {
    id: 'children',
    emoji: '👧🏾',
    color: '#7C3AED',
    bg: '#FAF5FF',
    accent: '#EDE9FE',
    title: 'Your children records are finally organised',
    shortTitle: 'Children',
    pain:
      'The paper register works until you must find one detail fast while a parent is waiting at the gate.',
    solution:
      'Add each child once and keep profile, guardians, pickup contacts, and health notes in one place.',
    steps: [
      'Add child name and date of birth',
      'Choose age group',
      'Add parent and guardian contacts',
      'Add pickup people',
      'Add allergy and health notes',
    ],
    ctaLabel: 'Start Adding Children',
    ctaHref: '/ecd/children/new',
    quote: '"Now I find records in seconds on my phone."',
    quoteAuthor: 'Auntie Rose, Alexandra Creche',
  },
  {
    id: 'attendance',
    emoji: '✅',
    color: '#0369A1',
    bg: '#F0F9FF',
    accent: '#BAE6FD',
    title: 'Attendance in 30 seconds, not 30 minutes',
    shortTitle: 'Attendance',
    pain:
      'Morning roll call and month end counting can eat your time and create mistakes.',
    solution:
      'Mark present or absent with a few taps. Monthly totals are ready for invoicing.',
    steps: [
      'Open attendance each morning',
      'Tap each child present or absent',
      'Add reason for absence if needed',
      'It saves automatically',
      'View monthly summary any time',
    ],
    ctaLabel: 'Open Attendance',
    ctaHref: '/ecd/attendance',
    quote: '"Month end counting became easy and fast."',
    quoteAuthor: 'Mama Precious, Tembisa',
  },
  {
    id: 'pickup',
    emoji: '🔐',
    color: '#B45309',
    bg: '#FFFBEB',
    accent: '#FDE68A',
    title: 'Safe pickup with less gate confusion',
    shortTitle: 'Safe Pickup',
    pain:
      'Someone unknown arrives at the gate and says they are picking up a child. That moment is stressful.',
    solution:
      'Authorised pickup people are registered. You scan QR, verify quickly, and release only when safe.',
    steps: [
      'Add pickup people to each child profile',
      'Print your centre QR poster',
      'Guardian shows QR at pickup',
      'You scan and verify',
      'System confirms authorised or not',
    ],
    ctaLabel: 'Set Up Safe Pickup',
    ctaHref: '/ecd/pickup',
    quote: '"The system helps us stay calm and safe at the gate."',
    quoteAuthor: 'Mama Lindiwe, Katlehong',
  },
  {
    id: 'parents',
    emoji: '💬',
    color: '#047857',
    bg: '#F0FDF4',
    accent: '#A7F3D0',
    title: 'Invite parents and keep them involved',
    shortTitle: 'Invite Parents',
    pain:
      'Parents can feel disconnected during the day and then everything becomes urgent.',
    solution:
      'Parents see attendance, notes, and updates in one place. Trust grows without extra calls.',
    steps: [
      'Share your centre link',
      'Parents register for free',
      'They apply through the app',
      'You approve and onboard quickly',
      'Parents follow updates daily',
    ],
    ctaLabel: 'Get Your Share Link',
    ctaHref: '/ecd/profile',
    quote: '"Parents started thanking us for clear updates."',
    quoteAuthor: 'Auntie Grace, Mamelodi',
  },
  {
    id: 'staff',
    emoji: '👩🏾‍🏫',
    color: '#9D174D',
    bg: '#FFF1F2',
    accent: '#FECDD3',
    title: 'Give staff access without losing control',
    shortTitle: 'Your Staff',
    pain:
      'You cannot be everywhere, but sharing one password is not safe.',
    solution:
      'Invite each staff member with their own role and login, so they can help without seeing everything.',
    steps: [
      'Open centre settings',
      'Click Invite Staff',
      'Enter staff email',
      'Choose role access',
      'Staff activate their own login',
    ],
    ctaLabel: 'Invite Your Staff',
    ctaHref: '/ecd/profile',
    quote: '"My team can help while I keep control."',
    quoteAuthor: 'Mama Ntombi, Soweto',
  },
]

const tips: Tip[] = [
  { emoji: '📱', tip: 'Add CentreConnect to your home screen. It works like an app with no download.' },
  { emoji: '💾', tip: 'Start with five children from your register, then add more later.' },
  { emoji: '🖨️', tip: 'Print your QR poster and place it at the gate for safer pickup.' },
  { emoji: '📸', tip: 'Upload a clear centre photo and logo. Parents choose with their eyes first.' },
  { emoji: '🗓️', tip: 'Set one weekly catch up slot so onboarding becomes easy and consistent.' },
]

function ScenarioCard({
  scenario,
  onOpen,
}: {
  scenario: Scenario
  onOpen: (scenario: Scenario) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(scenario)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '22px',
        background: scenario.bg,
        border: `2px solid ${scenario.accent}`,
        borderRadius: '20px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        width: '100%',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = 'translateY(-3px)'
        event.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = 'translateY(0)'
        event.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
      }}
    >
      <span style={{ fontSize: '2rem' }}>{scenario.emoji}</span>
      <span
        style={{
          fontFamily: "'Bitter', Georgia, serif",
          fontSize: '1.05rem',
          fontWeight: 700,
          color: scenario.color,
          lineHeight: 1.3,
        }}
      >
        {scenario.title}
      </span>
      <span style={{ fontSize: '0.82rem', color: '#6B7280', lineHeight: 1.5 }}>
        Tap to read more →
      </span>
    </button>
  )
}

function ScenarioModal({
  scenario,
  onClose,
}: {
  scenario: Scenario | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!scenario) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [scenario])

  if (!scenario) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '28px',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
          animation: 'slideUp 0.25s ease',
        }}
      >
        <div style={{ background: scenario.color, borderRadius: '28px 28px 0 0', padding: '28px 28px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '2.5rem' }}>{scenario.emoji}</span>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Close scenario"
            >
              ✕
            </button>
          </div>
          <h2
            style={{
              fontFamily: "'Bitter', Georgia, serif",
              fontSize: '1.4rem',
              fontWeight: 800,
              color: '#fff',
              margin: '12px 0 0',
              lineHeight: 1.3,
            }}
          >
            {scenario.title}
          </h2>
        </div>

        <div style={{ padding: '28px' }}>
          <div style={{ background: '#FEF3C7', borderRadius: '16px', padding: '18px', marginBottom: '20px' }}>
            <p
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#92400E',
                margin: '0 0 8px',
              }}
            >
              You know this situation
            </p>
            <p style={{ fontSize: '0.95rem', color: '#374151', lineHeight: 1.7, margin: 0 }}>
              {scenario.pain}
            </p>
          </div>

          <div
            style={{
              background: scenario.bg,
              border: `2px solid ${scenario.accent}`,
              borderRadius: '16px',
              padding: '18px',
              marginBottom: '20px',
            }}
          >
            <p
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: scenario.color,
                margin: '0 0 8px',
              }}
            >
              Here is how it works now
            </p>
            <p style={{ fontSize: '0.95rem', color: '#374151', lineHeight: 1.7, margin: 0 }}>
              {scenario.solution}
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151', margin: '0 0 12px' }}>
              Step by step
            </p>
            {scenario.steps.map((step, index) => (
              <div key={step} style={{ display: 'flex', gap: '14px', marginBottom: '10px', alignItems: 'flex-start' }}>
                <span
                  style={{
                    minWidth: '28px',
                    height: '28px',
                    background: scenario.color,
                    color: '#fff',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </span>
                <p style={{ fontSize: '0.9rem', color: '#374151', margin: 0, paddingTop: '4px', lineHeight: 1.5 }}>
                  {step}
                </p>
              </div>
            ))}
          </div>

          <div style={{ borderLeft: `4px solid ${scenario.color}`, paddingLeft: '16px', marginBottom: '24px' }}>
            <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, fontStyle: 'italic', margin: '0 0 6px' }}>
              {scenario.quote}
            </p>
            <p style={{ fontSize: '0.78rem', color: '#9CA3AF', margin: 0, fontWeight: 600 }}>
              — {scenario.quoteAuthor}
            </p>
          </div>

          <a
            href={scenario.ctaHref}
            style={{
              display: 'block',
              textAlign: 'center',
              background: scenario.color,
              color: '#fff',
              borderRadius: '16px',
              padding: '16px',
              fontWeight: 800,
              fontSize: '1rem',
              textDecoration: 'none',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.opacity = '0.88'
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.opacity = '1'
            }}
          >
            {scenario.ctaLabel}
          </a>
        </div>
      </div>
    </div>
  )
}

export default function CentreConnectWelcomePack() {
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null)
  const [centreName, setCentreName] = useState('your centre')
  const [contactName, setContactName] = useState('Friend')
  const [step, setStep] = useState<0 | 1>(0)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('centre')) setCentreName(params.get('centre') as string)
    if (params.get('name')) setContactName(params.get('name') as string)
  }, [])

  const firstName = useMemo(() => contactName.split(' ')[0] || contactName, [contactName])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bitter:wght@400;600;700;800&family=Nunito:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #FFF7ED; }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        .pulse { animation: float 3s ease-in-out infinite; }
        .scenario-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 640px) { .scenario-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div
        style={{
          fontFamily: "'Nunito', sans-serif",
          minHeight: '100vh',
          background: 'linear-gradient(160deg, #FFF7ED 0%, #F0FDFA 50%, #EFF6FF 100%)',
        }}
      >
        {step === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
              padding: '32px 24px',
              textAlign: 'center',
            }}
          >
            <div className="pulse" style={{ fontSize: '4rem', marginBottom: '24px' }}>
              🏫
            </div>

            <p
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#0D9488',
                margin: '0 0 16px',
              }}
            >
              CentreConnect
            </p>

            <h1
              style={{
                fontFamily: "'Bitter', Georgia, serif",
                fontSize: 'clamp(2rem, 6vw, 2.8rem)',
                fontWeight: 800,
                color: '#1E293B',
                margin: '0 0 12px',
                lineHeight: 1.15,
              }}
            >
              Sawubona, {firstName}
            </h1>

            <h2
              style={{
                fontFamily: "'Bitter', Georgia, serif",
                fontSize: 'clamp(1.1rem, 4vw, 1.4rem)',
                fontWeight: 600,
                color: '#0D9488',
                margin: '0 0 28px',
                lineHeight: 1.4,
              }}
            >
              {centreName} is now on CentreConnect.
            </h2>

            <div
              style={{
                maxWidth: '480px',
                background: '#fff',
                borderRadius: '24px',
                padding: '28px',
                boxShadow: '0 8px 40px rgba(0,0,0,0.1)',
                marginBottom: '32px',
                textAlign: 'left',
              }}
            >
              <p style={{ fontSize: '1rem', color: '#374151', lineHeight: 1.8, margin: '0 0 14px' }}>
                We know you have been running your centre with paper and WhatsApp for years.
              </p>
              <p style={{ fontSize: '1rem', color: '#374151', lineHeight: 1.8, margin: '0 0 14px' }}>
                You already do incredible work. This guide simply helps you remove admin stress and save time.
              </p>
              <p style={{ fontSize: '1rem', color: '#374151', lineHeight: 1.8, margin: 0 }}>
                Think of CentreConnect as your trusted helper, step by step.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                background: 'linear-gradient(135deg, #0D9488 0%, #0369A1 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '20px',
                padding: '20px 48px',
                fontSize: '1.1rem',
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: "'Nunito', sans-serif",
                boxShadow: '0 8px 24px rgba(13,148,136,0.35)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.transform = 'translateY(-2px)'
                event.currentTarget.style.boxShadow = '0 12px 32px rgba(13,148,136,0.45)'
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.transform = 'translateY(0)'
                event.currentTarget.style.boxShadow = '0 8px 24px rgba(13,148,136,0.35)'
              }}
            >
              Let us get started →
            </button>

            <p style={{ fontSize: '0.8rem', color: '#9CA3AF', margin: '16px 0 0' }}>
              Simple steps. Real support. No complicated setup.
            </p>
          </div>
        )}

        {step === 1 && (
          <div style={{ maxWidth: '660px', margin: '0 auto', padding: '32px 20px 64px' }}>
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: '#0D9488',
                  margin: '0 0 12px',
                }}
              >
                CentreConnect
              </p>
              <h1
                style={{
                  fontFamily: "'Bitter', Georgia, serif",
                  fontSize: 'clamp(1.6rem, 5vw, 2.2rem)',
                  fontWeight: 800,
                  color: '#1E293B',
                  margin: '0 0 12px',
                }}
              >
                Your centre, your way
              </h1>
              <p style={{ fontSize: '1rem', color: '#6B7280', lineHeight: 1.7, margin: 0 }}>
                Tap any card below to see exactly how CentreConnect helps in real daily situations.
              </p>
            </div>

            <div
              style={{
                background: 'linear-gradient(135deg, #0D9488 0%, #0369A1 100%)',
                borderRadius: '24px',
                padding: '28px',
                marginBottom: '32px',
                color: '#fff',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '6rem', opacity: 0.1 }}>
                🏫
              </div>
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  margin: '0 0 12px',
                  opacity: 0.8,
                }}
              >
                A personal note for {firstName}
              </p>
              <p style={{ fontSize: '1rem', lineHeight: 1.75, margin: '0 0 16px', opacity: 0.95 }}>
                This platform is built for centres like {centreName}. It helps reduce the admin load so your team can focus on children.
              </p>
              <p style={{ fontSize: '1rem', lineHeight: 1.75, margin: 0, opacity: 0.95 }}>
                Parents are already asking for this type of experience.
              </p>
            </div>

            <h2
              style={{
                fontFamily: "'Bitter', Georgia, serif",
                fontSize: '1.3rem',
                fontWeight: 800,
                color: '#1E293B',
                margin: '0 0 6px',
              }}
            >
              What would you like to tackle first?
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#9CA3AF', margin: '0 0 18px' }}>
              Each card explains one common situation.
            </p>

            <div className="scenario-grid" style={{ marginBottom: '40px' }}>
              {scenarios.map((scenario) => (
                <ScenarioCard key={scenario.id} scenario={scenario} onOpen={setActiveScenario} />
              ))}
            </div>

            <div
              style={{
                background: '#fff',
                borderRadius: '24px',
                padding: '28px',
                marginBottom: '32px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              }}
            >
              <h2
                style={{
                  fontFamily: "'Bitter', Georgia, serif",
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: '#1E293B',
                  margin: '0 0 6px',
                }}
              >
                Quick tips from other principals
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#9CA3AF', margin: '0 0 20px' }}>
                Small actions that make setup easier.
              </p>
              {tips.map((tip) => (
                <div key={tip.tip} style={{ display: 'flex', gap: '14px', marginBottom: '16px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{tip.emoji}</span>
                  <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.65, margin: 0 }}>{tip.tip}</p>
                </div>
              ))}
            </div>

            <div
              style={{
                background: '#F0FDF4',
                border: '2px solid #A7F3D0',
                borderRadius: '24px',
                padding: '28px',
                marginBottom: '32px',
              }}
            >
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: '#047857',
                  margin: '0 0 12px',
                }}
              >
                We are here always
              </p>
              <p style={{ fontSize: '1rem', color: '#374151', lineHeight: 1.75, margin: '0 0 20px' }}>
                If anything is confusing, WhatsApp us. A real person will help you.
              </p>
              <a
                href="https://wa.me/27685356430?text=Hi%2C%20I%20need%20help%20with%20CentreConnect"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: '#25D366',
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: '16px',
                  padding: '14px 24px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 16px rgba(37,211,102,0.35)',
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>💬</span>
                WhatsApp us right now
              </a>
            </div>

            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.9rem', color: '#6B7280', margin: '0 0 16px', lineHeight: 1.6 }}>
                Ready to go in? Your dashboard is waiting.
              </p>
              <a
                href="/ecd/dashboard"
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #0D9488 0%, #0369A1 100%)',
                  color: '#fff',
                  textDecoration: 'none',
                  borderRadius: '20px',
                  padding: '20px 48px',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  boxShadow: '0 8px 24px rgba(13,148,136,0.35)',
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                Open my dashboard
              </a>
            </div>
          </div>
        )}

        <ScenarioModal scenario={activeScenario} onClose={() => setActiveScenario(null)} />
      </div>
    </>
  )
}
