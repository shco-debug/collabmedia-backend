var user = require('./../models/userModel.js');
var Capsule = require('./../models/capsuleModel.js');
var generator = require('generate-password');
var Referral = require('./../models/referralModel.js');
var AppSetting = require('./../models/appSettingModel.js')
var mongoose = require('mongoose');

function generateUniqueRefcode(callback) {
    console.log("generateUniqueRefcode");
    var referralCode = generator.generate({
        length: 5,
        numbers: true
    });
    user.find({ referralCode: referralCode }, function (err, refcodes) {
        if (refcodes.length == 0) {
            callback(referralCode);
        } else {
            return generateUniqueRefcode();
        }
    })
}
exports.generateUniqueRefcode = generateUniqueRefcode;


function getReferralCode(req, res) {
    if (req.body.referralCode == undefined || req.body.referralCode == null || req.body.referralCode == '') {

        generateUniqueRefcode(function (referCode) {
        var query = { _id: req.session.user._id };
        user.update(query, { $set: { referralCode: referCode } }, function (err, result) {
            if (err) {
                console.log("err");
            } else {
                user.find({ '_id': req.session.user._id }, function (err, result) {
                    req.session.user = result;
                })
            }
        })
        var referralLink = process.HOST_URL + '/referral/' + referCode;
        var referralData = {
            userId: req.body.userId,
            message: req.body.messageData,
            referralCode: req.body.referralCode,
            referralLink: referralLink
        }
        res.json({ "code": "200", "response": referralData })
    })

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
    
};
exports.getReferralCode = getReferralCode;


function checkReferralCode(req, res) {
    console.log("checkReferralCode", req.body);
    var referralData = {};
    var conditions = {
        _id: req.body.capsule_id,
        IsDeleted: false
    }
    if (req.body.referralCode) {
        var referralCode = req.body.referralCode;
        user.findOne({ referralCode: referralCode, IsDeleted: false }).exec(function (err, userReferData) {
            console.log("data==============", err, userReferData);
            if (!err) {
                Capsule.findOne(conditions).exec(function (err, capsuleReferdata) {
                    if (!err) {
                        referralData.capsuleReferdata = capsuleReferdata;
                        referralData.userReferData = userReferData;
                        console.log("referralData-------------", referralData);
                        res.json({ "code": "200", "response": referralData });
                    } else {
                        res.json(err);
                    }
                })
            } else {
                res.json(err);
            }
        });
    } else {
        res.json(err);
    }
}
exports.checkReferralCode = checkReferralCode;




function getReferralData(req, res) {
    var referralUserId = req.body.referralUserId;
    console.log("getReferralData", referralUserId);
    var userId = mongoose.Types.ObjectId(referralUserId);
    Referral.findOne({ ReferredToId: userId }).exec(function (err, UserReferralInfo) {
        console.log("data==============", err, UserReferralInfo);
        if (!err) {
            res.json({ "code": "200", "response": UserReferralInfo });
        } else {
            res.json(err);
        }
    })

}
exports.getReferralData = getReferralData;

function getUserDataForCredit(req, res) {
    console.log("data==============", req.session.user._id);
    var userId = req.session.user._id;
    user.findOne({ _id: userId }).exec(function (err, UserData) {
        console.log("---------------", err, UserData);
        if (!err) {
            res.json({ "code": "200", "response": UserData });
        } else {
            res.json(err);
        }
    })
}


exports.getUserDataForCredit = getUserDataForCredit;




var getReferralPoint = function (req, res) {
	AppSetting.findOne({ isDeleted: false }, function (err, AppSettingData) {
		if (err) {
			res.json({
				code: 201,
				data: {},
				message: "INTERNAL_ERROR"
			});
		} else {
			if(!AppSettingData){
				res.json({
					code: 404,
					data: {},
					message: "No_RECORD_FOUND"
				});
			}else{
				res.json({
					code: 200,
					data: AppSettingData,
					message: "DATA_FOUND_SUCCESSFULLY"
				});
				
			}
			
		}
	});
}

exports.getReferralPoint = getReferralPoint;