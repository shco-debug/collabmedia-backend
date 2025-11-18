const ebookController = require('../../../controllers/ebookController');
const ebookUtils = require('../../../utilities/ebookUtils');

/**
 * E-book Routes
 * Module exports a function that takes a router
 */
module.exports = function(router) {
  /**
   * Get all available e-books
   * GET /ebooks
   */
  router.get('/', function(req, res) {
    try {
      const ebooks = ebookUtils.getAllEbooks();
      res.json({
        code: 200,
        message: "E-books retrieved successfully",
        results: ebooks
      });
    } catch (error) {
      res.json({
        code: 500,
        message: "Error retrieving e-books",
        error: error.message
      });
    }
  });

  /**
   * Get specific e-book metadata
   * GET /ebooks/:ebookId
   */
  router.get('/:ebookId', function(req, res) {
    try {
      const ebookId = req.params.ebookId;
      const ebook = ebookUtils.getEbookMetadata(ebookId);
      
      if (!ebook) {
        return res.json({
          code: 404,
          message: "E-book not found"
        });
      }
      
      res.json({
        code: 200,
        message: "E-book retrieved successfully",
        result: ebook
      });
    } catch (error) {
      res.json({
        code: 500,
        message: "Error retrieving e-book",
        error: error.message
      });
    }
  });

  /**
   * Create e-book post for a stream
   * POST /ebooks/createPost
   */
  router.post('/createPost', function(req, res) {
    ebookController.createEbookPost(req, res);
  });

  /**
   * Admin: Add/Update e-book metadata
   * POST /ebooks/metadata
   */
  router.post('/metadata', function(req, res) {
    // Add admin authentication check here if needed
    try {
      const ebookData = req.body;
      
      if (!ebookData.id || !ebookData.fileName) {
        return res.json({
          code: 400,
          message: "E-book id and fileName are required"
        });
      }
      
      const success = ebookUtils.saveEbookMetadata(ebookData);
      
      if (success) {
        res.json({
          code: 200,
          message: "E-book metadata saved successfully"
        });
      } else {
        res.json({
          code: 500,
          message: "Error saving e-book metadata"
        });
      }
    } catch (error) {
      res.json({
        code: 500,
        message: "Error saving e-book metadata",
        error: error.message
      });
    }
  });
};

