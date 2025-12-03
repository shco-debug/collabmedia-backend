/**
 * Static GroupTags Loader
 * 
 * Loads the groupTags-index.json file once at server startup
 * and provides fast O(1) lookup functions for:
 *   - Cron Job: Match media metadata → Get GroupTag/Tag IDs
 *   - Parse API: Lookup keywords → Get IDs to find matching images
 * 
 * Usage:
 *   const { loadTagIndex, lookupTag, lookupTags, isLoaded } = require('./utilities/staticGroupTagsLoader');
 *   
 *   // Load once at startup
 *   await loadTagIndex();
 *   
 *   // Lookup a single tag
 *   const matches = lookupTag('happiness');
 *   // Returns: [{ groupTagId, groupTagTitle, tagId, tagTitle, tagType }, ...]
 *   
 *   // Lookup multiple tags
 *   const allMatches = lookupTags(['joy', 'happiness', 'love']);
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// The loaded index (tag title → array of GroupTag mappings)
let tagIndex = null;
// Reverse index (GroupTagID → GroupTagTitle) for quick title lookups
let groupTagIdToTitleMap = null;
// Reverse index (GroupTagID → array of tags) for quick tag lookups
let groupTagIdToTagsMap = null;
let isIndexLoaded = false;
let loadPromise = null;

// File path
const INDEX_FILE = path.join(__dirname, '../data/groupTags-index.json');

/**
 * Load the tag index from file
 * Uses streaming to handle large file efficiently
 * Can be called multiple times safely (will only load once)
 */
async function loadTagIndex() {
  // If already loaded, return immediately
  if (isIndexLoaded && tagIndex) {
    console.log('✅ Tag index already loaded');
    return true;
  }

  // If currently loading, wait for existing load to complete
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = _doLoadIndex();
  return loadPromise;
}

async function _doLoadIndex() {
  const startTime = Date.now();
  console.log('📂 Loading static GroupTags index...');
  console.log(`   File: ${INDEX_FILE}`);

  if (!fs.existsSync(INDEX_FILE)) {
    console.error('❌ Tag index file not found:', INDEX_FILE);
    throw new Error('Tag index file not found');
  }

  const fileStats = fs.statSync(INDEX_FILE);
  console.log(`   Size: ${(fileStats.size / (1024 * 1024)).toFixed(2)} MB`);

  try {
    // For files under 500MB, we can read directly with streaming JSON parse
    tagIndex = {};
    
    const readStream = fs.createReadStream(INDEX_FILE, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: readStream,
      crlfDelay: Infinity
    });

    let currentKey = null;
    let currentValue = '';
    let lineCount = 0;

    for await (const line of rl) {
      lineCount++;
      const trimmedLine = line.trim();
      
      // Skip opening/closing braces
      if (trimmedLine === '{' || trimmedLine === '}') continue;

      // Match key-value pattern: "tagTitle": [...]
      const keyMatch = trimmedLine.match(/^"([^"]+)":\s*(\[.*)$/);
      
      if (keyMatch) {
        // Save previous entry if exists
        if (currentKey && currentValue) {
          try {
            // Remove trailing comma if present
            let cleanValue = currentValue.trim();
            if (cleanValue.endsWith(',')) {
              cleanValue = cleanValue.slice(0, -1);
            }
            tagIndex[currentKey] = JSON.parse(cleanValue);
          } catch (e) {
            // Skip malformed entries
          }
        }
        
        currentKey = keyMatch[1].toLowerCase();
        currentValue = keyMatch[2];
      } else if (currentKey) {
        // Continuation of previous value
        currentValue += line;
      }

      // Progress logging
      if (lineCount % 50000 === 0) {
        console.log(`   📝 Loaded ${lineCount.toLocaleString()} lines, ${Object.keys(tagIndex).length.toLocaleString()} tags...`);
      }
    }

    // Don't forget the last entry
    if (currentKey && currentValue) {
      try {
        let cleanValue = currentValue.trim();
        if (cleanValue.endsWith(',')) {
          cleanValue = cleanValue.slice(0, -1);
        }
        tagIndex[currentKey] = JSON.parse(cleanValue);
      } catch (e) {
        // Skip malformed entries
      }
    }

    // Build reverse indices
    groupTagIdToTitleMap = {};
    groupTagIdToTagsMap = {};
    
    console.log('   📝 Building reverse indices...');
    
    for (const key in tagIndex) {
      const entries = tagIndex[key];
      for (const entry of entries) {
        if (entry.groupTagId) {
          // Build GroupTagID → GroupTagTitle map
          if (entry.groupTagTitle && !groupTagIdToTitleMap[entry.groupTagId]) {
            groupTagIdToTitleMap[entry.groupTagId] = entry.groupTagTitle;
          }
          
          // Build GroupTagID → Tags map (only for non-GT entries)
          if (entry.tagType !== 'gt' && entry.tagId) {
            if (!groupTagIdToTagsMap[entry.groupTagId]) {
              groupTagIdToTagsMap[entry.groupTagId] = [];
            }
            // Check if tag already exists (by tagId)
            const existingTag = groupTagIdToTagsMap[entry.groupTagId].find(t => t.tagId === entry.tagId);
            if (!existingTag) {
              groupTagIdToTagsMap[entry.groupTagId].push({
                tagId: entry.tagId,
                tagTitle: entry.tagTitle,
                tagType: entry.tagType
              });
            }
          }
        }
      }
    }

    isIndexLoaded = true;
    const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Tag index loaded in ${loadTime}s`);
    console.log(`   📊 Total unique tags: ${Object.keys(tagIndex).length.toLocaleString()}`);
    console.log(`   📊 Total GroupTagID → Title mappings: ${Object.keys(groupTagIdToTitleMap).length.toLocaleString()}`);
    console.log(`   📊 Total GroupTagID → Tags mappings: ${Object.keys(groupTagIdToTagsMap).length.toLocaleString()}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error loading tag index:', error.message);
    throw error;
  }
}

