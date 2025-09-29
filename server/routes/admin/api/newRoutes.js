var newUser = require('../../../controllers/newUserController.js');

module.exports = function(router){
	console.log("in routes.js",router);
	
	// User routes only
	router.post('/login',function(req,res){
		newUser.login(req,res);
	});
	
	router.get('/chklogin', function(req, res){
		console.log("m in chklogin...");
		newUser.chklogin(req,res);
	});
	
	router.get('/view', function(req, res){
		newUser.view(req,res);
	});
	
	router.post('/register', function(req, res){
		newUser.registerUser(req,res);
	});
	
	router.post('/addFsg', function(req, res){
		newUser.addFsg(req,res);
	});
	
	router.get('/logout', function(req, res){
		if (req.session.user) {
			req.session.user = null; // Deletes the cookie.
			res.json({"logout":"200","msg":"Success"});
		}        
	});
	
}
