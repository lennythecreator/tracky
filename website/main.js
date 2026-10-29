const routeDiagram = document.querySelector('#route-diagram');
const traceButton = document.querySelector('#trace-button');
const traceButtonLabel = document.querySelector('#trace-button-label');
const copyStatus = document.querySelector('#copy-status');

traceButton?.addEventListener('click', () => {
  if (!routeDiagram) return;
  const paused = routeDiagram.classList.toggle('is-paused');
  traceButton.classList.toggle('is-paused', paused);
  traceButton.setAttribute('aria-label', paused ? 'Play the event flow animation' : 'Pause the event flow animation');
  if (traceButtonLabel) traceButtonLabel.textContent = paused ? 'Play animation' : 'Pause animation';
});

document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    const targetId = button.getAttribute('data-copy');
    const code = targetId ? document.querySelector(`#${CSS.escape(targetId)} code`) : null;
    if (!code || !copyStatus) return;
    try {
      await navigator.clipboard.writeText(code.textContent ?? '');
      button.textContent = 'Copied';
      copyStatus.textContent = 'Quick-start code copied to clipboard.';
    } catch {
      button.textContent = 'Select code to copy';
      copyStatus.textContent = 'Clipboard access is unavailable. Select the code block and copy it.';
    }
    window.setTimeout(() => { button.textContent = 'Copy code'; }, 2200);
  });
});

const installButton = document.querySelector('[data-copy-install]');
const installCommand = document.querySelector('#install-command-code');

installButton?.addEventListener('click', async () => {
  const command = installCommand?.textContent?.trim();
  if (!command) return;
  try {
    await navigator.clipboard.writeText(command);
    installButton.textContent = 'Copied';
    if (copyStatus) copyStatus.textContent = 'Install command copied to clipboard.';
  } catch {
    installButton.textContent = 'Select to copy';
    if (copyStatus) copyStatus.textContent = 'Clipboard access is unavailable. Select the command and copy it.';
  }
  window.setTimeout(() => { installButton.textContent = 'Copy'; }, 2200);
});

document.querySelectorAll('.mobile-nav-panel a').forEach((link) => {
  link.addEventListener('click', () => {
    const menu = link.closest('details');
    if (menu) menu.open = false;
  });
});
