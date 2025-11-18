const fs = require('fs');
const path = require('path');

/**
 * Generate a public URL for an e-book file
 * @param {String} ebookFileName - Name of the e-book file (e.g., "my-book.pdf")
 * @param {String} baseUrl - Base URL of the application (e.g., "https://www.scrpt.com")
 * @returns {String} Public URL to the e-book
 */
function generateEbookUrl(ebookFileName, baseUrl = 'https://www.scrpt.com') {
  // E-books should be stored in: public/assets/ebooks/
  const ebookPath = `/assets/ebooks/${ebookFileName}`;
  return `${baseUrl}${ebookPath}`;
}

/**
 * Validate that an e-book file exists in the public folder
 * @param {String} ebookFileName - Name of the e-book file
 * @returns {Boolean} True if file exists
 */
function validateEbookExists(ebookFileName) {
  const publicEbookPath = path.join(__dirname, '../../public/assets/ebooks', ebookFileName);
  return fs.existsSync(publicEbookPath);
}

/**
 * Get e-book metadata from static data
 * @param {String} ebookId - Unique identifier for the e-book
 * @returns {Object|null} E-book metadata or null if not found
 */
function getEbookMetadata(ebookId) {
  try {
    const ebooksDataPath = path.join(__dirname, '../data/ebooks/ebooks.json');
    if (!fs.existsSync(ebooksDataPath)) {
      return null;
    }
    
    const ebooksData = JSON.parse(fs.readFileSync(ebooksDataPath, 'utf8'));
    return ebooksData.find(ebook => ebook.id === ebookId) || null;
  } catch (error) {
    console.error('Error reading e-book metadata:', error);
    return null;
  }
}

/**
 * Get all available e-books
 * @returns {Array} Array of e-book metadata objects
 */
function getAllEbooks() {
  try {
    const ebooksDataPath = path.join(__dirname, '../data/ebooks/ebooks.json');
    if (!fs.existsSync(ebooksDataPath)) {
      return [];
    }
    
    const ebooksData = JSON.parse(fs.readFileSync(ebooksDataPath, 'utf8'));
    return ebooksData || [];
  } catch (error) {
    console.error('Error reading e-books list:', error);
    return [];
  }
}

/**
 * Create or update e-book metadata in static data
 * @param {Object} ebookData - E-book metadata object
 * @returns {Boolean} True if successful
 */
function saveEbookMetadata(ebookData) {
  try {
    const ebooksDir = path.join(__dirname, '../data/ebooks');
    const ebooksDataPath = path.join(ebooksDir, 'ebooks.json');
    
    // Ensure directory exists
    if (!fs.existsSync(ebooksDir)) {
      fs.mkdirSync(ebooksDir, { recursive: true });
    }
    
    // Read existing data
    let ebooksData = [];
    if (fs.existsSync(ebooksDataPath)) {
      ebooksData = JSON.parse(fs.readFileSync(ebooksDataPath, 'utf8'));
    }
    
    // Check if e-book already exists (update) or add new
    const existingIndex = ebooksData.findIndex(ebook => ebook.id === ebookData.id);
    if (existingIndex >= 0) {
      ebooksData[existingIndex] = { ...ebooksData[existingIndex], ...ebookData };
    } else {
      ebooksData.push(ebookData);
    }
    
    // Write back to file
    fs.writeFileSync(ebooksDataPath, JSON.stringify(ebooksData, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving e-book metadata:', error);
    return false;
  }
}

module.exports = {
  generateEbookUrl,
  validateEbookExists,
  getEbookMetadata,
  getAllEbooks,
  saveEbookMetadata
};

