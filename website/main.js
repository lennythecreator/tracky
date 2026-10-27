const routeDiagram = document.querySelector('#route-diagram');
const traceButton = document.querySelector('#trace-button');
const traceStatus = document.querySelector('#trace-status');
const copyStatus = document.querySelector('#copy-status');
let traceTimer;

traceButton?.addEventListener('click', () => {
  if (!routeDiagram || !traceStatus) return;
  window.clearTimeout(traceTimer);
  routeDiagram.classList.remove('is-tracing');
  void routeDiagram.offsetWidth;
  routeDiagram.classList.add('is-tracing');
  traceStatus.textContent = 'Preview: an example event moves through the flow. No data is sent.';
  traceTimer = window.setTimeout(() => {
    routeDiagram.classList.remove('is-tracing');
    traceStatus.textContent = 'Illustration only · no data is sent';
  }, 1450);
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

document.querySelectorAll('.mobile-nav-panel a').forEach((link) => {
  link.addEventListener('click', () => {
    const menu = link.closest('details');
    if (menu) menu.open = false;
  });
});
