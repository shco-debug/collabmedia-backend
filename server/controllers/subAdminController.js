const SubAdmin = require('./../models/subAdminModel.js');

/**
 * SubAdmin login controller
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

        // Find subadmin by email and password
        const subAdmin = await SubAdmin.findOne({ email, password }).exec();

        if (!subAdmin) {
            return res.status(404).json({
                code: "404",
                msg: "Invalid credentials"
            });
        }

        // Set session
        req.session.subAdmin = subAdmin;
        
        // Get complete subadmin data from database (excluding password)
        const completeSubAdminData = subAdmin.toObject();
        delete completeSubAdminData.password; // Remove password from response for security
        
        // Save session to ensure it's persisted
        req.session.save((err) => {
            if (err) {
                console.error('SubAdmin session save error:', err);
            }
        });

        // Handle remember me functionality if needed
        if (req.body.remember === "1") {
            // Extend session duration or set remember me cookie
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        }

        res.json({
            code: "200",
            msg: "Login successful",
            subAdminsession: subAdmin,
            subAdminData: completeSubAdminData, // Complete subadmin data from database
            sessionId: req.sessionID,
            sessionExpires: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString(),
            message: "SubAdmin login successful. Session will expire in 7 days.",
            cookieName: 'connect.sid',
            cookieValue: req.sessionID,
            fullCookie: `connect.sid=${req.sessionID}`
        });

    } catch (error) {
        console.error('SubAdmin login error:', error);
        res.status(500).json({
            code: "500",
            msg: "Internal server error during login"
        });
    }
};

/**
 * Check subadmin login status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const chklogin = (req, res) => {
    try {
        if (req.session.subAdmin) {
            res.json({
                code: "200",
                msg: "SubAdmin is logged in",
                subAdmin: req.session.subAdmin
            });
        } else {
            res.status(401).json({
                code: "401",
                msg: "SubAdmin not logged in"
            });
        }
    } catch (error) {
        console.error('Check subadmin login error:', error);
        res.status(500).json({
            code: "500",
            msg: "Internal server error"
        });
    }
};

/**
 * SubAdmin logout
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const logout = (req, res) => {
    try {
        if (req.session.subAdmin) {
            req.session.subAdmin = null;
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
        console.error('SubAdmin logout error:', error);
        res.status(500).json({
            code: "500",
            msg: "Internal server error during logout"
        });
    }
};

/**
 * Get all subadmins (for admin management)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllSubAdmins = async (req, res) => {
    try {
        const subAdmins = await SubAdmin.find({}).select('-password').exec();

        res.json({
            code: 200,
            msg: "SubAdmins retrieved successfully",
            data: subAdmins
        });

    } catch (error) {
        console.error('Get all subadmins error:', error);
        res.status(500).json({
            code: 500,
            msg: "Internal server error",
            data: []
        });
    }
};

/**
 * Create new subadmin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createSubAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Input validation
        if (!name || !email || !password) {
            return res.status(400).json({
                code: 400,
                msg: "Name, email, and password are required"
            });
        }

        // Check if subadmin already exists
        const existingSubAdmin = await SubAdmin.findOne({ email }).exec();
        if (existingSubAdmin) {
            return res.status(409).json({
                code: 409,
                msg: "SubAdmin with this email already exists"
            });
        }

        // Create new subadmin
        const newSubAdmin = new SubAdmin({
            name,
            email,
            password // Note: In production, hash this password
        });

        await newSubAdmin.save();

        // Remove password from response
        const subAdminResponse = newSubAdmin.toObject();
        delete subAdminResponse.password;

        res.status(201).json({
            code: 201,
            msg: "SubAdmin created successfully",
            data: subAdminResponse
        });

    } catch (error) {
        console.error('Create subadmin error:', error);
        res.status(500).json({
            code: 500,
            msg: "Internal server error during subadmin creation"
        });
    }
};

/**
 * Update subadmin profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateProfile = async (req, res) => {
    try {
        const { _id } = req.params;
        const { name, email } = req.body;

        // Input validation
        if (!name && !email) {
            return res.status(400).json({
                code: 400,
                msg: "At least one field (name or email) is required"
            });
        }

        // Check if subadmin exists
        const subAdmin = await SubAdmin.findById(_id).exec();
        if (!subAdmin) {
            return res.status(404).json({
                code: 404,
                msg: "SubAdmin not found"
            });
        }

        // Update fields
        if (name) subAdmin.name = name;
        if (email) {
            // Check if email is already taken by another subadmin
            const existingSubAdmin = await SubAdmin.findOne({ 
                email, 
                _id: { $ne: _id } 
            }).exec();
            
            if (existingSubAdmin) {
                return res.status(409).json({
                    code: 409,
                    msg: "Email is already taken by another subadmin"
                });
            }
            subAdmin.email = email;
        }

        await subAdmin.save();

        // Remove password from response
        const subAdminResponse = subAdmin.toObject();
        delete subAdminResponse.password;

        res.json({
            code: 200,
            msg: "Profile updated successfully",
            data: subAdminResponse
        });

    } catch (error) {
        console.error('Update subadmin profile error:', error);
        res.status(500).json({
            code: 500,
            msg: "Internal server error during profile update"
        });
    }
};

/**
 * Delete subadmin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteSubAdmin = async (req, res) => {
    try {
        const { _id } = req.params;

        // Check if subadmin exists
        const subAdmin = await SubAdmin.findById(_id).exec();
        if (!subAdmin) {
            return res.status(404).json({
                code: 404,
                msg: "SubAdmin not found"
            });
        }

        await SubAdmin.findByIdAndDelete(_id).exec();

        res.json({
            code: 200,
            msg: "SubAdmin deleted successfully"
        });

    } catch (error) {
        console.error('Delete subadmin error:', error);
        res.status(500).json({
            code: 500,
            msg: "Internal server error during deletion"
        });
    }
};

module.exports = {
    login,
    chklogin,
    logout,
    getAllSubAdmins,
    createSubAdmin,
    updateProfile,
    deleteSubAdmin
};