var userManagement = require('../../../controllers/userManagementController.js');
var Report = require('../../../controllers/reportsController.js');
module.exports = function(router){
	
	router.get('/view', function(req,res){
		userManagement.findAll(req,res);
	})
	router.post('/add', function(req,res){
		userManagement.add(req,res);
	})
	router.post('/edit', function(req,res){
		userManagement.edit(req,res);
	})
	router.post('/delete', function(req,res){
		userManagement.deleteUser(req,res);
	})
	router.post('/activateUser', function(req,res){
		console.log(" - - - Inside Activate User Route - - -")
		userManagement.activateUser(req,res);
	})
	router.post('/deactivateUser', function(req,res){
		userManagement.deactivateUser(req,res);
	})  
	
	// To Get Searched Users
    router.post('/search', function (req, res) {
        userManagement.searchQuery(req, res);
    });
	router.post('/view', function (req, res) {
        userManagement.findPerPage(req, res);
    })
	
	// To Get Request Invitation Users
    router.post('/searchRequestInvitation', function (req, res) {
        userManagement.searchRequestInvitation(req, res);
    });
	router.post('/viewRequestInvitation', function (req, res) {
        userManagement.viewRequestInvitation(req, res);
    })
	// To Get Request Invitation Users
	
	// To Upload User Avatar
    router.post('/uploadAvatar', function (req, res) {
        userManagement.uploadAvatar(req, res);
    });

	//To Get All Reports in Dashboard
    router.get('/getAllReports', function (req, res) {
        Report.getAllReports(req, res);
    });
	
	router.post('/setUnsetCreate', function (req, res) {
        userManagement.setUnsetCreate(req, res);
    });
	
	router.post('/getMySales',function(req,res){ 
		userManagement.getMySales(req,res);
    });
}