// Initialize database for background script
const imagesDB = {
  db: null,
  initialized: false,
  
  async init() {
    if (this.initialized) return;
    
    try {
      // Open IndexedDB
      const request = indexedDB.open('imageFxDB', 1);
      
      return new Promise((resolve, reject) => {
        request.onerror = () => {
          this.initialized = false;
          reject(new Error('Failed to open database'));
        };
        
        request.onsuccess = (event) => {
          this.db = event.target.result;
          this.initialized = true;
          resolve();
        };
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          // Create images store if it doesn't exist
          if (!db.objectStoreNames.contains('images')) {
            const store = db.createObjectStore('images', { keyPath: 'id' });
            store.createIndex('prompt', 'prompt', { unique: false });
            store.createIndex('seed', 'seed', { unique: false });
            store.createIndex('date', 'date', { unique: false });
          }
        };
      });
    } catch (error) {
      this.initialized = false;
      console.error('Error initializing database:', error);
      throw error;
    }
  },
  
  async ensureInitialized() {
    if (!this.initialized) {
      await this.init();
    }
    return this.initialized;
  },
  
  async addImage(image) {
    await this.ensureInitialized();
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      
      const request = store.add(image);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to add image'));
    });
  },
  
  async getAllImages() {
    await this.ensureInitialized();
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['images'], 'readonly');
      const store = transaction.objectStore('images');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to get images'));
    });
  },
  
  async deleteImage(id) {
    await this.ensureInitialized();
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete image'));
    });
  },
  
  async updateImage(image) {
    await this.ensureInitialized();
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['images'], 'readwrite');
      const store = transaction.objectStore('images');
      
      const request = store.put(image);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to update image'));
    });
  }
};

// Log when background script loads
console.log('Background script loaded');

// Create context menu item
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated');
  
  // Remove existing menu items first
  chrome.contextMenus.removeAll(() => {
    // Create new menu item
    chrome.contextMenus.create({
      id: 'addImage',
      title: 'Add Image',
      contexts: ['page'],
      documentUrlPatterns: [
        'https://labs.google/fx/tools/image-fx/*'
      ]
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error creating context menu:', chrome.runtime.lastError);
      } else {
        console.log('Context menu created successfully');
      }
    });
  });
});

// Function to get first 7 words from a string
function getFirstSevenWords(text) {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  return words.slice(0, 7).join(' ');
}

// Extract ID from the URL
function getImageIdFromUrl(url) {
  const match = url.match(/\/image-fx\/(\w+)/);
  return match ? match[1] : '';
}

// Проверяем, является ли URL действительным источником изображения
function isValidImageUrl(url) {
  if (!url) return false;
  
  // Если это data URL с изображением
  if (url.startsWith('data:image/')) return true;
  
  // Если это URL с расширением изображения
  if (url.match(/\.(jpeg|jpg|png|gif|webp)($|\?)/i)) return true;
  
  // Если URL содержит строки, указывающие на изображение
  if (url.includes('image-fx') && 
      (url.includes('/content/') || url.includes('/generate/'))) {
    return true;
  }
  
  return false;
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('Context menu clicked:', info.menuItemId);
  
  if (info.menuItemId === 'addImage') {
    try {
      console.log('Add image clicked, tab URL:', tab.url);
      
      // Validate URL is from Google Labs Image FX
      if (!tab.url.includes('labs.google/fx/tools/image-fx')) {
        throw new Error('Not a Google Labs Image FX URL');
      }
      
      // Ensure database is initialized
      await imagesDB.ensureInitialized();
      
      // Get image info from content script
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_IMAGE_INFO' });
      
      if (response && response.status === 'ok') {
        // Get current date
        const now = new Date();
        const formattedDate = now.toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });

        // Create shortened title from prompt
        const shortTitle = getFirstSevenWords(response.prompt);
        
        // Логируем полученные данные для отладки
        console.log('Received data:', {
          prompt: response.prompt ? response.prompt.substring(0, 50) + '...' : 'empty',
          seed: response.seed,
          imageUrl: response.imageUrl ? 'present (length: ' + String(response.imageUrl).length + ')' : 'empty',
          thumbnailUrl: response.thumbnailUrl ? 'present (length: ' + String(response.thumbnailUrl).length + ')' : 'empty',
          error: response.error || 'none'
        });
        
        // Проверяем валидность полученных URL изображений
        let validImageUrl = isValidImageUrl(response.imageUrl);
        let validThumbnailUrl = isValidImageUrl(response.thumbnailUrl);
        
        console.log('URL validation:', { 
          validImageUrl, 
          validThumbnailUrl,
          imageUrlStart: response.imageUrl ? response.imageUrl.substring(0, 50) + '...' : 'none',
          thumbnailUrlType: response.thumbnailUrl ? (response.thumbnailUrl.startsWith('data:') ? 'data URL' : 'regular URL') : 'none'
        });
        
        // Если есть ошибка при создании миниатюры, но у нас есть imageUrl,
        // мы все равно можем сохранить изображение
        if (response.error && !validThumbnailUrl && !validImageUrl) {
          console.warn('Warning: ' + response.error);
        }
        
        // Create image record
        const image = {
          id: Date.now().toString(),
          title: shortTitle,
          url: tab.url,
          imageId: getImageIdFromUrl(tab.url),
          prompt: response.prompt,
          seed: response.seed,
          imageUrl: validImageUrl ? response.imageUrl : '',
          thumbnailUrl: validThumbnailUrl ? response.thumbnailUrl : '',
          date: now.toISOString(),
          timestamp: formattedDate,
          errorMessage: response.error || ''
        };

        console.log('Created image object:', image.id);

        // Check if already saved
        const images = await imagesDB.getAllImages();
        const exists = images.some(img => img.url === image.url);

        if (!exists) {
          await imagesDB.addImage(image);
          console.log('Successfully added image');
          
          // Notify content script of success
          chrome.tabs.sendMessage(tab.id, {
            type: 'SHOW_NOTIFICATION',
            message: 'Image added successfully!' + (response.error ? ' (with warnings)' : ''),
            isError: false
          });
        } else {
          console.log('Image already saved');
          
          // Notify content script of duplicate
          chrome.tabs.sendMessage(tab.id, {
            type: 'SHOW_NOTIFICATION',
            message: 'This image is already saved',
            isError: true
          });
        }
      } else {
        throw new Error(response?.error || 'Failed to get image info');
      }
    } catch (error) {
      console.error('Error in addImage:', error);
      
      // Notify content script of error
      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_NOTIFICATION',
        message: `Error: ${error.message}`,
        isError: true
      });
    }
  }
});

