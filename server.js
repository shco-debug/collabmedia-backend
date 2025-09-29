/*
 * Modern CollabMedia Server
 * Compatible with updated packages and Node.js v22
 * Based on project_cluster_scrpt.js
 */

// Performance monitoring

// Environment setup - Force development mode for Vercel deployment
process.env.NODE_ENV = process.env.NODE_ENV || "development";

// Core Node.js modules
const fs = require("fs");
const tls = require("tls");
const path = require("path");

// Third-party modules
const express = require("express");
const cors = require("cors");
const shortid = require("shortid");
const mongoose = require("mongoose");
const html2canvasProxy = require("html2canvas-proxy");
const bodyParser = require("body-parser");

// Load environment variables
require("dotenv").config();


// Import models
const UserModel = require("./server/models/userModel.js");

// Log environment setup
console.log(
  `<<<<< SERVER Loaded SECRET_API_KEY from .env: ${
    process.env.SECRET_API_KEY ? "SET" : "NOT SET"
  } >>>>>`
);

// Configure shortid
shortid.worker(1);
shortid.seed(49876);
shortid.characters(
  "dfrxzPOI69VFTCDRESW8072tbhy@ujnmk314qwesaUJKLcvg$ilopMNH5BYGQAZX"
);

// Create Express app
const app = express();

// Simplified server setup (no clustering needed)
console.log(`Server starting in ${process.env.NODE_ENV} mode`);

// Vercel serverless mode
if (process.env.VERCEL === '1') {
  console.log(`Running on Vercel - serverless mode`);
} else {
  console.log(`Running locally - single process mode`);
}

// Configure Express App
// Use custom CORS configuration for better Swagger UI integration
const corsOptions = require("./config/cors-config.js");
app.use(cors(corsOptions));

// Body parsing middleware
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// CORS is now handled by the cors package with proper configuration
// This prevents conflicts and provides consistent CORS handling

app.get("/join", (req, res) => {
  return res.redirect("/login");
});

// API health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    server: "CollabMedia Backend",
    version: "1.0.0",
    cors: "enabled",
    session: "enabled",
  });
});

// HTTPS redirect function (commented out for local development)
console.log(`HTTPS redirect disabled for local development`);

app.use("/html2canvas/", html2canvasProxy());

// Set temp directory for file uploads
process.env.TMPDIR = path.join(__dirname, "server", "temp");

// MongoDB connection with modern options
const dbURI_local =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/collabmedia";

console.log(`Attempting to connect to MongoDB: ${dbURI_local}`);

// Modern Mongoose connection options
mongoose.connect(dbURI_local, {
  // Note: useNewUrlParser and useUnifiedTopology are no longer needed in Mongoose 6+
  // They are now the default behavior
}).catch((err) => {
  console.error(`Failed to connect to MongoDB:`, err);
  // Don't exit the process on Vercel - let it continue
  if (process.env.VERCEL !== '1') {
    process.exit(1);
  }
});

mongoose.connection.on("connected", () => {
  console.log(`Mongoose connected to ${dbURI_local}`);
});

mongoose.connection.on("error", (err) => {
  console.error(`Mongoose connection error:`, err);
});

mongoose.connection.on("disconnected", () => {
  console.log(`Mongoose disconnected`);
});

// Subdomain handling
app.set("subdomain offset", 0);

app.use(async (req, res, next) => {
  if (req.url !== "/") {
    return next();
  }

  if (
    !req.subdomains.length ||
    req.subdomains.slice(-1)[0] === "www" ||
    req.subdomains.slice(-1)[0] === "scrpt" ||
    req.subdomains.slice(-1)[0].toLowerCase() === "localhost" ||
    req.subdomains.slice(-1)[0].toLowerCase() === "scrpt.com" ||
    req.subdomains.slice(-1)[0].toLowerCase() === "journale.co" ||
    req.subdomains.slice(-1)[0] === "journale"
  ) {
    return next();
  }

  const subdomain = req.subdomains.slice(-1)[0];
  console.log("subdomain - ", subdomain);

  if (subdomain) {
    const conditions = {
      Subdomain: subdomain,
      AllowCreate: 1,
      Status: 1,
      IsDeleted: 0,
    };

    try {
      // Use countDocuments() for Mongoose 6+ compatibility
      const IsAllowed = await UserModel.countDocuments(conditions);
      if (!IsAllowed) {
        return res.send(
          "This subdomain is not yet registered with us! If you want to get this registered for yourself then kindly send an email to hello@scrpt.com."
        );
      }
      req.subdomain = subdomain;
    } catch (err) {
      console.error(`Error checking subdomain:`, err);
      return res.status(500).send("Error checking subdomain validity.");
    }
  }
  return next();
});

