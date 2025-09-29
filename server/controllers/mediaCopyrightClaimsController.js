var mediaCopyrightClaims = require('./../models/mediaCopyrightClaimsModel.js');

// To Save DMCA Copyright Details
var saveCopyrightDetails = function (req, res) {
    var data = req.body;
    console.log("***********************",data)
    mediaCopyrightClaims(data).save(function (err, result) {
        if (err) {
            res.json(err)
        } else {
            res.json({"code": "200", "msg": "Success", "response": result})
        }
    });
};
exports.saveCopyrightDetails = saveCopyrightDetails;


//To Get Data Per Page
var findPerPage = function (req, res) {
    var searchparam = req.body.searchText ? req.body.searchText : "";
    console.log("*******findPerPage Fucntion*****", req.body);
    var conditions = {};
    if(searchparam != ""){
       // conditions = {"MediaDetails.AutoId": parseInt(searchparam)};
        conditions = {
                        $or: [
                                {"MediaDetails.AutoId": parseInt(searchparam)},
                                {"MediaDetails.Title": {$regex: new RegExp(searchparam, "i")}}
                             ]
                    }
    }
    var fields = {  _id: "$MediaId",
                    FirstName : { $first: '$FirstName' }, LastName : { $first: '$LastName' },
                    ClaimedBy : { $first: '$ClaimedBy' },Description : { $first: '$Description' },
                    Address : { $first: '$Address' },City : { $first: '$City' },
                    State : { $first: '$State' },PostalCode : { $first: '$PostalCode' },
                    Country : { $first: '$Country' },PhoneNumber : { $first: '$PhoneNumber' },
                    Email : { $first: '$Email' },FullName : { $first: '$FullName' },
                    Company : { $first: '$Company' },UrlArr : { $first: '$UrlArr' }
                };
    var sortObj = {};
    var offset = req.body.offset ? req.body.offset : 0;
    var limit = req.body.limit ? req.body.limit : 100;

    mediaCopyrightClaims.aggregate([
        {"$group":fields },
        {"$skip": offset},
        {"$limit": limit},
        {"$lookup": {from: "media", localField: "_id", foreignField: "_id", as: "MediaDetails"}},
        {"$match":conditions},
        ],
        function (err, result) {
            mediaCopyrightClaims.aggregate([
                {"$group":{"_id":"$MediaId"}},
                {"$lookup":{"from": "media","localField":"_id","foreignField":"_id","as":"MediaDetails"}},
                {"$match":conditions},
                {"$group":{"_id":null,"count":{"$sum":1}}}
            ],
            function (err, resultCount) {
                var tempCount = resultCount.length > 0 ? resultCount[0].count : 0;
                res.json({"code": "200", "msg": "Success", "response": result, "count": tempCount})
            })
        }
    );
}
exports.findPerPage = findPerPage;


//To Search Specific Users
var searchQuery = function (req, res) {
    var searchparam = req.body.searchText ? req.body.searchText : "";
    var conditions = {
        $or: [
            {FirstName: {$regex: new RegExp(searchparam, "i")}},
            {LastName: {$regex: new RegExp(searchparam, "i")}},
            {Address: {$regex: new RegExp(searchparam, "i")}},
            {Email: {$regex: new RegExp(searchparam, "i")}},
            {FullName: {$regex: new RegExp(searchparam, "i")}}
        ]
    };
    var fields = {
        MediaId:true,
        UrlArr : true,
        FirstName: true,
        LastName: true,
        Address: true,
        Email: true,
        FullName: true,
        Company: true,
        Description: true,
        City : true,
        State: true,
        PostalCode: true,
        Country: true,
        PhoneNumber: true
        
    };

    var sortObj = {};

    var offset = req.body.offset ? req.body.offset : 0;
    var limit = req.body.limit ? req.body.limit : 100;

    mediaCopyrightClaims.find(conditions, fields).sort(sortObj).skip(offset).limit(limit).exec(function (err, result) {
        if (err) {
            res.json(err);
        } else {
            mediaCopyrightClaims.find(conditions, fields).count().exec(function (err, copyrightCount) {
				if (!err) {
					res.json({"code": "200", "msg": "Success", "response": result, "count": copyrightCount})
				} else {
					res.json({"code": "200", "msg": "Success", "response": result, "count": 0})
				}
			});
        }
    });
};
exports.searchQuery = searchQuery;

var get_usersByMediaID = function (req, res) {
	var searchparam = req.body.searchUser ? req.body.searchText : "";
    var conditions = {
        MediaId: req.body.MediaID,
        $or: [
            {FirstName: {$regex: new RegExp(searchparam, "i")}},
            {LastName: {$regex: new RegExp(searchparam, "i")}},
            {Address: {$regex: new RegExp(searchparam, "i")}},
            {Email: {$regex: new RegExp(searchparam, "i")}},
            {FullName: {$regex: new RegExp(searchparam, "i")}}
        ]
    };
    var fields = {
        MediaId: true,
        UrlArr: true,
        FirstName: true,
        LastName: true,
        Address: true,
        Email: true,
        FullName: true,
        Company: true,
        Description: true,
        City: true,
        State: true,
        PostalCode: true,
        Country: true,
        PhoneNumber: true

    };
    var sortObj = {};
    var offset = req.body.offset ? req.body.offset : 0;
    var limit = req.body.limit ? req.body.limit : 50;
    mediaCopyrightClaims.find(conditions, fields).sort(sortObj).skip(offset).limit(limit).exec(function (err, result) {
        if (err) {
            res.json(err);
        } else {
            mediaCopyrightClaims.find(conditions, fields).count().exec(function (err, copyrightCount) {
				if (!err) {
					res.json({"code": "200", "msg": "Success", "response": result, "count": copyrightCount})
				} else {
					console.log("Reuslt inside findPerPage function - - >", result)
					res.json({"code": "200", "msg": "Success", "response": result, "count": 0})
				}
			});
        }
    });
};
exports.get_usersByMediaID = get_usersByMediaID;