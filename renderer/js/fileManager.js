/* ═══════════════════════════════════════════════════════
   小野兔 Rabbit — File Manager Module
   ═══════════════════════════════════════════════════════ */

import * as App from './app.js';
import * as Editor from './editor.js';

// File operations are defined in app.js to access global state.
// This module provides the wiring and helpers.

// Re-export for convenience — calls go to App (main state holder)
export async function saveFile() {
  await App.saveFile();
}

// Handle drag-and-drop
export function initDragDrop(element) {
  element.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  });

  element.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    const ext = file.name.split('.').pop().toLowerCase();
    const textExts = ['md', 'txt', 'html', 'htm', 'json', 'js', 'css', 'xml', 'yaml', 'yml', 'csv', 'log', 'rst', 'tex', 'py', 'java', 'c', 'cpp', 'h', 'sh'];
    const isBinary = ['exe', 'dll', 'zip', 'rar', '7z', 'png', 'jpg', 'jpeg', 'gif', 'mp3', 'mp4', 'pdf', 'ico', 'bin'].includes(ext);
    if (isBinary) {
      alert('不支持二进制文件');
      return;
    }

    // Read the dropped file
    const reader = new FileReader();
    reader.onload = async () => {
      if (App.getIsModified()) {
        const choice = await window.electronAPI.confirmClose();
        if (choice === 0) {
          await App.saveFile();
        } else if (choice === 2) {
          return;
        }
      }
      Editor.setContent(reader.result);
      // For dropped files, we don't have a real path, so set to null
      App.setCurrentFilePath(null);
      App.setIsModified(true);
    };
    reader.readAsText(file);
  });
}
