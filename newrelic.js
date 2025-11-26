'use strict'
/**
 * New Relic agent configuration.
 *
 * See lib/config.defaults.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 * 
 * Configuration is loaded from environment variables:
 * - NEWRELIC_LICENSE_KEY: Your New Relic license key (required)
 * - NEWRELIC_APP_NAME: Application name in New Relic dashboard (optional, defaults to 'CollabMedia')
 * - NODE_ENV: Environment (production, development, etc.)
 */

// Load environment variables
require('dotenv').config();

// Only enable New Relic if license key is provided
const licenseKey = process.env.NEWRELIC_LICENSE_KEY;
const appName = process.env.NEWRELIC_APP_NAME || 'CollabMedia';
const nodeEnv = process.env.NODE_ENV || 'development';

exports.config = {
  /**
   * Array of application names.
   * You can have multiple app names for different environments.
   */
  app_name: [
    nodeEnv === 'production' 
      ? `${appName}-Production` 
      : `${appName}-${nodeEnv.charAt(0).toUpperCase() + nodeEnv.slice(1)}`
  ],
  
  /**
   * Your New Relic license key (required).
   * Get this from your New Relic account.
   */
  license_key: licenseKey,
  
  /**
   * Enable/disable New Relic agent.
   * Only enable if license key is provided.
   */
  agent_enabled: !!licenseKey,
  
  /**
   * Logging configuration
   */
  logging: {
    /**
     * Level at which to log. 
     * - 'trace': Most verbose (useful for debugging agent issues)
     * - 'info': Standard logging (recommended for production)
     * - 'warn': Only warnings and errors
     * - 'error': Only errors
     * - 'fatal': Only fatal errors
     * - 'off': No logging
     */
    level: nodeEnv === 'production' ? 'info' : 'trace'
  },
  
  /**
   * Application logging - capture application logs in New Relic
   */
  application_logging: {
    enabled: true,
    forwarding: {
      enabled: true,
      max_samples_stored: 10000
    },
    local_decorating: {
      enabled: false
    }
  },
  
  /**
   * Distributed tracing - track requests across services
   */
  distributed_tracing: {
    enabled: true
  },
  
  /**
   * Browser monitoring (if applicable)
   */
  browser_monitoring: {
    enable: false // Disabled for backend API
  },
  
  /**
   * Error collection
   */
  error_collector: {
    enabled: true,
    capture_events: true,
    max_event_samples_stored: 100
  },
  
  /**
   * Transaction tracer
   */
  transaction_tracer: {
    enabled: true,
    transaction_threshold: 'apdex_f', // Trace transactions that are slower than ApDex threshold
    record_sql: 'obfuscated', // Obfuscate SQL queries for security
    stack_trace_threshold: 0.500 // Show stack traces for queries taking longer than 500ms
  },
  
  /**
   * Slow queries tracking
   */
  slow_sql: {
    enabled: true,
    max_samples: 10
  }
}
