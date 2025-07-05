## Plan for Image FX Magic Extension

1. **Extension Structure**
   - manifest.json - Configure the extension settings, permissions, and context menu
   - background.js - Set up context menu and handle background operations
   - content.js - Extract data from Image FX pages
   - db.js - Set up IndexedDB for storing image data
   - popup.html/js - Create UI for viewing saved images
   - styles/icons - UI styling and extension icons

2. **manifest.json Configuration**
   - Set permissions: storage, contextMenus, activeTab
   - Host permissions: https://labs.google/fx/tools/image-fx/*
   - Set up popup and background script

3. **IndexedDB Implementation**
   - Create ImagesDB class in db.js with methods:
     - init() - Initialize the database
     - addImage() - Save new image data
     - getAllImages() - Retrieve saved images
     - deleteImage() - Remove images
     - updateImage() - Modify saved image data

4. **Context Menu Setup**
   - Create "Add Image" context menu item in background.js
   - Set up URL pattern to match only https://labs.google/fx/tools/image-fx/* pages

5. **Content Script Implementation**
   - Create methods to extract:
     - Prompt text from element with class "fAArph"
     - Seed value from element with class "foAXNG"
     - Image thumbnail URL (will need to identify the appropriate selector)
     - Create title from URL and first 7 words of prompt

6. **Background Script Handler**
   - Handle context menu click events
   - Communicate with content script to get image data
   - Save data to IndexedDB

7. **Popup UI Implementation**
   - Create a grid view of saved images with thumbnails
   - Display prompt text, seed value, and links
   - Add filtering/search functionality
   - Add options to delete or edit saved items

8. **Additional Features**
   - Export/Import functionality for saved data
   - Settings for customizing the extension behavior
   - Notification system for successful operations

9. **Testing Plan**
   - Test context menu appearance on correct pages
   - Verify data extraction functionality
   - Validate database operations
   - Check popup UI rendering and functionality

This comprehensive plan provides a roadmap for implementing the Image FX Magic extension with similar functionality to the DeepSeek Magic extension, adapted for the Google Labs Image FX site.
