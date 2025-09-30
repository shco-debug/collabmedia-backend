// CORS Configuration for CollabMedia Backend
// This file provides explicit CORS settings to resolve Swagger UI integration issues

const corsOptions = {
  origin: function (origin, callback) {
    console.log('CORS Origin Check:', origin);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('CORS: Allowing request with no origin');
      return callback(null, true);
    }
    
    // Allow localhost for development (all ports)
    if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
      console.log('CORS: Allowing localhost origin:', origin);
      return callback(null, true);
    }
    
    // Allow your production domains
    const allowedOrigins = [
      'https://scrpt.com',
      'https://www.scrpt.com',
      'https://journale.co',
      'https://www.journale.co',
      'https://collabmedia.com',
      'https://www.collabmedia.com',
      'https://www.ahaday.com'
    ];
    
    if (allowedOrigins.includes(origin)) {
      console.log('CORS: Allowing production origin:', origin);
      return callback(null, true);
    }
    
    // Allow Swagger UI and API documentation
    if (origin.includes('swagger') || origin.includes('api-docs')) {
      console.log('CORS: Allowing Swagger/API docs origin:', origin);
      return callback(null, true);
    }
    
    // For development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      console.log('CORS: Development mode - allowing all origins:', origin);
      return callback(null, true);
    }
    
    console.log('CORS: Blocking origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies and authentication headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cookie',
    'Set-Cookie',
    'capsule_id',
    'chapter_id'
  ],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  preflightContinue: false,
  // Add more permissive settings for development
  maxAge: 86400, // Cache preflight for 24 hours
  // Ensure cookies work properly
  credentials: true
};

module.exports = corsOptions;