/**
 * Check if the index is loaded
 */
function isLoaded() {
  return isIndexLoaded && tagIndex !== null;
}

/**
 * Lookup a single tag title
 * @param {string} tagTitle - The tag to lookup (case-insensitive)
 * @returns {Array} Array of matching GroupTag entries, or empty array if not found
 * 
 * Each entry contains:
 *   - groupTagId: Parent GroupTag's ObjectId
 *   - groupTagTitle: Parent GroupTag's title
 *   - tagId: This tag's ObjectId
 *   - tagTitle: This tag's title (original case)
 *   - tagType: Type (gt, synonym, metaphor, feeling, etc.)
 */
function lookupTag(tagTitle) {
  if (!isIndexLoaded || !tagIndex) {
    console.warn('⚠️ Tag index not loaded. Call loadTagIndex() first.');
    return [];
  }

  if (!tagTitle || typeof tagTitle !== 'string') {
    return [];
  }

  const key = tagTitle.toLowerCase().trim();
  return tagIndex[key] || [];
}

/**
 * Lookup multiple tag titles at once
 * @param {string[]} tagTitles - Array of tags to lookup
 * @returns {Object} Object with results:
 *   - matches: Array of all unique GroupTag entries found
 *   - byTag: Object mapping each input tag to its matches
 *   - groupTagIds: Array of unique GroupTagIds (for querying Media)
 */
function lookupTags(tagTitles) {
  if (!isIndexLoaded || !tagIndex) {
    console.warn('⚠️ Tag index not loaded. Call loadTagIndex() first.');
    return { matches: [], byTag: {}, groupTagIds: [] };
  }

  if (!Array.isArray(tagTitles)) {
    return { matches: [], byTag: {}, groupTagIds: [] };
  }

  const allMatches = [];
  const byTag = {};
  const seenGroupTagIds = new Set();
  const groupTagIds = [];

  for (const tagTitle of tagTitles) {
    if (!tagTitle || typeof tagTitle !== 'string') continue;

    const key = tagTitle.toLowerCase().trim();
    const matches = tagIndex[key] || [];
    
    byTag[tagTitle] = matches;

    for (const match of matches) {
      allMatches.push(match);
      
      // Collect unique GroupTagIds
      if (match.groupTagId && !seenGroupTagIds.has(match.groupTagId)) {
        seenGroupTagIds.add(match.groupTagId);
        groupTagIds.push(match.groupTagId);
      }
    }
  }

  return {
    matches: allMatches,
    byTag,
    groupTagIds
  };
}

/**
 * Get all unique GroupTagIds for a tag (for Media query)
 * @param {string} tagTitle - The tag to lookup
 * @returns {string[]} Array of unique GroupTagIds
 */
