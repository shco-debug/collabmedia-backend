var media = require('./../models/mediaModel.js');
var mongoose = require('mongoose');

var async = require('async');

var uploader = function (req, res) {
	req.body = req.body ? req.body : {};
	console.log("uploader API --------- request body : ",req.body);
	res.json({code : 200, requestObject : req.body });
};

exports.uploader = uploader;
