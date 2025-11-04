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

        if (req.body.referralCode == undefined || req.body.referralCode == null || req.body.referralCode == '') {
            const referCode = await generateUniqueRefcode();
            var query = { _id: req.session.user._id };
            await user.updateOne(query, { $set: { referralCode: referCode } });
            
            const updatedUser = await user.findOne({ '_id': req.session.user._id });
            req.session.user = updatedUser;
            
            var referralLink = process.HOST_URL + '/referral/' + referCode;
            var referralData = {
                userId: req.body.userId,
                message: req.body.messageData,
                referralCode: referCode,
                referralLink: referralLink
            }
            res.json({ "code": "200", "response": referralData })
        } else {
            var referralLink = process.HOST_URL + '/referral/' + req.body.referralCode;
            var referralData = {
                userId: req.body.userId,
                message: req.body.messageData,
                referralCode: req.body.referralCode,
                referralLink: referralLink
            }
            res.json({ "code": "200", "response": referralData })
        }
    } catch (err) {
        console.error("Error in getReferralCode:", err);
        res.status(500).json({ "code": "500", "message": "Internal server error" });
    }
};
exports.getReferralCode = getReferralCode;


async function checkReferralCode(req, res) {
    try {
        console.log("checkReferralCode", req.body);
        var referralData = {};
        var conditions = {
            _id: req.body.capsule_id,
            IsDeleted: false
        }
        if (req.body.referralCode) {
            var referralCode = req.body.referralCode;
            const userReferData = await user.findOne({ referralCode: referralCode, IsDeleted: false });
            console.log("data==============", userReferData);
            
            if (userReferData) {
                const capsuleReferdata = await Capsule.findOne(conditions);
                referralData.capsuleReferdata = capsuleReferdata;
                referralData.userReferData = userReferData;
                console.log("referralData-------------", referralData);
                res.json({ "code": "200", "response": referralData });
            } else {
                res.json({ "code": "404", "message": "Referral code not found" });
            }
        } else {
            res.json({ "code": "400", "message": "Referral code is required" });
        }
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