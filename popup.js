// Global state
  let allImages = [];
  let filteredImages = [];
let selectedTags = []; // Track selected tags

// Function to delete an image
async function deleteImage(id) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'DELETE_IMAGE',
      id
    });
    
    if (response.status === 'ok') {
      // Remove from arrays
      allImages = allImages.filter(img => img.id !== id);
      filteredImages = filteredImages.filter(img => img.id !== id);
      
      // Re-render
      renderImages(filteredImages);
      updatePopularTags(); // Update popular tags after deletion
      showNotification('Image deleted successfully');
    } else {
      showError('Failed to delete image');
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    showError('Error deleting image');
  }
}

// Function to show error
function showError(message) {
  // Could create a toast/notification, for now using console
  console.error(message);
  
  // Add a small error UI indicator
  const header = document.querySelector('header');
  const errorIndicator = document.createElement('span');
  errorIndicator.textContent = '⚠️ ' + message;
  errorIndicator.style.fontSize = '12px';
  errorIndicator.style.marginLeft = '10px';
  
  header.appendChild(errorIndicator);
  
  setTimeout(() => {
    header.removeChild(errorIndicator);
  }, 3000);
}

// Theme management
function initTheme() {
  // Check for saved theme preference or use preferred color scheme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else {
    // Check if user prefers dark mode at system level
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

// Initialize theme when the script loads
initTheme();

// Function to render images in the container
  function renderImages(images) {
  const imagesContainer = document.getElementById('images-container');
  
    if (images.length === 0) {
      imagesContainer.innerHTML = `
        <div class="empty-state">
          <p>No saved images yet</p>
          <p>Use the "Add Image" context menu option on ImageFX pages to save images</p>
        </div>
      `;
      return;
    }
    
    const html = images.map(image => {
      // Определяем источник изображения с учетом резервных вариантов
      let imageSource = '';
      
      // Проверяем наличие thumbnailUrl или imageUrl и проверяем, что это реальные URL
      if (image.thumbnailUrl && image.thumbnailUrl.length > 100) {
        imageSource = image.thumbnailUrl;
      } else if (image.imageUrl && image.imageUrl.length > 10) {
        imageSource = image.imageUrl;
      } else {
        // Если нет подходящего URL, используем placeholder
        imageSource = 'icons/imagefx128.png';
      }
      
      // Проверяем, не слишком ли длинный URL (может быть data URL)
      const displayedSource = imageSource.length > 100 ? (imageSource.startsWith('data:') ? imageSource : 'icons/imagefx128.png') : imageSource;
      
      return `
        <div class="image-card" data-id="${image.id}">
          <img class="image-thumbnail" src="${displayedSource}" alt="${image.title}" 
               onerror="this.onerror=null; this.src='icons/imagefx128.png';">
          <div class="image-info">
            <div class="image-title" title="${image.title}">${image.title}</div>
            <div class="image-prompt" title="${image.prompt}">${image.prompt}</div>
            <div class="image-seed">Seed: ${image.seed}</div>
            ${image.comments ? `<div class="image-comments">${convertLinksToHtml(image.comments)}</div>` : ''}
            <div class="image-tags" style="display: flex; flex-wrap: wrap; gap: 4px; margin: 3px 0;">
              ${(image.tags || []).map(tag => `<span class="tag" style="background-color: #f1f1f1; color: #333; padding: 1px 6px; border-radius: 10px; font-size: 11px;">${tag}</span>`).join('')}
            </div>
            <div class="timestamp">Saved: ${image.timestamp}</div>
            <div class="image-actions">
              <button class="open" data-url="${image.url}">Open</button>
              <button class="edit" data-id="${image.id}">Edit</button>
              <button class="copy" data-prompt="${image.prompt}">Copy Prompt</button>
              <button class="delete" data-id="${image.id}">Delete</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    imagesContainer.innerHTML = html;
    
  // Add event listeners
  addImageEventListeners();
}

// Function to add event listeners to image cards
function addImageEventListeners() {
  // Add listeners for image thumbnails
    document.querySelectorAll('.image-thumbnail').forEach(img => {
      img.addEventListener('error', function() {
        console.error('Failed to load image:', this.src);
        this.src = 'icons/imagefx128.png';
      });
    });
    
  // Add listeners for action buttons
    document.querySelectorAll('.image-actions .open').forEach(button => {
      button.addEventListener('click', (e) => {
        const url = e.target.dataset.url;
        chrome.tabs.create({ url });
      });
    });
    
    document.querySelectorAll('.image-actions .copy').forEach(button => {
      button.addEventListener('click', (e) => {
        const prompt = e.target.dataset.prompt;
        navigator.clipboard.writeText(prompt)
          .then(() => {
            const originalText = e.target.textContent;
            e.target.textContent = 'Copied!';
            setTimeout(() => {
              e.target.textContent = originalText;
            }, 1500);
          })
          .catch(err => {
            console.error('Error copying text:', err);
          });
      });
    });
    
    document.querySelectorAll('.image-actions .delete').forEach(button => {
      button.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        await deleteImage(id);
      });
    });
    
    document.querySelectorAll('.image-actions .edit').forEach(button => {
      button.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const image = allImages.find(img => img.id === id);
        if (image) {
          showEditModal(image);
        }
      });
    });
  }
  
// Function to show notification
function showNotification(message, isError = false) {
  const header = document.querySelector('header');
  const notification = document.createElement('span');
  notification.textContent = isError ? '⚠️ ' + message : '✅ ' + message;
  notification.style.fontSize = '12px';
  notification.style.marginLeft = '10px';
  notification.style.color = isError ? '#f44336' : '#4caf50';
  
  header.appendChild(notification);
  
  setTimeout(() => {
    header.removeChild(notification);
  }, 3000);
}

// Function to calculate and display popular tags
function updatePopularTags() {
  const tagsCount = {};
  
  // Count occurrences of each tag
  allImages.forEach(image => {
    if (image.tags && Array.isArray(image.tags)) {
      image.tags.forEach(tag => {
        if (tag && tag.trim()) {
          const trimmedTag = tag.trim();
          tagsCount[trimmedTag] = (tagsCount[trimmedTag] || 0) + 1;
        }
      });
    }
  });
  
  // Convert to array and sort by count (descending)
  const sortedTags = Object.entries(tagsCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10) // Take only top 10
    .map(entry => ({ tag: entry[0], count: entry[1] }));
  
  // Display in the UI
  const popularTagsList = document.getElementById('popular-tags-list');
  
  if (sortedTags.length === 0) {
    document.getElementById('popular-tags').style.display = 'none';
    return;
  }
  
  document.getElementById('popular-tags').style.display = 'block';
  popularTagsList.innerHTML = '';
  
  sortedTags.forEach(tagInfo => {
    const tagElement = document.createElement('span');
    tagElement.className = 'popular-tag';
    tagElement.textContent = `${tagInfo.tag} (${tagInfo.count})`;
    tagElement.style.padding = '2px 8px';
    tagElement.style.borderRadius = '10px';
    tagElement.style.fontSize = '11px';
    tagElement.style.cursor = 'pointer';
    
    // Add event listener to add tag to search input when clicked
    tagElement.addEventListener('click', () => {
      handleTagClick(tagInfo.tag);
    });
    
    popularTagsList.appendChild(tagElement);
  });

  // Update visual state of tag elements if any are selected
  updateTagsVisualState();
}

// Function to handle tag click - adds tag to search or removes it
function handleTagClick(tag) {
  const searchInput = document.getElementById('search-input');
  const currentSearch = searchInput.value;
  const hashTag = `#${tag}`;
  
  // Check if the tag is already in the search (with # prefix)
  if (currentSearch.includes(hashTag)) {
    // Remove this tag from search
    searchInput.value = currentSearch
      .replace(hashTag, '')
      .replace(/\s+/g, ' ')
      .trim();
  } else {
    // Add this tag to search
    const newSearch = currentSearch ? `${currentSearch} ${hashTag}` : hashTag;
    searchInput.value = newSearch;
  }
  
  // Trigger search update
  searchInput.dispatchEvent(new Event('input'));
}

// Function to filter images by tag
function filterByTag(tag) {
  // Reset search input
  const searchInput = document.getElementById('search-input');
  searchInput.value = '';
  
  // Toggle tag selection
  const tagIndex = selectedTags.indexOf(tag);
  if (tagIndex === -1) {
    // Tag not selected - add it
    selectedTags.push(tag);
  } else {
    // Tag already selected - remove it
    selectedTags.splice(tagIndex, 1);
  }
  
  // Filter images by selected tags (if any)
  if (selectedTags.length === 0) {
    // No tags selected - show all images
      filteredImages = [...allImages];
    } else {
    // Show images that have ALL of the selected tags (instead of ANY)
      filteredImages = allImages.filter(image => 
      image.tags && 
      Array.isArray(image.tags) && 
      selectedTags.every(selectedTag => 
        image.tags.some(imageTag => imageTag.trim() === selectedTag)
      )
    );
  }
  
  // Sort by date (newest first)
  filteredImages.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Update UI
  renderImages(filteredImages);
  
  // Update visual state of tag elements
  updateTagsVisualState();
}

// Function to update the visual state of tag elements
function updateTagsVisualState() {
  document.querySelectorAll('.popular-tag').forEach(element => {
    const tagText = element.textContent.split(' (')[0]; // Extract tag name without count
    if (selectedTags.includes(tagText)) {
      element.style.backgroundColor = 'var(--header-bg)';
      element.style.color = 'white';
    } else {
      // Use the CSS variables
      // Note: We don't need to set these explicitly as they're handled by the class
      // but keeping the code structure for consistency
      element.style.backgroundColor = '';
      element.style.color = '';
    }
  });
}

// Function to handle search
function handleSearch() {
  const searchTerm = document.getElementById('search-input').value.trim();
  
  // Extract hashtags from search and update selectedTags
  selectedTags = [];
  const hashtagRegex = /#([\w-]+)/g;  // Updated regex to include hyphens
  let match;
  while ((match = hashtagRegex.exec(searchTerm)) !== null) {
    const tag = match[1];
    if (tag && !selectedTags.includes(tag)) {
      selectedTags.push(tag);
    }
  }
  
  // Update tag visual state
  updateTagsVisualState();
  
  if (searchTerm === '') {
    // Empty search - show all images
    filteredImages = [...allImages];
  } else if (selectedTags.length > 0) {
    // First filter by hashtags if present
    filteredImages = allImages.filter(image => 
      image.tags && 
      Array.isArray(image.tags) && 
      selectedTags.every(selectedTag => 
        image.tags.some(imageTag => imageTag.trim() === selectedTag)
      )
    );
    
    // Then apply text search on other terms (non-hashtags)
    const plainSearchTerms = searchTerm
      .replace(hashtagRegex, '')
      .trim()
      .toLowerCase();
      
    if (plainSearchTerms) {
      filteredImages = filteredImages.filter(image => 
        image.prompt.toLowerCase().includes(plainSearchTerms) || 
        image.seed.toLowerCase().includes(plainSearchTerms) ||
        image.title.toLowerCase().includes(plainSearchTerms)
      );
    }
  } else {
    // No hashtags - regular search
    const normalizedSearchTerm = searchTerm.toLowerCase();
    filteredImages = allImages.filter(image => 
      image.prompt.toLowerCase().includes(normalizedSearchTerm) || 
      image.seed.toLowerCase().includes(normalizedSearchTerm) ||
      image.title.toLowerCase().includes(normalizedSearchTerm)
    );
  }
  
  // Sort by date (newest first)
  filteredImages.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  renderImages(filteredImages);
}

// Wait for DOM to be loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Get UI elements
  const imagesContainer = document.getElementById('images-container');
  const searchInput = document.getElementById('search-input');
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const clearBtn = document.getElementById('clear-btn');
  const themeToggleBtn = document.getElementById('theme-toggle');
  
  // Set up theme toggle
  themeToggleBtn.addEventListener('click', toggleTheme);
  
  // Load all saved images
  await loadImages();
  
  // Add event listeners
  searchInput.addEventListener('input', handleSearch);
  exportBtn.addEventListener('click', handleExport);
  importBtn.addEventListener('click', handleImport);
  clearBtn.addEventListener('click', handleClearAll);
  
  // Function to load all images from the database
  async function loadImages() {
    try {
      // Show loading state
      imagesContainer.innerHTML = `
        <div class="loading">
          <div class="spinner"></div>
        </div>
      `;
      
      // Request images from background script
      const response = await chrome.runtime.sendMessage({
        type: 'GET_ALL_IMAGES'
      });
      
      if (response.status === 'ok') {
        allImages = response.images || [];
        filteredImages = [...allImages];
    
    // Sort by date (newest first)
    filteredImages.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    renderImages(filteredImages);
        updatePopularTags(); // Update popular tags after loading images
      } else {
        showError('Failed to load images');
      }
    } catch (error) {
      console.error('Error loading images:', error);
      showError('Error loading images');
    }
  }
  
  // Function to export all images
  function handleExport() {
    try {
      if (allImages.length === 0) {
        showError('No images to export');
        return;
      }
      
      const dataStr = JSON.stringify(allImages, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `imagefx-export-${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error('Error exporting data:', error);
      showError('Error exporting data');
    }
  }
  
  // Function to import images
  function handleImport() {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const importedData = JSON.parse(event.target.result);
            
            if (!Array.isArray(importedData)) {
              showError('Invalid import file format');
              return;
            }
            
            // Send each image to be added
            for (const image of importedData) {
              await chrome.runtime.sendMessage({
                type: 'ADD_IMAGE',
                image
              });
            }
            
            // Reload images
            await loadImages();
          } catch (error) {
            console.error('Error processing import file:', error);
            showError('Error processing import file');
          }
        };
        
        reader.readAsText(file);
      };
      
      input.click();
    } catch (error) {
      console.error('Error importing data:', error);
      showError('Error importing data');
    }
  }
  
  // Function to clear all images
  async function handleClearAll() {
    try {
      if (!confirm('Are you sure you want to delete all saved images? This cannot be undone.')) {
        return;
      }
      
      const response = await chrome.runtime.sendMessage({
        type: 'CLEAR_ALL_IMAGES'
      });
      
      if (response.status === 'ok') {
        allImages = [];
        filteredImages = [];
        renderImages(filteredImages);
      } else {
        showError('Failed to clear images');
      }
    } catch (error) {
      console.error('Error clearing images:', error);
      showError('Error clearing images');
    }
  }
});

// Edit card functionality
let currentEditingCard = null;

function showEditModal(card) {
  currentEditingCard = card;
  const modal = document.getElementById('editModal');
  const titleInput = document.getElementById('editTitle');
  const promptInput = document.getElementById('editPrompt');
  const commentsInput = document.getElementById('editComments');
  const tagsInput = document.getElementById('editTags');
  
  // Set current values
  titleInput.value = card.title || '';
  promptInput.value = card.prompt || '';
  commentsInput.value = card.comments || '';
  
  // Clear and set tags
  tagsInput.innerHTML = '';
  const tagsContainer = document.createElement('div');
  tagsContainer.className = 'tags-container';
  tagsContainer.style.display = 'flex';
  tagsContainer.style.flexWrap = 'wrap';
  tagsContainer.style.gap = '4px';
  tagsContainer.style.marginBottom = '5px';
  
  // Add existing tags
  if (card.tags && card.tags.length > 0) {
    card.tags.forEach(tag => {
      addTagToInput(tag, tagsContainer);
    });
  }
  
  // Add input for new tags
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'form-control';
  input.placeholder = 'Add tags (press Enter)';
  input.style.marginTop = '5px';
  input.style.fontSize = '12px';
  input.style.padding = '4px 8px';
  input.style.width = 'auto';
  input.style.flexGrow = '1';
  input.addEventListener('keydown', handleTagInput);
  
  tagsContainer.appendChild(input);
  tagsInput.appendChild(tagsContainer);
  
  modal.style.display = 'block';
}

function hideEditModal() {
  const modal = document.getElementById('editModal');
  modal.style.display = 'none';
  currentEditingCard = null;
}

function addTagToInput(tag, container) {
  const tagElement = document.createElement('div');
  tagElement.className = 'tag';
  tagElement.style.display = 'inline-flex';
  tagElement.style.alignItems = 'center';
  tagElement.style.backgroundColor = '#f1f1f1';
  tagElement.style.color = '#333';
  tagElement.style.padding = '1px 6px';
  tagElement.style.borderRadius = '10px';
  tagElement.style.fontSize = '11px';
  tagElement.style.margin = '2px';
  tagElement.innerHTML = `
    ${tag}
    <span class="remove-tag" style="margin-left: 3px; cursor: pointer; font-size: 12px;">&times;</span>
  `;
  
  tagElement.querySelector('.remove-tag').addEventListener('click', () => {
    tagElement.remove();
  });
  
  container.insertBefore(tagElement, container.lastElementChild);
}

function handleTagInput(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    const input = event.target;
    const tag = input.value.trim();
    
    if (tag) {
      addTagToInput(tag, input.parentElement);
      input.value = '';
    }
  }
}

function getTagsFromInput() {
  const tagsContainer = document.querySelector('.tags-container');
  return Array.from(tagsContainer.querySelectorAll('.tag'))
    .map(tag => tag.textContent.trim().replace('×', ''))
    .filter(tag => tag);
}

// Event listeners for edit modal
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('editModal');
  const closeBtn = modal.querySelector('.close');
  const cancelBtn = document.getElementById('cancelEdit');
  const saveBtn = document.getElementById('saveEdit');
  
  closeBtn.addEventListener('click', hideEditModal);
  cancelBtn.addEventListener('click', hideEditModal);
  
  saveBtn.addEventListener('click', async () => {
    if (!currentEditingCard) return;
    
    const title = document.getElementById('editTitle').value.trim();
    const prompt = document.getElementById('editPrompt').value.trim();
    const comments = document.getElementById('editComments').value.trim();
    const tags = getTagsFromInput();
    
    if (!title || !prompt) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      // Update the card in storage
      const updatedCard = {
        ...currentEditingCard,
        title,
        prompt,
        comments,
        tags,
        lastEdited: new Date().toISOString()
      };
      
      // Update in allImages array
      const imageIndex = allImages.findIndex(img => img.id === currentEditingCard.id);
      if (imageIndex !== -1) {
        allImages[imageIndex] = updatedCard;
      }
      
      // Update in filteredImages array
      const filteredIndex = filteredImages.findIndex(img => img.id === currentEditingCard.id);
      if (filteredIndex !== -1) {
        filteredImages[filteredIndex] = updatedCard;
      }
      
      // Save to storage
      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_IMAGE',
        image: updatedCard
      });
      
      if (response.success) {
        // Re-render the images to update the UI
        renderImages(filteredImages);
        updatePopularTags(); // Update popular tags after edit
        hideEditModal();
        showNotification('Image updated successfully!');
      } else {
        throw new Error(response.error || 'Failed to update image');
      }
    } catch (error) {
      console.error('Error updating card:', error);
      showNotification('Error updating card', true);
    }
  });
});

// Add edit button to card creation
function createCardElement(card) {
  const cardElement = document.createElement('div');
  cardElement.className = 'card';
  cardElement.setAttribute('data-card-id', card.id);
  
  cardElement.innerHTML = `
    <div class="card-header">
      <h3 class="card-title">${card.title}</h3>
      <div class="card-actions">
        <button class="btn btn-edit">Edit</button>
        <button class="btn btn-delete">Delete</button>
      </div>
    </div>
    <p class="card-prompt">${card.prompt}</p>
    <div class="card-tags">
      ${(card.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
    </div>
  `;
  
  // Add event listeners
  cardElement.querySelector('.btn-edit').addEventListener('click', () => {
    showEditModal(card);
  });
  
  cardElement.querySelector('.btn-delete').addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete this card?')) {
      try {
        await chrome.storage.local.remove(`card_${card.id}`);
        cardElement.remove();
        showNotification('Card deleted successfully!');
      } catch (error) {
        console.error('Error deleting card:', error);
        showNotification('Error deleting card', true);
      }
    }
  });
  
  return cardElement;
}

// Function to convert URLs in text to clickable links
function convertLinksToHtml(text) {
  if (!text) return '';
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
} 