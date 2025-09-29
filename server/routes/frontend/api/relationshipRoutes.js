var relationship = require('../../../controllers/relationshipController.js');

module.exports = function(router) {
    // Get all active relationships
    router.get('/', function(req, res) {
        relationship.getAllRelationships(req, res);
    });

    // Get default relationship
    router.get('/default', function(req, res) {
        relationship.getDefaultRelationship(req, res);
    });

    // Add new relationship
    router.post('/add', function(req, res) {
        relationship.addRelationship(req, res);
    });

    // Update relationship
    router.post('/update', function(req, res) {
        relationship.updateRelationship(req, res);
    });

    // Delete relationship
    router.post('/delete', function(req, res) {
        relationship.deleteRelationship(req, res);
    });
};
