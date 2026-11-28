// No caching or request interception: the hosting security check remains intact.
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('/sw-v16.js', {scope:'/', updateViaCache:'none'}).catch(() => {
    // The hosting provider or browser may block registration; browsing still works.
  });
}
