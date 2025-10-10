/**
 * Modern Page Layout Utilities
 * Handles conversion between old viewport system and new component-based system
 */

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

/**
 * Convert old viewport-based page to new component-based format
 * @param {Object} oldPage - Page with ViewportDesktopSections, ViewportTabletSections, ViewportMobileSections
 * @returns {Object} - Page with Content array and PageLayout
 */
function convertOldPageToNewFormat(oldPage) {
  const content = [];
  const qaPageRefs = new Set(); // Track Q&A page references
  
  // Primary source: Desktop viewport (most complete)
  const desktopWidgets = oldPage.ViewportDesktopSections?.Widgets || [];
  
  desktopWidgets.forEach((widget, index) => {
    const component = {
      id: new ObjectId().toString(),
      type: mapWidgetTypeToComponentType(widget.Type),
      data: extractWidgetData(widget),
      layout: {
        containerClass: "container",
        width: calculateResponsiveWidth(widget.W),
        alignment: "left",
        stackOnMobile: true,
        order: widget.SrNo || index
      },
      style: {
        animation: widget.Animation || "fade",
        bgColor: widget.BgColor,
        textColor: widget.TextColor,
        padding: "md",
        margin: "md"
      }
    };
    
    // Track Q&A page references
    if (widget.Type === "questAnswer" && widget.QAWidObj?.PageId) {
      qaPageRefs.add(widget.QAWidObj.PageId);
      component.data.qaPageId = widget.QAWidObj.PageId;
    }
    
    content.push(component);
  });
  
  return {
    Content: content,
    PageLayout: {
      type: "grid",
      columns: { mobile: 1, tablet: 2, desktop: 3 },
      gap: "md",
      maxWidth: "1200px"
    },
    PageBackground: {
      type: oldPage.ViewportDesktopSections?.Background?.Type || "color",
      value: oldPage.ViewportDesktopSections?.Background?.Data || "#ffffff",
      opacity: parseFloat(oldPage.ViewportDesktopSections?.Background?.BgOpacity || 1)
    },
    qaPageReferences: Array.from(qaPageRefs)
  };
}

/**
 * Map old widget type to new component type
 */
function mapWidgetTypeToComponentType(widgetType) {
  const typeMap = {
    'text': 'text',
    'image': 'image',
    'audio': 'audio',
    'video': 'video',
    'questAnswer': 'qa'
  };
  return typeMap[widgetType] || 'text';
}

/**
 * Extract data from widget based on type
 */
function extractWidgetData(widget) {
  const data = {};
  
  switch (widget.Type) {
    case 'text':
      data.text = widget.Data;
      break;
    case 'image':
      data.mediaUrl = widget.Data;
      data.thumbnail = widget.LqData || widget.Thumbnail;
      break;
    case 'video':
    case 'audio':
      data.embedCode = widget.Data;
      data.thumbnail = widget.Thumbnail;
      break;
    case 'questAnswer':
      data.qaPageId = widget.QAWidObj?.PageId || null;
      break;
  }
  
  return data;
}

/**
 * Calculate responsive width from pixel width
 */
function calculateResponsiveWidth(pixelWidth) {
  if (!pixelWidth || pixelWidth === 0) return "100%";
  
  // Common breakpoints
  if (pixelWidth <= 300) return "33.33%";
  if (pixelWidth <= 500) return "50%";
  if (pixelWidth <= 800) return "66.67%";
  return "100%";
}

/**
 * Duplicate page with new component system
 * Handles Q&A page references properly
 */
async function duplicatePageWithComponents(Page, originalPageId, newChapterId, userId, pageIdMap = {}) {
  const originalPage = await Page.findById(originalPageId);
  
  if (!originalPage) {
    throw new Error(`Page ${originalPageId} not found`);
  }
  
  const nowDate = Date.now();
  
  // Check if page uses new Content format or old Viewport format
  let content = [];
  let pageLayout = {};
  let pageBackground = {};
  
  if (originalPage.Content && originalPage.Content.length > 0) {
    // ✅ New format - just duplicate Content array
    content = JSON.parse(JSON.stringify(originalPage.Content));
    
    // Update Q&A page references if they've been duplicated
    content.forEach(component => {
      if (component.type === 'qa' && component.data?.qaPageId) {
        const oldQAPageId = component.data.qaPageId;
        if (pageIdMap[oldQAPageId]) {
          component.data.qaPageId = pageIdMap[oldQAPageId];
        }
      }
      // Generate new ID for component
      component.id = new ObjectId().toString();
    });
    
    pageLayout = originalPage.PageLayout || {};
    pageBackground = originalPage.PageBackground || {};
    
  } else if (originalPage.ViewportDesktopSections) {
    // ❌ Old format - convert to new format
    const converted = convertOldPageToNewFormat(originalPage);
    content = converted.Content;
    pageLayout = converted.PageLayout;
    pageBackground = converted.PageBackground;
  }
  
  // Create new page
  const pageData = {
    Origin: "duplicated",
    OriginatedFrom: originalPageId,
    CreaterId: userId,
    OwnerId: userId,
    ChapterId: newChapterId,
    Title: originalPage.Title,
    PageType: originalPage.PageType,
    Order: originalPage.Order,
    HeaderImage: originalPage.HeaderImage || "",
    BackgroundMusic: originalPage.BackgroundMusic || "",
    SelectedMedia: originalPage.SelectedMedia || [],
    SelectionCriteria: originalPage.SelectionCriteria,
    HeaderBlurValue: originalPage.HeaderBlurValue || 0,
    HeaderTransparencyValue: originalPage.HeaderTransparencyValue || 0,
    CreatedOn: nowDate,
    UpdatedOn: nowDate,
    
    // New fields
    Content: content,
    PageLayout: pageLayout,
    PageBackground: pageBackground
  };
  
  const newPage = await Page(pageData).save();
  return newPage;
}

