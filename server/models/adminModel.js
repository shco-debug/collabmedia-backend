const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Admin name is required'],
        trim: true,
        minlength: [2, 'Admin name must be at least 2 characters long'],
        maxlength: [100, 'Admin name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Admin email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please enter a valid email address'
        ]
    },
    password: {
        type: String,
        required: [true, 'Admin password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },
    role: {
        type: String,
        enum: ['admin', 'super_admin'],
        default: 'admin'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date,
        default: null
    },
    permissions: [{
        type: String,
        enum: ['user_management', 'content_moderation', 'system_settings', 'analytics', 'billing']
    }],
    ProfilePic: {
        type: String,
        default: '/assets/users/default.png'
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt fields
    collection: 'admin' // Use existing collection name
});

// Index for better query performance
adminSchema.index({ email: 1 });
adminSchema.index({ isActive: 1 });

// Virtual for admin display name
adminSchema.virtual('displayName').get(function() {
    return this.name || this.email;
});

// Method to check if admin has specific permission
adminSchema.methods.hasPermission = function(permission) {
    return this.permissions && this.permissions.includes(permission);
};

// Method to update last login
adminSchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    return this.save();
};

// Static method to find active admins
adminSchema.statics.findActive = function() {
    return this.find({ isActive: { $ne: false } }); // Handle existing records without isActive field
};

// Pre-save middleware to ensure email is lowercase
adminSchema.pre('save', function(next) {
    if (this.isModified('email')) {
        this.email = this.email.toLowerCase();
    }
    next();
});

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;