// GPT API Key Authentication Middleware
const YOUR_SECRET_API_KEY = process.env.SECRET_API_KEY;

app.use("/api/gpt", (req, res, next) => {
  if (!YOUR_SECRET_API_KEY) {
    console.error(
      `CRITICAL - SECRET_API_KEY for GPT is not set in environment.`
    );
    return res.status(500).json({
      success: false,
      message: "API configuration error (key missing).",
    });
  }

  const authHeader = req.headers["authorization"];
  const expectedApiKeyString = `Bearer ${YOUR_SECRET_API_KEY}`;

  console.log(`GPT Auth - Path: ${req.originalUrl}`);
  console.log(
    `GPT Auth - Expected Key String: ${expectedApiKeyString}`
  );
  console.log(
    `GPT Auth - Received Authorization Header: ${authHeader}`
  );

  if (!authHeader || authHeader !== expectedApiKeyString) {
    console.warn(
      `GPT Auth failure: Header mismatch. Expected: "${expectedApiKeyString}", Received: "${authHeader}" for ${req.originalUrl}.`
    );
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Invalid API Key" });
  }

  console.log(
    `GPT Auth SUCCESS for ${req.originalUrl}`
  );
  next();
});

// Main router setup
const router = require("./config/express/config.js")(app);
require("./server/routes/admin/api/userManagementRoutes.js")(
  router.admin.userManagementRoutes
);

// Initialize models
require("./server/models.js")();

// Initialize default relationships
const relationshipController = require("./server/controllers/relationshipController.js");
relationshipController.initializeDefaultRelationships();

// Admin middleware - TEMPORARILY DISABLED DUE TO SESSION ISSUES
// require("./server/adminMiddlewares.js")(router.admin.adminRoutes);
// require("./server/adminMiddlewares.js")(router.admin.fsgRoutes);
// require("./server/adminMiddlewares.js")(router.admin.domainRoutes);
// require("./server/adminMiddlewares.js")(router.admin.collectionRoutes);
// require("./server/adminMiddlewares.js")(router.admin.groupTagRoutes);
// require("./server/adminMiddlewares.js")(router.admin.metaMetaTagRoutes);
// require("./server/adminMiddlewares.js")(router.admin.gtbindingRoutes);
// require("./server/adminMiddlewares.js")(router.admin.tagRoutes);
// require("./server/adminMiddlewares.js")(router.admin.massmediauploadRoutes);
// require("./server/adminMiddlewares.js")(router.admin.sourceRoutes);
// require("./server/adminMiddlewares.js")(router.admin.contributionRoutes);
// require("./server/adminMiddlewares.js")(router.admin.metaTagRoutes);
// require("./server/adminMiddlewares.js")(router.admin.emailTemplateRoutes);
// require("./server/adminMiddlewares.js")(router.admin.userManagementRoutes);
// require("./server/adminMiddlewares.js")(router.admin.copyrightClaimsRoutes);
// require("./server/adminMiddlewares.js")(router.admin.postManagerRoutes);
// require("./server/adminMiddlewares.js")(router.admin.unsplashGrapperRoutes);

// SubAdmin middleware - TEMPORARILY DISABLED DUE TO SESSION ISSUES
// require("./server/subAdminMiddlewares.js")(router.subadmin.subadminRoutes);

