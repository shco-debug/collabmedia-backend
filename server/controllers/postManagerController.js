var pages = require('./../models/pageModel.js');
var async = require('async');


function allPost(req, res) {
    var isActiveData = req.body.isActivatePost;
    if (isActiveData == true) {
        var count = req.body.limit;
        var skip = req.body.offset;
        var condition = {
            //"Medias.MediaType": { $in: ["Link"] },
            PageType: { $in: ["gallery", "qaw-gallery"] },
            IsDeleted: false,
            $or: [
                { 'Medias.IsAdminApproved': { $exists: false } },
                { 'Medias.IsAdminApproved': { $exists: true }, 'Medias.IsAdminApproved': true }
            ],
            //'Medias.IsOnlyForOwner': { $ne: true }
			"Medias.PostPrivacySetting" : {$nin : ["OnlyForOwner","InvitedFriends"]},
			IsDasheditpage : false
        };

        var aggregate = [
            {
                $unwind: "$Medias"
            },
            {
                $match: condition
            },
            { '$sort': { 'Medias.PostedOn': -1 } },
        ];
        var project = {
            $project: {
                medias: '$Medias'
            }
        };
        aggregate.push(project);
        var countQuery = [].concat(aggregate);
        aggregate.push({
            $skip: parseInt(skip)
        });
        aggregate.push({
            $limit: parseInt(count)
        });
        pages.aggregate(aggregate).exec(function (err, result) {
            var data = {};
            data.data = result;
            countQuery.push({
                $group: {
                    _id: null,
                    count: {
                        $sum: 1
                    }
                }
            });
            if (err) {
                res.json(err);
            }
            else {
                if (result.length == 0) {
                    res.json({ "code": "404", "msg": "Not Found" })
                }
                else {
                    pages.aggregate(countQuery).exec(function (err, dataCount) {
                        var cnt = (dataCount[0]) ? dataCount[0].count : 0;
                        data.total_count = cnt;
                        if (err) {
                            res.json(err);
                        }
                        else {
                            res.json({ "code": "200", "msg": "Success", "response": result, "responselength": cnt })
                        }
                    })
                }
            }
        })
    } else {
        var count = req.body.limit;
        var skip = req.body.offset;
        var condition = {
            //"Medias.MediaType": { $in: ["Link"] },
            PageType: { $in: ["gallery", "qaw-gallery"] },
            IsDeleted: false,
            $or: [
                { 'Medias.IsAdminApproved': { $exists: true }, 'Medias.IsAdminApproved': false }
            ],
            //'Medias.IsOnlyForOwner': { $ne: true }
			"Medias.PostPrivacySetting" : {$nin : ["OnlyForOwner","InvitedFriends"]},
			IsDasheditpage : false
        };

        var aggregate = [
            {
                $unwind: "$Medias"
            },
            {
                $match: condition
            },
            { '$sort': { 'Medias.PostedOn': -1 } },
        ];
        var project = {
            $project: {
                medias: '$Medias'
            }
        };
        aggregate.push(project);
        var countQuery = [].concat(aggregate);
        aggregate.push({
            $skip: parseInt(skip)
        });
        aggregate.push({
            $limit: parseInt(count)
        });
        pages.aggregate(aggregate).exec(function (err, result) {
            var data = {};
            data.data = result;
            countQuery.push({
                $group: {
                    _id: null,
                    count: {
                        $sum: 1
                    }
                }
            });
            if (err) {
                res.json(err);
            }
            else {
                if (result.length == 0) {
                    res.json({ "code": "404", "msg": "Not Found" })
                }
                else {
                    pages.aggregate(countQuery).exec(function (err, dataCount) {

                        var cnt = (dataCount[0]) ? dataCount[0].count : 0;
                        data.total_count = cnt;
                        if (err) {
                            res.json(err);
                        }
                        else {
                            res.json({ "code": "200", "msg": "Success", "response": result, "responselength": cnt })
                        }
                    })
                }
            }
        })
    }

};
exports.allPost = allPost;


var activateDeactivatePost = function (req, res) {
    var isActiveData = req.body.isActivatePost;
    if (!isActiveData) {
        var mediaArray = req.body.media;
        async.each(mediaArray, function (id, callback) {
            var media_id = id;
            pages.find({ IsDasheditpage : false , 'Medias._id': media_id }).exec(function (err, mediaData) {
                if (err) {
                    callback(err);
                } else {
                    pages.update({ 'Medias._id': media_id },
                        { $set: { 'Medias.$.IsAdminApproved': true } }, { upsert: true }).exec(function (err, updateData) {
                            if (err) {
                                callback(err);
                            } else {
                                callback();
                            }
                        })
                }
            })
        }, function (err) {
            if (err) {                         
                res.json({ "code": "501", "msg": "Something went wrong" });
            } else {
                res.json({ "code": "200", "msg": "Success" });
            }
        });

    } else {
        var mediaArray = req.body.media;
        async.each(mediaArray, function (id, callback) {
            var media_id = id;
            pages.find({ 'Medias._id': media_id }).exec(function (err, mediaData) {
                if (err) {
                    callback(err);
                } else {
                    pages.update({ IsDasheditpage : false , 'Medias._id': media_id },
                    { $set: { 'Medias.$.IsAdminApproved': false } }, { upsert: true }).exec(function (err, updateData) {                           
                         if (err) {
                            callback(err);
                        } else {
                                callback();
                            }
                        })
                }
            })
        }, function (err) {
            if (err) {                         
                res.json({ "code": "501", "msg": "Something went wrong" });
            } else {
                res.json({ "code": "200", "msg": "Success" });
            }
        });

    }
}



// async.each(openFiles, function (file, callback) {

//     // Perform operation on file here.
//     console.log('Processing file ' + file);

//     if (file.length > 32) {
//         console.log('This file name is too long');
//         callback('File name too long');
//     } else {
//         // Do work to process file here
//         console.log('File processed');
//         callback();
//     }
// }, function (err) {
//     // if any of the file processing produced an error, err would equal that error
//     if (err) {
//         // One of the iterations produced an error.
//         // All processing will now stop.
//         console.log('A file failed to process');
//     } else {
//         console.log('All files have been processed successfully');
//     }
// });

exports.activateDeactivatePost = activateDeactivatePost;
