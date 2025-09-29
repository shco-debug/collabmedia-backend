var flagAsInAppropriate = require('./../models/flagAsInAppropriateModel.js');
var media = require('./../models/mediaModel.js');

// To Get Flag As Inappropriate Details
var getMediaInappropriateFlag = function (req, res) {
    
    var conditions = {
        UserId:req.session.user._id, 
        MediaId:req.body.MediaId ? req.body.MediaId : undefined
    };
    var fields = {
            UserId : true,
            MediaId : true,
            FlagAs : true
    };
        
    flagAsInAppropriate.find(conditions , fields , function (err, result) {
        if (err) {
            res.json(err);
        } else {
            var returnObj = {};
            if (result.length == 0) {
                returnObj = {
                    FlagAs:true
                };
                
                res.json({code: "200", msg: "Not Found Data",response: returnObj});
            } else {
                returnObj = {
                    FlagAs:false
                };
                res.json({code: "200", msg: "Success", response: returnObj});
            }
        }
    })
};
exports.getMediaInappropriateFlag = getMediaInappropriateFlag;


// To Mark Flag As Inappropriate Details
var markFlagAsInappropriate = function (req, res) {
    var data = {
                UserId: req.session.user._id,
                MediaId: req.body.MediaId ? req.body.MediaId : undefined,
                FlagAs: req.body.FlagAs
               };
    flagAsInAppropriate(data).save(function (err, result) {
        if (err) {
            res.json(err)
        } else {

            var conditions = {
                _id: req.body.MediaId ? req.body.MediaId : undefined
            };

            var setObj = {$inc: {InAppropFlagCount: 1}};

            media.update(conditions, setObj, function (err, numAffected) {
                if (!err) {
                    console.log("InAppropFlagCount is updated in media table ", numAffected);
                } else {
                    console.log("Capsule : ----09998887----ERROR : ", err);
                }
            });

            res.json({"code": "200", "msg": "Success", "response": result})
        }
    });
};
exports.markFlagAsInappropriate = markFlagAsInappropriate;

// To Unmark Flag As Inappropriate Details
var unmarkFlagAsInappropriate = function (req, res) {
    var conditions = {
        UserId: req.session.user._id,
        MediaId: req.body.MediaId ? req.body.MediaId : undefined
    };

    flagAsInAppropriate.remove(conditions, function (err, result) {
        if (err) {
            console.log("ERORORORORORR =- = =  = = >", err)
            res.json(err)
        } else {
            
            var conditions = {
                _id: req.body.MediaId ? req.body.MediaId : undefined
            };

            var setObj = {$inc: {InAppropFlagCount: -1}};

            media.update(conditions, setObj, function (err, numAffected) {
                if (!err) {
                    console.log("InAppropFlagCount is updated in media table ", numAffected);
                } else {
                    console.log("Capsule : ----09998887----ERROR : ", err);
                }
            });
            
            console.log("**** Succesfully Deleted *****", result)
            res.json({"code": "200", "msg": "Success", "response": result})
        }
    });
};
exports.unmarkFlagAsInappropriate = unmarkFlagAsInappropriate;