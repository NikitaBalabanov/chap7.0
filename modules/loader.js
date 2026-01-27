export function createFullscreenLoader() {
  let loader = document.getElementById("fullscreen-loader");
  if (loader) return loader;

  loader = document.createElement("div");
  loader.id = "fullscreen-loader";
  loader.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 9990;
  `;

  const spinner = document.createElement("div");
  spinner.style.cssText = `
    width: 50px;
    height: 50px;
    border: 4px solid rgba(255, 242, 54, 0.3);
    border-top-color: #FFF236;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  `;

  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  loader.appendChild(spinner);
  document.body.appendChild(loader);
  return loader;
}

export function showFullscreenLoader() {
  const loader = createFullscreenLoader();
  loader.style.display = "flex";
}

export function hideFullscreenLoader() {
  const loader = document.getElementById("fullscreen-loader");
  if (loader) {
    loader.style.display = "none";
  }
}
