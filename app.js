(() => {
  'use strict';

  const DATA_URL = './data/predictions.json';
  const FALLBACK = 'Nincs adat a JSON-ban';

  const state = {
    bundle: null,
    matches: [],
    activeView: 'matches',
    focusedBeforeSheet: null,
    drag: {
      active: false,
      startY: 0,
      currentY: 0,
      startTime: 0,
      fromHandle: false
    }
  };

  const els = {
    matchList: document.getElementById('matchList'),
    riskGrid: document.getElementById('riskGrid'),
    matchesView: document.getElementById('matchesView'),
    riskView: document.getElementById('riskView'),
    navButtons: Array.from(document.querySelectorAll('.nav-button')),
    overlay: document.getElementById('sheetOverlay'),
    sheet: document.getElementById('matchSheet'),
    sheetClose: document.getElementById('sheetClose'),
    sheetContent: document.getElementById('sheetContent')
  };

  const NAME_REPLACEMENTS = [
    ['Bosnia and Herzegovina', 'Bosznia-Hercegovina'],
    ['United States', 'Egyesült Államok'],
    ['DR Congo', 'Kongói Demokratikus Köztársaság'],
    ['Cape Verde', 'Zöld-foki Köztársaság'],
    ['Mexico City Stadium', 'Mexikóvárosi Stadion'],
    ['Mexico City', 'Mexikóváros'],
    ['Mexico', 'Mexikó'],
    ['England', 'Anglia'],
    ['Belgium', 'Belgium'],
    ['Senegal', 'Szenegál'],
    ['Ecuador', 'Ecuador'],
    ['Spain', 'Spanyolország'],
    ['Austria', 'Ausztria'],
    ['Portugal', 'Portugália'],
    ['Croatia', 'Horvátország'],
    ['Switzerland', 'Svájc'],
    ['Algeria', 'Algéria'],
    ['Australia', 'Ausztrália'],
    ['Egypt', 'Egyiptom'],
    ['Argentina', 'Argentína'],
    ['Colombia', 'Kolumbia'],
    ['Ghana', 'Ghána']
  ];

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const safe = (value, fallback = FALLBACK) => {
    if (value === null || value === undefined || value === '') return fallback;
    return naturalize(String(value));
  };

  const pct = (value) => (Number.isFinite(Number(value)) ? `${Number(value)}%` : FALLBACK);
  const labelledPct = (label, value) => `${label}: ${pct(value)}`;

  function replaceNames(text) {
    let output = String(text ?? '');
    NAME_REPLACEMENTS.forEach(([from, to]) => {
      output = output.replace(new RegExp(escapeRegExp(from), 'g'), to);
    });
    return output;
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function naturalize(text) {
    return replaceNames(String(text ?? ''))
      .replace(/\s+vs\s+/gi, ' – ')
      .replace(/BTTS Yes/gi, 'Mindkét csapat szerez gólt: igen')
      .replace(/BTTS No/gi, 'Mindkét csapat szerez gólt: nem')
      .replace(/\bBTTS\b/gi, 'Mindkét csapat szerez gólt')
      .replace(/Under\s*2\.5/gi, '2,5 gól alatt')
      .replace(/Over\s*2\.5/gi, '2,5 gól felett')
      .replace(/\bDNB\b/g, 'Döntetlen esetén visszajár')
      .replace(/Double chance/gi, 'Dupla esély')
      .replace(/\b1X2\b/g, 'Kimenetel')
      .replace(/Qualifier/gi, 'Továbbjutó')
      .replace(/Correct score/gi, 'Pontos eredmény')
      .replace(/Unexpected tip/gi, 'Váratlan tipp')
      .replace(/Extra time/gi, 'Hosszabbítás')
      .replace(/Penalties/gi, 'Büntetők')
      .replace(/Clean sheet/gi, 'Kapott gól nélkül')
      .replace(/Confidence/gi, 'Esély')
      .replace(/Bizalom/g, 'Esély')
      .replace(/bizalom/g, 'esély')
      .replace(/Risk/gi, 'Kockázat')
      .replace(/Group form/gi, 'Csoportforma')
      .replace(/Last20/gi, 'utolsó 20 meccs')
      .replace(/last20/gi, 'utolsó 20 meccs')
      .replace(/H2H/gi, 'egymás elleni')
      .replace(/head to head/gi, 'egymás elleni')
      .replace(/óvatos becslés/gi, 'becslés')
      .replace(/óvatosan/gi, '')
      .replace(/óvatos/gi, '')
      .replace(/team_a/g, 'első csapat')
      .replace(/team_b/g, 'második csapat')
      .replace(/Stadium/g, 'Stadion')
      .replace(/underes/gi, '2,5 gól alatti')
      .replace(/overes/gi, '2,5 gól feletti')
      .replace(/Kapott gól nélkül sor/g, 'kapott gól nélküli sor')
      .replace(/A számított kép szerint /g, '')
      .replace(/A egymás elleni/g, 'Az egymás elleni')
      .replace(/egymás elleni-ben/g, 'egymás elleni meccseken')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function bttsLabel(value) {
    const raw = typeof value === 'object' ? value?.pick : value;
    const normalized = String(raw ?? '').trim().toLowerCase();
    if (['yes', 'igen', 'i'].includes(normalized)) return 'Igen';
    if (['no', 'nem', 'n'].includes(normalized)) return 'Nem';
    return safe(raw);
  }

  function goalLabel(value) {
    const raw = typeof value === 'object' ? value?.pick : value;
    return safe(raw);
  }

  function displayTitle(match) {
    return safe(match?.title || `${match?.teams?.team_a?.name || ''} – ${match?.teams?.team_b?.name || ''}`);
  }

  function displayTeam(value) {
    return safe(value);
  }

  function formatHungaryDate(raw) {
    if (!raw) return FALLBACK;
    const cleaned = String(raw).replace(' Europe/Budapest', '').trim();
    const [date, time] = cleaned.split(' ');
    if (!date || !time) return safe(raw);
    const [, month, day] = date.split('-');
    return `${month}.${day}. ${time}`;
  }

  function scoreText(match) {
    const scores = Array.isArray(match?.correct_score_tips) ? match.correct_score_tips : [];
    if (!scores.length) return FALLBACK;
    return scores.map((item) => item?.score).filter(Boolean).join(' / ') || FALLBACK;
  }

  function sanitizeDirectFact(item) {
    const text = safe(item);
    if (/eltilt/i.test(text) || /fegyelmi/i.test(text) || /Elo/i.test(text) || /FIFA-rang/i.test(text)) return null;

    const last20 = text.match(/^(.+?) utolsó 20 meccs:\s*([^,.;]+)/i);
    if (last20) return `${last20[1]} utolsó 20 meccs: ${last20[2]}.`;

    const rest = text.match(/^Pihenő:\s*([^;]+)/i);
    if (rest) return `Pihenő: ${rest[1]}.`;

    return text;
  }

  function sanitizeEstimate(item) {
    return safe(item)
      .replace(/\s*becslés\s*/gi, ' ')
      .replace(/Pontos eredmény esély/i, 'Pontos eredmény esélye')
      .replace(/Összesített predikciós esély/i, 'Összesített predikciós esély')
      .replace(/\s*:\s*/g, ': ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }


  function sanitizeRisk(item) {
    const text = safe(item);
    if (/eltilt|fegyelmi/i.test(text)) return null;
    return text;
  }

  function shortenScenario(text) {
    const value = safe(text);
    if (value === FALLBACK) return value;
    const sentences = value.match(/[^.!?]+[.!?]+/g) || [value];
    let shortened = sentences.slice(0, 2).join(' ').trim();
    if (shortened.length > 260) shortened = `${shortened.slice(0, 257).trim()}…`;
    return shortened;
  }

  async function loadData() {
    try {
      const response = await fetch(DATA_URL, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bundle = await response.json();
      if (!Array.isArray(bundle.matches)) throw new Error('Hiányzó matches tömb');
      state.bundle = bundle;
      state.matches = [...bundle.matches].sort((a, b) => Number(a.match_no_chronological || 0) - Number(b.match_no_chronological || 0));
      renderAll();
      registerServiceWorker();
    } catch (error) {
      renderError(error);
    }
  }

  function renderAll() {
    renderMatches();
    renderRiskView();
  }

  function renderMatches() {
    els.matchList.innerHTML = state.matches.map((match, index) => {
      const prediction = match?.predictions || {};
      const one = prediction.one_x_two || {};
      const venue = [match?.fixture?.city, match?.fixture?.venue].filter(Boolean).join(' · ');
      return `
        <button class="match-card" type="button" data-match-id="${escapeHtml(match.match_id)}" style="animation-delay:${index * 42}ms" aria-label="${escapeHtml(displayTitle(match))} részletei">
          <div class="card-top">
            <span class="time-text">${escapeHtml(formatHungaryDate(match?.fixture?.kickoff_hungary))}</span>
          </div>
          <h3 class="card-title">${escapeHtml(displayTitle(match))}</h3>
          <div class="pick-row">
            <div class="pick-label">
              <small>Kimenetel</small>
              <strong>${escapeHtml(safe(one.label))}</strong>
            </div>
            <span class="badge">${escapeHtml(labelledPct('Esély', one.confidence_pct))}</span>
          </div>
          <div class="card-meta">
            <div class="meta-pill"><small>Gólirány</small><span>${escapeHtml(goalLabel(prediction.total_2_5))}</span></div>
            <div class="meta-pill"><small>Pontos eredmény</small><span>${escapeHtml(scoreText(match))}</span></div>
            <div class="meta-pill"><small>Mindkét csapat szerez gólt</small><span>${escapeHtml(bttsLabel(prediction.btts))}</span></div>
            <div class="meta-pill"><small>Helyszín</small><span>${escapeHtml(safe(venue))}</span></div>
          </div>
        </button>
      `;
    }).join('');

    els.matchList.querySelectorAll('.match-card').forEach((card) => {
      card.addEventListener('click', () => openMatch(card.dataset.matchId));
    });
  }

  function renderRiskView() {
    const panels = [
      {
        title: 'Döntetlen esélye',
        items: getRiskSorted('draw').slice(0, 5),
        getValue: (m) => Number(m?.predictions?.extra_time_chance_pct || 0),
        valueLabel: (m) => labelledPct('Esély', m?.predictions?.extra_time_chance_pct),
        reason: (m) => `A JSON alapján itt magasabb a rendes játékidős döntetlen kockázata.`
      },
      {
        title: 'Váratlan kimenetel esélye',
        items: getRiskSorted('upset').slice(0, 5),
        getValue: (m) => Number(m?.pwa?.sort_scores?.upset_risk_score || 0),
        valueLabel: (m) => labelledPct('Kockázat', m?.pwa?.sort_scores?.upset_risk_score),
        reason: (m) => shortRiskReason(m?.unexpected_tip?.tip || 'A váratlan tipp ennél a meccsnél erősebb kilengést jelez.')
      },
      {
        title: 'Alacsonyabb predikciós esély',
        items: getLowestConfidence().slice(0, 5),
        getValue: (m) => Math.max(0, 100 - Number(m?.confidence?.overall_prediction_pct || 0)),
        valueLabel: (m) => labelledPct('Összesített esély', m?.confidence?.overall_prediction_pct),
        reason: (m) => 'Az összesített esély alacsonyabb, ezért a fő tipp kevésbé stabil.'
      }
    ];

    els.riskGrid.innerHTML = panels.map((panel) => `
      <article class="risk-panel">
        <h3>${escapeHtml(panel.title)}</h3>
        ${panel.items.map((match) => {
          const value = Math.max(0, Math.min(100, Number(panel.getValue(match) || 0)));
          return `
            <button class="risk-item risk-item-large" type="button" data-match-id="${escapeHtml(match.match_id)}" aria-label="${escapeHtml(displayTitle(match))} részletei">
              <span class="risk-main">
                <span class="risk-title">${escapeHtml(displayTitle(match))}</span>
                <span class="risk-time">${escapeHtml(formatHungaryDate(match?.fixture?.kickoff_hungary))}</span>
                <span class="risk-note">${escapeHtml(panel.reason(match))}</span>
                <span class="risk-meter" aria-hidden="true"><span style="width:${value}%"></span></span>
              </span>
              <span class="badge">${escapeHtml(panel.valueLabel(match))}</span>
            </button>
          `;
        }).join('')}
      </article>
    `).join('');

    els.riskGrid.querySelectorAll('.risk-item').forEach((item) => {
      item.addEventListener('click', () => openMatch(item.dataset.matchId));
    });
  }

  function shortRiskReason(value) {
    const text = safe(value);
    if (text === FALLBACK) return 'A JSON váratlan forgatókönyvet is jelez ennél a meccsnél.';
    const compact = text.replace(/\.$/, '');
    return compact.length > 92 ? `${compact.slice(0, 89).trim()}…` : compact;
  }

  function getRiskSorted(type) {
    const key = type === 'draw' ? 'extra_time_risk_score' : 'upset_risk_score';
    return [...state.matches].sort((a, b) => Number(b?.pwa?.sort_scores?.[key] || 0) - Number(a?.pwa?.sort_scores?.[key] || 0));
  }

  function getLowestConfidence() {
    return [...state.matches].sort((a, b) => Number(a?.confidence?.overall_prediction_pct || 999) - Number(b?.confidence?.overall_prediction_pct || 999));
  }

  function openMatch(matchId) {
    const match = state.matches.find((item) => item.match_id === matchId);
    if (!match) return;
    state.focusedBeforeSheet = document.activeElement;
    els.sheetContent.innerHTML = renderSheet(match);
    els.overlay.hidden = false;
    els.sheet.hidden = false;
    els.sheet.style.transform = '';
    els.overlay.style.opacity = '';
    requestAnimationFrame(() => {
      els.overlay.classList.add('is-open');
      els.sheet.classList.add('is-open');
      els.sheetContent.focus({ preventScroll: true });
    });
    document.body.style.overflow = 'hidden';
  }

  function closeSheet() {
    state.drag.active = false;
    els.sheet.classList.remove('is-dragging');
    els.sheet.style.transform = '';
    els.overlay.style.opacity = '';
    els.overlay.classList.remove('is-open');
    els.sheet.classList.remove('is-open');
    document.body.style.overflow = '';
    window.setTimeout(() => {
      els.overlay.hidden = true;
      els.sheet.hidden = true;
      els.sheetContent.innerHTML = '';
      if (state.focusedBeforeSheet && typeof state.focusedBeforeSheet.focus === 'function') {
        state.focusedBeforeSheet.focus({ preventScroll: true });
      }
    }, 280);
  }

  function renderSheet(match) {
    const pred = match?.predictions || {};
    const one = pred.one_x_two || {};
    const unexpected = match?.unexpected_tip || {};
    const scenario = match?.match_scenario || {};
    const reasoning = match?.prediction_reasoning || {};
    const risks = Array.isArray(match?.risks) ? match.risks : [];
    const scores = Array.isArray(match?.correct_score_tips) ? match.correct_score_tips : [];
    const venue = [match?.fixture?.venue, match?.fixture?.city].filter(Boolean).join(' · ');

    return `
      <h2 class="sheet-title" id="sheetTitle">${escapeHtml(displayTitle(match))}</h2>
      <p class="sheet-subtitle">${escapeHtml(formatHungaryDate(match?.fixture?.kickoff_hungary))} · ${escapeHtml(safe(venue))}<br>Továbbjutó tipp: <strong>${escapeHtml(displayTeam(pred?.qualifier?.pick || pred?.qualifier))}</strong></p>

      <section class="sheet-section">
        <h3>Fő predikciók</h3>
        <div class="pred-grid">
          ${predBox('Kimenetel', `${safe(one.label)} · ${labelledPct('Esély', one.confidence_pct)}`)}
          ${predBox('Dupla esély', safe(pred?.double_chance?.label || pred?.double_chance?.pick))}
          ${predBox('Döntetlen esetén visszajár', safe(pred?.dnb?.pick || pred?.dnb))}
          ${predBox('Mindkét csapat szerez gólt', bttsLabel(pred?.btts))}
          ${predBox('Gólirány', goalLabel(pred?.total_2_5))}
          ${predBox('Hosszabbítás', labelledPct('Esély', pred?.extra_time_chance_pct))}
          ${predBox('Büntetők', labelledPct('Esély', pred?.penalties_chance_pct))}
          ${predBox('Esély', pct(match?.confidence?.overall_prediction_pct))}
        </div>
      </section>

      <section class="sheet-section">
        <h3>Pontos eredmény</h3>
        <ul class="score-list">
          ${scores.length ? scores.map((score, index) => `
            <li><strong>${index + 1}. ${escapeHtml(safe(score.score))}</strong><br>${escapeHtml(safe(score.reason))}</li>
          `).join('') : `<li>${FALLBACK}</li>`}
        </ul>
      </section>

      <section class="sheet-section">
        <h3>Váratlan tipp</h3>
        <div class="pred-grid">
          ${predBox('Tipp', safe(unexpected.tip))}
          ${predBox('Kockázati szint', safe(unexpected.risk_level))}
          ${predBox('Esély', pct(unexpected.confidence_pct))}
          ${predBox('Miért váratlan?', safe(unexpected.why_unexpected))}
        </div>
        <ul class="score-list"><li><strong>Miért védhető?</strong><br>${escapeHtml(safe(unexpected.why_defensible))}</li></ul>
      </section>

      <section class="sheet-section">
        <h3>Legvalószínűbb forgatókönyv</h3>
        <p class="story-text">${escapeHtml(shortenScenario(scenario.most_likely_scenario_text))}</p>
      </section>

      <section class="sheet-section">
        <h3>Adatalap</h3>
        ${reasonBlock('Közvetlenül kiolvasható adatok', reasoning.directly_readable_from_json, sanitizeDirectFact)}
        ${reasonBlock('Becslések', reasoning.cautious_estimates, sanitizeEstimate)}
      </section>

      <section class="sheet-section">
        <h3>Kockázatok</h3>
        <ul class="risk-list">
          ${renderRiskItems(risks)}
        </ul>
      </section>
    `;
  }

  function renderRiskItems(risks) {
    const list = Array.isArray(risks) ? risks.map(sanitizeRisk).filter(Boolean) : [];
    return list.length ? list.map((risk) => `<li>${escapeHtml(risk)}</li>`).join('') : `<li>${FALLBACK}</li>`;
  }

  function predBox(label, value) {
    return `<div class="pred-box"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>`;
  }

  function reasonBlock(title, items, transform = safe) {
    const list = Array.isArray(items) ? items.map(transform).filter(Boolean) : [];
    return `
      <details class="reason-block">
        <summary>${escapeHtml(title)}</summary>
        <ul class="reason-list">
          ${list.length ? list.map((item) => `<li>${escapeHtml(item)}</li>`).join('') : `<li>${FALLBACK}</li>`}
        </ul>
      </details>
    `;
  }

  function renderError(error) {
    els.matchList.innerHTML = `
      <article class="error-card">
        <h2>Nem sikerült betölteni az adatokat</h2>
        <p>A <strong>data/predictions.json</strong> fájl nem olvasható vagy nem érvényes. Részlet: ${escapeHtml(error.message || 'ismeretlen hiba')}</p>
        <button class="retry-button" type="button" id="retryButton">Újrapróbálás</button>
      </article>
    `;
    document.getElementById('retryButton')?.addEventListener('click', loadData);
  }

  function setView(view) {
    state.activeView = view;
    const showRisk = view === 'risk';
    els.matchesView.classList.toggle('is-active', !showRisk);
    els.riskView.classList.toggle('is-active', showRisk);
    els.navButtons.forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setupSheetGestures() {
    const resetDrag = () => {
      state.drag.active = false;
      els.sheet.classList.remove('is-dragging');
      els.sheet.style.transform = '';
      els.overlay.style.opacity = '';
    };

    els.sheet.addEventListener('touchstart', (event) => {
      if (els.sheet.hidden || event.touches.length !== 1) return;
      const target = event.target;
      const fromHandle = Boolean(target.closest('.sheet-handle'));
      const fromContentTop = Boolean(target.closest('.sheet-content')) && els.sheetContent.scrollTop <= 0;
      if (!fromHandle && !fromContentTop) return;

      const y = event.touches[0].clientY;
      state.drag = {
        active: true,
        startY: y,
        currentY: y,
        startTime: Date.now(),
        fromHandle
      };
      els.sheet.classList.add('is-dragging');
    }, { passive: true });

    els.sheet.addEventListener('touchmove', (event) => {
      if (!state.drag.active || event.touches.length !== 1) return;
      if (!state.drag.fromHandle && els.sheetContent.scrollTop > 0) {
        resetDrag();
        return;
      }

      const y = event.touches[0].clientY;
      const delta = Math.max(0, y - state.drag.startY);
      state.drag.currentY = y;
      if (delta <= 0) return;

      event.preventDefault();
      const limited = Math.min(delta, Math.round(window.innerHeight * 0.55));
      els.sheet.style.transform = `translate(-50%, ${limited}px)`;
      els.overlay.style.opacity = String(Math.max(0.18, 1 - limited / 360));
    }, { passive: false });

    const endDrag = () => {
      if (!state.drag.active) return;
      const delta = Math.max(0, state.drag.currentY - state.drag.startY);
      const elapsed = Math.max(1, Date.now() - state.drag.startTime);
      const velocity = delta / elapsed;
      if (delta > 105 || velocity > 0.55) {
        closeSheet();
      } else {
        resetDrag();
      }
    };

    els.sheet.addEventListener('touchend', endDrag, { passive: true });
    els.sheet.addEventListener('touchcancel', resetDrag, { passive: true });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
  }

  els.navButtons.forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
  els.overlay.addEventListener('click', closeSheet);
  els.sheetClose.addEventListener('click', closeSheet);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !els.sheet.hidden) closeSheet();
  });
  setupSheetGestures();
  loadData();
})();
