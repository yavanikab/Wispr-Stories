/* Wispr Stories — About page scripts */
(function() {
  /* --- Theme --- */
  var saved = localStorage.getItem('theme');
  var html = document.documentElement;
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) html.classList.add('dark');
  var themeToggle = document.getElementById('themeToggle');
  function setTheme(mode) {
    if (mode === 'dark') html.classList.add('dark');
    else html.classList.remove('dark');
    localStorage.setItem('theme', mode);
    themeToggle.innerHTML = mode === 'dark'
      ? '<i class="fa-solid fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';
    themeToggle.setAttribute('aria-pressed', mode === 'dark' ? 'true' : 'false');
  }
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      setTheme(html.classList.contains('dark') ? 'light' : 'dark');
    });
  }
  setTheme(saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light');

  /* --- Smooth accordion with keyboard navigation --- */
  var faqButtons = document.querySelectorAll('.faq-q');

  faqButtons.forEach(function(q) {
    q.addEventListener('click', function() {
      toggleFaq(this);
    });

    q.addEventListener('keydown', function(e) {
      var buttons = Array.from(faqButtons);
      var idx = buttons.indexOf(this);

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (idx < buttons.length - 1) buttons[idx + 1].focus();
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (idx > 0) buttons[idx - 1].focus();
          break;
        case 'Home':
          e.preventDefault();
          buttons[0].focus();
          break;
        case 'End':
          e.preventDefault();
          buttons[buttons.length - 1].focus();
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          toggleFaq(this);
          break;
      }
    });
  });

  function toggleFaq(btn) {
    var item = btn.parentElement;
    var answer = btn.nextElementSibling;
    var isOpen = item.classList.contains('open');

    /* Close all other items */
    document.querySelectorAll('.faq-item.open').forEach(function(otherItem) {
      if (otherItem !== item) {
        otherItem.classList.remove('open');
        otherItem.querySelector('.faq-q').classList.remove('open');
        otherItem.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
        var otherAnswer = otherItem.querySelector('.faq-a');
        if (otherAnswer) {
          otherAnswer.style.maxHeight = '0';
          otherAnswer.classList.remove('open');
        }
      }
    });

    if (isOpen) {
      item.classList.remove('open');
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      if (answer) {
        answer.style.maxHeight = '0';
        answer.classList.remove('open');
      }
    } else {
      item.classList.add('open');
      btn.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      if (answer) {
        answer.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
      /* Auto-scroll if item is partially off-screen */
      var rect = item.getBoundingClientRect();
      if (rect.bottom > window.innerHeight || rect.top < 0) {
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  /* --- Page load fade-in --- */
  document.body.classList.add('loaded');

  /* --- Scroll reveal (IntersectionObserver) --- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function(el) { observer.observe(el); });
  } else {
    /* Fallback: show everything immediately */
    reveals.forEach(function(el) { el.classList.add('visible'); });
  }

  /* --- Count-up animation for stat numbers --- */
  function animateCountUp(el) {
    var text = el.textContent.trim();
    var match = text.match(/^(\d+)/);
    if (!match) return;
    var target = parseInt(match[0], 10);
    var suffix = text.slice(match[0].length);
    var duration = 900;
    var start = performance.now();
    function step(now) {
      var t = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      var current = Math.round(eased * target);
      el.textContent = current + suffix;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var countUps = document.querySelectorAll('.feature-value');
  if ('IntersectionObserver' in window && countUps.length) {
    var countObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          animateCountUp(entry.target);
          countObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    countUps.forEach(function(el) { countObserver.observe(el); });
  }

  /* --- Auto-wave: continuous wave animation for "Wispr Flow" --- */
  function initAutoWave() {
    var el = document.querySelector('.wispr-wave');
    if (!el) return;
    var text = el.textContent;
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || window.innerWidth <= 720) return;
    el.innerHTML = '';
    var charIdx = 0;
    for (var i = 0; i < text.length; i++) {
      if (text[i] === ' ') {
        el.appendChild(document.createTextNode(' '));
      } else {
        var span = document.createElement('span');
        span.textContent = text[i];
        span.style.animationDelay = (charIdx * 0.06) + 's';
        el.appendChild(span);
        charIdx++;
      }
    }
  }
  initAutoWave();

  /* --- Footer hover wave (same as main page) --- */
  function initFooterWave() {
    if (window.innerWidth <= 720) return;
    var els = document.querySelectorAll('.wave-on-hover');
    els.forEach(function(el) {
      if (el.dataset.waveBound) return;
      el.dataset.waveBound = 'true';
      el.dataset.waveHtml = el.innerHTML;
      el.dataset.waveText = el.textContent;
      el.addEventListener('mouseenter', function() { applyWaveOnce(this); });
      el.addEventListener('mouseleave', function() { restoreWaveText(this); });
      el.addEventListener('focus', function() { applyWaveOnce(this); });
      el.addEventListener('blur', function() { restoreWaveText(this); });
    });
  }
  function applyWaveOnce(el) {
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || el.dataset.waveInit === 'true') return;
    var text = el.dataset.waveText;
    el.innerHTML = '';
    var idx = 0;
    for (var i = 0; i < text.length; i++) {
      if (text[i] === ' ') {
        el.appendChild(document.createTextNode(' '));
      } else {
        var s = document.createElement('span');
        s.textContent = text[i];
        s.style.display = 'inline-block';
        s.style.animation = 'wave-letter 0.7s ease-in-out ' + (idx * 0.05) + 's 1';
        el.appendChild(s);
        idx++;
      }
    }
    el.dataset.waveInit = 'true';
  }
  function restoreWaveText(el) {
    if (!el.dataset.waveInit) return;
    el.innerHTML = el.dataset.waveHtml || '';
    delete el.dataset.waveInit;
  }
  initFooterWave();

  /* --- Nav scroll shadow --- */
  var navEl = document.querySelector('.nav');
  if (navEl) {
    window.addEventListener('scroll', function() {
      navEl.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  /* --- Back to top --- */
  var backToTop = document.getElementById('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 300) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    }, { passive: true });
    backToTop.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* --- Auto-expand FAQ from hash --- */
  if (location.hash) {
    var target = document.querySelector(location.hash);
    if (target) {
      var btn = target.querySelector('.faq-q');
      if (btn) {
        btn.click();
        requestAnimationFrame(function() {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
    }
  }
})();
