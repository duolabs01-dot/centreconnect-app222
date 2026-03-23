import 'server-only'

/**
 * Structured logging utility for server-side code.
 * Replaces console.log/error with structured JSON logs that can be
 * ingested by log aggregation services.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  service?: string
  error?: {
    message: string
    stack?: string
    code?: string
  }
  context?: Record<string, unknown>
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  error?: Error
): LogEntry {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: 'centreconnect',
    context,
  }

  if (error) {
    entry.error = {
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      code: (error as { code?: string }).code,
    }
  }

  return entry
}

function outputLog(entry: LogEntry): void {
  const isDev = process.env.NODE_ENV === 'development'
  
  if (isDev) {
    // Pretty print in development
    const color = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
    }[entry.level]
    
    console.log(
      `${color}[${entry.level.toUpperCase()}]\x1b[0m ${entry.message}`,
      entry.context ? entry.context : '',
      entry.error ? `\n${entry.error.stack}` : ''
    )
  } else {
    // JSON output in production for log aggregation
    console.log(JSON.stringify(entry))
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => {
    if (process.env.NODE_ENV === 'development') {
      outputLog(createLogEntry('debug', message, context))
    }
  },
  
  info: (message: string, context?: Record<string, unknown>) => {
    outputLog(createLogEntry('info', message, context))
  },
  
  warn: (message: string, context?: Record<string, unknown>) => {
    outputLog(createLogEntry('warn', message, context))
  },
  
  error: (message: string, error?: Error, context?: Record<string, unknown>) => {
    outputLog(createLogEntry('error', message, context, error))
  },
}
