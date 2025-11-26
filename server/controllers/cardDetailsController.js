var CardDetails = require('./../models/cardDetailsModel.js');
var User = require('./../models/userModel.js');
var ObjectId = require('mongodb').ObjectId;

/**
 * Add a new card for a user
 * IMPORTANT: Card token should come from frontend after tokenization with Stripe/PayPal
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
var addCard = async function(req, res) {
	try {
		// Check if user is logged in
		if (!req.session || !req.session.user || !req.session.user._id) {
			return res.json({
				code: 401,
				message: "User not authenticated"
			});
		}

		var userId = req.session.user._id;
		var {
			CardToken,
			PaymentMethodId,
			CustomerId,
			PaymentGateway,
			CardBrand,
			Last4Digits,
			ExpiryMonth,
			ExpiryYear,
			CardHolderName,
			BillingAddress,
			CardType,
			CardNickname,
			IsDefault,
			GatewayMetadata
		} = req.body;

		// Validate required fields
		if (!CardToken || !Last4Digits || !ExpiryMonth || !ExpiryYear || !CardHolderName) {
			return res.json({
				code: 400,
				message: "Missing required fields: CardToken, Last4Digits, ExpiryMonth, ExpiryYear, CardHolderName"
			});
		}

		// Validate billing address
		if (!BillingAddress || !BillingAddress.AddressLine1 || !BillingAddress.City || 
			!BillingAddress.State || !BillingAddress.Country || !BillingAddress.ZipCode) {
			return res.json({
				code: 400,
				message: "Complete billing address is required"
			});
		}

		// Check if card token already exists
		var existingCard = await CardDetails.findOne({
			CardToken: CardToken,
			IsDeleted: false
		});

		if (existingCard) {
			return res.json({
				code: 409,
				message: "This card has already been added"
			});
		}

		// Create new card
		var newCard = new CardDetails({
			UserId: userId,
			CardToken: CardToken,
			PaymentMethodId: PaymentMethodId,
			CustomerId: CustomerId,
			PaymentGateway: PaymentGateway || 'Stripe',
			CardBrand: CardBrand || 'Unknown',
			Last4Digits: Last4Digits,
			ExpiryMonth: ExpiryMonth,
			ExpiryYear: ExpiryYear,
			CardHolderName: CardHolderName,
			BillingAddress: BillingAddress,
			CardType: CardType || 'Unknown',
			CardNickname: CardNickname,
			IsDefault: IsDefault || false,
			IsVerified: true, // Assuming token from gateway means verified
			VerificationStatus: 'Verified',
			GatewayMetadata: GatewayMetadata || {},
			Status: true,
			IsDeleted: false
		});

		// Deactivate all old cards and set new card as default
		// When adding a new card, deactivate all existing cards and make the new one default
		await CardDetails.updateMany(
			{ UserId: userId, _id: { $ne: newCard._id } },
			{ 
				$set: { 
					IsDefault: false,
					Status: false  // Deactivate old cards
				}
			}
		);
		
		// Always set the new card as default and active
		newCard.IsDefault = true;
		newCard.Status = true;

		await newCard.save();

		return res.json({
			code: 200,
			message: "Card added successfully",
			data: {
				cardId: newCard._id,
				maskedCardNumber: newCard.MaskedCardNumber,
				cardBrand: newCard.CardBrand,
				expiryDisplay: newCard.ExpiryDisplay,
				isDefault: newCard.IsDefault
			}
		});

	} catch (error) {
		console.error('Error adding card:', error);
		return res.json({
			code: 500,
			message: "Failed to add card",
			error: error.message
		});
	}
};

/**
 * Get all cards for logged-in user
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
var getUserCards = async function(req, res) {
	try {
		if (!req.session || !req.session.user || !req.session.user._id) {
			return res.json({
				code: 401,
				message: "User not authenticated"
			});
		}

		var userId = req.session.user._id;
		var includeExpired = req.body.includeExpired || req.query.includeExpired || false;

		var query = {
			UserId: userId,
			IsDeleted: false,
			Status: true
		};

		var cards = await CardDetails.find(query)
			.sort({ IsDefault: -1, AddedOn: -1 })
			.lean();

		// Filter out expired cards if requested
		if (!includeExpired) {
			const now = new Date();
			const currentYear = now.getFullYear();
			const currentMonth = now.getMonth() + 1;

			cards = cards.filter(card => {
				if (card.ExpiryYear < currentYear) return false;
				if (card.ExpiryYear === currentYear && card.ExpiryMonth < currentMonth) return false;
				return true;
			});
		}

		// Format response
		var formattedCards = cards.map(card => ({
			_id: card._id, // Keep original _id for compatibility
			cardId: card._id,
			maskedCardNumber: `****  ****  ****  ${card.Last4Digits}`,
			Last4Digits: card.Last4Digits, // Keep original field for compatibility
			CardBrand: card.CardBrand, // Keep original field for compatibility
			cardBrand: card.CardBrand,
			cardType: card.CardType,
			CardType: card.CardType, // Keep original field for compatibility
			CardNickname: card.CardNickname, // Keep original field for compatibility
			cardNickname: card.CardNickname,
			ExpiryMonth: card.ExpiryMonth, // Keep original field for compatibility
			expiryMonth: card.ExpiryMonth,
			ExpiryYear: card.ExpiryYear, // Keep original field for compatibility
			expiryYear: card.ExpiryYear,
			expiryDisplay: `${String(card.ExpiryMonth).padStart(2, '0')}/${String(card.ExpiryYear).slice(-2)}`,
			CardHolderName: card.CardHolderName, // Keep original field for compatibility
			cardHolderName: card.CardHolderName,
			IsDefault: card.IsDefault, // Keep original field for compatibility
			isDefault: card.IsDefault,
			Status: card.Status, // Keep original field for compatibility
			isVerified: card.IsVerified,
			IsVerified: card.IsVerified, // Keep original field for compatibility
			lastUsedOn: card.LastUsedOn,
			LastUsedOn: card.LastUsedOn, // Keep original field for compatibility
			addedOn: card.AddedOn,
			AddedOn: card.AddedOn, // Keep original field for compatibility
			paymentGateway: card.PaymentGateway,
			PaymentGateway: card.PaymentGateway, // Keep original field for compatibility
			BillingAddress: card.BillingAddress || null, // Include billing address
			billingAddress: card.BillingAddress || null
		}));

		return res.json({
			code: 200,
			message: "Cards retrieved successfully",
			data: formattedCards,
			count: formattedCards.length
		});

	} catch (error) {
		console.error('Error getting user cards:', error);
		return res.json({
			code: 500,
			message: "Failed to retrieve cards",
			error: error.message
		});
	}
};

/**
 * Get default card for logged-in user
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
var getDefaultCard = async function(req, res) {
	try {
		if (!req.session || !req.session.user || !req.session.user._id) {
			return res.json({
				code: 401,
				message: "User not authenticated"
			});
		}

		var userId = req.session.user._id;

		var card = await CardDetails.findOne({
			UserId: userId,
			IsDefault: true,
			IsDeleted: false,
			Status: true
		}).lean();

		if (!card) {
			return res.json({
				code: 404,
				message: "No default card found"
			});
		}

		return res.json({
			code: 200,
			message: "Default card retrieved successfully",
			data: {
				cardId: card._id,
				maskedCardNumber: `****  ****  ****  ${card.Last4Digits}`,
				cardBrand: card.CardBrand,
				cardType: card.CardType,
				expiryDisplay: `${String(card.ExpiryMonth).padStart(2, '0')}/${String(card.ExpiryYear).slice(-2)}`,
				cardHolderName: card.CardHolderName,
				paymentMethodId: card.PaymentMethodId,
				cardToken: card.CardToken
			}
		});

	} catch (error) {
		console.error('Error getting default card:', error);
		return res.json({
			code: 500,
			message: "Failed to retrieve default card",
			error: error.message
		});
	}
};

/**
 * Set a card as default
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
var setDefaultCard = async function(req, res) {
	try {
		if (!req.session || !req.session.user || !req.session.user._id) {
			return res.json({
				code: 401,
				message: "User not authenticated"
			});
		}

		var userId = req.session.user._id;
		var cardId = req.body.cardId || req.body.CardId;

		if (!cardId) {
			return res.json({
				code: 400,
				message: "Card ID is required"
			});
		}

		// Find the card
		var card = await CardDetails.findOne({
			_id: new ObjectId(cardId),
			UserId: userId,
			IsDeleted: false,
			Status: true
		});

		if (!card) {
			return res.json({
				code: 404,
				message: "Card not found"
			});
		}

		// Check if card is expired
		if (card.IsExpired) {
			return res.json({
				code: 400,
				message: "Cannot set expired card as default"
			});
		}

		// Set this card as default
		await card.setAsDefault();

		return res.json({
			code: 200,
			message: "Default card updated successfully"
		});

	} catch (error) {
		console.error('Error setting default card:', error);
		return res.json({
			code: 500,
			message: "Failed to set default card",
			error: error.message
		});
	}
};

/**
 * Update card details (limited fields)
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
var updateCard = async function(req, res) {
	try {
		if (!req.session || !req.session.user || !req.session.user._id) {
			return res.json({
				code: 401,
				message: "User not authenticated"
			});
		}

		var userId = req.session.user._id;
		var cardId = req.body.cardId || req.body.CardId;
		var {
			CardNickname,
			BillingAddress,
			ExpiryMonth,
			ExpiryYear
		} = req.body;

		if (!cardId) {
			return res.json({
				code: 400,
				message: "Card ID is required"
			});
		}

		// Find the card
		var card = await CardDetails.findOne({
			_id: new ObjectId(cardId),
			UserId: userId,
			IsDeleted: false
		});

		if (!card) {
			return res.json({
				code: 404,
				message: "Card not found"
			});
		}

		// Update allowed fields
		if (CardNickname !== undefined) {
			card.CardNickname = CardNickname;
		}
		
		if (BillingAddress) {
			if (BillingAddress.AddressLine1) card.BillingAddress.AddressLine1 = BillingAddress.AddressLine1;
			if (BillingAddress.AddressLine2 !== undefined) card.BillingAddress.AddressLine2 = BillingAddress.AddressLine2;
			if (BillingAddress.City) card.BillingAddress.City = BillingAddress.City;
			if (BillingAddress.State) card.BillingAddress.State = BillingAddress.State;
			if (BillingAddress.Country) card.BillingAddress.Country = BillingAddress.Country;
			if (BillingAddress.ZipCode) card.BillingAddress.ZipCode = BillingAddress.ZipCode;
		}

		if (ExpiryMonth) card.ExpiryMonth = ExpiryMonth;
		if (ExpiryYear) card.ExpiryYear = ExpiryYear;

		await card.save();

		return res.json({
			code: 200,
			message: "Card updated successfully"
		});

	} catch (error) {
		console.error('Error updating card:', error);
		return res.json({
			code: 500,
			message: "Failed to update card",
			error: error.message
		});
	}
};

/**
 * Delete a card (soft delete)
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
var deleteCard = async function(req, res) {
	try {
		if (!req.session || !req.session.user || !req.session.user._id) {
			return res.json({
				code: 401,
				message: "User not authenticated"
			});
		}

		var userId = req.session.user._id;
		var cardId = req.body.cardId || req.body.CardId;
		var reason = req.body.reason || "User requested deletion";

		if (!cardId) {
			return res.json({
				code: 400,
				message: "Card ID is required"
			});
		}

		// Find the card
		var card = await CardDetails.findOne({
			_id: new ObjectId(cardId),
			UserId: userId,
			IsDeleted: false
		});

		if (!card) {
			return res.json({
				code: 404,
				message: "Card not found"
			});
		}

		var wasDefault = card.IsDefault;

		// Soft delete the card
		await card.softDelete(reason);

		// If this was the default card, set another card as default
		if (wasDefault) {
			var nextCard = await CardDetails.findOne({
				UserId: userId,
				IsDeleted: false,
				Status: true
			}).sort({ AddedOn: -1 });

			if (nextCard) {
				await nextCard.setAsDefault();
			}
		}

		return res.json({
			code: 200,
			message: "Card deleted successfully"
		});

	} catch (error) {
		console.error('Error deleting card:', error);
		return res.json({
			code: 500,
			message: "Failed to delete card",
			error: error.message
		});
	}
};

/**
 * Get a specific card by ID
 * 
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
var getCardById = async function(req, res) {
	try {
		if (!req.session || !req.session.user || !req.session.user._id) {
			return res.json({
				code: 401,
				message: "User not authenticated"
			});
		}

		var userId = req.session.user._id;
		var cardId = req.body.cardId || req.query.cardId || req.body.CardId || req.query.CardId;

		if (!cardId) {
			return res.json({
				code: 400,
				message: "Card ID is required"
			});
		}

		var card = await CardDetails.findOne({
			_id: new ObjectId(cardId),
			UserId: userId,
			IsDeleted: false
		}).lean();

		if (!card) {
			return res.json({
				code: 404,
				message: "Card not found"
			});
		}

		return res.json({
			code: 200,
			message: "Card retrieved successfully",
			data: {
				cardId: card._id,
				maskedCardNumber: `****  ****  ****  ${card.Last4Digits}`,
				cardBrand: card.CardBrand,
				cardType: card.CardType,
				cardNickname: card.CardNickname,
				expiryMonth: card.ExpiryMonth,
				expiryYear: card.ExpiryYear,
				expiryDisplay: `${String(card.ExpiryMonth).padStart(2, '0')}/${String(card.ExpiryYear).slice(-2)}`,
				cardHolderName: card.CardHolderName,
				billingAddress: card.BillingAddress,
				isDefault: card.IsDefault,
				isVerified: card.IsVerified,
				verificationStatus: card.VerificationStatus,
				lastUsedOn: card.LastUsedOn,
				addedOn: card.AddedOn,
				paymentGateway: card.PaymentGateway,
				paymentMethodId: card.PaymentMethodId
			}
		});

	} catch (error) {
		console.error('Error getting card:', error);
		return res.json({
			code: 500,
			message: "Failed to retrieve card",
			error: error.message
		});
	}
};

module.exports = {
	addCard: addCard,
	getUserCards: getUserCards,
	getDefaultCard: getDefaultCard,
	setDefaultCard: setDefaultCard,
	updateCard: updateCard,
	deleteCard: deleteCard,
	getCardById: getCardById
};

