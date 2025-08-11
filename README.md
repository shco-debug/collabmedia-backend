# CollabMedia Backend

## Description
Backend API for CollabMedia platform.

## Installation
```bash
npm install
```

## Environment Setup
Copy `.env.example` to `.env` and configure:
```
NODE_ENV=development
PORT=3002
MONGODB_URI=mongodb://127.0.0.1:27017/collabmedia
SESSION_SECRET=your_session_secret
SECRET_API_KEY=your_api_key
```

## Running the Application
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints
- Base URL: http://localhost:3002
- API Documentation: Available in OpenAPI format

## Database
- MongoDB required
- Database name: collabmedia
- Collections created on-demand

## Dependencies
- Node.js 18+
- MongoDB 3.6+
- Redis (optional)

## Project Structure
```
collabmedia-backend/
├── server/           # Backend server code
│   ├── controllers/  # API controllers
│   ├── models/       # Database models
│   ├── routes/       # API routes
│   └── middlewares/  # Express middlewares
├── config/           # Configuration files
├── project_cluster_scrpt.js  # Main entry point
└── package.json      # Backend dependencies
```

## API Features
- User authentication and management
- Media upload and processing
- Content management
- Real-time notifications (Socket.IO)
- Cron jobs for automated tasks
- Google APIs integration
- Payment processing (Stripe) 