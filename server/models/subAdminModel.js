const mongoose = require('mongoose');

const subAdminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'SubAdmin name is required'],
        trim: true,
        minlength: [2, 'SubAdmin name must be at least 2 characters long'],
        maxlength: [100, 'SubAdmin name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'SubAdmin email is required'],
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
        required: [true, 'SubAdmin password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },
    role: {
        type: String,
        enum: ['subadmin', 'moderator', 'editor'],
        default: 'subadmin'
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
        enum: ['content_moderation', 'user_management', 'basic_analytics', 'content_editing']
    }],
    assignedDomains: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Domain'
    }],
    assignedCategories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],
    ProfilePic: {
        type: String,
        default: '/assets/users/default.png'
    },
    supervisor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt fields
    collection: 'subadmins' // Explicitly set collection name
});

// Index for better query performance
subAdminSchema.index({ email: 1 });
subAdminSchema.index({ isActive: 1 });
subAdminSchema.index({ supervisor: 1 });

// Virtual for subadmin display name
subAdminSchema.virtual('displayName').get(function() {
    return this.name || this.email;
});

// Method to check if subadmin has specific permission
subAdminSchema.methods.hasPermission = function(permission) {
    return this.permissions.includes(permission);
};

// Method to update last login
subAdminSchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    return this.save();
};

// Method to assign domain
subAdminSchema.methods.assignDomain = function(domainId) {
    if (!this.assignedDomains.includes(domainId)) {
        this.assignedDomains.push(domainId);
        return this.save();
    }
    return Promise.resolve(this);
};

// Method to remove domain assignment
subAdminSchema.methods.removeDomain = function(domainId) {
    this.assignedDomains = this.assignedDomains.filter(id => !id.equals(domainId));
    return this.save();
};

// Static method to find active subadmins
subAdminSchema.statics.findActive = function() {
    return this.find({ isActive: true });
};

// Static method to find subadmins by supervisor
subAdminSchema.statics.findBySupervisor = function(supervisorId) {
    return this.find({ supervisor: supervisorId });
};

// Pre-save middleware to ensure email is lowercase
subAdminSchema.pre('save', function(next) {
    if (this.isModified('email')) {
        this.email = this.email.toLowerCase();
    }
    next();
});

const SubAdmin = mongoose.model('SubAdmin', subAdminSchema);

module.exports = SubAdmin;

