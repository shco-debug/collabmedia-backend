var contribution = require('./../models/contributionModel.js');

// To fetch all sources
var findAll = function(req, res){    
    
    contribution.find({},function(err,result){
	if(err){ 		
	    res.json(err);
	}
	else{
	    if(result.length==0){
		res.json({"code":"404","msg":"Not Found"})
	    }
	    else{				
		res.json({"code":"200","msg":"Success","response":result})
	    }
	}
    })
};
exports.findAll = findAll;


// Add a new domain
var add = function(req,res){
    
    fields={
	contributionType:req.body.type,
	contributionTitle:req.body.title,
	contributionValue:parseInt(req.body.value)
    };
    
    contribution(fields).save(function(err){
	if(err){
	    res.json(err);
	}
	else{
	    findAll(req,res)
	}
    });
    
};

exports.add = add;



var edit = function(req,res){
var dt=Date.now();

    var fields={
	LastModified:dt,
	contributionValue:parseInt(req.body.value)
    };
    
    var query={_id:req.body.id};
    var options = { multi: true };
    
    contribution.update(query, { $set : fields }, options, callback)
    
    function callback (err, numAffected){
	if(err){
	    res.json(err)
	}
	else{
	    findAll(req,res)
	}
    }
    
};

exports.edit = edit;