// Handle messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message.type);
  
  if (message.type === 'GET_ALL_IMAGES') {
    imagesDB.getAllImages()
      .then(images => {
        sendResponse({ status: 'ok', images });
      })
      .catch(error => {
        console.error('Error getting images:', error);
        sendResponse({ status: 'error', error: error.message });
      });
    return true; // Will respond asynchronously
  }
  
  if (message.type === 'DELETE_IMAGE') {
    imagesDB.deleteImage(message.id)
      .then(() => {
        sendResponse({ status: 'ok' });
      })
      .catch(error => {
        console.error('Error deleting image:', error);
        sendResponse({ status: 'error', error: error.message });
      });
    return true; // Will respond asynchronously
  }
  
  if (message.type === 'CLEAR_ALL_IMAGES') {
    // Add handler for clearing all images
    imagesDB.init()
      .then(() => {
        return new Promise((resolve, reject) => {
          const transaction = imagesDB.db.transaction(['images'], 'readwrite');
          const store = transaction.objectStore('images');
          const request = store.clear();
          
          request.onsuccess = () => resolve();
          request.onerror = () => reject(new Error('Failed to clear images'));
        });
      })
      .then(() => {
        sendResponse({ status: 'ok' });
      })
      .catch(error => {
        console.error('Error clearing images:', error);
        sendResponse({ status: 'error', error: error.message });
      });
    return true; // Will respond asynchronously
  }
  
  if (message.type === 'ADD_IMAGE') {
    // Add handler for adding an imported image
    imagesDB.addImage(message.image)
      .then(() => {
        sendResponse({ status: 'ok' });
      })
      .catch(error => {
        console.error('Error adding imported image:', error);
        sendResponse({ status: 'error', error: error.message });
      });
    return true; // Will respond asynchronously
  }
  
  if (message.type === 'DOWNLOAD_IMAGE') {
    console.log('Attempting to download image from background script:', message.url);
    
    // Background script имеет меньше ограничений по CORS
    fetch(message.url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => {
        console.log('Image downloaded in background, size:', blob.size);
        // Преобразуем blob в data URL
        const reader = new FileReader();
        reader.onloadend = function() {
          console.log('Converted blob to data URL');
          sendResponse({ 
            status: 'ok', 
            dataUrl: reader.result 
          });
        };
        reader.onerror = function() {
          console.error('Error converting blob to data URL');
          sendResponse({ 
            status: 'error', 
            error: 'Failed to convert blob to data URL' 
          });
        };
        reader.readAsDataURL(blob);
      })
      .catch(error => {
        console.error('Error downloading image:', error);
        sendResponse({ 
          status: 'error', 
          error: error.message 
        });
      });
    
    return true; // Will respond asynchronously
  }
  
  if (message.type === 'UPDATE_IMAGE') {
    imagesDB.updateImage(message.image)
      .then(() => sendResponse({ success: true }))
      .catch(error => {
        console.error('Error updating image:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Will respond asynchronously
  }
  
  return false;
}); 