function getGroupTagIdsForTag(tagTitle) {
  const matches = lookupTag(tagTitle);
  const ids = new Set();
  
  for (const match of matches) {
    if (match.groupTagId) {
      ids.add(match.groupTagId);
    }
  }
  
  return Array.from(ids);
}

/**
 * Get all unique GroupTagIds for multiple tags (for Media query)
 * @param {string[]} tagTitles - Array of tags
 * @returns {string[]} Array of unique GroupTagIds
 */
function getGroupTagIdsForTags(tagTitles) {
  const result = lookupTags(tagTitles);
  return result.groupTagIds;
}

/**
 * Build GroupTags array entry for Media document
 * Used by cron job when assigning tags to media
 * @param {string} tagTitle - The matched tag title
 * @param {string} matchedFrom - Which metadata field matched (e.g., "MetaData.Subjects")
 * @returns {Array} Array of GroupTag entries to add to Media.GroupTags
 */
function buildGroupTagEntries(tagTitle, matchedFrom) {
  const matches = lookupTag(tagTitle);
  
  return matches.map(match => ({
    GroupTagID: match.groupTagId,
    GroupTagTitle: match.groupTagTitle,
    TagID: match.tagId,
    TagTitle: match.tagTitle,
    TagType: match.tagType,
    MatchedFrom: matchedFrom
  }));
}

/**
 * Tag type priority for image search
 * Higher number = higher priority (will be searched first)
 */
const TAG_TYPE_PRIORITY = {
  'subject': 100,    // Most important - what's IN the image
  'gt': 95,          // GroupTag title itself
  'feeling': 80,     // Mood/emotion of the image
  'attribute': 70,   // Visual characteristics
  'adjective': 60,   // Similar to attributes
  'metaphor': 40,    // Abstract, less visual
  'verb': 30,        // Actions, not very visual
  'concept': 20,     // Very abstract
  'synonym': 10      // Just word variations
};

/**
 * Get priority score for a tag type
 */
function getTagTypePriority(tagType) {
  if (!tagType) return 0;
  const type = tagType.toLowerCase().trim();
  return TAG_TYPE_PRIORITY[type] || 0;
}

/**
 * Lookup tags with priority sorting
 * Returns matches sorted by tag type priority (subjects first, then feelings, etc.)
 * @param {string[]} keywords - Array of keywords to lookup
 * @param {number} maxResults - Maximum number of results to return (default: 500)
 * @returns {Object} Object with prioritized results:
 *   - all: All matches sorted by priority
 *   - byPriority: Object grouping matches by priority level
 *   - groupTagIds: Array of unique GroupTagIds in priority order
 *   - limitReached: Whether max results was reached
 */
function lookupTagsPrioritized(keywords, maxResults = 500) {
  if (!isIndexLoaded || !tagIndex) {
    console.warn('⚠️ Tag index not loaded. Call loadTagIndex() first.');
    return { all: [], byPriority: {}, groupTagIds: [], limitReached: false };
  }

  if (!Array.isArray(keywords)) {
    return { all: [], byPriority: {}, groupTagIds: [], limitReached: false };
  }

  const allMatches = [];
  const seenIds = new Set();

  // Collect all matches
  for (const keyword of keywords) {
    if (!keyword || typeof keyword !== 'string') continue;

    const key = keyword.toLowerCase().trim();
    const matches = tagIndex[key] || [];
    
    for (const match of matches) {
      if (!seenIds.has(match.groupTagId)) {
        seenIds.add(match.groupTagId);
        allMatches.push({
          ...match,
          priority: getTagTypePriority(match.tagType),
          matchedKeyword: keyword
        });
      }
    }
  }

  // Sort by priority (highest first)
  allMatches.sort((a, b) => b.priority - a.priority);

  // Apply limit
  const limitReached = allMatches.length > maxResults;
  const limitedMatches = allMatches.slice(0, maxResults);

  // Group by priority level
  const byPriority = {
    subjects: [],    // priority >= 90
    feelings: [],    // priority 70-89
    attributes: [],  // priority 50-69
    other: []        // priority < 50
  };

  const groupTagIds = [];

  for (const match of limitedMatches) {
    groupTagIds.push(match.groupTagId);
    
    if (match.priority >= 90) {
      byPriority.subjects.push(match);
    } else if (match.priority >= 70) {
      byPriority.feelings.push(match);
    } else if (match.priority >= 50) {
      byPriority.attributes.push(match);
    } else {
      byPriority.other.push(match);
    }
  }

  return {
    all: limitedMatches,
    byPriority,
    groupTagIds,
    limitReached,
    stats: {
      total: allMatches.length,
      returned: limitedMatches.length,
      subjects: byPriority.subjects.length,
      feelings: byPriority.feelings.length,
      attributes: byPriority.attributes.length,
      other: byPriority.other.length
    }
  };
}

