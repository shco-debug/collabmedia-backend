const admin = require('../../../controllers/adminController.js');
const adminMassApis = require('../../../controllers/adminMassApis.js');

module.exports = function(router) {
    
    //-----/admin
    router.get('/', function(req, res) {
        res.render('layouts/backend/adminLayout.html');
    });

    // Authentication routes
    router.post('/signin', function(req, res) {
        admin.login(req, res);
    });

    router.get('/chklogin', function(req, res) {
        admin.chklogin(req, res);
    });

    router.get('/logout', function(req, res) {
        admin.logout(req, res);
    });

    // Debug session endpoint
    router.get('/debug-session', function(req, res) {
        admin.debugSession(req, res);
    });

    // Test session creation endpoint (no auth required)
    router.get('/test-session', function(req, res) {
        // Create a test session
        req.session.testData = {
            timestamp: new Date().toISOString(),
            message: 'Test session created'
        };
        
        // Save session
        req.session.save((err) => {
            if (err) {
                console.error('Test session save error:', err);
                return res.json({
                    code: "500",
                    msg: "Session save failed",
                    error: err.message
                });
            }
            
            res.json({
                code: "200",
                msg: "Test session created",
                sessionID: req.sessionID,
                testData: req.session.testData,
                cookieName: 'connect.sid'
            });
        });
    });

    // Test MongoDB connection for sessions
    router.get('/test-mongo-session', function(req, res) {
        const mongoose = require('mongoose');
        
        mongoose.connection.db.admin().ping((err, result) => {
            if (err) {
                console.error('MongoDB ping error:', err);
                return res.json({
                    code: "500",
                    msg: "MongoDB connection failed",
                    error: err.message
                });
            }
            
            res.json({
                code: "200",
                msg: "MongoDB connection successful",
                ping: result,
                sessionStore: req.sessionStore ? 'Available' : 'Not available'
            });
        });
    });

    // Test current session
    router.get('/test-current-session', function(req, res) {
        const sessionInfo = {
            sessionID: req.sessionID,
            hasSession: !!req.session,
            sessionKeys: req.session ? Object.keys(req.session) : [],
            adminSession: req.session.admin || null,
            cookies: req.headers.cookie,
            sessionStore: req.sessionStore ? 'Available' : 'Not available'
        };
        
        console.log('🔍 Current session info:', sessionInfo);
        
        res.json({
            code: "200",
            msg: "Current session information",
            sessionInfo: sessionInfo
        });
    });

    // Simple cookie test
    router.get('/test-simple-cookie', function(req, res) {
        // Set a simple test cookie
        res.cookie('test_cookie', 'test_value_123', {
            maxAge: 60000, // 1 minute
            httpOnly: false,
            secure: false,
            sameSite: 'lax',
            path: '/'
        });
        
        console.log('🍪 Setting simple test cookie');
        
        res.json({
            code: "200",
            msg: "Simple test cookie set",
            cookieName: 'test_cookie',
            cookieValue: 'test_value_123'
        });
    });

    // Test session functionality
    router.get('/test-session-working', function(req, res) {
        const sessionInfo = {
            sessionID: req.sessionID,
            hasSession: !!req.session,
            sessionKeys: req.session ? Object.keys(req.session) : [],
            adminSession: req.session.admin || null,
            cookies: req.headers.cookie,
            sessionStore: req.sessionStore ? 'Available' : 'Not available'
        };
        
        console.log('🔍 Testing session functionality:', sessionInfo);
        
        // Try to set a test session
        req.session.testData = {
            timestamp: new Date().toISOString(),
            message: 'Test session data',
            randomValue: Math.random()
        };
        
        res.json({
            code: "200",
            msg: "Session test completed",
            sessionInfo: sessionInfo,
            testData: req.session.testData,
            instructions: "Check if session data persists across requests"
        });
    });

    // Test session deserialization
    router.get('/test-session-deserialization', function(req, res) {
        console.log('🔍 Testing session deserialization for ID:', req.sessionID);
        
        if (!req.sessionStore) {
            return res.json({
                code: "500",
                msg: "Session store not available",
                error: "No session store found"
            });
        }
        
        // Try to retrieve session from store
        req.sessionStore.get(req.sessionID, (err, session) => {
            if (err) {
                console.error('❌ Error retrieving session:', err);
                return res.json({
                    code: "500",
                    msg: "Error retrieving session from store",
                    error: err.message
                });
            }
            
            if (!session) {
                console.log('❌ Session not found in store for ID:', req.sessionID);
                return res.json({
                    code: "404",
                    msg: "Session not found in store",
                    sessionID: req.sessionID,
                    error: "Session does not exist in MongoDB"
                });
            }
            
            console.log('✅ Session found in store:', {
                sessionID: session.id,
                hasAdmin: !!session.admin,
                adminData: session.admin || null,
                sessionKeys: Object.keys(session)
            });
            
            res.json({
                code: "200",
                msg: "Session deserialization test completed",
                sessionFromStore: {
                    sessionID: session.id,
                    hasAdmin: !!session.admin,
                    adminData: session.admin || null,
                    sessionKeys: Object.keys(session)
                },
                currentSession: {
                    sessionID: req.sessionID,
                    hasSession: !!req.session,
                    sessionKeys: req.session ? Object.keys(req.session) : [],
                    adminSession: req.session.admin || null
                }
            });
        });
    });

    // Test manual cookie setting
    router.get('/test-cookie', function(req, res) {
        // Set a test cookie manually
        res.cookie('test_cookie', 'test_value_123', {
            maxAge: 24 * 60 * 60 * 1000, // 1 day
            httpOnly: false,
            secure: false,
            sameSite: 'lax',
            path: '/'
        });
        
        // Set a session cookie manually
        res.cookie('connect.sid', 'manual_test_session_123', {
            maxAge: 24 * 60 * 60 * 1000, // 1 day
            httpOnly: false,
            secure: false,
            sameSite: 'lax',
            path: '/'
        });
        
        console.log('🍪 Manual cookies set:', {
            test_cookie: 'test_value_123',
            connect_sid: 'manual_test_session_123'
        });
        
        res.json({
            code: "200",
            msg: "Manual cookies set",
            cookies: {
                test_cookie: 'test_value_123',
                connect_sid: 'manual_test_session_123'
            }
        });
    });

    // Admin management routes
    router.get('/admins', function(req, res) {
        admin.getAllAdmins(req, res);
    });

    router.post('/create', function(req, res) {
        admin.createAdmin(req, res);
    });

    // Promote user to subadmin
    router.post('/promoteUserToSubAdmin', function(req, res) {
        admin.promoteUserToSubAdmin(req, res);
    });

    // Referral point management
    router.post('/updateReferralPoint', function(req, res) {
        admin.updateReferralPoint(req, res);
    });

    router.get('/getReferralPoint', function(req, res) {
        admin.getReferralPoint(req, res);
    });

    // Admin mass APIs routes
    router.get('/getMediaTitlesFile', function(req, res) {
        adminMassApis.getMediaTitlesFile(req, res);
    });

    router.get('/getGTsFile', function(req, res) {
        adminMassApis.getGTsFile(req, res);
    });
};



