# Local Development Setup Guide

## Prerequisites

1. **Node.js 10.x** (already installed via nvm)
2. **MongoDB 3.6.x** (already installed)
3. **MongoDB Compass 1.21.x** (already installed)

## Setup Steps

### 1. Environment Configuration
The `.env` file has been created with the following configuration:
```
NODE_ENV=development
PORT=3002
MONGODB_URI=mongodb://localhost:27017/collabmedia
SESSION_SECRET=3q8753248o5_mnasxvda@!#$@%@#
SECRET_API_KEY=d6c86e4cb3e155af4e21deb943e1275608f4950a2f8e20773d9aaea593be1917
```

### 2. Database Setup
1. Start MongoDB service
2. Create database: `collabmedia`
3. The application will automatically create collections as needed

### 3. Install Dependencies
```bash
npm install
```

### 4. Run the Application

#### Option 1: Using the startup script
```bash
node start-local.js
```

#### Option 2: Direct execution
```bash
node project_cluster_scrpt.js
```

#### Option 3: Using PM2 (if installed)
```bash
pm2 start ecosystem.config.js --only Scrpt
```

## Access Points

- **Main Application**: http://localhost:3002
- **Admin Panel**: http://localhost:3002/admin_panel
- **Subadmin**: http://localhost:3002/subadmin

## What's Been Modified for Local Development

### ✅ Changes Made:
1. **Database Connection**: Updated to use `localhost:27017/collabmedia`
2. **Environment Variables**: Created `.env` file with local config
3. **HTTPS Disabled**: Commented out HTTPS server setup
4. **HTTPS Redirect Disabled**: Commented out requireHTTPS middleware
5. **Port Configuration**: Set to port 3002 for local development
6. **Directories Created**: `server/temp` and `uploads` directories

### ❌ Production Features Disabled:
1. **SSL/HTTPS**: All HTTPS-related code commented out
2. **Production Domains**: Domain-specific redirects disabled
3. **Production Database**: Using local MongoDB instead of production IP

## Troubleshooting

### Port Already in Use
If port 3002 is already in use, change the PORT in `.env` file:
```
PORT=3003
```

### Database Connection Issues
1. Ensure MongoDB is running: `mongod`
2. Check if MongoDB is accessible on localhost:27017
3. Verify database name: `collabmedia`

### Permission Issues
- The application runs on port 3002, which shouldn't require admin privileges
- If you get permission errors, try a different port (3003, 3004, etc.)

## API Endpoints Available

All existing API endpoints are preserved and available:
- `/user/*` - User management APIs
- `/boards/*` - Board management APIs
- `/media/*` - Media handling APIs
- `/admin/*` - Admin panel APIs
- `/capsules/*` - Capsule management APIs
- And many more...

## Development Notes

- The application uses clustering to utilize all CPU cores
- Session data is stored in MongoDB
- File uploads go to the `uploads` directory
- Temporary files are stored in `server/temp`
- All production-specific features are safely disabled

## Next Steps

1. **Start MongoDB** (if not already running):
   - Open MongoDB Compass and connect to `mongodb://localhost:27017`
   - Or start MongoDB service from Windows Services
   - Or run `mongod` from MongoDB installation directory

2. **Start the Application**:
   ```bash
   node project_cluster_scrpt.js
   ```
   or
   ```bash
   node start-local.js
   ```

3. **Access the Application**:
   - Main Application: http://localhost:3002
   - Admin Panel: http://localhost:3002/admin_panel
   - Subadmin: http://localhost:3002/subadmin

## ✅ Setup Complete!

The backend system is now configured for local development with:
- ✅ Node.js 18.19.0 (compatible version)
- ✅ Dependencies installed and working
- ✅ Database configuration updated for localhost
- ✅ HTTPS/SSL features disabled for local development
- ✅ DKIM email configuration commented out
- ✅ Port configured to 3002
- ✅ Environment variables set up

## Troubleshooting

### MongoDB Connection Issues
If you get database connection errors:
1. Ensure MongoDB is running on localhost:27017
2. Create the database: `collabmedia`
3. The application will create collections automatically

### Port Issues
If port 3002 is in use, change the PORT in `.env` file:
```
PORT=3003
```

### Application Not Starting
1. Ensure Node.js 18.19.0 is active: `nvm use 18.19.0`
2. Check if all dependencies are installed: `npm install`
3. Verify MongoDB is running
4. Check the console output for any error messages 