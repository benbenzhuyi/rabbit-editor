/* ═══════════════════════════════════════════════════════
   小野兔 Rabbit Web — Browser Capability Detection
   ═══════════════════════════════════════════════════════ */

const capabilities = {
  hasDirectoryPicker: 'showDirectoryPicker' in window,
  hasFilePicker: 'showOpenFilePicker' in window,
  hasSavePicker: 'showSaveFilePicker' in window,
  hasOPFS: 'storage' in navigator && 'getDirectory' in (navigator.storage || {}),
  needsPermissionRestore: false,
  pwaAvailable: 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window,
  platform: (() => {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'chrome';
    if (ua.includes('Edg')) return 'edge';
    if (ua.includes('Firefox')) return 'firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'safari';
    return 'unknown';
  })(),
};

export function getCapabilities() { return { ...capabilities }; }

export function supportsNativeFS() {
  return capabilities.hasDirectoryPicker || capabilities.hasFilePicker;
}

export function supportsDirectory() {
  return capabilities.hasDirectoryPicker;
}

export function supportsSingleFile() {
  return capabilities.hasFilePicker;
}

export function canSaveDirectly() {
  return capabilities.hasSavePicker;
}

export function isPWA() {
  return window.matchMedia('(display-mode: standalone)').matches;
}
