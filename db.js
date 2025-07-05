class ImagesDB {
  constructor() {
    this.dbName = 'imageFxDB';
    this.dbVersion = 1;
    this.storeName = 'images';
    this.db = null;
  }

  async init() {
    if (this.db) {
      console.log(`${this.dbName} already initialized`);
      return;
    }
    
    console.log(`Initializing ${this.dbName}...`);
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error(`Error opening ${this.dbName}:`, request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log(`${this.dbName} opened successfully`);
        resolve();
      };

      request.onupgradeneeded = (event) => {
        console.log(`Upgrading ${this.dbName} schema...`);
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          console.log(`Creating ${this.storeName} store...`);
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          // Create indexes for searching
          store.createIndex('prompt', 'prompt', { unique: false });
          store.createIndex('seed', 'seed', { unique: false });
          store.createIndex('date', 'date', { unique: false });
          console.log(`${this.storeName} store created successfully`);
        }
      };
    });
  }

  async addImage(imageData) {
    if (!this.db) {
      console.log('ImagesDB not initialized in addImage, initializing now...');
      await this.init();
      console.log('ImagesDB initialized in addImage:', !!this.db);
    }

    return new Promise((resolve, reject) => {
      try {
        if (!this.db) {
          throw new Error('Database is still null after initialization');
        }
        const store = this.db
          .transaction(this.storeName, 'readwrite')
          .objectStore(this.storeName);
        
        const request = store.add(imageData);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async updateImage(imageData) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      try {
        const store = this.db
          .transaction(this.storeName, 'readwrite')
          .objectStore(this.storeName);
        
        const request = store.put(imageData);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async getAllImages() {
    console.log('Getting all images...');
    if (!this.db) {
      console.log(`${this.dbName} not initialized, initializing now...`);
      await this.init();
      console.log(`${this.dbName} initialized:`, !!this.db);
    }

    return new Promise((resolve, reject) => {
      try {
        if (!this.db) {
          throw new Error(`${this.dbName} is still null after initialization`);
        }

        console.log('Creating transaction for images...');
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          const images = request.result || [];
          console.log(`Retrieved ${images.length} images`);
          resolve(images);
        };

        request.onerror = () => {
          console.error('Error getting images:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('Error in getAllImages:', error);
        reject(error);
      }
    });
  }

  async deleteImage(id) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      try {
        const store = this.db
          .transaction(this.storeName, 'readwrite')
          .objectStore(this.storeName);
        
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async getImageById(id) {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      try {
        const store = this.db
          .transaction(this.storeName, 'readonly')
          .objectStore(this.storeName);
        
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async clearAll() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => {
          console.log('Images store cleared successfully');
          resolve();
        };

        request.onerror = () => {
          console.error('Error clearing images store:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('Error in clearAll:', error);
        reject(error);
      }
    });
  }
}

// Export the database instance
const imagesDB = new ImagesDB(); 