// Admin API Routes
require("./server/routes/admin/api/adminRoutes.js")(router.admin.adminRoutes);
require("./server/routes/admin/api/fsgRoutes.js")(router.admin.fsgRoutes);
require("./server/routes/admin/api/domainRoutes.js")(
  router.admin.domainRoutes
);
require("./server/routes/admin/api/collectionRoutes.js")(
  router.admin.collectionRoutes
);
require("./server/routes/admin/api/groupTagRoutes.js")(
  router.admin.groupTagRoutes
);
require("./server/routes/admin/api/metaMetaTagRoutes.js")(
  router.admin.metaMetaTagRoutes
);
require("./server/routes/admin/api/gtbindingRoutes.js")(
  router.admin.gtbindingRoutes
);
require("./server/routes/admin/api/tagRoutes.js")(router.admin.tagRoutes);
require("./server/routes/admin/api/massmediauploadRoutes.js")(
  router.admin.massmediauploadRoutes
);
require("./server/routes/admin/api/sourceRoutes.js")(
  router.admin.sourceRoutes
);
require("./server/routes/admin/api/contributionRoutes.js")(
  router.admin.contributionRoutes
);
require("./server/routes/admin/api/metaTagRoutes.js")(
  router.admin.metaTagRoutes
);
require("./server/routes/admin/api/emailTemplateRoutes.js")(
  router.admin.emailTemplateRoutes
);
require("./server/routes/admin/api/userManagementRoutes.js")(
  router.admin.userManagementRoutes
);
require("./server/routes/admin/api/copyrightClaimsRoutes.js")(
  router.admin.copyrightClaimsRoutes
);
require("./server/routes/admin/api/postManagerRoutes.js")(
  router.admin.postManagerRoutes
);
require("./server/routes/admin/api/unsplashGrapperRoutes.js")(
  router.admin.unsplashGrapperRoutes
);

require("./server/routes/subadmin/api/subAdminRoutes.js")(
  router.subadmin.subadminRoutes
);

// Frontend Middlewares & Routes
require("./server/middlewares.js")(router.userRoutes);
require("./server/middlewares.js")(router.projectRoutes);
require("./server/middlewares.js")(router.boardRoutes);
require("./server/middlewares.js")(router.myInviteeRoutes);
require("./server/middlewares.js")(router.myBoardRoutes);
require("./server/middlewares.js")(router.addBoardMediaToBoardRoutes);
require("./server/middlewares.js")(router.mediaRoutes);
require("./server/middlewares.js")(router.proxyRoutes);
require("./server/middlewares.js")(router.originalImageRoutes);
require("./server/middlewares.js")(router.keywordRoutes);
require("./server/middlewares.js")(router.chapterRoutes);
require("./server/middlewares.js")(router.groupRoutes);
require("./server/middlewares.js")(router.memberRoutes);
require("./server/middlewares.js")(router.pageRoutes);
// require("./server/middlewares.js")(router.capsuleRoutes); // TEMPORARILY DISABLED FOR CAPSULE ROUTES
require("./server/middlewares.js")(router.referralRoutes);
require("./server/middlewares.js")(router.journalRoutes);

// Frontend API Routes
require("./server/routes/frontend/api/userRoutes.js")(router.userRoutes);
require("./server/routes/frontend/api/projectRoutes.js")(
  router.projectRoutes
);
require("./server/routes/frontend/api/boardRoutes.js")(router.boardRoutes);
require("./server/routes/frontend/api/myInviteeRoutes.js")(
  router.myInviteeRoutes
);
require("./server/routes/frontend/api/myBoardRoutes.js")(
  router.myBoardRoutes
);
require("./server/routes/frontend/api/addBoardMediaToBoardRoutes.js")(
  router.addBoardMediaToBoardRoutes
);
require("./server/routes/frontend/api/mediaRoutes.js")(router.mediaRoutes);
require("./server/routes/frontend/api/proxyRoutes.js")(router.proxyRoutes);
require("./server/routes/frontend/api/keywordRoutes.js")(
  router.keywordRoutes
);
require("./server/routes/frontend/api/chapterRoutes.js")(
  router.chapterRoutes
);
require("./server/routes/frontend/api/groupRoutes.js")(router.groupRoutes);
require("./server/routes/frontend/api/memberRoutes.js")(router.memberRoutes);
require("./server/routes/frontend/api/pageRoutes.js")(router.pageRoutes);
require("./server/routes/frontend/api/capsuleRoutes.js")(
  router.capsuleRoutes
);
require("./server/routes/frontend/api/referralRoutes.js")(
  router.referralRoutes
);
require("./server/routes/frontend/api/journalRoutes.js")(
  router.journalRoutes
);

