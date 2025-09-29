const Admin = require('./../models/adminModel.js');
const AppSetting = require('./../models/appSettingModel.js');

/**
 * Admin login controller
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Input validation
        if (!email || !password) {
            return res.status(400).json({
                code: "400",
                msg: "Email and password are required"
            });
        }

        // Find admin by email and password
        const admin = await Admin.findOne({ email, password }).exec();

        if (!admin) {
            return res.status(404).json({
                code: "404",
                msg: "Invalid credentials"
            });
        }

        // Update last login for existing admin
        try {
            admin.lastLogin = new Date();
            if (!admin.isActive) admin.isActive = true; // Set default for existing records
            if (!admin.role) admin.role = 'admin'; // Set default role for existing records
            if (!admin.permissions) admin.permissions = ['user_management', 'content_moderation']; // Set default permissions
            await admin.save();
        } catch (updateError) {
            console.log('Note: Could not update admin record (this is normal for first login):', updateError.message);
        }

        // Set session
        req.session.admin = admin;
        
        console.log('🔍 Session before save:', {
            sessionID: req.sessionID,
            adminID: admin._id,
            sessionData: req.session,
            cookie: req.session.cookie
        });
        
        // Set response headers to ensure cookie is sent
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        console.log('🍪 Session cookie should be set automatically by express-session');
        
        // Explicitly set the session cookie to ensure it's sent
        res.cookie('connect.sid', req.sessionID, {
            maxAge: 5 * 24 * 60 * 60 * 1000, // 5 days
            httpOnly: false,
            secure: false,
            sameSite: 'lax',
            path: '/'
        });
        
        console.log('🍪 Explicitly setting cookie:', {
            name: 'connect.sid',
            value: req.sessionID
        });
        
        // Simple session save without complex callbacks
        req.session.save((err) => {
            if (err) {
                console.error('❌ Session save error:', err);
            } else {
                console.log('✅ Session saved successfully');
            }
            
            // Send response after session is saved
            res.json({
                code: "200",
                msg: "Login successful",
                adminsession: admin,
                sessionId: req.sessionID,
                sessionExpires: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString(),
                message: "Admin login successful. Session will expire in 7 days.",
                cookieName: 'connect.sid',
                // Add the actual cookie value for easy copying to Swagger
                cookieValue: req.sessionID,
                // Add the full cookie string for easy copying
                fullCookie: `connect.sid=${req.sessionID}`
            });
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            code: "500",
            msg: "Internal server error during login"
        });
    }
};

/**
 * Check admin login status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const chklogin = (req, res) => {
    try {
        if (req.session.admin) {
            res.json({
                code: "200",
                msg: "Admin is logged in",
                admin: req.session.admin
            });
        } else {
            res.status(401).json({
                code: "401",
                msg: "Admin not logged in"
            });
        }
    } catch (error) {
        console.error('Check admin login error:', error);
        res.status(500).json({
            code: "500",
            msg: "Internal server error"
        });
    }
};

/**
 * Admin logout
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const logout = (req, res) => {
    try {
        if (req.session.admin) {
            req.session.admin = null;
            req.session.destroy((err) => {
                if (err) {
                    console.error('Session destruction error:', err);
                    return res.status(500).json({
                        code: "500",
                        msg: "Error during logout"
                    });
                }
                res.json({
                    code: "200",
                    msg: "Logout successful"
                });
            });
        } else {
            res.json({
                code: "200",
                msg: "Already logged out"
            });
        }
    } catch (error) {
        console.error('Admin logout error:', error);
        res.status(500).json({
            code: "500",
            msg: "Internal server error during logout"
        });
    }
};

/**
 * Get referral point settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getReferralPoint = async (req, res) => {
    try {
        const appSetting = await AppSetting.findOne({ isDeleted: false }).exec();

        if (!appSetting) {
            return res.status(404).json({
                code: 404,
                data: {},
                message: "No record found"
            });
        }

        res.json({
            code: 200,
            data: appSetting,
            message: "Data found successfully"
        });

    } catch (error) {
        console.error('Get referral point error:', error);
        res.status(500).json({
            code: 500,
            data: {},
            message: "Internal server error"
        });
    }
};

/**
 * Update referral point settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateReferralPoint = async (req, res) => {
    try {
        const { _id, ReferralDiscount } = req.body;

        // Input validation
        if (!ReferralDiscount || ReferralDiscount < 0 || ReferralDiscount > 100) {
            return res.status(400).json({
                code: 400,
                data: {},
                message: "Referral discount must be between 0 and 100"
            });
        }

        let appSetting;

        if (_id) {
            // Update existing setting
            appSetting = await AppSetting.findById(_id).exec();
            
            if (!appSetting) {
                return res.status(404).json({
                    code: 404,
                    data: {},
                    message: "App setting not found"
                });
            }

            appSetting.ReferralDiscount = ReferralDiscount;
        } else {
            // Create new setting if none exists
            appSetting = new AppSetting({
                ReferralDiscount,
                isDeleted: false
            });
        }

        await appSetting.save();

        res.json({
            code: 200,
            data: appSetting,
            message: "Setting updated successfully"
        });

    } catch (error) {
        console.error('Update referral point error:', error);
        res.status(500).json({
            code: 500,
            data: {},
            message: "Internal server error during update"
        });
    }
};

/**
 * Get all admins (for admin management)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllAdmins = async (req, res) => {
    try {
        const admins = await Admin.find({}).select('-password').exec();

        res.json({
            code: 200,
            msg: "Admins retrieved successfully",
            data: admins
        });

    } catch (error) {
        console.error('Get all admins error:', error);
        res.status(500).json({
            code: 500,
            msg: "Internal server error",
            data: []
        });
    }
};

/**
 * Create new admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Input validation
        if (!name || !email || !password) {
            return res.status(400).json({
                code: 400,
                msg: "Name, email, and password are required"
            });
        }

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email }).exec();
        if (existingAdmin) {
            return res.status(409).json({
                code: 409,
                msg: "Admin with this email already exists"
            });
        }

        // Create new admin
        const newAdmin = new Admin({
            name,
            email,
            password // Note: In production, hash this password
        });

        await newAdmin.save();

        // Remove password from response
        const adminResponse = newAdmin.toObject();
        delete adminResponse.password;

        res.status(201).json({
            code: 201,
            msg: "Admin created successfully",
            data: adminResponse
        });

    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({
            code: 500,
            msg: "Internal server error during admin creation"
        });
    }
};

/**
 * Debug session information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const debugSession = (req, res) => {
    try {
        const sessionInfo = {
            sessionID: req.sessionID,
            hasSession: !!req.session,
            sessionKeys: req.session ? Object.keys(req.session) : [],
            adminSession: req.session.admin || null,
            subAdminSession: req.session.subAdmin || null,
            cookies: req.headers.cookie,
            userAgent: req.headers['user-agent'],
            origin: req.headers.origin,
            referer: req.headers.referer
        };
        
        console.log('Session Debug Info:', sessionInfo);
        
        res.json({
            code: "200",
            msg: "Session debug information",
            sessionInfo: sessionInfo
        });
    } catch (error) {
        console.error('Debug session error:', error);
        res.status(500).json({
            code: "500",
            msg: "Internal server error"
        });
    }
};

/**
 * Promote a regular user to subadmin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const promoteUserToSubAdmin = async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const User = require('./../models/userModel.js');
        const SubAdmin = require('./../models/subAdminModel.js');
        
        const { userId, password, permissions = [], role = 'subadmin' } = req.body;

        // Input validation
        if (!userId || !password) {
            return res.status(400).json({
                code: 400,
                msg: "User ID and password are required"
            });
        }

        // Find the user
        const user = await User.findById(userId).exec();
        if (!user) {
            return res.status(404).json({
                code: 404,
                msg: "User not found"
            });
        }

        // Check if user is already a subadmin
        const existingSubAdmin = await SubAdmin.findOne({ email: user.Email }).exec();
        if (existingSubAdmin) {
            return res.status(409).json({
                code: 409,
                msg: "User is already a subadmin"
            });
        }

        // Create new subadmin from user data
        const newSubAdmin = new SubAdmin({
            name: user.Name,
            email: user.Email,
            password: password,
            role: role,
            isActive: true,
            permissions: permissions,
            ProfilePic: user.ProfilePic || '/assets/users/default.png',
            assignedDomains: [],
            assignedCategories: []
        });

        await newSubAdmin.save();

        // Remove password from response
        const subAdminResponse = newSubAdmin.toObject();
        delete subAdminResponse.password;

        res.status(201).json({
            code: 201,
            msg: "User promoted to subadmin successfully",
            data: {
                subAdmin: subAdminResponse,
                originalUser: {
                    _id: user._id,
                    Name: user.Name,
                    Email: user.Email,
                    ProfilePic: user.ProfilePic
                }
            }
        });

    } catch (error) {
        console.error('Promote user to subadmin error:', error);
        res.status(500).json({
            code: 500,
            msg: "Internal server error during promotion"
        });
    }
};

module.exports = {
    login,
    chklogin,
    logout,
    getReferralPoint,
    updateReferralPoint,
    getAllAdmins,
    createAdmin,
    promoteUserToSubAdmin,
    debugSession
};
