/*
* SMTP Configuration for CollabMedia
* This file contains all SMTP settings for different environments
*/

module.exports = {
  // Development SMTP Configuration
  development: {
    // Primary SMTP Configuration (IONOS - From Dashboard)
    primary: {
      host: process.env.SMTP_HOST || 'smtp.ionos.com',
      port: parseInt(process.env.SMTP_PORT) || 465,
      secure: true, // true for port 465 (SSL/TLS)
      requireTLS: false,
      auth: {
        user: process.env.SMTP_USER || 'hello@lifeattimes.com',
        pass: process.env.SMTP_PASS || 'B*T0XuwTtKN&kM@a'
      },
      timeout: 30000,
      connectionTimeout: 30000,
      tls: {
        rejectUnauthorized: false
      },
      greetingTimeout: 30000,
      socketTimeout: 60000
    },

    // Fallback SMTP Configuration (Gmail)
    fallback: {
      service: 'Gmail',
      auth: {
        user: 'collabmedia.scrpt@gmail.com',
        pass: 'scrpt123_2014collabmedia#1909'
      }
    },

    // Email settings
    email: {
      from: process.env.SMTP_FROM || 'Scrpt <hello@lifeattimes.com>',
      replyTo: process.env.SMTP_REPLY_TO || 'hello@lifeattimes.com',
      senderLine: process.env.SMTP_FROM || 'Scrpt <hello@lifeattimes.com>'
    }
  },

  // Production SMTP Configuration
  production: {
    primary: {
      host: process.env.SMTP_HOST || 'smtp.ionos.com',
      port: parseInt(process.env.SMTP_PORT) || 465,
      secure: true, // true for port 465 (SSL/TLS)
      requireTLS: false,
      auth: {
        user: process.env.SMTP_USER || 'hello@lifeattimes.com',
        pass: process.env.SMTP_PASS || 'B*T0XuwTtKN&kM@a'
      },
      timeout: 30000, // 30 seconds timeout
      connectionTimeout: 30000, // 30 seconds connection timeout
      tls: {
        rejectUnauthorized: false
      }
    },
    email: {
      from: process.env.SMTP_FROM || 'Scrpt <hello@lifeattimes.com>',
      replyTo: process.env.SMTP_REPLY_TO || 'hello@lifeattimes.com',
      senderLine: process.env.SMTP_FROM || 'Scrpt <hello@lifeattimes.com>'
    }
  },

  // Test SMTP Configuration (Mock)
  test: {
    mock: true,
    email: {
      from: 'Scrpt <darshan@scrpt.com>',
      replyTo: 'darshan@scrpt.com',
      senderLine: 'Scrpt <darshan@scrpt.com>'
    }
  }
};
