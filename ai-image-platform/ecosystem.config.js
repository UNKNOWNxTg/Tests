module.exports = {
  apps: [
    {
      name: 'ai-image-backend',
      cwd: './backend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '500M',
      autorestart: true,
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'ai-image-bot',
      cwd: './backend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        TELEGRAM_ONLY: 'true',
      },
      autorestart: true,
      error_file: './logs/bot-error.log',
      out_file: './logs/bot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
