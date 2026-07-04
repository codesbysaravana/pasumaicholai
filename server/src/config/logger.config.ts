import { env } from './env.config.js';

export interface LoggerConfig {
  level: string;
  prettyPrint: boolean;
}

export const loggerConfig: LoggerConfig = {
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  prettyPrint: env.NODE_ENV !== 'production',
};
