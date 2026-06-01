(function() {

  var saved = localStorage.getItem('theme');
  var html = document.documentElement;
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) html.classList.add('dark');
  var themeToggle = document.getElementById('themeToggle');
  function setTheme(mode) {
    if (mode === 'dark') { html.classList.add('dark'); }
    else { html.classList.remove('dark'); }
    localStorage.setItem('theme', mode);
    themeToggle.innerHTML = mode === 'dark'
      ? '<i class="fa-solid fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';
    themeToggle.setAttribute('aria-pressed', mode === 'dark' ? 'true' : 'false');
  }
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      setTheme(html.classList.contains('dark') ? 'light' : 'dark');
      // Canvas chart can't follow CSS theme changes on its own — recolor it.
      if (typeof refreshChartTheme === 'function') refreshChartTheme();
    });
  }
  setTheme(saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light');

  var LANGUAGES = [
    { code:'hi', label:'Hindi', native:'\u0939\u093F\u0928\u094D\u0926\u0940', flag:'in', region:'South Asia', speakers:600 },
    { code:'bn', label:'Bengali', native:'\u09AC\u09BE\u0982\u09B2\u09BE', flag:'in', region:'South Asia', speakers:265 },
    { code:'mr', label:'Marathi', native:'\u092E\u0930\u093E\u0920\u0940', flag:'in', region:'South Asia', speakers:83 },
    { code:'gu', label:'Gujarati', native:'\u0917\u0941\u091C\u0930\u093E\u0924\u0940', flag:'in', region:'South Asia', speakers:55 },
    { code:'pa', label:'Punjabi', native:'\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40', flag:'in', region:'South Asia', speakers:113 },
    { code:'ta', label:'Tamil', native:'\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD', flag:'in', region:'South Asia', speakers:78 },
    { code:'te', label:'Telugu', native:'\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41', flag:'in', region:'South Asia', speakers:82 },
    { code:'kn', label:'Kannada', native:'\u0C95\u0CA8\u0CCD\u0CA8\u0CA1', flag:'in', region:'South Asia', speakers:44 },
    { code:'ml', label:'Malayalam', native:'\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02', flag:'in', region:'South Asia', speakers:35 },
    { code:'ne', label:'Nepali', native:'\u0928\u0947\u092A\u093E\u0932\u0940', flag:'np', region:'South Asia', speakers:16 },
    { code:'si', label:'Sinhala', native:'\u0DC3\u0DD2\u0D82\u0DC4\u0DBD', flag:'lk', region:'South Asia', speakers:22 },
    { code:'ur', label:'Urdu', native:'\u0627\u0631\u062F\u0648', flag:'pk', region:'South Asia', speakers:70 },
    { code:'en', label:'English', native:'English', flag:'us', region:'Europe', speakers:1500 },
    { code:'de', label:'German', native:'Deutsch', flag:'de', region:'Europe', speakers:130 },
    { code:'fr', label:'French', native:'Fran\u00E7ais', flag:'fr', region:'Europe', speakers:310 },
    { code:'es', label:'Spanish', native:'Espa\u00F1ol', flag:'es', region:'Europe', speakers:485 },
    { code:'pt', label:'Portuguese', native:'Portugu\u00EAs', flag:'br', region:'Europe', speakers:230 },
    { code:'it', label:'Italian', native:'Italiano', flag:'it', region:'Europe', speakers:68 },
    { code:'nl', label:'Dutch', native:'Nederlands', flag:'nl', region:'Europe', speakers:24 },
    { code:'sv', label:'Swedish', native:'Svenska', flag:'se', region:'Europe', speakers:10 },
    { code:'da', label:'Danish', native:'Dansk', flag:'dk', region:'Europe', speakers:5.5 },
    { code:'fi', label:'Finnish', native:'Suomi', flag:'fi', region:'Europe', speakers:5.4 },
    { code:'ru', label:'Russian', native:'\u0420\u0443\u0441\u0441\u043A\u0438\u0439', flag:'ru', region:'Europe', speakers:150 },
    { code:'pl', label:'Polish', native:'Polski', flag:'pl', region:'Europe', speakers:40 },
    { code:'uk', label:'Ukrainian', native:'\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430', flag:'ua', region:'Europe', speakers:30 },
    { code:'hu', label:'Hungarian', native:'Magyar', flag:'hu', region:'Europe', speakers:13 },
    { code:'el', label:'Greek', native:'\u0395\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC', flag:'gr', region:'Europe', speakers:13.5 },
    { code:'ca', label:'Catalan', native:'Catal\u00E0', flag:'es', region:'Europe', speakers:10 },
    { code:'cs', label:'Czech', native:'\u010Ce\u0161tina', flag:'cz', region:'Europe', speakers:12 },
    { code:'zh', label:'Chinese', native:'\u4E2D\u6587', flag:'cn', region:'East Asia', speakers:1200 },
    { code:'ja', label:'Japanese', native:'\u65E5\u672C\u8A9E', flag:'jp', region:'East Asia', speakers:125 },
    { code:'ko', label:'Korean', native:'\uD55C\uAD6D\uC5B4', flag:'kr', region:'East Asia', speakers:80 },
    { code:'th', label:'Thai', native:'\u0E44\u0E17\u0E22', flag:'th', region:'Southeast Asia', speakers:60 },
    { code:'vi', label:'Vietnamese', native:'Ti\u1EBFng Vi\u1EC7t', flag:'vn', region:'Southeast Asia', speakers:85 },
    { code:'id', label:'Indonesian', native:'Bahasa Indonesia', flag:'id', region:'Southeast Asia', speakers:200 },
    { code:'ms', label:'Malay', native:'Bahasa Melayu', flag:'my', region:'Southeast Asia', speakers:30 },
    { code:'my', label:'Burmese', native:'\u1019\u103C\u1014\u103A\u1019\u102C', flag:'mm', region:'Southeast Asia', speakers:42 },
    { code:'jw', label:'Javanese', native:'Basa Jawa', flag:'id', region:'Southeast Asia', speakers:69 },
    { code:'tl', label:'Tagalog', native:'Tagalog', flag:'ph', region:'Southeast Asia', speakers:45 },
    { code:'ar', label:'Arabic', native:'\u0627\u0644\u0639\u0631\u0628\u064A\u0629', flag:'sa', region:'Middle East & Central Asia', speakers:310 },
    { code:'fa', label:'Persian', native:'\u0641\u0627\u0631\u0633\u06CC', flag:'ir', region:'Middle East & Central Asia', speakers:60 },
    { code:'tr', label:'Turkish', native:'T\u00FCrk\u00E7e', flag:'tr', region:'Middle East & Central Asia', speakers:80 },
    { code:'he', label:'Hebrew', native:'\u05E2\u05D1\u05E8\u05D9\u05EA', flag:'il', region:'Middle East & Central Asia', speakers:5 },
    { code:'uz', label:'Uzbek', native:"O'zbekcha", flag:'uz', region:'Middle East & Central Asia', speakers:35 }
  ];

  var REGION_PALETTE = {
    'South Asia':              '#ffa946',
    'Europe':                  '#3898ec',
    'Southeast Asia':          '#22a85a',
    'Middle East & Central Asia': '#886dc2',
    'East Asia':               '#ff6c4c'
  };

  var REGION_CODES = Object.keys(REGION_PALETTE);

  var CHART = null;
  var SORT_COL = 'total';
  var SORT_STATE = 1;
  var regionFilter = null;
  var USAGE = { voice: {}, story: {} };
  var fetchFailed = false;
  var loading = true;

  function getRegionColor(lang) {
    return REGION_PALETTE[lang.region] || '#999';
  }

  function hexToRgba(hex, alpha) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var r = parseInt(h.substring(0, 2), 16);
    var g = parseInt(h.substring(2, 4), 16);
    var b = parseInt(h.substring(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function countUp(el, target, duration) {
    duration = duration || 600;
    var start = parseInt(el.textContent) || 0;
    if (start === target) { el.textContent = target; return; }
    var startTime = null;
    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(start + (target - start) * eased);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }

  // Timestamp tracks when the DATA last changed (a new card was created),
  // not when we last polled the server. It stays null until we actually
  // observe a change during this session — so an idle/new user never sees
  // a misleading "just now".
  var lastChangeTime = null;
  var prevSignature = null;
  var hasRenderedOnce = false;

  // Order-independent signature of the counts, so a mere reordering of
  // Redis hash fields between polls is never mistaken for a real change.
  function statsSignature() {
    var parts = [];
    ['voice', 'story'].forEach(function(src) {
      var obj = USAGE[src] || {};
      Object.keys(obj).sort().forEach(function(k) {
        parts.push(src + ':' + k + '=' + obj[k]);
      });
    });
    return parts.join('|');
  }

  function updateLastFetched() {
    var updatedEl = document.getElementById('lastUpdated');
    if (!updatedEl) return;
    if (fetchFailed || loading || lastChangeTime === null) {
      updatedEl.textContent = '';
      return;
    }
    var elapsed = Math.floor((Date.now() - lastChangeTime) / 1000);
    var msg;
    if (elapsed < 10) {
      msg = 'Updated just now';
    } else if (elapsed < 60) {
      msg = 'Updated a few seconds ago';
    } else if (elapsed < 120) {
      msg = 'Updated 1 minute ago';
    } else if (elapsed < 3600) {
      msg = 'Updated ' + Math.floor(elapsed / 60) + ' minutes ago';
    } else if (elapsed < 7200) {
      msg = 'Updated 1 hour ago';
    } else {
      msg = 'Updated ' + Math.floor(elapsed / 3600) + ' hours ago';
    }
    updatedEl.textContent = msg;
  }

  function fetchStats() {
    fetch('/api/lang-stats')
      .then(function(r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function(data) {
        var wasFailed = fetchFailed;
        USAGE.voice = data.voice || {};
        USAGE.story = data.story || {};
        fetchFailed = false;
        loading = false;
        var sig = statsSignature();
        // Only treat as "changed" if we have a prior poll to compare against,
        // so the first successful load doesn't count as a change.
        var changed = (prevSignature !== null && sig !== prevSignature);
        if (changed) lastChangeTime = Date.now();
        prevSignature = sig;
        // Re-render only on first load, real data change, or recovery from a
        // failed poll. Avoids the chart re-animating on every 30s poll.
        if (!hasRenderedOnce || changed || wasFailed) {
          updateView();
          hasRenderedOnce = true;
        }
        updateLastFetched();
      })
      .catch(function() {
        fetchFailed = true;
        loading = false;
        updateView();
        updateLastFetched();
      });
  }

  function getTotal(lang) {
    return (USAGE.voice[lang] || 0) + (USAGE.story[lang] || 0);
  }
  function getVoice(lang) { return USAGE.voice[lang] || 0; }
  function getStory(lang) { return USAGE.story[lang] || 0; }

  // Ranking comparator (for top-3 badges and the chart). Wispr Stories is a
  // voice-first product, so ties on total cards are broken by voice cards
  // (more spoken cards ranks higher), then alphabetically for stability.
  // Each item must expose { total, voice, lang:{ label } }.
  function rankCompare(a, b) {
    return (b.total - a.total)
      || (b.voice - a.voice)
      || a.lang.label.localeCompare(b.lang.label);
  }

  function updateBanner() {
    var total = 0, voice = 0, story = 0, langsUsed = 0;
    LANGUAGES.forEach(function(l) {
      var v = getVoice(l.code);
      var s = getStory(l.code);
      if (v > 0 || s > 0) langsUsed++;
      total += v + s;
      voice += v;
      story += s;
    });
    var dash = '\u2014';
    if (fetchFailed || loading) {
      document.getElementById('statTotal').textContent = dash;
      document.getElementById('statVoice').textContent = dash;
      document.getElementById('statStory').textContent = dash;
      document.getElementById('statLangsUsed').textContent = dash;
    } else {
      // Remove skeleton shimmer
      document.querySelectorAll('.skeleton').forEach(function(el) { el.classList.remove('skeleton'); });
      countUp(document.getElementById('statTotal'), total);
      countUp(document.getElementById('statVoice'), voice);
      countUp(document.getElementById('statStory'), story);
      countUp(document.getElementById('statLangsUsed'), langsUsed);
    }
    // Percentage split
    var pctV = document.getElementById('pctVoice');
    var pctS = document.getElementById('pctStory');
    var splitV = document.getElementById('splitVoice');
    var splitS = document.getElementById('splitStory');
    if (!fetchFailed && !loading && total > 0) {
      var vPct = Math.round((voice / total) * 100);
      var sPct = 100 - vPct;
      if (pctV) pctV.textContent = '(' + vPct + '%)';
      if (pctS) pctS.textContent = '(' + sPct + '%)';
      if (splitV) { splitV.style.width = vPct + '%'; }
      if (splitS) { splitS.style.width = sPct + '%'; }
      // Split bar count labels — only show when segment is wide enough (>12%)
      var vcEl = document.getElementById('splitVoiceCount');
      var scEl = document.getElementById('splitStoryCount');
      if (vcEl) vcEl.textContent = vPct > 12 ? voice.toLocaleString() : '';
      if (scEl) scEl.textContent = sPct > 12 ? story.toLocaleString() : '';
    } else {
      if (pctV) pctV.textContent = '';
      if (pctS) pctS.textContent = '';
      if (splitV) splitV.style.width = '0%';
      if (splitS) splitS.style.width = '0%';
      var vcEl = document.getElementById('splitVoiceCount');
      var scEl = document.getElementById('splitStoryCount');
      if (vcEl) vcEl.textContent = '';
      if (scEl) scEl.textContent = '';
    }
    var errorEl = document.getElementById('fetchError');
    if (errorEl) errorEl.style.display = fetchFailed ? 'flex' : 'none';
    updateLastFetched();
  }

  function renderChart() {
    var allItems = LANGUAGES.map(function(l) {
      return { lang: l, total: getTotal(l.code), voice: getVoice(l.code), story: getStory(l.code) };
    });
    allItems.sort(rankCompare);
    var hasData = allItems.some(function(i) { return i.total > 0; });
    // Chart shows only languages with data to keep x-axis readable
    var items = allItems.filter(function(i) { return i.total > 0; });

    var container = document.getElementById('chartContainer');
    if (!hasData) {
      container.innerHTML = '<div class="empty-state"><i class="fa-regular fa-chart-bar"></i><p>No cards created yet. Start creating to see usage data.</p></div>';
      if (CHART) { CHART.destroy(); CHART = null; }
      return;
    }
    // On narrow screens, give each bar a minimum width so labels stay legible
    // when many languages are present; the chart then scrolls horizontally
    // inside #chartContainer (the legend lives outside it, so it stays put).
    // On wider screens the chart simply fits its container (no scroll).
    var isNarrow = (typeof window.matchMedia === 'function') && window.matchMedia('(max-width: 640px)').matches;
    var boxHeight = isNarrow ? 300 : 400;
    var minBarPx = isNarrow ? 34 : 0;
    var neededWidth = items.length * minBarPx;
    var boxStyle = 'height:' + boxHeight + 'px;' + (neededWidth > 0 ? ('min-width:' + neededWidth + 'px;') : '');
    container.innerHTML = '<div class="chart-canvas-box" style="' + boxStyle + '"><canvas id="langChart"></canvas></div>';

    var labels = items.map(function(i) { return i.lang.label; });
    var data = items.map(function(i) { return i.total; });
    var bgColors = items.map(function(i, idx) {
      var base = getRegionColor(i.lang);
      if (regionFilter && i.lang.region !== regionFilter) {
        return hexToRgba(base, 0.25);
      }
      if (idx === 0 && items.length > 1) {
        return hexToRgba(base, 1);
      }
      return hexToRgba(base, 0.7);
    });
    var borderColors = items.map(function(i, idx) {
      var base = getRegionColor(i.lang);
      if (regionFilter && i.lang.region !== regionFilter) {
        return hexToRgba(base, 0.15);
      }
      if (idx === 0 && items.length > 1) {
        return base;
      }
      return hexToRgba(base, 0.5);
    });

    var ctx = document.getElementById('langChart').getContext('2d');
    if (CHART) CHART.destroy();

    var style = getComputedStyle(document.documentElement);
    var gridColor = style.getPropertyValue('--rule').trim() || 'rgba(26,26,26,0.1)';
    var textColor = style.getPropertyValue('--ink').trim() || '#1a1a1a';

    CHART = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Cards Created',
          data: data,
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: 1,
          borderRadius: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 800,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                var idx = context.dataIndex;
                var item = items[idx];
                return item.lang.label + ' (' + item.lang.region + '): ' + item.total + ' cards';
              },
              afterLabel: function(context) {
                var idx = context.dataIndex;
                var item = items[idx];
                return 'Voice: ' + item.voice + '  Story: ' + item.story;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { size: 10 } }
          },
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: { color: textColor, precision: 0 }
          }
        },
        onHover: function(e, elements) {
          e.native.target.style.cursor = elements.length ? 'pointer' : 'default';
        },
        onClick: function(e, elements) {
          if (elements && elements.length > 0) {
            var idx = elements[0].index;
            if (idx === undefined || idx >= items.length) return;
            var lang = items[idx].lang;
            if (regionFilter === lang.region) {
              regionFilter = null;
            } else {
              regionFilter = lang.region;
            }
            SORT_COL = 'total';
            SORT_STATE = 1;
            // Defer re-render to avoid Chart.js destroy-while-processing crash
            setTimeout(function() {
              renderChart();
              renderTable();
              updateRegionBadge();
              updateChips();
            }, 0);
          }
        }
      }
    });

    var legendEl = document.getElementById('chartLegend');
    if (legendEl) {
      var legendHtml = '';
      REGION_CODES.forEach(function(region) {
        legendHtml += '<span class="legend-item" data-region="' + region + '"><span class="legend-swatch" style="background:' + REGION_PALETTE[region] + '"></span>' + region + '</span>';
      });
      legendEl.innerHTML = legendHtml;
      // Make legend items clickable to filter by region
      legendEl.querySelectorAll('.legend-item').forEach(function(item) {
        item.addEventListener('click', function() {
          var region = this.dataset.region;
          regionFilter = regionFilter === region ? null : region;
          SORT_COL = 'total';
          SORT_STATE = 1;
          renderChart();
          renderTable();
          updateRegionBadge();
          updateChips();
        });
      });
    }
  }

  // The chart is painted on a <canvas>, so (unlike the HTML table/badges that
  // use CSS variables) it can't pick up a dark/light theme switch on its own.
  // Recolor the axis ticks/grid in place when the theme changes. Bar colors are
  // region-based (theme-independent), so only the axis colors need updating.
  function refreshChartTheme() {
    if (!CHART) return;
    var style = getComputedStyle(document.documentElement);
    var gridColor = style.getPropertyValue('--rule').trim() || 'rgba(26,26,26,0.1)';
    var textColor = style.getPropertyValue('--ink').trim() || '#1a1a1a';
    if (CHART.options.scales.x) CHART.options.scales.x.ticks.color = textColor;
    if (CHART.options.scales.y) {
      CHART.options.scales.y.ticks.color = textColor;
      CHART.options.scales.y.grid.color = gridColor;
    }
    CHART.update('none');
  }

  function updateRegionBadge() {
    var badge = document.getElementById('regionBadge');
    var name = document.getElementById('regionName');
    if (!badge || !name) return;
    if (regionFilter) {
      badge.style.display = 'inline-flex';
      var count = LANGUAGES.filter(function(l) { return l.region === regionFilter; }).length;
      name.textContent = regionFilter + ' (' + count + ' languages)';
    } else {
      badge.style.display = 'none';
    }
  }

  function renderTable() {
    var items = LANGUAGES.map(function(l) {
      return { lang: l, voice: getVoice(l.code), story: getStory(l.code), total: getTotal(l.code) };
    });

    if (regionFilter) {
      items = items.filter(function(i) { return i.lang.region === regionFilter; });
    }

    if (SORT_COL && SORT_STATE !== 0) {
      var desc = SORT_STATE === 1;
      if (SORT_COL === 'lang') {
        items.sort(function(a, b) {
          return desc
            ? b.lang.label.localeCompare(a.lang.label)
            : a.lang.label.localeCompare(b.lang.label);
        });
      } else {
        var key = SORT_COL;
        items.sort(function(a, b) {
          return desc ? b[key] - a[key] : a[key] - b[key];
        });
      }
    }

    var hasData = items.some(function(i) { return i.total > 0; });
    // Hide table when no data
    var tableWrap = document.getElementById('tableWrap');
    if (tableWrap) tableWrap.style.display = hasData ? '' : 'none';
    var badgeNote = document.querySelector('.badge-note');
    if (badgeNote) badgeNote.style.display = hasData ? '' : 'none';
    if (!hasData) return;
    var html = '';
    items.forEach(function(i) {
      var v = i.voice, s = i.story, t = i.total;
      var cls = t === 0 ? 'zero-row' : '';
      html += '<tr class="' + cls + '" data-region="' + i.lang.region + '">';
      html += '<td><span class="fi fi-' + i.lang.flag + '"></span>' + i.lang.label + ' <span class="native-name">' + i.lang.native + '</span></td>';
      html += '<td class="num-cell">' + (hasData ? v : '\u2014') + '</td>';
      html += '<td class="num-cell">' + (hasData ? s : '\u2014') + '</td>';
      html += '<td class="num-cell">' + (hasData ? t : '\u2014') + '</td>';
      html += '</tr>';
    });

    if (!regionFilter) {
      var v = getVoice('__native__'), s = getStory('__native__'), t = v + s;
      html += '<tr class="' + (t === 0 ? 'zero-row' : '') + '">';
      html += '<td><span class="native-badge">N</span>Native <span class="native-name">(unsupported languages)</span></td>';
      html += '<td class="num-cell">' + (hasData ? v : '\u2014') + '</td>';
      html += '<td class="num-cell">' + (hasData ? s : '\u2014') + '</td>';
      html += '<td class="num-cell">' + (hasData ? t : '\u2014') + '</td>';
      html += '</tr>';
    }

    // Totals row
    var totV = 0, totS = 0, totT = 0;
    items.forEach(function(i) { totV += i.voice; totS += i.story; totT += i.total; });
    if (!regionFilter) {
      var nv = getVoice('__native__'), ns = getStory('__native__');
      totV += nv; totS += ns; totT += nv + ns;
    }
    if (totT > 0) {
      html += '<tr class="totals-row">';
      html += '<td><strong>Total</strong></td>';
      html += '<td class="num-cell"><strong>' + totV + '</strong></td>';
      html += '<td class="num-cell"><strong>' + totS + '</strong></td>';
      html += '<td class="num-cell"><strong>' + totT + '</strong></td>';
      html += '</tr>';
    }

    document.getElementById('tableBody').innerHTML = html;
    // Update row count
    var countEl = document.getElementById('searchCount');
    if (countEl) {
      var visibleRows = document.querySelectorAll('#tableBody tr:not([style*="display: none"])').length;
      countEl.textContent = visibleRows + ' of ' + LANGUAGES.length;
    }
  }

  function updateView() {
    updateBanner();
    updateInsights();
    renderChart();
    renderTable();
    updateRegionBadge();
  }

  function updateInsights() {
    var allItems = LANGUAGES.map(function(l) {
      return { lang: l, total: getTotal(l.code), voice: getVoice(l.code) };
    }).filter(function(i) { return i.total > 0; });
    allItems.sort(rankCompare);
    var top3 = allItems.slice(0, 3);
    var banner = document.getElementById('insightsBanner');
    var container = document.getElementById('insightsItems');
    if (!banner || !container) return;
    if (top3.length === 0) {
      banner.style.display = 'grid';
      container.innerHTML = '<div class="insight-empty">No cards created yet — start creating to see top languages.</div>';
      return;
    }
    banner.style.display = 'grid';
    // Calculate total across all languages
    var grandTotal = 0;
    LANGUAGES.forEach(function(l) { grandTotal += getTotal(l.code); });
    grandTotal += getTotal('__native__');
    var medals = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
    var html = '';
    top3.forEach(function(item, i) {
      var pct = grandTotal > 0 ? Math.round((item.total / grandTotal) * 100) : 0;
      html += '<div class="insight-item">';
      html += '<span class="insight-rank">' + medals[i] + '</span>';
      html += '<span class="insight-flag fi fi-' + item.lang.flag + '"></span>';
      html += '<span class="insight-info">';
      html += '<span class="insight-name">' + item.lang.label + '</span>';
      html += '<span class="insight-count">' + item.total + ' cards (' + pct + '%)</span>';
      html += '</span></div>';
    });
    container.innerHTML = html;
  }

  fetchStats();
  setInterval(fetchStats, 30000);
  // Tick the relative-time label more often than we poll so it progresses
  // promptly (just now → a few seconds ago → minutes) without extra fetches.
  setInterval(updateLastFetched, 15000);

  document.getElementById('clearRegionFilter')?.addEventListener('click', function() {
    regionFilter = null;
    SORT_COL = 'total';
    SORT_STATE = 1;
    renderChart();
    renderTable();
    updateRegionBadge();
    updateChips();
  });

  // Region chips
  document.querySelectorAll('.region-chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      var region = this.dataset.region;
      regionFilter = region === 'all' ? null : region;
      SORT_COL = 'total';
      SORT_STATE = 1;
      renderChart();
      renderTable();
      updateRegionBadge();
      updateChips();
    });
  });

  // Table row click → filter chart by language's region
  document.getElementById('tableBody').addEventListener('click', function(e) {
    var row = e.target.closest('tr');
    if (!row || !row.dataset.region) return;
    var region = row.dataset.region;
    regionFilter = regionFilter === region ? null : region;
    SORT_COL = 'total';
    SORT_STATE = 1;
    renderChart();
    renderTable();
    updateRegionBadge();
    updateChips();
  });

  function updateChips() {
    // Update active state
    document.querySelectorAll('.region-chip').forEach(function(chip) {
      var region = chip.dataset.region;
      var isActive = (region === 'all' && !regionFilter) || region === regionFilter;
      chip.classList.toggle('active', isActive);
    });
    // Update counts
    var counts = {};
    LANGUAGES.forEach(function(l) {
      counts[l.region] = (counts[l.region] || 0) + 1;
    });
    var totalLangs = LANGUAGES.length;
    var countMap = {
      'all': totalLangs,
      'South Asia': counts['South Asia'] || 0,
      'Europe': counts['Europe'] || 0,
      'East Asia': counts['East Asia'] || 0,
      'Southeast Asia': counts['Southeast Asia'] || 0,
      'Middle East & Central Asia': counts['Middle East & Central Asia'] || 0
    };
    Object.keys(countMap).forEach(function(key) {
      var el = document.getElementById('chip' + key.replace(/[^a-zA-Z]/g, ''));
      if (el) el.textContent = '(' + countMap[key] + ')';
    });
  }

  // Table search
  var searchInput = document.getElementById('tableSearch');
  var noResults = document.getElementById('noResults');
  searchInput?.addEventListener('input', function() {
    var query = this.value.toLowerCase().trim();
    var visibleCount = 0;
    document.querySelectorAll('#tableBody tr').forEach(function(row) {
      var text = row.textContent.toLowerCase();
      var match = text.includes(query);
      // Respect the zero-rows toggle: never show a zero-row when showZeros is off
      var shouldShow = match && (showZeros || !row.classList.contains('zero-row'));
      row.style.display = shouldShow ? '' : 'none';
      if (shouldShow) visibleCount++;
    });
    if (noResults) noResults.style.display = visibleCount === 0 && query ? 'flex' : 'none';
  });

  // Zero rows toggle
  var zeroToggle = document.getElementById('zeroToggle');
  var showZeros = false;
  zeroToggle?.addEventListener('change', function() {
    showZeros = this.checked;
    renderTable();
  });

  // Override renderTable to respect showZeros
  var origRenderTable = renderTable;
  renderTable = function() {
    origRenderTable();
    if (!showZeros) {
      document.querySelectorAll('#tableBody tr.zero-row').forEach(function(row) {
        row.style.display = 'none';
      });
    }
    // Re-apply search filter, still respecting showZeros
    if (searchInput && searchInput.value.trim()) {
      var query = searchInput.value.toLowerCase().trim();
      var visibleCount = 0;
      document.querySelectorAll('#tableBody tr').forEach(function(row) {
        var match = row.textContent.toLowerCase().includes(query);
        var shouldShow = match && (showZeros || !row.classList.contains('zero-row'));
        row.style.display = shouldShow ? '' : 'none';
        if (shouldShow) visibleCount++;
      });
      if (noResults) noResults.style.display = visibleCount === 0 ? 'flex' : 'none';
    }
  };

  // Top language badges are display-only — no click interaction.

  // Show table header when data loads
  var tableHeader = document.getElementById('tableHeader');
  if (tableHeader) {
    var origUpdateView = updateView;
    updateView = function() {
      origUpdateView();
      var hasData = LANGUAGES.some(function(l) { return getTotal(l.code) > 0; });
      if (tableHeader) tableHeader.style.display = hasData ? 'flex' : 'none';
    };
  }

  // Back to top button
  var backToTop = document.getElementById('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', function() {
      backToTop.classList.toggle('visible', window.scrollY > 300);
    });
    backToTop.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function showToast(msg) {
    var t = document.createElement('div');
    t.className = 'toast-msg';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function() { t.classList.add('show'); }, 10);
    setTimeout(function() { t.classList.remove('show'); setTimeout(function() { t.remove(); }, 300); }, 2000);
  }

  function applySort(th) {
    var key = th.dataset.sort;
    if (SORT_COL === key) {
      SORT_STATE = (SORT_STATE + 1) % 3;
    } else {
      SORT_COL = key;
      SORT_STATE = 1;
    }
    document.querySelectorAll('th').forEach(function(t) {
      t.classList.remove('sorted', 'sorted-asc', 'sorted-desc');
      t.removeAttribute('aria-sort');
    });
    if (SORT_STATE !== 0) {
      th.classList.add('sorted');
      var isDesc = SORT_STATE === 1;
      th.classList.add(isDesc ? 'sorted-desc' : 'sorted-asc');
      th.setAttribute('aria-sort', isDesc ? 'descending' : 'ascending');
    }
    renderTable();
  }

  document.querySelectorAll('th[data-sort]').forEach(function(th) {
    th.addEventListener('click', function() { applySort(th); });
    // Keyboard support: headers are focusable (tabindex=0), so Enter/Space
    // must trigger the same sort a click does.
    th.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        applySort(th);
      }
    });
  });

  // Apply initial sort state to header
  (function() {
    var initialTh = document.querySelector('th[data-sort="' + SORT_COL + '"]');
    if (initialTh && SORT_STATE !== 0) {
      initialTh.classList.add('sorted', SORT_STATE === 1 ? 'sorted-desc' : 'sorted-asc');
      initialTh.setAttribute('aria-sort', SORT_STATE === 1 ? 'descending' : 'ascending');
    }
  })();

})();
