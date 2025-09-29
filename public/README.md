# CollabMedia API Documentation

This directory contains the new modular API documentation system for CollabMedia, featuring separate pages for each API route with easy navigation between them.

## 🚀 Features

- **Modular Design**: Each API route has its own dedicated page
- **Easy Navigation**: Switch between different API sections using the navigation tabs
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Interactive Documentation**: Full Swagger UI integration for testing APIs
- **Modern UI**: Beautiful, gradient-based design with smooth animations

## 📁 File Structure

```
public/
├── index.html              # Main landing page with navigation
├── user-api.html          # User Management API documentation
├── metatags-api.html      # Meta Tags API documentation
├── metametatags-api.html  # Meta Meta Tags API documentation
└── README.md              # This file
```

## 🔗 API Documentation Files

### 1. Main Index (`index.html`)
- **Purpose**: Landing page with navigation to all API sections
- **Features**: 
  - Welcome section with API overview
  - Navigation tabs for all API routes
  - Responsive design with gradient backgrounds
  - Embedded iframes for each API section

### 2. User API (`user-api.html`)
- **Purpose**: User management, authentication, and profile operations
- **Swagger File**: `../swagger-user-api.yaml`
- **Endpoints**: Login, registration, profile management, analytics, etc.

### 3. Meta Tags API (`metatags-api.html`)
- **Purpose**: Content categorization and tagging operations
- **Swagger File**: `../swagger-metatags-api.yaml`
- **Endpoints**: CRUD operations for meta tags within meta meta tags

### 4. Meta Meta Tags API (`metametatags-api.html`)
- **Purpose**: Advanced tag organization and domain management
- **Swagger File**: `../swagger-metaMetaTags-api.yaml`
- **Endpoints**: CRUD operations for meta meta tags, domain associations

## 🎨 Design Features

### Navigation System
- **Sticky Navigation**: Navigation bar stays at the top when scrolling
- **Active State Indicators**: Current page is highlighted
- **Hover Effects**: Smooth animations and visual feedback
- **Responsive Layout**: Adapts to different screen sizes

### Visual Design
- **Gradient Backgrounds**: Modern purple-blue gradients
- **Card-based Layout**: Clean, organized information display
- **Smooth Animations**: CSS transitions for better user experience
- **Professional Typography**: Segoe UI font family for readability

## 🛠️ Technical Implementation

### Frontend Technologies
- **HTML5**: Semantic markup structure
- **CSS3**: Modern styling with flexbox and grid
- **JavaScript**: Interactive functionality and navigation
- **Swagger UI**: API documentation rendering

### Key Features
- **Iframe Integration**: Each API section loads in its own iframe
- **Dynamic Content Switching**: JavaScript-powered tab navigation
- **Responsive Design**: Mobile-first approach with media queries
- **Cross-browser Compatibility**: Works on all modern browsers

## 📱 Responsive Design

The documentation system is fully responsive and includes:

- **Mobile-first approach**: Optimized for small screens
- **Flexible navigation**: Adapts to different screen sizes
- **Touch-friendly**: Optimized for mobile devices
- **Readable text**: Appropriate font sizes for all devices

## 🚀 Getting Started

1. **Open the main page**: Navigate to `public/index.html`
2. **Choose an API section**: Click on the navigation tabs
3. **Explore endpoints**: Use the embedded Swagger UI
4. **Test APIs**: Try out the "Try it out" functionality

## 🔧 Customization

### Adding New API Sections

1. **Create Swagger YAML file**: Add your API specification
2. **Create HTML page**: Follow the existing template structure
3. **Update navigation**: Add new tab to all pages
4. **Update main index**: Add new iframe section

### Styling Changes

- **Colors**: Modify CSS variables for theme changes
- **Layout**: Adjust CSS grid and flexbox properties
- **Animations**: Customize CSS transitions and transforms

## 📚 API Testing

Each page includes full Swagger UI functionality:

- **Interactive Documentation**: View all endpoints and schemas
- **Request Testing**: Test APIs directly from the documentation
- **Response Examples**: See expected response formats
- **Authentication**: Configure session cookies for testing

## 🌐 Browser Support

- **Chrome**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support
- **Mobile Browsers**: Full responsive support

## 📝 Notes

- **Session Cookies**: APIs use session-based authentication
- **CORS**: Cross-origin requests are enabled
- **Local Development**: Default server runs on port 3002
- **Production**: Configure for your production server URL

## 🤝 Contributing

When adding new API sections:

1. Follow the existing file naming convention
2. Maintain consistent styling and layout
3. Update navigation across all pages
4. Test responsive behavior on different devices
5. Ensure Swagger YAML files are properly formatted

## 📞 Support

For questions or issues with the API documentation system:

- **Email**: support@collabmedia.com
- **Documentation**: Check the Swagger files for API details
- **Issues**: Report bugs or feature requests through your development workflow
