/*
JWT Authentication Middleware
Replaces session-based authentication with JWT tokens
*/

const jwt = require('jsonwebtoken');

// JWT Authentication middleware
const authenticateJWT = (req, res, next) => {
    // Get token from Authorization header or X-Session-ID header (for backward compatibility)
    const authHeader = req.headers['authorization'];
    const sessionHeader = req.headers['x-session-id'];
    
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
    } else if (sessionHeader) {
        // Check if it's a JWT token (starts with eyJ) or session ID
        if (sessionHeader.startsWith('eyJ')) {
            token = sessionHeader;
        }
    }
    
    if (!token) {
        return res.status(401).json({ 
            "code": "401", 
            "msg": "Access token required" 
        });
    }
    
    try {
        // Verify JWT token
        const jwtSecret = process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production';
        const decoded = jwt.verify(token, jwtSecret);
        
        // Add user data to request object (similar to req.session.user)
        req.user = decoded;
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        
        // Check if user account is still active
        if (!decoded.status) {
            return res.status(403).json({ 
                "code": "403", 
                "msg": "Your account has been blocked by site admin. Please contact at info@scrpt.com." 
            });
        }
        
        // Check email confirmation
        if (!decoded.emailConfirmationStatus) {
            return res.status(403).json({ 
                "code": "403", 
                "msg": "Please verify your e-mail address to continue" 
            });
        }
        
        next();
        
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                "code": "401", 
                "msg": "Token has expired. Please login again." 
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                "code": "401", 
                "msg": "Invalid token. Please login again." 
            });
        } else {
            return res.status(401).json({ 
                "code": "401", 
                "msg": "Token verification failed" 
            });
        }
    }
};

// Middleware to check if user has specific role
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                "code": "401", 
                "msg": "Authentication required" 
            });
        }
        
        const userRole = req.user.role || 'user';
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        
        if (!allowedRoles.includes(userRole)) {
            console.log('❌ Insufficient permissions for user:', req.user.email, 'Role:', userRole);
            return res.status(403).json({ 
                "code": "403", 
                "msg": "Insufficient permissions" 
            });
        }
        
        next();
    };
};

// Middleware to check if user can create content
const requireCreatePermission = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            "code": "401", 
            "msg": "Authentication required" 
        });
    }
    
    if (!req.user.allowCreate && req.user.role !== 'admin' && req.user.role !== 'subadmin') {
        console.log('❌ User does not have create permissions:', req.user.email);
        return res.status(403).json({ 
            "code": "403", 
            "msg": "You do not have permission to create content" 
        });
    }
    
    next();
};

module.exports = {
    authenticateJWT,
    requireRole,
    requireCreatePermission
};
