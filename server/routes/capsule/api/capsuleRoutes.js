var capsule = require('../../../controllers/capsules/capsulesController.js');
var chapter = require('../../../controllers/capsules/chaptersController.js');
// var page = require('../../../controllers/capsules/pagesController.js');

module.exports = function (router) {
	console.log("in capsuleRoutes.js", router);

	router.post('/createCapsule', function (req, res) {
		capsule.createCapsule(req, res);
	});

	router.post('/createChapter', function (req, res) {
		chapter.createChapter(req, res);
	});

	router.post('/deleteChapter', function (req, res) {	
		chapter.deleteChapter(req, res);
	});

	

}