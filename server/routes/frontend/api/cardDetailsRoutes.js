var CardDetails = require('../../../controllers/cardDetailsController.js');

module.exports = function(router){
	
	/**
	 * Add a new card
	 * POST /api/cards/add
	 * 
	 * Body:
	 * {
	 *   CardToken: "tok_xxxx",           // Required - Token from Stripe/PayPal
	 *   PaymentMethodId: "pm_xxxx",      // Optional - Stripe Payment Method ID
	 *   CustomerId: "cus_xxxx",          // Optional - Stripe Customer ID
	 *   PaymentGateway: "Stripe",        // Optional - Default: "Stripe"
	 *   CardBrand: "Visa",               // Optional - e.g., "Visa", "MasterCard"
	 *   Last4Digits: "4242",             // Required - Last 4 digits
	 *   ExpiryMonth: 12,                 // Required - 1-12
	 *   ExpiryYear: 2025,                // Required - YYYY
	 *   CardHolderName: "John Doe",      // Required
	 *   BillingAddress: {                // Required
	 *     AddressLine1: "123 Main St",
	 *     AddressLine2: "Apt 4",         // Optional
	 *     City: "New York",
	 *     State: "NY",
	 *     Country: "US",
	 *     ZipCode: "10001"
	 *   },
	 *   CardType: "Credit",              // Optional - "Credit", "Debit", "Prepaid"
	 *   CardNickname: "My Business Card",// Optional
	 *   IsDefault: false,                // Optional - Default: false
	 *   GatewayMetadata: {}              // Optional - Additional data
	 * }
	 */
	router.post('/add', function(req, res){
		CardDetails.addCard(req, res);
	});
	
	/**
	 * Get all cards for logged-in user
	 * POST /api/cards/
	 * GET /api/cards/
	 * 
	 * Body/Query (optional):
	 * {
	 *   includeExpired: false  // Optional - Include expired cards
	 * }
	 */
	router.post('/', function(req, res){
		CardDetails.getUserCards(req, res);
	});
	
	router.get('/', function(req, res){
		CardDetails.getUserCards(req, res);
	});
	
	/**
	 * Get default card for logged-in user
	 * POST /api/cards/default
	 * GET /api/cards/default
	 */
	router.post('/default', function(req, res){
		CardDetails.getDefaultCard(req, res);
	});
	
	router.get('/default', function(req, res){
		CardDetails.getDefaultCard(req, res);
	});
	
	/**
	 * Set a card as default
	 * POST /api/cards/setDefault
	 * 
	 * Body:
	 * {
	 *   cardId: "card_id_here"  // Required
	 * }
	 */
	router.post('/setDefault', function(req, res){
		CardDetails.setDefaultCard(req, res);
	});
	
	/**
	 * Update card details
	 * POST /api/cards/update
	 * 
	 * Body:
	 * {
	 *   cardId: "card_id_here",          // Required
	 *   CardNickname: "My Card",         // Optional
	 *   ExpiryMonth: 12,                 // Optional
	 *   ExpiryYear: 2025,                // Optional
	 *   BillingAddress: {                // Optional
	 *     AddressLine1: "123 Main St",
	 *     AddressLine2: "Apt 4",
	 *     City: "New York",
	 *     State: "NY",
	 *     Country: "US",
	 *     ZipCode: "10001"
	 *   }
	 * }
	 */
	router.post('/update', function(req, res){
		CardDetails.updateCard(req, res);
	});
	
	/**
	 * Delete a card (soft delete)
	 * POST /api/cards/delete
	 * 
	 * Body:
	 * {
	 *   cardId: "card_id_here",  // Required
	 *   reason: "Optional reason for deletion"
	 * }
	 */
	router.post('/delete', function(req, res){
		CardDetails.deleteCard(req, res);
	});
	
	/**
	 * Get a specific card by ID
	 * POST /api/cards/getById
	 * GET /api/cards/getById?cardId=xxx
	 * 
	 * Body/Query:
	 * {
	 *   cardId: "card_id_here"  // Required
	 * }
	 */
	router.post('/getById', function(req, res){
		CardDetails.getCardById(req, res);
	});
	
	router.get('/getById', function(req, res){
		CardDetails.getCardById(req, res);
	});
	
};