// Relationship routes
require("./server/routes/frontend/api/relationshipRoutes.js")(
  router.relationshipRoutes
);

// GPT API Routes
const gptActivationRoutes = require("./server/routes/gpt/GPTactivationRoutes.js");
app.use("/api/gpt", gptActivationRoutes);

// Main API Routes (includes /media/createSinglePost)
require("./server/routes/routes.js")(router.mainRoutes);

// Video upload endpoint (replaces complex recorder system)
const { videoUpload, uploadVideoToS3 } = require('./server/utilities/awsS3Utils.js');

app.post("/recorder/uploadRecordedVideo", videoUpload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({
        code: "400",
        message: "No video file uploaded"
      });
    }

    console.log("=== VIDEO UPLOAD DEBUG ===");
    console.log("File:", req.file.originalname);
    console.log("Size:", req.file.size);
    console.log("Type:", req.file.mimetype);

    // Upload video to S3
    const uploadResult = await uploadVideoToS3(req.file, 'scrptMedia/video/recorded', {
      'user-id': req.body.userId || 'unknown',
      'recording-type': 'webRTC'
    });

    if (uploadResult.success) {
      res.json({
        code: "200",
        message: "Video uploaded successfully",
        response: {
          fileName: uploadResult.fileName,
          videoUrl: uploadResult.videoUrl,
          fileSize: uploadResult.fileSize,
          contentType: uploadResult.contentType,
          originalName: uploadResult.originalName
        }
      });
    } else {
      res.json({
        code: "500",
        message: "Video upload failed",
        error: uploadResult.error
      });
    }

  } catch (error) {
    console.error("Video upload error:", error);
    res.json({
      code: "500",
      message: "Video upload error",
      error: error.message
    });
  }
});

// Request logging middleware
app.use((req, res, next) => {
  const reqUrl = req.baseUrl + req.path;
  // console.log(`\nRequest url : `, reqUrl);
  next();
});

app.get("/board", (req, res) => {
  res.render("layouts/frontend/capsuleLayout.html");
});

app.get("/capsule", (req, res) => {
  res.render("layouts/frontend/capsuleLayout.html");
});

app.get("/admin_panel", (req, res) => {
  res.render("layouts/backend/login.html");
});

app.get("/subadmin", (req, res) => {
  res.render("layouts/backend/subAdminLayout.html");
});

// Routes for GPT Info
app.get("/gpt-privacy", (req, res) => {
  console.log(`Received GET /gpt-privacy`);
  res.send(
    'This GPT uses your email and provided GPT title only for membership verification and access control for the "Being Visible 1.0" GPT.'
  );
});

// OpenAPI specification
try {
  const openapiSpec = require(path.join(__dirname, "server", "openapi.json"));
  app.get("/openapi.json", (req, res) => {
    console.log(`Serving /openapi.json`);
    res.json(openapiSpec);
  });
} catch (e) {
  console.error(
    `Could not load or serve openapi.json:`,
    e.message
  );
  app.get("/openapi.json", (req, res) =>
    res.status(404).send("OpenAPI specification not found.")
  );
}

// Health check endpoint - moved outside try/catch to ensure it's always available
app.get("/health", (req, res) => {
  try {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      platform: process.env.VERCEL ? 'Vercel' : 'Local',
      uptime: process.uptime(),
      mongoStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'ERROR', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});


// Start server for Local Development (skip for Vercel)
if (process.env.VERCEL !== '1') {
  const httpPort = process.env.PORT || 3002;
  
  app.listen(httpPort, () => {
    console.log(`Server running on port ${httpPort}`);
    console.log(`Local development at http://localhost:${httpPort}`);
  });
} else {
  console.log(`Running on Vercel - no server needed`);
  // Export app for Vercel
  module.exports = app;
}

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (process.env.VERCEL !== '1') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  if (process.env.VERCEL !== '1') {
    process.exit(1);
  }
});
