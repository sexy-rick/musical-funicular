(() => {
  const button = document.getElementById('web-install-button');
  const status = document.getElementById('web-install-status');
  if (!button || !status) return;
  let pending = null;
  let installing = false;
  let installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (installed) status.textContent = 'The website is open as an app.';
  window.addEventListener('beforeinstallprompt', event => {
    if (installed || installing) return;
    event.preventDefault();
    pending = event;
    button.hidden = false;
    status.textContent = '';
  });
  button.addEventListener('click', async () => {
    if (!pending || installing) return;
    const prompt = pending;
    pending = null;
    installing = true;
    button.hidden = true;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (!installed) status.textContent = choice && choice.outcome === 'accepted'
        ? 'Follow Chrome’s installation prompt.'
        : 'Installation was dismissed. Use Chrome’s menu to try again.';
    } catch (_) {
      if (!installed) status.textContent = 'Could not open the install prompt. Use Chrome’s menu to try again.';
    } finally { installing = false; }
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    pending = null;
    button.hidden = true;
    status.textContent = 'Website app installed.';
  });
})();
