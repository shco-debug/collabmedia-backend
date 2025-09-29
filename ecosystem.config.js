// PM2 Ecosystem File Configuration
// This file tells PM2 how to manage your Node.js applications.

module.exports = {
  apps: [
    {
      // ✅ GPT-Activation API Server (port 3001)
      name: 'GPT-Activation',
      script: './server/GPTserver.js',
      exec_mode: 'fork',
      instances: 1,
      env: {
        PORT: 3001,
        SECRET_API_KEY: 'd6c86e4cb3e155af4e21deb943e1275608f4950a2f8e20773d9aaea593be1917',
        NODE_ENV: 'production'
      }
    },
    {
      // ✅ Scrpt main app (port 3002)
      name: 'Scrpt',
      script: 'project_cluster_scrpt.js',
      exec_mode: 'cluster',
      instances: 'max',
      env: {
        PORT: 3002,
        SECRET_API_KEY: 'd6c86e4cb3e155af4e21deb943e1275608f4950a2f8e20773d9aaea593be1917',
        NODE_ENV: 'production'
      }
    }
  ]
};

