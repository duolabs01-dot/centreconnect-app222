// components/parent/ApplicationTimeline.tsx
// A stepper that shows application progress in parent-friendly language.
// NO technical status names. Uses icons, color, and plain English.

'use client'

import { CheckCircle2, Clock, Search, PartyPopper, XCircle, ListOrdered } from 'lucide-react'
import { formatDate } from '@/lib/utils'

type AppStatus = 'submitted' | 'in_review' | 'approved' | 'enrolled' | 'waitlisted' | 'rejected' | 'withdrawn'

interface TimelineEvent {
  status: AppStatus
  created_at: string
  notes?: string
}

interface ApplicationTimelineProps {
  currentStatus: AppStatus
  history: TimelineEvent[]
  centreName: string
  childName: string
  applicationNumber: string
}

const STATUS_CONFIG: Record<AppStatus, {
  label: string
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
}> = {
  submitted: {
    label: 'Application Sent ✓',
    description: 'Your application was received. The centre will be in touch soon.',
    icon: CheckCircle2,
    color: '#2563EB',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  in_review: {
    label: 'They\'re Looking 👀',
    description: 'The centre is reviewing your application right now.',
    icon: Search,
    color: '#D97706',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  approved: {
    label: 'You Got In! 🎉',
    description: 'Congratulations! Your child has been accepted. Confirm enrollment below.',
    icon: PartyPopper,
    color: '#059669',
    bgColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  enrolled: {
    label: 'Enrollment Confirmed',
    description: 'Your spot is confirmed and the centre should contact you next.',
    icon: PartyPopper,
    color: '#047857',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  waitlisted: {
    label: 'On the List 📋',
    description: 'You\'re on the waitlist. We\'ll notify you as soon as a spot opens up.',
    icon: ListOrdered,
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  rejected: {
    label: 'Not This Time',
    description: 'Unfortunately there isn\'t a spot available. Try other centres — we\'ll help you find one.',
    icon: XCircle,
    color: '#DC2626',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  withdrawn: {
    label: 'Application Withdrawn',
    description: 'You withdrew this application.',
    icon: XCircle,
    color: '#6B7280',
    bgColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
}

// The ORDERED flow — only show steps up to current
const FLOW: AppStatus[] = ['submitted', 'in_review', 'approved', 'enrolled']

export default function ApplicationTimeline({
  currentStatus,
  history,
  centreName,
  childName,
  applicationNumber,
}: ApplicationTimelineProps) {
  const config = STATUS_CONFIG[currentStatus]
  const Icon = config.icon

  // Find where we are in the main flow
  const currentFlowIndex = FLOW.indexOf(currentStatus)
  const isTerminal = currentStatus === 'rejected' || currentStatus === 'withdrawn'
  const isWaitlisted = currentStatus === 'waitlisted'

  return (
    <>
      <div className="timeline">
        {/* Current Status Hero Card */}
        <div
          className="timeline__status-card"
          style={{ background: config.bgColor, borderColor: config.borderColor }}
        >
          <div className="timeline__status-icon" style={{ color: config.color }}>
            <Icon size={28} strokeWidth={2} />
          </div>
          <div>
            <p className="timeline__status-label" style={{ color: config.color }}>
              {config.label}
            </p>
            <p className="timeline__status-desc">{config.description}</p>
          </div>
        </div>

        {/* Progress dots (only for non-terminal, non-waitlist) */}
        {!isTerminal && !isWaitlisted && (
          <div className="timeline__progress">
            {FLOW.map((step, i) => {
              const isDone = i <= currentFlowIndex
              const isCurrentStep = i === currentFlowIndex
              const stepConfig = STATUS_CONFIG[step]
              return (
                <div key={step} className="timeline__step">
                  {/* Line connector */}
                  {i > 0 && (
                    <div
                      className="timeline__line"
                      style={{ background: isDone ? '#2563EB' : '#E2E8F0' }}
                    />
                  )}

                  {/* Step dot */}
                  <div
                    className={`timeline__dot ${isDone ? 'timeline__dot--done' : ''} ${isCurrentStep ? 'timeline__dot--current' : ''}`}
                  >
                    {isDone && <CheckCircle2 size={16} strokeWidth={2.5} />}
                  </div>

                  {/* Label */}
                  <span
                    className="timeline__step-label"
                    style={{ color: isDone ? '#0F172A' : '#94A3B8', fontWeight: isDone ? 700 : 500 }}
                  >
                    {i === 0 ? 'Sent' : i === 1 ? 'In review' : i === 2 ? 'Accepted' : 'Enrolled'}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* History log (collapsed by default) */}
        <div className="timeline__history">
          <p className="timeline__history-title">Activity</p>
          {history.map((event, i) => {
            const ec = STATUS_CONFIG[event.status]
            return (
              <div key={i} className="timeline__history-item">
                <div
                  className="timeline__history-dot"
                  style={{ background: ec.color }}
                />
                <div className="timeline__history-content">
                  <p className="timeline__history-label" style={{ color: ec.color }}>
                    {ec.label}
                  </p>
                  <p className="timeline__history-date">
                    {formatDate(event.created_at)}
                  </p>
                  {event.notes && (
                    <p className="timeline__history-notes">{event.notes}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Application reference */}
        <p className="timeline__ref">Ref: {applicationNumber}</p>
      </div>

      <style jsx>{`
        .timeline {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 20px 16px;
        }

        /* Status hero */
        .timeline__status-card {
          display: flex;
          gap: 14px;
          padding: 16px;
          border-radius: 16px;
          border: 1.5px solid;
          align-items: flex-start;
        }
        .timeline__status-icon { flex-shrink: 0; margin-top: 2px; }
        .timeline__status-label {
          font-size: 17px; font-weight: 800; margin: 0 0 4px;
        }
        .timeline__status-desc {
          font-size: 14px; color: #374151; margin: 0; line-height: 1.5;
        }

        /* Progress bar */
        .timeline__progress {
          display: flex;
          align-items: center;
          padding: 16px;
          background: white;
          border-radius: 14px;
          border: 1px solid #F1F5F9;
          gap: 0;
        }
        .timeline__step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          position: relative;
          flex: 1;
        }
        .timeline__line {
          position: absolute;
          top: 12px;
          left: -50%;
          right: 50%;
          height: 2px;
          transition: background 0.3s ease;
        }
        .timeline__dot {
          width: 24px; height: 24px;
          border-radius: 50%;
          background: #E2E8F0;
          display: flex; align-items: center; justify-content: center;
          color: white;
          position: relative;
          z-index: 1;
          transition: all 0.3s ease;
        }
        .timeline__dot--done {
          background: #2563EB;
          box-shadow: var(--shadow-elevation-1);
        }
        .timeline__dot--current {
          background: #2563EB;
          box-shadow: var(--shadow-elevation-2);
          animation: pulse 2s ease infinite;
        }
        .timeline__step-label {
          font-size: 11px; text-align: center;
        }

        /* History */
        .timeline__history {
          background: white;
          border-radius: 14px;
          border: 1px solid #F1F5F9;
          padding: 14px 16px;
        }
        .timeline__history-title {
          font-size: 13px; font-weight: 700; color: #64748B;
          text-transform: uppercase; letter-spacing: 0.06em;
          margin: 0 0 12px;
        }
        .timeline__history-item {
          display: flex;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid #F8FAFC;
        }
        .timeline__history-item:last-child { border-bottom: none; }
        .timeline__history-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 5px;
        }
        .timeline__history-content { flex: 1; }
        .timeline__history-label {
          font-size: 13px; font-weight: 700; margin: 0 0 2px;
        }
        .timeline__history-date {
          font-size: 12px; color: #94A3B8; margin: 0;
        }
        .timeline__history-notes {
          font-size: 12px; color: #374151; margin: 4px 0 0;
          padding: 6px 8px;
          background: #F8FAFC;
          border-radius: 6px;
        }

        .timeline__ref {
          font-size: 11px; color: #CBD5E1; text-align: center; margin: 0;
        }

        @keyframes pulse {
          0%, 100% { box-shadow: var(--shadow-elevation-2); }
          50%       { box-shadow: var(--shadow-elevation-3); }
        }
      `}</style>
    </>
  )
}

