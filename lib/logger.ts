/**
 * Logger Utility
 * Provides structured logging with environment-aware output
 * Only logs in development mode to avoid console pollution in production
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LoggerOptions {
    prefix?: string
    timestamp?: boolean
}

class Logger {
    private isDevelopment = process.env.NODE_ENV === 'development'

    private formatMessage(level: LogLevel, args: any[], options?: LoggerOptions): any[] {
        const prefix = options?.prefix ? `[${options.prefix}]` : ''
        const timestamp = options?.timestamp ? `[${new Date().toISOString()}]` : ''
        const levelTag = `[${level.toUpperCase()}]`

        return [timestamp, levelTag, prefix, ...args].filter(Boolean)
    }

    /**
     * Log informational messages (development only)
     */
    info(...args: any[]) {
        if (this.isDevelopment) {
            console.log(...this.formatMessage('info', args))
        }
    }

    /**
     * Log warning messages (development only)
     */
    warn(...args: any[]) {
        if (this.isDevelopment) {
            console.warn(...this.formatMessage('warn', args))
        }
    }

    /**
     * Log error messages (always logged)
     */
    error(...args: any[]) {
        console.error(...this.formatMessage('error', args))
    }

    /**
     * Log debug messages (development only)
     */
    debug(...args: any[]) {
        if (this.isDevelopment) {
            console.log(...this.formatMessage('debug', args))
        }
    }

    /**
     * Create a scoped logger with a prefix
     */
    scope(prefix: string) {
        return {
            info: (...args: any[]) => this.info(...this.formatMessage('info', args, { prefix })),
            warn: (...args: any[]) => this.warn(...this.formatMessage('warn', args, { prefix })),
            error: (...args: any[]) => this.error(...this.formatMessage('error', args, { prefix })),
            debug: (...args: any[]) => this.debug(...this.formatMessage('debug', args, { prefix })),
        }
    }
}

// Export singleton instance
export const logger = new Logger()

// Export scoped loggers for common modules
export const envLogger = logger.scope('ENV')
export const apiLogger = logger.scope('API')
export const authLogger = logger.scope('AUTH')
export const dbLogger = logger.scope('DB')
