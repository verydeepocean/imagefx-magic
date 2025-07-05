// Log when content script loads
console.log('ImageFX Magic content script loaded');

// Функция для поиска и получения URL изображения через кнопку скачивания
async function getImageUrl() {
  try {
    // Добавляем прямой поиск по карточке изображения из скриншота
    console.log('Checking for image card elements first');
    const cardImage = document.querySelector('.MuiCardMedia-root img, .MuiCardMedia-img');
    if (cardImage && cardImage.src) {
      console.log('Found image in card:', cardImage.src);
      return cardImage.src;
    }
    
    // Поиск основного изображения на странице - более агрессивный подход
    const allImages = Array.from(document.querySelectorAll('img'));
    console.log(`Found ${allImages.length} img elements on page`);
    
    // Ищем самое большое изображение на странице (вероятно, это наше сгенерированное изображение)
    let largestImage = null;
    let largestArea = 0;
    
    for (const img of allImages) {
      // Пропускаем очень маленькие изображения и иконки
      if (img.naturalWidth < 100 || img.naturalHeight < 100) continue;
      
      const area = img.naturalWidth * img.naturalHeight;
      if (area > largestArea) {
        largestArea = area;
        largestImage = img;
        console.log(`Found larger image: ${img.naturalWidth}x${img.naturalHeight}, src:`, img.src);
      }
    }
    
    if (largestImage) {
      console.log('Using largest image on page:', largestImage.src);
      return largestImage.src;
    }
    
    // Если не нашли по размеру, проверяем оригинальные подходы
    // Найдем элемент скачивания по тексту
    const downloadSpan = Array.from(document.querySelectorAll('span')).find(
      span => span.textContent.trim() === 'Download'
    );
    
    // Если нашли элемент, ищем родительский элемент (кнопку или ссылку)
    if (downloadSpan) {
      const parentButton = downloadSpan.closest('button') || downloadSpan.closest('a');
      
      if (parentButton) {
        // Если это ссылка, у нее должен быть href
        if (parentButton.tagName === 'A' && parentButton.href) {
          console.log('Found download link:', parentButton.href);
          return parentButton.href;
        }
        
        // Если это кнопка, попробуем перехватить URL
        console.log('Found download button, attempting to capture URL');
        const url = await captureDownloadUrl(parentButton);
        if (url) return url;
      }
    }
    
    // Резервный вариант - поиск изображения на странице
    console.log('Trying to find image element on page');
    const possibleImageSelectors = [
      '.main-image img', 
      '.image-container img',
      '.sc-5eb7ae1b-0 img',
      'img[alt="Generated image"]',
      // Добавляем более общие селекторы в конце
      'img[src*="image-fx"]',
      'img[src*="content"]'
    ];
    
    for (const selector of possibleImageSelectors) {
      const img = document.querySelector(selector);
      if (img && img.src) {
        console.log('Found image with selector:', selector, img.src);
        return img.src;
      }
    }
    
    console.log('Image not found by selectors, attempting canvas capture');
    return await captureCanvasImage();
  } catch (error) {
    console.error('Error in getImageUrl:', error);
    return null;
  }
}

// Функция для перехвата URL скачивания
function captureDownloadUrl(button) {
  return new Promise((resolve) => {
    // Создаем перехватчик fetch запросов
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      // Если URL содержит изображение, сохраняем его
      if (typeof url === 'string' && url.match(/\.(jpeg|jpg|gif|png)/) !== null) {
        console.log('Intercepted image URL via fetch:', url);
        resolve(url);
        // Восстанавливаем оригинальную функцию
        window.fetch = originalFetch;
      }
      return originalFetch.apply(this, arguments);
    };
    
    // Также перехватываем XHR запросы
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
      if (typeof url === 'string' && url.match(/\.(jpeg|jpg|gif|png)/) !== null) {
        console.log('Intercepted image URL via XHR:', url);
        resolve(url);
        XMLHttpRequest.prototype.open = originalXHROpen;
      }
      originalXHROpen.apply(this, arguments);
    };
    
    // Имитируем клик по кнопке скачивания
    console.log('Clicking download button');
    button.click();
    
    // Устанавливаем таймаут на случай, если перехват не сработает
    setTimeout(() => {
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXHROpen;
      resolve(null);
      console.log('Capture timeout reached, no image URL found');
    }, 3000);
  });
}

