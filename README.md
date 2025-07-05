# ImageFX Magic

A Chrome extension for saving and managing prompts and images from Google Labs Image FX.

## Features

- **Save Everything**: Easily save prompts, seeds, and generated images from Google Labs Image FX with a single click.
- **Local Storage**: All your data is stored securely on your local machine using IndexedDB, ensuring privacy and offline access.
- **Context Menu Integration**: Add images to your collection directly from any Image FX page using the right-click context menu.
- **Powerful Search**: Quickly find any saved image by searching through prompts, seeds, or custom tags.
- **Organize with Tags & Comments**: Add custom tags and comments to your saved images for better organization and context.
- **Data Portability**: Export your entire collection to a JSON file for backup, or import a previously saved collection.
- **User-Friendly Interface**: A clean, intuitive popup interface for viewing and managing your saved images, with both light and dark modes.

## Installation

1.  **Download the Extension**:
    *   Clone this repository: `git clone https://github.com/your-username/imagefx-magic.git`
    *   Or download the ZIP and extract it to a local folder.

2.  **Load into Chrome**:
    *   Open Google Chrome and navigate to `chrome://extensions/`.
    *   Enable **"Developer mode"** using the toggle in the top-right corner.
    *   Click the **"Load unpacked"** button.
    *   Select the directory where you cloned or extracted the extension files.

3.  **Ready to Use**:
    *   The **ImageFX Magic** icon will appear in your Chrome toolbar. You can pin it for easy access.

## Usage

1.  **Navigate to Image FX**: Visit any image generation page on Google Labs Image FX (e.g., `https://labs.google/fx/tools/image-fx/...`).
2.  **Save an Image**: Right-click anywhere on the page and select **"Add Image"** from the context menu. A notification will confirm that the image has been saved.
3.  **View Your Collection**: Click the **ImageFX Magic** icon in your toolbar to open the popup. Here you can:
    *   See all your saved images in a grid view.
    *   Use the search bar to filter by prompt, seed, or tags (use `#tagname` for tags).
    *   Click on popular tags to quickly filter your collection.
    *   **Open**: View the original Image FX page for a saved image.
    *   **Edit**: Change the title, prompt, add comments, or manage tags.
    *   **Copy Prompt**: Quickly copy the prompt text to your clipboard.
    *   **Delete**: Remove an image from your collection.
4.  **Export/Import**: Use the "Export" and "Import" buttons in the popup to save or load your collection from a JSON file.

## Development

The extension is built with standard web technologies and is structured for easy development.

*   `manifest.json`: The core configuration file for the extension, defining permissions, scripts, and other metadata.
*   `background.js`: The service worker that handles background tasks, such as creating the context menu and managing database operations.
*   `content.js`: A script injected into Image FX pages to extract image data (prompt, seed, image URL) and display notifications.
*   `db.js`: A utility class that manages all interactions with the IndexedDB database.
*   `popup.html` / `popup.js`: The HTML structure and JavaScript logic for the extension's user interface, including state management, rendering, and event handling.

### Contributing

Contributions are welcome! If you have ideas for new features or improvements, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
