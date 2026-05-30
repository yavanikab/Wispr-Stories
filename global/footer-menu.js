(() => {
  // ── Fonts ──
  if (!document.querySelector('link[href*="Space+Grotesk"]')) {
    const preconnect1 = document.createElement("link");
    preconnect1.rel = "preconnect";
    preconnect1.href = "https://fonts.googleapis.com";
    document.head.appendChild(preconnect1);

    const preconnect2 = document.createElement("link");
    preconnect2.rel = "preconnect";
    preconnect2.href = "https://fonts.gstatic.com";
    preconnect2.crossOrigin = "anonymous";
    document.head.appendChild(preconnect2);

    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href =
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap";
    document.head.appendChild(fontLink);
  }

  // ── Styles ──
  const style = document.createElement("style");
  style.textContent = `
    .fmenu-root {
      --fmenu-bg: #2a2a2a;
      --fmenu-border: rgba(255, 255, 235, 0.12);
      --fmenu-text: #c0c0b0;
      --fmenu-text-dim: #a0a090;
      --fmenu-accent: #f59e0b;
      --fmenu-toggle-color: #a0a090;
      --fmenu-font-main: "Space Grotesk", sans-serif;
      --fmenu-font-mono: "Space Mono", monospace;
      --fmenu-text-tag: clamp(0.65rem, 0.8vw, 0.75rem);
      --fmenu-text-ui: clamp(0.7rem, 1vw, 1rem);
      --fmenu-z-menu: 100;
      position: relative;
    }

    :root:not(.dark) .fmenu-root {
      --fmenu-bg: #f5f1e6;
      --fmenu-border: rgba(26, 26, 26, 0.12);
      --fmenu-text: #555548;
      --fmenu-text-dim: #77776a;
      --fmenu-toggle-color: #555548;
    }

    .fmenu-toggle {
      font-family: var(--fmenu-font-mono);
      font-size: var(--fmenu-text-tag);
      color: var(--fmenu-toggle-color);
      font-weight: 700;
      text-transform: uppercase;
      text-decoration: none;
      cursor: pointer;
      transition: color 0.2s;
    }

    .fmenu-toggle:hover {
      color: var(--fmenu-accent);
    }

    .fmenu-toggle:focus-visible {
      outline: 2px solid var(--fmenu-accent);
      outline-offset: 2px;
      border-radius: 2px;
    }

    .fmenu-panel {
      position: absolute;
      bottom: calc(100% + 8px);
      right: 0;
      left: auto;
      background: var(--fmenu-bg);
      border: 1px solid var(--fmenu-border);
      border-radius: 4px;
      padding: 8px 0;
      z-index: var(--fmenu-z-menu);
      min-width: 200px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .fmenu-panel.hidden {
      display: none;
    }

    .fmenu-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 16px;
      color: var(--fmenu-text);
      text-decoration: none;
      font-family: var(--fmenu-font-main);
      font-size: 0.875rem;
      cursor: pointer;
      transition: color 0.15s;
    }

    .footer .fmenu-link:hover,
    .fmenu-link:hover {
      color: var(--fmenu-accent);
    }

    .fmenu-link i {
      width: 16px;
      text-align: center;
      flex-shrink: 0;
    }

    @media (max-width: 768px) {
      .fmenu-root {
        display: none;
      }
    }

    .fmenu-version {
      display: none;
      padding: 10px 16px 8px;
      border-top: 1px solid var(--fmenu-border);
      line-height: 1.4;
    }
    .fmenu-version.loaded {
      display: block;
    }
    .fmenu-version-number {
      display: block;
      font-family: var(--sans);
      font-size: 0.6rem;
      color: var(--fmenu-text-dim);
    }
    .fmenu-version-name {
      display: block;
      font-family: var(--sans);
      font-size: 0.6rem;
      color: var(--fmenu-text);
    }
  `;
  document.head.appendChild(style);

  // ── HTML ──
  const wrapper = document.createElement("span");
  wrapper.className = "fmenu-root";
  wrapper.innerHTML = `
    <a
      href="#"
      id="fmenu-toggle"
      class="fmenu-toggle"
      rel="noopener noreferrer"
      aria-label="Open menu"
      aria-expanded="false"
    >[ <i class="fa-solid fa-question"></i> ]</a>

    <div class="fmenu-panel hidden" id="fmenu-panel">
      <a href="https://buymeacoffee.com/yg_labs" class="fmenu-link" target="_blank" rel="noopener noreferrer">
        <i class="fa-solid fa-hand-holding-heart"></i> Support Here
      </a>
      <a href="https://medium.com/" class="fmenu-link" rel="noopener noreferrer" target="_blank">
        <i class="fa-brands fa-medium"></i> Read Articles
      </a>
     
      <a href="mailto:yellowgreenlabs@proton.me?subject=Wispr%20Stories%20Feedback" class="fmenu-link">
        <i class="fa-solid fa-pen-clip"></i> Submit Issues
      </a>
      <a href="#" class="fmenu-link" id="fmenu-help">
        <i class="fa-solid fa-circle-question"></i> How to Use
      </a>
      <a href="about.html" class="fmenu-link">
        <i class="fa-solid fa-book-open"></i> About
      </a>
      <a href="language-stats.html" class="fmenu-link">
        <i class="fa-solid fa-chart-simple"></i> Lang Stats
      </a>
      <a href="#" class="fmenu-link">
        <i class="fa-solid fa-file-shield"></i> License & Terms
      </a>
      <div class="fmenu-version" id="fmenu-version">
        <span class="fmenu-version-number" id="fmenu-version-number"></span>
        <span class="fmenu-version-name">Wispr Stories</span>
      </div>
    </div>
  `;

  // <a href="language-stats.html" class="fmenu-link">
      //   <i class="fa-solid fa-chart-simple"></i> Lang Stats
      // </a>
      // <a href="#" class="fmenu-link">
      //   <i class="fa-solid fa-book-open"></i> About
      // </a>
      // <a href="#" class="fmenu-link">
      //   <i class="fa-solid fa-clock-rotate-left"></i> Version Notes
      // </a>
      // <a href="#" class="fmenu-link">
      //   <i class="fa-solid fa-pen-clip"></i> Submit Feedback
      // </a>

  document.currentScript
    ? document.currentScript.parentNode.insertBefore(
        wrapper,
        document.currentScript
      )
    : document.body.appendChild(wrapper);

  // ── Behaviour ──
  const toggle = wrapper.querySelector("#fmenu-toggle");
  const panel = wrapper.querySelector("#fmenu-panel");

  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    const isHidden = panel.classList.toggle("hidden");
    toggle.setAttribute("aria-expanded", String(!isHidden));
  });

  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) {
      panel.classList.add("hidden");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  wrapper.querySelector("#fmenu-help")?.addEventListener("click", (e) => {
    e.preventDefault();
    panel.classList.add("hidden");
    toggle.setAttribute("aria-expanded", "false");
    if (typeof window.showOnboarding === "function") window.showOnboarding();
  });

  window.addEventListener("scroll", () => {
    panel.classList.add("hidden");
    toggle.setAttribute("aria-expanded", "false");
  }, { passive: true });

  // ── Version ──
  const versionDiv = wrapper.querySelector("#fmenu-version");
  const versionSpan = wrapper.querySelector("#fmenu-version-number");

  fetch("VERSION_HISTORY.md")
    .then(r => r.ok ? r.text() : Promise.reject())
    .then(text => {
      const match = text.match(/^## v(\d+\.\d+\.\d+)/m);
      if (match) {
        versionSpan.textContent = "v" + match[1];
        versionDiv.classList.add("loaded");
      }
    })
    .catch(() => {});
})();
