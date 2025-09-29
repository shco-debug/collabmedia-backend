var referral = require('../../../controllers/referralController.js');
module.exports = function (router) {

	router.post('/getReferralCode', function (req, res) {
		referral.getReferralCode(req, res);
	})
	router.post('/checkReferralCode', function (req, res) {
		referral.checkReferralCode(req, res);
	});
	router.post('/getReferralData', function (req, res) {
		referral.getReferralData(req, res);
	})
	router.post('/getUserDataForCredit', function (req, res) {
		referral.getUserDataForCredit(req, res);
	})
	router.get('/getReferralPoint', function (req, res) {
		referral.getReferralPoint(req, res);
	})
}   