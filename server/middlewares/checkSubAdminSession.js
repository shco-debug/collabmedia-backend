/*
Comments - Defines a custom middle-ware to check for session for every route, with exceptions routes listed in unprotectedRoutes[]
*/

//var mongoose = require('mongoose');
//var tokenModel = mongoose.model('Token');

module.exports = function(req, res, next){
	//define api prefix
	//var frontendApiPrefix = '/api';
	console.log('Something is happening.----admin panel...');
	reqUrl = req.baseUrl + req.path;
	console.log("request url : ",reqUrl);
	
	if(reqUrl.substring(0,6) == '/subadmin'){
		var frontendApiPrefix = '/subadmin';
		var unprotectedRoutes = [
				'/',
				'/login'				
		];
		
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,16) == '/massmediaupload'){
		
		var frontendApiPrefix = '/massmediaupload';
		var unprotectedRoutes = [
			
		];
		
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else{
		console.log("in else..");
		next();
	}
	
};

function checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl){
	console.log("check : ",unprotectedRoutes.indexOf(reqUrl.replace(frontendApiPrefix, '').trim('/')));
	if(unprotectedRoutes.indexOf(reqUrl.replace(frontendApiPrefix, '').trim('/')) > -1){
		console.log("api status-----","public");
		next();
	}
	else{
		console.log("api status-----","protected");
		checkSession(req , res , next);
	}
}


function checkSession(req , res , next){
	console.log("==========req.session.subadmin = ",req.session.subadmin);
	if (req.session.subAdmin) {
		next();
	}else{
		//console.log("session has expired...");
		//res.render('admin/login.html');
		//return;
		res.send(401, 'Your session has expired');
	} 
}