// Функция для захвата изображения с canvas, если оно есть
function captureCanvasImage() {
  return new Promise((resolve) => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        console.log('Captured image from canvas');
        resolve(dataUrl);
      } catch (e) {
        console.error('Error capturing from canvas:', e);
        resolve(null);
      }
    } else {
      console.log('No canvas element found');
      resolve(null);
    }
  });
}

// Функция для скачивания изображения
async function downloadImage(url) {
  console.log('Downloading image from URL:', url);
  try {
    // Проверяем, является ли URL data URL (base64)
    if (url.startsWith('data:')) {
      console.log('URL is a data URL, converting directly');
      // Извлекаем данные из data URL
      const response = await fetch(url);
      const blob = await response.blob();
      console.log('Data URL converted to blob, size:', blob.size);
      return blob;
    }

    // Пробуем XMLHttpRequest вместо fetch для обхода CORS
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';
      
      // Добавляем больше логирования
      xhr.onloadstart = () => console.log('XHR: Started loading image');
      xhr.onprogress = (e) => {
        if (e.lengthComputable) {
          console.log(`XHR: Downloaded ${e.loaded} of ${e.total} bytes`);
        } else {
          console.log(`XHR: Downloaded ${e.loaded} bytes`);
        }
      };
      
      xhr.onload = function() {
        if (this.status === 200) {
          console.log('XHR: Image downloaded successfully, size:', this.response.size);
          resolve(this.response);
        } else {
          console.error('XHR: HTTP error', this.status);
          reject(new Error(`HTTP error! status: ${this.status}`));
        }
      };
      
      xhr.onerror = function() {
        console.error('XHR: Network error occurred');
        
        // Запасной вариант - попробуем запросить через background script
        console.log('Trying to request image via background script...');
        chrome.runtime.sendMessage({ 
          type: 'DOWNLOAD_IMAGE', 
          url: url 
        }, (response) => {
          if (response && response.status === 'ok' && response.dataUrl) {
            console.log('Background script returned data URL, converting to blob');
            fetch(response.dataUrl)
              .then(res => res.blob())
              .then(blob => {
                console.log('Data URL converted to blob, size:', blob.size);
                resolve(blob);
              })
              .catch(err => {
                console.error('Error converting data URL:', err);
                reject(err);
              });
          } else {
            reject(new Error('Failed to download image via background script'));
          }
        });
      };
      
      xhr.send();
    });
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
}

