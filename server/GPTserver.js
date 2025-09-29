// Load environment variables from the .env file located in the same directory as this script
require('dotenv').config({ path: __dirname + '/.env' });

// Define the PORT, defaulting to 3002 if the environment variable is not set by dotenv
let PORT = process.env.PORT || 3001;

// --- Debug Logs to check if env variables are loaded correctly ---
console.log('--- Environment Variable Check ---');
console.log('Loaded PORT (from env or default):', PORT);
console.log('Loaded API Key (from env):', process.env.SECRET_API_KEY);
console.log('----------------------------------');

const LISTENING_PORT = parseInt(PORT, 10);
if (isNaN(LISTENING_PORT)) {
  console.error(`Invalid PORT value: ${PORT}. Defaulting to 3002.`);
  PORT = 3002;
} else {
  PORT = LISTENING_PORT;
}
console.log(`Using final listening PORT value: ${PORT}`);

const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const YOUR_SECRET_API_KEY = process.env.SECRET_API_KEY;
const EXCEL_FILE_PATH = path.join(__dirname, 'data/GPTMembers.xlsx');
const OPENAPI_PATH = path.join(__dirname, 'openapi.json');

const app = express();
app.use(bodyParser.json());

// CORS Headers for OpenAI
app.use(function (req, res, next) {
  res.header('OpenAI-Allowed', 'true');
  res.header('Access-Control-Allow-Origin', 'https://chat.openai.com');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ✅ API Key Middleware - wrapped correctly
app.use('/api/gpt', function (req, res, next) {
  const apiKey = req.headers['x-api-key'];

  console.log('\n--- Incoming GPT API Request ---');
  console.log('URL:', req.originalUrl);
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Expected X-Api-Key:', process.env.SECRET_API_KEY);
  console.log('Received X-Api-Key:', apiKey);
  console.log('-------------------------------\n');

  if (apiKey !== process.env.SECRET_API_KEY) {
    console.warn('❌ Authentication failed. Invalid X-Api-Key.');
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid API Key' });
  }

  console.log('✅ Authenticated via X-Api-Key');
  next();
});


const router = express.Router();

// Add this debugging GET route handler
router.get('/verify-gpt', function (req, res) {
  console.log('GET request received at /verify-gpt - This should be a POST');
  res.status(405).json({ success: false, message: 'Use POST instead of GET for this endpoint.' });
});

// Existing POST route
router.post('/verify-gpt', function (req, res) {
  var email = req.body.email;
  var gptTitle = req.body.gptTitle;
  if (!email || !gptTitle) {
    return res.status(400).json({ success: false, message: 'Bad Request: Both email and gptTitle are required.' });
  }

  var workbook;
  try {
    if (!fs.existsSync(EXCEL_FILE_PATH)) {
      console.error('Membership data file not found at:', EXCEL_FILE_PATH);
      throw new Error('Membership data file not found.');
    }
    workbook = XLSX.readFile(EXCEL_FILE_PATH);
  } catch (error) {
    console.error('Error reading Excel file:', error.message);
    return res.status(500).json({ success: false, message: 'Membership data service unavailable (file read error)' });
  }

  var sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    console.error('Excel sheet not found or is empty.');
    return res.status(500).json({ success: false, message: 'Membership data service unavailable (sheet not found)' });
  }

  var data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (!data || data.length === 0) {
    return res.status(403).json({ success: false, message: 'Membership list is empty or could not be read.' });
  }

  var first = data[0];
  if (!first || !first.hasOwnProperty('Members') || !first.hasOwnProperty('Title') || !first.hasOwnProperty('GPT Usage')) {
    console.error('Membership data missing required columns (Members, Title, GPT Usage).');
    return res.status(500).json({ success: false, message: 'Membership data service unavailable (missing required columns)' });
  }

  var idx = data.findIndex(function (r) {
    return r.Members && typeof r.Members === 'string' && r.Members.toLowerCase() === email.toLowerCase();
  });

  if (idx < 0) {
    return res.status(403).json({ success: false, message: 'Access Denied: Email not found in membership list.' });
  }

  var user = data[idx];
  if (user.Title !== gptTitle) {
    return res.status(403).json({ success: false, message: 'Access Denied: This activation is only valid for GPT titled "' + user.Title + '".' });
  }

  if (user['GPT Usage'] && typeof user['GPT Usage'] === 'string' && user['GPT Usage'].toLowerCase() === 'used') {
    return res.status(403).json({ success: false, message: 'Access Denied: This activation has already been used.' });
  }

  try {
    data[idx]['GPT Usage'] = 'Used';
    workbook.Sheets[workbook.SheetNames[0]] = XLSX.utils.json_to_sheet(data);
    XLSX.writeFile(workbook, EXCEL_FILE_PATH);
    console.log('Successfully marked', email, 'as Used for', gptTitle);
  } catch (error) {
    console.error('Error writing Excel file after update:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to record activation usage.' });
  }

  res.json({ success: true, message: 'Activation successful! Access granted.' });
});

app.use('/api/gpt', router);

// OpenAPI schema endpoint
app.get('/openapi.json', function (req, res) {
  console.log('OpenAPI request received');
  console.log('Looking for file at:', OPENAPI_PATH);

  if (!fs.existsSync(OPENAPI_PATH)) {
    console.error('OpenAPI file not found at:', OPENAPI_PATH);
    return res.status(404).json({ success: false, message: 'OpenAPI schema not found.' });
  }

  try {
    var fileContent = fs.readFileSync(OPENAPI_PATH, 'utf8');
    var openApiSchema = JSON.parse(fileContent);
    res.setHeader('Content-Type', 'application/json');
    res.json(openApiSchema);
  } catch (error) {
    console.error('Error reading or parsing OpenAPI file:', error.message);
    res.status(500).json({ success: false, message: 'Error reading OpenAPI schema.' });
  }
});

// Privacy policy
app.get('/privacy', function (req, res) {
  res.send('This GPT uses your email and provided GPT title only for membership verification and access control.');
});

// Error handling middleware
app.use(function (err, req, res, next) {
  console.error('Caught unhandled error by middleware:', err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error. Please try again later.' });
});

// HTTP server
const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', function () {
  console.log('*** GPT-Activation Test HTTP Server running on http://0.0.0.0:' + PORT + ' ***');
}).on('error', function (err) {
  console.error('GPT-Activation HTTP server listen error:', err.message);
  process.exit(1);
});

// Global crash handlers
process.on('uncaughtException', function (err) {
  console.error('FATAL Uncaught Exception:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', function (reason, promise) {
  console.error('FATAL Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