/**
 * Get prioritized GroupTagIds for keywords
 * Use this for image search - returns IDs sorted by tag type priority
 * @param {string[]} keywords - Array of keywords
 * @param {number} maxResults - Maximum results (default: 500)
 * @returns {string[]} Array of GroupTagIds in priority order
 */
function getGroupTagIdsPrioritized(keywords, maxResults = 500) {
  const result = lookupTagsPrioritized(keywords, maxResults);
  return result.groupTagIds;
}

/**
 * Get GroupTagTitle by GroupTagID
 * Used for selectedKeywords in BlendSettings
 * @param {string} groupTagId - The GroupTagID to lookup
 * @returns {string} The GroupTagTitle, or empty string if not found
 */
function getGroupTagTitleById(groupTagId) {
  if (!isIndexLoaded || !groupTagIdToTitleMap) {
    console.warn('⚠️ Tag index not loaded. Call loadTagIndex() first.');
    return '';
  }

  if (!groupTagId || typeof groupTagId !== 'string') {
    return '';
  }

  return groupTagIdToTitleMap[groupTagId] || '';
}

/**
 * Get multiple GroupTagTitles by GroupTagIDs
 * @param {string[]} groupTagIds - Array of GroupTagIDs
 * @returns {Object} Object mapping GroupTagID → GroupTagTitle
 */
function getGroupTagTitlesById(groupTagIds) {
  if (!isIndexLoaded || !groupTagIdToTitleMap) {
    console.warn('⚠️ Tag index not loaded. Call loadTagIndex() first.');
    return {};
  }

  if (!Array.isArray(groupTagIds)) {
    return {};
  }

  const result = {};
  let foundCount = 0;
  let notFoundIds = [];
  for (const id of groupTagIds) {
    if (id && typeof id === 'string') {
      const title = groupTagIdToTitleMap[id];
      if (title) {
        result[id] = title;
        foundCount++;
      } else {
        result[id] = '';
        notFoundIds.push(id);
      }
    }
  }
  
  // Debug: Show what was found vs not found
  if (groupTagIds.length > 0) {
    console.log(`🔍 getGroupTagTitlesById: ${foundCount}/${groupTagIds.length} IDs found in reverse index`);
    if (notFoundIds.length > 0 && notFoundIds.length <= 5) {
      console.log(`⚠️ IDs not found in reverse index:`, notFoundIds);
    } else if (notFoundIds.length > 5) {
      console.log(`⚠️ ${notFoundIds.length} IDs not found, first 3:`, notFoundIds.slice(0, 3));
    }
  }
  return result;
}

/**
 * Get stats about the loaded index
 */
function getStats() {
  if (!isIndexLoaded || !tagIndex) {
    return { loaded: false };
  }

  let totalMappings = 0;
  let singleMapping = 0;
  let multiMapping = 0;

  for (const key in tagIndex) {
    const count = tagIndex[key].length;
    totalMappings += count;
    if (count === 1) singleMapping++;
    else multiMapping++;
  }

  return {
    loaded: true,
    uniqueTags: Object.keys(tagIndex).length,
    totalMappings,
    singleMapping,
    multiMapping
  };
}

/**
 * Find all tags for a given GroupTagID
 * Uses pre-built reverse index for O(1) lookup
 * @param {string} groupTagId - The GroupTag ID to find tags for
 * @returns {Array} Array of tag entries belonging to this GroupTag
 */
function getTagsForGroupTagId(groupTagId) {
  if (!isIndexLoaded || !groupTagIdToTagsMap) {
    console.warn('⚠️ Tag index not loaded. Call loadTagIndex() first.');
    return [];
  }
  
  if (!groupTagId) return [];
  
  // Fast O(1) lookup using pre-built reverse index
  return groupTagIdToTagsMap[groupTagId] || [];
}

/**
 * Parse user description and find matching GroupTags with their first N tags
 * Used by /keywords/parse API
 * @param {string} inputText - The user's input text/description
 * @param {number} maxTagsPerGroup - Maximum tags to return per GroupTag (default: 5)
 * @returns {Object} Result containing matched GroupTags and their tags
 */
