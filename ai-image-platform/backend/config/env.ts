import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_ADMIN_IDS: string[];
  REDIS_URL: string;
  PROXY_REFRESH_INTERVAL: number;
  MAX_RETRIES: number;
  REQUEST_TIMEOUT: number;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  API_SECRET: string;
  FRONTEND_URL: string;
}

const envConfig: EnvConfig = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_ADMIN_IDS: (process.env.TELEGRAM_ADMIN_IDS || '').split(',').filter(Boolean),
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  PROXY_REFRESH_INTERVAL: parseInt(process.env.PROXY_REFRESH_INTERVAL || '300000', 10), // 5 minutes
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES || '3', 10),
  REQUEST_TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10), // 30 seconds
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10),
  API_SECRET: process.env.API_SECRET || 'your-secret-key-change-in-production',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
};

// Validate required environment variables
const requiredEnvVars = ['TELEGRAM_BOT_TOKEN'];
const missingEnvVars = requiredEnvVars.filter(
  (varName) => !envConfig[varName as keyof EnvConfig]
);

if (missingEnvVars.length > 0 && envConfig.NODE_ENV === 'production') {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

export default envConfig;
