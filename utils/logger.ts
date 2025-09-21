/**
 * Comprehensive logging utility for tracking the entire user tracking process
 */

export class Logger {
  private static isEnabled = true;
  private static logLevel: 'debug' | 'info' | 'warn' | 'error' = 'debug';

  static setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  static setLogLevel(level: 'debug' | 'info' | 'warn' | 'error') {
    this.logLevel = level;
  }

  private static shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    if (!this.isEnabled) return false;
    
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    return messageLevelIndex >= currentLevelIndex;
  }

  private static formatMessage(level: string, category: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] [${category}] ${message}`;
    
    if (data !== undefined) {
      return `${formattedMessage}\n${JSON.stringify(data, null, 2)}`;
    }
    
    return formattedMessage;
  }

  static debug(category: string, message: string, data?: any) {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', category, message, data));
    }
  }

  static info(category: string, message: string, data?: any) {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', category, message, data));
    }
  }

  static warn(category: string, message: string, data?: any) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', category, message, data));
    }
  }

  static error(category: string, message: string, data?: any) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', category, message, data));
    }
  }

  // Specific logging methods for user tracking
  static userTracking(message: string, data?: any) {
    this.info('UserTracking', message, data);
  }

  static authManager(message: string, data?: any) {
    this.info('AuthManager', message, data);
  }

  static supabase(message: string, data?: any) {
    this.info('Supabase', message, data);
  }

  static testComponent(message: string, data?: any) {
    this.info('TestComponent', message, data);
  }
}

// Export convenience functions
export const log = Logger;
