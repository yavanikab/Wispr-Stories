(function() {

  var saved = localStorage.getItem('theme');
  var html = document.documentElement;
  if (saved === 'dark') html.classList.add('dark');
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
    });
  }
  setTheme(saved === 'dark' ? 'dark' : 'light');

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
    'South Asia':              '#c48409',
    'Europe':                  '#3b82f6',
    'Southeast Asia':          '#22a85a',
    'Middle East & Central Asia': '#8b5cf6',
    'East Asia':               '#dc2626'
  };

  var REGION_CODES = Object.keys(REGION_PALETTE);

  var CHART = null;
  var SORT_COL = null;
  var SORT_STATE = 0;
  var regionFilter = null;
  var USAGE = { voice: {}, story: {} };

  function getRegionColor(lang) {
    return REGION_PALETTE[lang.region] || '#999';
  }

  function renderRegions() {
    var regions = {};
    LANGUAGES.forEach(function(l) {
      if (!regions[l.region]) regions[l.region] = [];
      regions[l.region].push(l);
    });
    var html = '';
    REGION_CODES.forEach(function(r) {
      html += '<div class="region-group"><strong>' + r + '</strong>';
      var langs = regions[r] || [];
      for (var i = 0; i < langs.length; i++) {
        if (i < langs.length - 1) {
          html += '<span class="region-chunk">' + langs[i].label + ' \u00b7</span> ';
        } else {
          html += '<span class="region-chunk">' + langs[i].label + '</span>';
        }
      }
      html += '</div>';
    });
    document.getElementById('regionList').innerHTML = html;
  }
  renderRegions();

  function fetchStats() {
    fetch('/api/lang-stats')
      .then(function(r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function(data) {
        USAGE.voice = data.voice || {};
        USAGE.story = data.story || {};
        updateView();
      })
      .catch(function() {
        updateView();
      });
  }

  function getTotal(lang) {
    return (USAGE.voice[lang] || 0) + (USAGE.story[lang] || 0);
  }
  function getVoice(lang) { return USAGE.voice[lang] || 0; }
  function getStory(lang) { return USAGE.story[lang] || 0; }

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
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statVoice').textContent = voice;
    document.getElementById('statStory').textContent = story;
    document.getElementById('statLangsUsed').textContent = langsUsed;
  }

  function renderChart() {
    var allItems = LANGUAGES.map(function(l) {
      return { lang: l, total: getTotal(l.code), voice: getVoice(l.code), story: getStory(l.code) };
    });
    allItems.sort(function(a, b) { return b.total - a.total || a.lang.label.localeCompare(b.lang.label); });
    var hasData = allItems.some(function(i) { return i.total > 0; });
    // Chart shows only languages with data to keep x-axis readable
    var items = allItems.filter(function(i) { return i.total > 0; });

    var container = document.getElementById('chartContainer');
    if (!hasData) {
      container.innerHTML = '<div class="empty-state"><i class="fa-regular fa-chart-bar"></i><p>No cards created yet. Start creating to see usage data.</p></div>';
      if (CHART) { CHART.destroy(); CHART = null; }
      return;
    }
    container.innerHTML = '<canvas id="langChart"></canvas>';

    var labels = items.map(function(i) { return i.lang.label; });
    var data = items.map(function(i) { return i.total; });
    var bgColors = items.map(function(i) {
      var base = getRegionColor(i.lang);
      if (regionFilter && i.lang.region !== regionFilter) {
        return base.replace(')', ' / 0.25)');
      }
      return base;
    });
    var borderColors = items.map(function(i) {
      var base = getRegionColor(i.lang);
      if (regionFilter && i.lang.region !== regionFilter) {
        return base.replace(')', ' / 0.15)');
      }
      return base;
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
            SORT_COL = null;
            SORT_STATE = 0;
            // Defer re-render to avoid Chart.js destroy-while-processing crash
            setTimeout(function() {
              renderChart();
              renderTable();
              updateRegionBadge();
            }, 0);
          }
        }
      }
    });
  }

  function updateRegionBadge() {
    var badge = document.getElementById('regionBadge');
    var name = document.getElementById('regionName');
    if (!badge || !name) return;
    if (regionFilter) {
      badge.style.display = 'inline-flex';
      name.textContent = regionFilter;
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
    var html = '';
    items.forEach(function(i) {
      var v = i.voice, s = i.story, t = i.total;
      var cls = t === 0 ? 'zero-row' : '';
      html += '<tr class="' + cls + '">';
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

    document.getElementById('tableBody').innerHTML = html;
  }

  function updateView() {
    updateBanner();
    renderChart();
    renderTable();
    updateRegionBadge();
  }

  fetchStats();
  setInterval(fetchStats, 30000);

  document.getElementById('clearRegionFilter')?.addEventListener('click', function() {
    regionFilter = null;
    SORT_COL = null;
    SORT_STATE = 0;
    renderChart();
    renderTable();
    updateRegionBadge();
  });

  document.querySelectorAll('th[data-sort]').forEach(function(th) {
    th.addEventListener('click', function() {
      var key = th.dataset.sort;
      if (SORT_COL === key) {
        SORT_STATE = (SORT_STATE + 1) % 3;
      } else {
        SORT_COL = key;
        SORT_STATE = 1;
      }
      document.querySelectorAll('th').forEach(function(t) {
        t.classList.remove('sorted', 'sorted-asc', 'sorted-desc');
      });
      if (SORT_STATE !== 0) {
        th.classList.add('sorted');
        var isLang = SORT_COL === 'lang';
        var isDesc = SORT_STATE === 1;
        if (isLang) {
          th.classList.add(isDesc ? 'sorted-asc' : 'sorted-desc');
        } else {
          th.classList.add(isDesc ? 'sorted-desc' : 'sorted-asc');
        }
      }
      renderTable();
    });
  });

})();
