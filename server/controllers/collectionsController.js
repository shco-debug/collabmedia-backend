var collection = require('./../models/collectionModel.js');

// To fetch all domains
var findAll = function (req, res) {
	collection.find({ status: 1, isDeleted: { $ne: 1 } }, function (err, result) {
		if (err) {
			res.json(err);
		}
		else {
			if (result.length == 0) {
				res.json({ "code": "404", "msg": "Not Found" })
			}
			else {
				res.json({ "code": "200", "msg": "Success", "response": result })
			}
		}
	})
};

exports.findAll = findAll;

// Add a new domain
var add = function (req, res) {

	fields = {
		collectionTitle: req.body.name,
		notes: req.body.notes,
		status: 1
	};

	collection(fields).save(function (err) {
		if (err) {
			res.json(err);
		}
		else {
			findAll(req, res)
		}
	});

};

exports.add = add;



var edit = function (req, res) {
	var dt = Date.now();
	var fields = {
		collectionTitle: req.body.name,
		notes: req.body.notes,
		LastModified: dt,
		status: 1
	};
	var query = { _id: req.body.id };
	var options = { multi: true };
	collection.update(query, { $set: fields }, options, callback)
	function callback(err, numAffected) {
		if (err) {
			res.json(err)
		}
		else {
			findAll(req, res)
		}
	}
};

exports.edit = edit;

var deleteOne = function (req, res) {
	console.log("request params : " + JSON.stringify(req.body));
	var fields = {
		isDeleted: 1
	};
	var query = { _id: req.body.id };
	console.log("id to delete : " + req.body.id);
	var options = { multi: false };
	collection.update(query, { $set: fields }, options, callback)
	function callback(err, numAffected) {
		if (err) {
			res.json(err)
		}
		else {
			findAll(req, res)
		}
	}
}

exports.deleteOne = deleteOne;
