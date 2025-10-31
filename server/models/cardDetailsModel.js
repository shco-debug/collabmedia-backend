var mongoose = require('mongoose');
var crypto = require('crypto');

/**
 * Card Details Schema
 * 
 * IMPORTANT SECURITY NOTES:
 * ========================
 * 1. For PCI compliance, you should NEVER store raw card numbers, CVV, or full expiry dates
 * 2. Use tokenization services (Stripe, PayPal, etc.) instead
 * 3. This schema stores tokenized/masked card data only
 * 4. Raw sensitive data should be sent directly to payment gateway
 * 
 * Recommended Flow:
 * 1. Frontend sends card details to Stripe/PayPal directly
 * 2. Payment gateway returns a token
 * 3. Save only the token and masked card info in this schema
 */

var cardDetailsSchema = new mongoose.Schema({
	// Reference to user who owns this card
	UserId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'user',
		required: true,
		index: true
	},

	// Payment Gateway Information
	PaymentGateway: {
		type: String,
		enum: ['Stripe', 'PayPal', 'Square', 'Other'],
		default: 'Stripe'
	},

	// Token from payment gateway (STORE THIS - NOT RAW CARD DATA)
	CardToken: {
		type: String,
		required: true,
		unique: true
	},

	// Customer ID from payment gateway
	CustomerId: {
		type: String,
		required: false
	},

	// Payment Method ID (for Stripe Payment Methods)
	PaymentMethodId: {
		type: String,
		required: false
	},

	// Card Information (Masked/Public data only)
	CardBrand: {
		type: String,
		enum: ['Visa', 'MasterCard', 'American Express', 'Discover', 'Diners Club', 'JCB', 'UnionPay', 'Unknown'],
		default: 'Unknown'
	},

	// Last 4 digits only (safe to store)
	Last4Digits: {
		type: String,
		required: true,
		validate: {
			validator: function(v) {
				return /^\d{4}$/.test(v);
			},
			message: 'Last 4 digits must be exactly 4 numeric characters'
		}
	},

	// Expiry month (1-12)
	ExpiryMonth: {
		type: Number,
		required: true,
		min: 1,
		max: 12
	},

	// Expiry year (YYYY format)
	ExpiryYear: {
		type: Number,
		required: true,
		validate: {
			validator: function(v) {
				const currentYear = new Date().getFullYear();
				return v >= currentYear && v <= currentYear + 20;
			},
			message: 'Invalid expiry year'
		}
	},

	// Card holder name
	CardHolderName: {
		type: String,
		required: true,
		trim: true
	},

	// Billing Address
	BillingAddress: {
		AddressLine1: { type: String, required: true },
		AddressLine2: { type: String },
		City: { type: String, required: true },
		State: { type: String, required: true },
		Country: { type: String, required: true, default: 'US' },
		ZipCode: { type: String, required: true },
	},

	// Card Type
	CardType: {
		type: String,
		enum: ['Credit', 'Debit', 'Prepaid', 'Unknown'],
		default: 'Unknown'
	},

	// Is this the default payment method?
	IsDefault: {
		type: Boolean,
		default: false
	},

	// Is card verified?
	IsVerified: {
		type: Boolean,
		default: false
	},

	// Card verification status
	VerificationStatus: {
		type: String,
		enum: ['Pending', 'Verified', 'Failed', 'Expired'],
		default: 'Pending'
	},

	// Card nickname (optional, for user to identify their cards)
	CardNickname: {
		type: String,
		trim: true
	},

	// Metadata from payment gateway
	GatewayMetadata: {
		type: Object,
		default: {}
	},

	// Track when card was added
	AddedOn: {
		type: Date,
		default: Date.now
	},

	// Track when card was last updated
	LastUpdatedOn: {
		type: Date,
		default: Date.now
	},

	// Track when card was last used
	LastUsedOn: {
		type: Date
	},

	// Number of successful transactions with this card
	SuccessfulTransactions: {
		type: Number,
		default: 0
	},

	// Status flags
	Status: {
		type: Boolean,
		default: true
	},

	IsDeleted: {
		type: Boolean,
		default: false
	},

	// Soft delete timestamp
	DeletedOn: {
		type: Date
	},

	// Reason for deletion/deactivation
	DeactivationReason: {
		type: String
	}

}, {
	collection: 'CardDetails',
	timestamps: { createdAt: 'CreatedOn', updatedAt: 'ModifiedOn' }
});

// Indexes for better query performance
cardDetailsSchema.index({ UserId: 1, IsDeleted: 0, Status: 1 });
cardDetailsSchema.index({ UserId: 1, IsDefault: 1 });
cardDetailsSchema.index({ CardToken: 1 });
cardDetailsSchema.index({ PaymentMethodId: 1 });

// Virtual property to check if card is expired
cardDetailsSchema.virtual('IsExpired').get(function() {
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth() + 1;
	
	if (this.ExpiryYear < currentYear) {
		return true;
	}
	if (this.ExpiryYear === currentYear && this.ExpiryMonth < currentMonth) {
		return true;
	}
	return false;
});

// Virtual property for masked card number display
cardDetailsSchema.virtual('MaskedCardNumber').get(function() {
	return `****  ****  ****  ${this.Last4Digits}`;
});

// Virtual property for expiry display
cardDetailsSchema.virtual('ExpiryDisplay').get(function() {
	const month = String(this.ExpiryMonth).padStart(2, '0');
	const year = String(this.ExpiryYear).slice(-2);
	return `${month}/${year}`;
});

// Method to mark card as used
cardDetailsSchema.methods.markAsUsed = function() {
	this.LastUsedOn = new Date();
	this.SuccessfulTransactions += 1;
	return this.save();
};

// Method to set as default card
cardDetailsSchema.methods.setAsDefault = async function() {
	// Unset all other cards as default for this user
	await this.constructor.updateMany(
		{ UserId: this.UserId, _id: { $ne: this._id } },
		{ $set: { IsDefault: false } }
	);
	
	this.IsDefault = true;
	return this.save();
};

// Method to soft delete
cardDetailsSchema.methods.softDelete = function(reason) {
	this.IsDeleted = true;
	this.Status = false;
	this.DeletedOn = new Date();
	if (reason) {
		this.DeactivationReason = reason;
	}
	return this.save();
};

// Pre-save middleware to validate expiry date
cardDetailsSchema.pre('save', function(next) {
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth() + 1;
	
	// Check if card is expired
	if (this.ExpiryYear < currentYear || 
		(this.ExpiryYear === currentYear && this.ExpiryMonth < currentMonth)) {
		this.VerificationStatus = 'Expired';
		this.Status = false;
	}
	
	this.LastUpdatedOn = new Date();
	next();
});

// Static method to get user's default card
cardDetailsSchema.statics.getDefaultCard = function(userId) {
	return this.findOne({
		UserId: userId,
		IsDefault: true,
		IsDeleted: false,
		Status: true
	});
};

// Static method to get all active cards for a user
cardDetailsSchema.statics.getUserCards = function(userId, includeExpired = false) {
	const query = {
		UserId: userId,
		IsDeleted: false,
		Status: true
	};
	
	return this.find(query).sort({ IsDefault: -1, AddedOn: -1 });
};

// Enable virtuals in JSON output
cardDetailsSchema.set('toJSON', { virtuals: true });
cardDetailsSchema.set('toObject', { virtuals: true });

var CardDetails = mongoose.model('CardDetails', cardDetailsSchema);

module.exports = CardDetails;

