var user = require('./../models/userModel.js');
var Capsule = require('./../models/capsuleModel.js');
var generator = require('generate-password');
var Referral = require('./../models/referralModel.js');
var AppSetting = require('./../models/appSettingModel.js')
var mongoose = require('mongoose');

async function generateUniqueRefcode() {
    console.log("generateUniqueRefcode");
    var referralCode = generator.generate({
        length: 5,
        numbers: true
    });
    const refcodes = await user.find({ referralCode: referralCode });
    if (refcodes.length == 0) {
        return referralCode;
    } else {
        return await generateUniqueRefcode();
    }
}
exports.generateUniqueRefcode = generateUniqueRefcode;


async function getReferralCode(req, res) {
    try {
        // Check if user is logged in
        if (!req.session || !req.session.user || !req.session.user._id) {
            return res.status(401).json({ 
                "code": "401", 
                "message": "User not authenticated. Please login first." 
            });
        }

        // First, check if user already has a referral code in the database
        const currentUser = await user.findOne({ _id: req.session.user._id }, { referralCode: 1, _id: 1 });
        
        var referCode;
        var backendUrl = process.BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3002';
        
        if (currentUser && currentUser.referralCode) {
            // User already has a referral code - return existing one
            referCode = currentUser.referralCode;
            console.log('✅ Using existing referral code from DB:', referCode);
        } else {
            // User doesn't have a referral code - generate new one
            referCode = await generateUniqueRefcode();
            await user.updateOne({ _id: req.session.user._id }, { $set: { referralCode: referCode } });
            
            const updatedUser = await user.findOne({ _id: req.session.user._id });
            req.session.user = updatedUser;
            
            console.log('🆕 Generated NEW referral code:', referCode);
        }
        
        var referralLink = backendUrl + '/referral/' + referCode;
        var referralData = {
            userId: req.session.user._id,
            message: req.body.messageData || '',
            referralCode: referCode,
            referralLink: referralLink
        }
        
        console.log('🔗 Referral link:', referralLink);
        res.json({ "code": "200", "response": referralData })
    } catch (err) {
        console.error("Error in getReferralCode:", err);
        res.status(500).json({ "code": "500", "message": "Internal server error" });
    }
};
exports.getReferralCode = getReferralCode;


async function checkReferralCode(req, res) {
    try {
        console.log("checkReferralCode", req.body);
        
        if (!req.body.referralCode) {
            return res.json({ "code": "400", "message": "Referral code is required" });
        }
        
        var referralData = {};
        var referralCode = req.body.referralCode;
        
        // Find user by referral code
        const userReferData = await user.findOne({ referralCode: referralCode, IsDeleted: false });
        console.log("data==============", userReferData);
        
        if (!userReferData) {
            return res.json({ "code": "404", "message": "Referral code not found" });
        }
        
        // Only query capsule if capsule_id is provided and valid
        var capsuleReferdata = null;
        if (req.body.capsule_id && req.body.capsule_id.trim() !== '') {
            const conditions = {
                _id: req.body.capsule_id,
                IsDeleted: false
            }
            capsuleReferdata = await Capsule.findOne(conditions);
        }
        
        referralData.capsuleReferdata = capsuleReferdata;
        referralData.userReferData = userReferData;
        console.log("referralData-------------", referralData);
        res.json({ "code": "200", "response": referralData });
        
    } catch (err) {
        console.error("Error in checkReferralCode:", err);
        res.status(500).json({ "code": "500", "message": "Internal server error" });
    }
}
exports.checkReferralCode = checkReferralCode;




async function getReferralData(req, res) {
    try {
        var referralUserId = req.body.referralUserId;
        console.log("getReferralData", referralUserId);
        var userId = mongoose.Types.ObjectId(referralUserId);
        const UserReferralInfo = await Referral.findOne({ ReferredToId: userId });
        console.log("data==============", UserReferralInfo);
        res.json({ "code": "200", "response": UserReferralInfo });
    } catch (err) {
        console.error("Error in getReferralData:", err);
        res.status(500).json({ "code": "500", "message": "Internal server error" });
    }
}
exports.getReferralData = getReferralData;

async function getUserDataForCredit(req, res) {
    try {
        // Check if user is logged in
        if (!req.session || !req.session.user || !req.session.user._id) {
            return res.status(401).json({ 
                "code": "401", 
                "message": "User not authenticated. Please login first." 
            });
        }

        console.log("data==============", req.session.user._id);
        var userId = req.session.user._id;
        const UserData = await user.findOne({ _id: userId });
        console.log("---------------", UserData);
        res.json({ "code": "200", "response": UserData });
    } catch (err) {
        console.error("Error in getUserDataForCredit:", err);
        res.status(500).json({ "code": "500", "message": "Internal server error" });
    }
}


exports.getUserDataForCredit = getUserDataForCredit;




var getReferralPoint = async function (req, res) {
	try {
		const AppSettingData = await AppSetting.findOne({ isDeleted: false });
		
		if (!AppSettingData) {
			res.json({
				code: 404,
				data: {},
				message: "No_RECORD_FOUND"
			});
		} else {
			res.json({
				code: 200,
				data: AppSettingData,
				message: "DATA_FOUND_SUCCESSFULLY"
			});
		}
	} catch (err) {
		console.error("Error in getReferralPoint:", err);
		res.json({
			code: 201,
			data: {},
			message: "INTERNAL_ERROR"
		});
	}
}

exports.getReferralPoint = getReferralPoint;