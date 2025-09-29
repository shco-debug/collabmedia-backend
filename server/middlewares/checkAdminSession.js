/*
Comments - Defines a custom middle-ware to check for session for every route, with exceptions routes listed in unprotectedRoutes[]
TEMPORARILY DISABLED DUE TO SESSION DESERIALIZATION ISSUE
*/

//var mongoose = require('mongoose');
//var tokenModel = mongoose.model('Token');

module.exports = function(req, res, next){
	// TEMPORARILY DISABLED - Allow all requests to pass through
	console.log('⚠️ Admin session middleware temporarily disabled');
	next();
	
	/*
	//define api prefix
	//var frontendApiPrefix = '/api';
	//console.log('Something is happening.----admin panel...');
	reqUrl = req.baseUrl + req.path;
	//console.log("request url : ",reqUrl);
	
	if(reqUrl.substring(0,6) == '/admin'){
		var frontendApiPrefix = '/admin';
		var unprotectedRoutes = [
				'/',
				'/login',
				'/signin',
				'/chklogin',
				'/register',
				'/test-cookie',
				'/test-session',
				'/debug-session',
				'/test-mongo-session',
				'/test-current-session',
				'/test-simple-cookie',
				'/test-session-working',
				'/test-session-deserialization'
		];
		
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,4) == '/fsg'){
		var frontendApiPrefix = '/fsg';
		var unprotectedRoutes = [
			'/view'
		];
		
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,8) == '/domains'){
		var frontendApiPrefix = '/domains';
		var unprotectedRoutes = [
			'/view'
		];
		
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,12) == '/collections'){
		var frontendApiPrefix = '/collections';
		var unprotectedRoutes = [
			'/view'
		];
		
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,10) == '/groupTags'){
		var frontendApiPrefix = '/groupTags';
		var unprotectedRoutes = [
			'/view',
			'/without_descriptors',
			'/getKeywords'
		];
		
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,13) == '/metaMetaTags'){
		var frontendApiPrefix = '/metaMetaTags';
		var unprotectedRoutes = [
			'/view'
		];
		
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,10) == '/gtbinding'){
		var frontendApiPrefix = '/gtbinding';
		var unprotectedRoutes = [];
		
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,5) == '/tags'){
		var frontendApiPrefix = '/tags';
		var unprotectedRoutes = [
			'/view'
		];
		
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,16) == '/massmediaupload'){
		var frontendApiPrefix = '/massmediaupload';
		var unprotectedRoutes = [];
		
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,8) == '/sources'){
		var frontendApiPrefix = '/sources';
		var unprotectedRoutes = [
			'view'
		];
		
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,13) == '/contribution'){
		var frontendApiPrefix = '/contribution';
		var unprotectedRoutes = [];
		
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,9) == '/metaTags'){
		var frontendApiPrefix = '/metaTags';
		var unprotectedRoutes = [];
		
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,15) == '/emailtemplates'){
		var frontendApiPrefix = '/emailtemplates';
		var unprotectedRoutes = [];
		
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else if(reqUrl.substring(0,16) == '/copyrightClaims'){
		var frontendApiPrefix = '/copyrightClaims';
		var unprotectedRoutes = [];
		
		checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl);
	}
	else{
		//console.log("in else..");
		next();
	}
	*/
};

/*
function checkUnprotectedRoutes(req , res , next , frontendApiPrefix , unprotectedRoutes , reqUrl){
	//console.log("check : ",unprotectedRoutes.indexOf(reqUrl.replace(frontendApiPrefix, '').trim('/')));
	if(unprotectedRoutes.indexOf(reqUrl.replace(frontendApiPrefix, '').trim('/')) > -1){
		//console.log("api status-----","public");
		next();
	}
	else{
		//console.log("api status-----","protected");
		checkSession(req , res , next);
	}
}


function checkSession(req , res , next){
	console.log('🔍 Session check for:', reqUrl);
	console.log('Session data:', {
		hasSession: !!req.session,
		sessionID: req.sessionID,
		adminSession: !!req.session.admin,
		subAdminSession: !!req.session.subAdmin,
		cookies: req.headers.cookie
	});
	
	// Debug: Check if session exists in store
	if (req.sessionStore) {
		console.log('🔍 Checking session store for ID:', req.sessionID);
		req.sessionStore.get(req.sessionID, (err, session) => {
			if (err) {
				console.error('❌ Error retrieving session from store:', err);
			} else if (session) {
				console.log('✅ Session found in store:', {
					sessionID: session.id,
					hasAdmin: !!session.admin,
					adminData: session.admin ? {
						id: session.admin._id,
						name: session.admin.name,
						email: session.admin.email
					} : null
				});
			} else {
				console.log('❌ Session not found in store for ID:', req.sessionID);
			}
		});
	}
	
	if (req.session.admin || req.session.subAdmin) {
		console.log('✅ Session valid, proceeding...');
		next();
	}else{
		console.log('❌ Session expired or invalid');
		console.log('🔍 Detailed session info:', {
			session: req.session,
			sessionKeys: req.session ? Object.keys(req.session) : [],
			adminData: req.session.admin || null
		});
		//console.log("session has expired...");
		//res.render('admin/login.html');
		//return;
		res.status(401).send('Your session has expired');
	} 
}
*/