function parseDescriptionForKeywords(inputText, maxTagsPerGroup = 5) {
  console.log('\n🔍 [parseDescriptionForKeywords] Starting...');
  console.log('   Input:', inputText);
  
  if (!isIndexLoaded || !tagIndex) {
    console.warn('   ⚠️ Tag index not loaded!');
    return { matchedArr: [], suggestedArr: [], result: [] };
  }
  
  if (!inputText || typeof inputText !== 'string') {
    console.warn('   ⚠️ Invalid input text');
    return { matchedArr: [], suggestedArr: [], result: [] };
  }
  
  // Clean and split input text into words
  const cleanText = inputText.toLowerCase().trim().replace(/["']/g, "");
  const inputWords = cleanText.split(/[\s,;.!?\-]+/).filter(word => word.length > 2);
  
  console.log('   📝 Parsed words:', inputWords);
  
  const matchedArr = [];
  const suggestedArr = [];
  const seenGroupTagIds = new Set();
  
  // For each word, find matching GroupTags (where GroupTagTitle matches)
  for (const word of inputWords) {
    const matches = lookupTag(word);
    console.log(`   🔎 Word "${word}": ${matches.length} total matches`);
    
    // Find entries where the word matches the GroupTagTitle (tagType === 'gt')
    const gtMatches = matches.filter(m => m.tagType === 'gt');
    console.log(`   🔎 Word "${word}": ${gtMatches.length} GroupTag matches (tagType='gt')`);
    
    for (const gtMatch of gtMatches) {
      // Skip if we already processed this GroupTag
      if (seenGroupTagIds.has(gtMatch.groupTagId)) {
        console.log(`      ⏭️ Skipping duplicate GroupTag: ${gtMatch.groupTagTitle}`);
        continue;
      }
      seenGroupTagIds.add(gtMatch.groupTagId);
      
      console.log(`      ✅ Found GroupTag: "${gtMatch.groupTagTitle}" (ID: ${gtMatch.groupTagId})`);
      
      // Get all tags for this GroupTag
      const allTags = getTagsForGroupTagId(gtMatch.groupTagId);
      console.log(`      📦 GroupTag has ${allTags.length} tags`);
      
      // Take first N tags
      const firstTags = allTags.slice(0, maxTagsPerGroup);
      
      // Create keyword objects for each tag
      for (const tag of firstTags) {
        const keywordObj = {
          keyword: {
            title: tag.tagTitle,           // Tag title
            id: gtMatch.groupTagId,        // GroupTag ID
            tagId: tag.tagId,              // Tag ID
            groupTitle: gtMatch.groupTagTitle,  // GroupTag title
            tagType: tag.tagType,          // Tag type
            from: 'ans'
          }
        };
        
        matchedArr.push(keywordObj);
        suggestedArr.push(keywordObj);
      }
      
      // Also add the GroupTagTitle itself as a keyword option
      const gtKeywordObj = {
        keyword: {
          title: gtMatch.groupTagTitle,     // GroupTag title as tag
          id: gtMatch.groupTagId,           // GroupTag ID
          tagId: gtMatch.tagId,             // Tag ID (same as groupTagId for GT entry)
          groupTitle: gtMatch.groupTagTitle, // GroupTag title
          tagType: 'gt',                    // Type is 'gt'
          from: 'ans'
        }
      };
      
      // Add GT itself at the beginning
      matchedArr.unshift(gtKeywordObj);
      suggestedArr.unshift(gtKeywordObj);
    }
  }
  
  console.log(`   ✅ Total results: ${suggestedArr.length} keywords`);
  
  return {
    inputText: inputText,
    matchedArr: matchedArr,
    suggestedArr: suggestedArr,
    newGT: matchedArr,
    removeGT: [],
    result: suggestedArr  // Frontend expects this
  };
}

module.exports = {
  loadTagIndex,
  isLoaded,
  lookupTag,
  lookupTags,
  lookupTagsPrioritized,
  getGroupTagIdsForTag,
  getGroupTagIdsForTags,
  getGroupTagIdsPrioritized,
  getTagTypePriority,
  buildGroupTagEntries,
  getGroupTagTitleById,
  getGroupTagTitlesById,
  getTagsForGroupTagId,
  parseDescriptionForKeywords,
  getStats,
  TAG_TYPE_PRIORITY
};

