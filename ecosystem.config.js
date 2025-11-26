// PM2 Ecosystem File Configuration
// This file tells PM2 how to manage your Node.js applications.
// PM2 will load environment variables from .env file automatically

module.exports = {
  apps: [
    {
      // ✅ GPT-Activation API Server (port 3001)
      name: 'GPT-Activation',
      script: './server/GPTserver.js',
      exec_mode: 'fork',              // Single process (no clustering needed)
      instances: 1,                   // Only 1 instance
      env: {
        PORT: 3001,
        NODE_ENV: 'production'
        // SECRET_API_KEY will be loaded from .env file via dotenv
      },
      env_development: {
        PORT: 3001,
        NODE_ENV: 'development'
      },
      // Auto-restart if crashes
      autorestart: true,
      // Watch for file changes (development only)
      watch: false,
      // Max memory before restart
      max_memory_restart: '1G',
      // Log files
      error_file: './logs/gpt-server-error.log',
      out_file: './logs/gpt-server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      // ✅ Main Backend Server (port 3002)
      name: 'CollabMedia-Backend',
      script: 'server.js',            // ✅ Updated to use current server.js
      exec_mode: 'cluster',           // PM2 will handle clustering
      instances: 'max',               // Use all CPU cores (PM2 clustering)
      env: {
        PORT: 3002,
        NODE_ENV: 'production'
        // SECRET_API_KEY, MONGODB_URI, etc. will be loaded from .env file
      },
      env_development: {
        PORT: 3002,
        NODE_ENV: 'development'
      },
      // Auto-restart if crashes
      autorestart: true,
      // Watch for file changes (development only)
      watch: false,
      // Max memory before restart (per instance)
      max_memory_restart: '1G',
      // Log files
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
};