/**
 * Duplicate page and all its Q&A referenced pages recursively
 */
async function duplicatePageWithQAReferences(Page, pageId, newChapterId, userId, pageIdMap = {}, processedPages = new Set()) {
  // Avoid infinite loops
  if (processedPages.has(pageId.toString())) {
    return pageIdMap;
  }
  processedPages.add(pageId.toString());
  
  const page = await Page.findById(pageId);
  if (!page) return pageIdMap;
  
  // Find all Q&A references in this page
  const qaRefs = [];
  
  if (page.Content && page.Content.length > 0) {
    // New format
    page.Content.forEach(component => {
      if (component.type === 'qa' && component.data?.qaPageId) {
        qaRefs.push(component.data.qaPageId);
      }
    });
  } else if (page.ViewportDesktopSections?.Widgets) {
    // Old format
    page.ViewportDesktopSections.Widgets.forEach(widget => {
      if (widget.Type === 'questAnswer' && widget.QAWidObj?.PageId) {
        qaRefs.push(widget.QAWidObj.PageId);
      }
    });
  }
  
  // Recursively duplicate all Q&A referenced pages first
  for (const qaPageId of qaRefs) {
    if (!pageIdMap[qaPageId]) {
      await duplicatePageWithQAReferences(Page, qaPageId, newChapterId, userId, pageIdMap, processedPages);
    }
  }
  
  // Now duplicate this page with updated references
  const newPage = await duplicatePageWithComponents(Page, pageId, newChapterId, userId, pageIdMap);
  pageIdMap[pageId.toString()] = newPage._id.toString();
  
  return pageIdMap;
}

/**
 * Create a simple text component
 */
function createTextComponent(text, options = {}) {
  return {
    id: new ObjectId().toString(),
    type: "text",
    data: { text },
    layout: {
      containerClass: options.containerClass || "container",
      width: options.width || "100%",
      alignment: options.alignment || "left",
      stackOnMobile: true,
      order: options.order || 0
    },
    style: {
      animation: options.animation || "fade",
      bgColor: options.bgColor,
      textColor: options.textColor,
      padding: options.padding || "md",
      margin: options.margin || "md"
    }
  };
}

/**
 * Create a media component (image/video)
 */
function createMediaComponent(mediaUrl, type = "image", options = {}) {
  return {
    id: new ObjectId().toString(),
    type: type,
    data: {
      mediaUrl,
      thumbnail: options.thumbnail,
      mediaTitle: options.title
    },
    layout: {
      containerClass: options.containerClass || "container",
      width: options.width || "100%",
      alignment: options.alignment || "center",
      stackOnMobile: true,
      order: options.order || 0
    },
    style: {
      animation: options.animation || "fade",
      padding: options.padding || "md",
      margin: options.margin || "md"
    }
  };
}

/**
 * Create a Q&A component that references another page
 */
function createQAComponent(qaPageId, options = {}) {
  return {
    id: new ObjectId().toString(),
    type: "qa",
    data: {
      qaPageId: qaPageId
    },
    layout: {
      containerClass: options.containerClass || "container",
      width: options.width || "100%",
      alignment: options.alignment || "left",
      stackOnMobile: true,
      order: options.order || 0
    },
    style: {
      animation: options.animation || "slide",
      padding: options.padding || "lg",
      margin: options.margin || "md"
    }
  };
}

/**
 * Create a question component (for stream questions)
 */
function createQuestionComponent(questionText, options = {}) {
  return {
    id: new ObjectId().toString(),
    type: "question",
    data: {
      text: questionText
    },
    layout: {
      containerClass: "container",
      width: "100%",
      alignment: "center",
      stackOnMobile: true,
      order: 0
    },
    style: {
      animation: "fadeIn",
      bgColor: options.bgColor || "#f9fafb",
      textColor: options.textColor || "#111827",
      padding: "xl",
      margin: "lg"
    }
  };
}

module.exports = {
  convertOldPageToNewFormat,
  duplicatePageWithComponents,
  duplicatePageWithQAReferences,
  createTextComponent,
  createMediaComponent,
  createQAComponent,
  createQuestionComponent,
  mapWidgetTypeToComponentType,
  extractWidgetData,
  calculateResponsiveWidth
};

