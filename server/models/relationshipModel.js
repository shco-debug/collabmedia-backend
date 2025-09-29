var mongoose = require('mongoose');

var relationshipSchema = new mongoose.Schema({
    RelationshipTitle: {
        type: String,
        required: true,
        unique: true
    },
    Description: {
        type: String,
        default: ''
    },
    Icon: {
        type: String,
        default: '👥' // Default emoji icon
    },
    Color: {
        type: String,
        default: '#007bff' // Default color
    },
    Order: {
        type: Number,
        default: 1000
    },
    IsActive: {
        type: Boolean,
        default: true
    },
    IsDefault: {
        type: Boolean,
        default: false
    },
    CreatedOn: {
        type: Date,
        default: Date.now
    },
    ModifiedOn: {
        type: Date,
        default: Date.now
    }
}, { collection: 'Relationships' });

// Pre-save middleware to update ModifiedOn
relationshipSchema.pre('save', function(next) {
    this.ModifiedOn = Date.now();
    next();
});

// Static method to get default relationship
relationshipSchema.statics.getDefault = function() {
    return this.findOne({ IsDefault: true, IsActive: true });
};

// Static method to get all active relationships
relationshipSchema.statics.getActive = function() {
    return this.find({ IsActive: true }).sort({ Order: 1 });
};

var Relationship = mongoose.model('Relationship', relationshipSchema);

module.exports = Relationship;