// Функция для создания миниатюры из изображения
function createThumbnail(imageBlob, maxWidth = 300, maxHeight = 200) {
  return new Promise((resolve, reject) => {
    console.log('Creating thumbnail from blob, size:', imageBlob.size);
    
    // Проверяем, что это действительно изображение
    if (!imageBlob || imageBlob.type.indexOf('image/') !== 0) {
      console.error('Invalid blob type:', imageBlob.type);
      reject(new Error('Invalid image format'));
      return;
    }

    const img = new Image();
    
    // Установим таймаут для загрузки изображения
    const timeoutId = setTimeout(() => {
      console.error('Thumbnail creation timed out');
      img.src = ''; // Прерываем загрузку
      reject(new Error('Image loading timed out'));
    }, 15000); // 15 секунд таймаут
    
    img.onload = () => {
      clearTimeout(timeoutId); // Отменяем таймаут
      
      try {
        console.log('Image loaded for thumbnail, dimensions:', img.width, 'x', img.height);
        
        // Проверяем, что изображение имеет размеры
        if (img.width === 0 || img.height === 0) {
          throw new Error('Image has zero dimensions');
        }
        
        // Вычисляем размеры с сохранением пропорций
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
        
        console.log('Calculated thumbnail dimensions:', width, 'x', height);
        
        // Создаем canvas и рисуем миниатюру
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Пробуем получить data URL с разными форматами, если один не сработает
        try {
          const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          console.log('Thumbnail created successfully as JPEG');
          
          // Проверяем, что data URL действительно содержит данные
          if (thumbnailDataUrl.length < 100) {
            throw new Error('Generated data URL is too short');
          }
          
          resolve(thumbnailDataUrl);
        } catch (jpegError) {
          console.error('Error creating JPEG thumbnail, trying PNG:', jpegError);
          try {
            const pngThumbnail = canvas.toDataURL('image/png');
            console.log('Thumbnail created successfully as PNG');
            resolve(pngThumbnail);
          } catch (pngError) {
            console.error('Error creating PNG thumbnail:', pngError);
            reject(pngError);
          }
        }
      } catch (error) {
        console.error('Error creating thumbnail:', error);
        reject(error);
      } finally {
        // Освобождаем ресурсы
        URL.revokeObjectURL(img.src);
      }
    };
    
    img.onerror = (error) => {
      clearTimeout(timeoutId); // Отменяем таймаут
      console.error('Error loading image for thumbnail:', error);
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    
    // Создаем URL из Blob
    const blobUrl = URL.createObjectURL(imageBlob);
    console.log('Created blob URL for image:', blobUrl);
    
    // Загружаем изображение из Blob
    img.src = blobUrl;
    
    // Устанавливаем crossOrigin атрибут для обхода некоторых CORS-ограничений
    img.crossOrigin = 'anonymous';
  });
}

// Обновленная функция извлечения информации об изображении
async function extractImageInfo() {
  try {
    console.log('Extracting image info from page');
    
    // Используем предоставленные XPath локаторы для промпта и seed
    let prompt = '';
    let seed = '';
    
    // XPath локатор для промпта
    const promptXPath = '//*[@id="__next"]/div/div/div/div[2]/div[1]/div/div/div/div/div/div[2]/div[1]/div[2]/div/div';
    const promptElement = document.evaluate(promptXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    
    if (promptElement) {
      prompt = promptElement.textContent.trim();
      console.log('Found prompt using XPath:', prompt);
    } else {
      // Если не нашли по XPath, используем старые селекторы как запасной вариант
      console.log('XPath for prompt failed, trying CSS selectors');
      
      const promptSelectors = [
        'div.sc-5eb7ae1b-3.fAArph',
        'div[class*="fAArph"]',
        'div.prompt-container',
        'div[class*="prompt"]',
        'div[aria-label="Prompt"]'
      ];
      
      for (const selector of promptSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          prompt = element.textContent.trim();
          console.log(`Found prompt with selector ${selector}:`, prompt);
          break;
        }
      }
    }
    
    // XPath локатор для seed
    const seedXPath = '//*[@id="__next"]/div/div/div/div[2]/div[1]/div/div/div/div/div/div[2]/div[1]/div[3]/div/div';
    const seedElement = document.evaluate(seedXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    
    if (seedElement) {
      seed = seedElement.textContent.trim();
      console.log('Found seed using XPath:', seed);
    } else {
      // Если не нашли по XPath, используем старые селекторы как запасной вариант
      console.log('XPath for seed failed, trying CSS selectors');
      
      const seedSelectors = [
        'div.sc-5eb7ae1b-2.foAXNG',
        'div[class*="foAXNG"]',
        'div.seed-container',
        'div[class*="seed"]',
        'div[aria-label="Seed"]'
      ];
      
      for (const selector of seedSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          seed = element.textContent.trim();
          console.log(`Found seed with selector ${selector}:`, seed);
          break;
        }
      }
    }
    
    // Если не нашли промпт или seed с помощью XPath или селекторов,
    // попробуем извлечь их из структуры страницы
    if (!prompt || !seed) {
      console.log('Trying to extract prompt/seed from DOM structure');
      // Ищем все div элементы на странице
      const allDivs = Array.from(document.querySelectorAll('div'));
      
      // Ищем элементы, которые могут содержать промпт или seed
      for (const div of allDivs) {
        const text = div.textContent.trim();
        if (!prompt && text.length > 10 && text.length < 500) {
          // Промпты обычно длиннее 10 и короче 500 символов
          prompt = text;
          console.log('Found potential prompt via general search:', prompt);
        } else if (!seed && /^\d{1,20}$/.test(text)) {
          // Seed обычно состоит только из цифр
          seed = text;
          console.log('Found potential seed via general search:', seed);
        }
      }
    }
    
    // Получаем URL изображения
    const imageUrl = await getImageUrl();
    console.log('Image URL obtained:', imageUrl);
    
    // Если не смогли получить imageUrl, возвращаем ошибку
    if (!imageUrl) {
      console.error('Failed to get image URL');
      return { 
        prompt, 
        seed, 
        imageUrl: '',
        thumbnailUrl: '',
        error: 'Failed to get image URL'
      };
    }
    
    // Создаем миниатюру, если удалось получить URL изображения
    let thumbnailUrl = '';
    let error = '';
    try {
      console.log('Attempting to download image and create thumbnail');
      const imageBlob = await downloadImage(imageUrl);
      console.log('Image downloaded successfully, creating thumbnail');
      thumbnailUrl = await createThumbnail(imageBlob);
      console.log('Created thumbnail from image, length:', thumbnailUrl.length);
    } catch (err) {
      console.error('Error creating thumbnail:', err);
      error = err.message;
      // В случае ошибки создания миниатюры, пробуем использовать оригинальный URL
      if (imageUrl.startsWith('data:')) {
        console.log('Using original data URL as fallback thumbnail');
        thumbnailUrl = imageUrl;
      }
    }
    
    return {
      prompt,
      seed,
      imageUrl,
      thumbnailUrl,
      error
    };
  } catch (error) {
    console.error('Error in extractImageInfo:', error);
    return { 
      prompt: '', 
      seed: '', 
      imageUrl: '',
      thumbnailUrl: '',
      error: error.message
    };
  }
}

// Create notification element
function createNotificationElement() {
  const notification = document.createElement('div');
  notification.id = 'imagefx-magic-notification';
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 10px 15px;
    background-color: #333;
    color: white;
    border-radius: 4px;
    z-index: 10000;
    font-family: Arial, sans-serif;
    font-size: 14px;
    max-width: 300px;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
    transition: opacity 0.3s ease;
    opacity: 0;
  `;
  document.body.appendChild(notification);
  return notification;
}

// Get or create notification element
function getNotificationElement() {
  let notification = document.getElementById('imagefx-magic-notification');
  if (!notification) {
    notification = createNotificationElement();
  }
  return notification;
}

// Show notification
function showNotification(message, isError = false) {
  const notification = getNotificationElement();
  notification.textContent = message;
  notification.style.backgroundColor = isError ? '#e74c3c' : '#2ecc71';
  notification.style.opacity = '1';
  
  // Hide after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
  }, 3000);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message.type);
  
  // Handle request to get image info
  if (message.type === 'GET_IMAGE_INFO') {
    extractImageInfo().then(imageInfo => {
      if (!imageInfo.prompt || !imageInfo.seed) {
        sendResponse({ 
          status: 'error', 
          error: 'Could not extract image information from the page'
        });
      } else {
        sendResponse({ 
          status: 'ok',
          ...imageInfo
        });
      }
    }).catch(error => {
      sendResponse({ 
        status: 'error', 
        error: 'Error extracting image info: ' + error.message
      });
    });
    
    return true; // Will respond asynchronously
  }
  
  // Handle notification request
  if (message.type === 'SHOW_NOTIFICATION') {
    showNotification(message.message, message.isError);
    sendResponse({ status: 'ok' });
    return true;
  }
  
  return false;
});

// Send ready message to background script
chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' }); 