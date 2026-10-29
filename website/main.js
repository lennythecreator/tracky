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
const installChip = document.querySelector('#install-command');
const installTimer = document.querySelector('#install-chip-timer');

// Long enough for the chip's wipe to read, even though the copy resolves in a few milliseconds.
const CHIP_MIN_RUN_MS = 650;
let installResetTimer;

const formatMs = (ms) => (ms < 10000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`);

function setInstallLabel(text, label) {
  if (!installButton) return;
  installButton.textContent = text;
  installButton.setAttribute('aria-label', label);
}

function resetInstallChip() {
  if (installChip) installChip.dataset.status = 'idle';
  setInstallLabel('Copy', 'Copy the install command');
  if (installTimer) installTimer.textContent = '—';
}

installButton?.addEventListener('click', async () => {
  if (installChip?.dataset.status === 'running') return;
  const command = installCommand?.textContent?.trim();
  if (!command) return;
  window.clearTimeout(installResetTimer);

  const startedAt = performance.now();
  if (installChip) {
    installChip.dataset.status = 'running';
    installChip.setAttribute('aria-busy', 'true');
  }
  let frame = requestAnimationFrame(function tick() {
    if (installTimer) installTimer.textContent = formatMs(performance.now() - startedAt);
    frame = requestAnimationFrame(tick);
  });

  let failed = false;
  try {
    await navigator.clipboard.writeText(command);
  } catch {
    failed = true;
  }

  const settledAt = performance.now() - startedAt;
  await new Promise((resolve) => window.setTimeout(resolve, Math.max(0, CHIP_MIN_RUN_MS - settledAt)));
  cancelAnimationFrame(frame);
  if (installChip) installChip.removeAttribute('aria-busy');
  if (installTimer) installTimer.textContent = formatMs(performance.now() - startedAt);

  if (failed) {
    if (installChip) installChip.dataset.status = 'error';
    setInstallLabel('Try again', 'Try again to copy the install command');
    if (copyStatus) copyStatus.textContent = 'Clipboard access is unavailable. Select the command and copy it.';
    installResetTimer = window.setTimeout(resetInstallChip, 3600);
    return;
  }

  if (installChip) installChip.dataset.status = 'done';
  setInstallLabel('Copied', 'Install command copied to clipboard');
  if (copyStatus) copyStatus.textContent = 'Install command copied to clipboard.';
  installResetTimer = window.setTimeout(resetInstallChip, 2400);
});

document.querySelectorAll('.mobile-nav-panel a').forEach((link) => {
  link.addEventListener('click', () => {
    const menu = link.closest('details');
    if (menu) menu.open = false;
  });
});
