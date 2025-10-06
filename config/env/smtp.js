/*
* SMTP Configuration for CollabMedia
* This file contains all SMTP settings for different environments
*/

module.exports = {
  // Development SMTP Configuration
  development: {
    // Primary SMTP Configuration (GoDaddy - Working)
    primary: {
      host: process.env.SMTP_HOST || 'smtpout.secureserver.net',
      port: parseInt(process.env.SMTP_PORT) || 465,
      secure: true, // true for 465, false for 587
      requireTLS: false,
      auth: {
        user: process.env.SMTP_USER || 'darshan@scrpt.com',
        pass: process.env.SMTP_PASS || 'I9QjSU9y&bqcEI83rq0d'
      },
      timeout: 30000, // 30 seconds timeout
      connectionTimeout: 30000, // 30 seconds connection timeout
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
      },
      connectionTimeout: 60000, // 60 seconds
      greetingTimeout: 30000,   // 30 seconds
      socketTimeout: 60000      // 60 seconds
    },

    // Fallback SMTP Configuration (Gmail)
    fallback: {
      service: 'Gmail',
      auth: {
        user: process.env.SMTP_GMAIL_USER || 'collabmedia.scrpt@gmail.com',
        pass: process.env.SMTP_GMAIL_PASS || 'scrpt123_2014collabmedia#1909'
      }
    },

    // Email settings
    email: {
      from: process.env.SMTP_FROM || 'Scrpt <darshan@scrpt.com>',
      replyTo: process.env.SMTP_REPLY_TO || 'darshan@scrpt.com',
      senderLine: process.env.SMTP_SENDER_LINE || 'Scrpt <darshan@scrpt.com>'
    }
  },

  // Production SMTP Configuration
  production: {
    primary: {
      host: process.env.SMTP_HOST || 'smtpout.secureserver.net',
      port: parseInt(process.env.SMTP_PORT) || 465,
      secure: true, // true for 465, false for 587
      requireTLS: false,
      auth: {
        user: process.env.SMTP_USER || 'darshan@scrpt.com',
        pass: process.env.SMTP_PASS || 'I9QjSU9y&bqcEI83rq0d'
      },
      timeout: 30000, // 30 seconds timeout
      connectionTimeout: 30000, // 30 seconds connection timeout
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
      }
    },
    email: {
      from: process.env.SMTP_FROM || 'Scrpt <darshan@scrpt.com>',
      replyTo: process.env.SMTP_REPLY_TO || 'darshan@scrpt.com',
      senderLine: process.env.SMTP_SENDER_LINE || 'Scrpt <darshan@scrpt.com>'
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
