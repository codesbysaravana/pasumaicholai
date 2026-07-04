import { env } from './env.config.js';

export interface DbConfig {
  uri: string;
  dbName: string;
}

export const dbConfig: DbConfig = {
  uri: env.MONGODB_URI,
  dbName: env.MONGODB_DB_NAME,
};

//new db