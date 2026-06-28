(() => {
  'use strict';

  const DATA_URL = './data/predictions.json';
  const FALLBACK = 'Nincs adat a JSON-ban';

  const state = {
    bundle: null,
    matches: [],
    activeView: 'matches',
    focusedBeforeSheet: null
  };

  const els = {
    loadStatus: document.getElementById('loadStatus'),
    summaryStrip: document.getElementById('summaryStrip'),
    matchList: document.getElementById('matchList'),
    riskGrid: document.getElementById('riskGrid'),
    matchesView: document.getElementById('matchesView'),
    riskView: document.getElementById('riskView'),
    navButtons: Array.from(document.querySelectorAll('.nav-button')),
    methodCard: document.getElementById('methodCard'),
    methodToggle: document.getElementById('methodToggle'),
    methodContent: document.getElementById('methodContent'),
    overlay: document.getElementById('sheetOverlay'),
    sheet: document.getElementById('matchSheet'),
    sheetClose: document.getElementById('sheetClose'),
    sheetContent: document.getElementById('sheetContent')
  };

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

  function naturalize(text) {
    return String(text ?? '')
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
      .replace(/Confidence/gi, 'Bizalom')
      .replace(/Risk/gi, 'Kockázat')
      .replace(/Group form/gi, 'Csoportforma')
      .replace(/Last20/gi, 'Utolsó 20 meccs');
  }

  function bttsLabel(value) {
    const raw = typeof value === 'object' ? value?.pick : value;
    const normalized = String(raw ?? '').trim().toLowerCase();
    if (['yes', 'igen', 'i'].includes(normalized)) return 'Mindkét csapat szerez gólt: igen';
    if (['no', 'nem', 'n'].includes(normalized)) return 'Mindkét csapat szerez gólt: nem';
    return `Mindkét csapat szerez gólt: ${safe(raw).toLowerCase()}`;
  }

  function goalLabel(value) {
    const raw = typeof value === 'object' ? value?.pick : value;
    return safe(raw);
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

  function translateTag(tag) {
    const map = {
      stable_favorite: 'stabil favorit',
      high_confidence: 'magas bizalom',
      medium_confidence: 'közepes bizalom',
      low_confidence: 'alacsonyabb bizalom',
      under_2_5_candidate: '2,5 alatt jelölt',
      over_2_5_candidate: '2,5 felett jelölt',
      btts_no_candidate: 'gólváltás: nem',
      btts_yes_candidate: 'gólváltás: igen',
      home_context_edge: 'helyszínelőny',
      draw_risk: 'döntetlenkockázat',
      upset_risk: 'váratlan kockázat',
      extra_time_risk: 'hosszabbításveszély',
      penalties_risk: 'büntetőkveszély'
    };
    return map[tag] || naturalize(String(tag || '').replaceAll('_', ' '));
  }

  async function loadData() {
    try {
      setLoading();
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

  function setLoading() {
    els.loadStatus.textContent = 'Adatok betöltése…';
  }

  function renderAll() {
    const count = state.matches.length;
    els.loadStatus.textContent = `${count} / 10 meccs betöltve`;
    renderSummary();
    renderMatches();
    renderRiskView();
    renderMethod();
  }

  function renderSummary() {
    const matches = state.matches;
    const strongCount = matches.filter((m) => Number(m?.predictions?.one_x_two?.confidence_pct) >= 65).length;
    const underCount = matches.filter((m) => /under/i.test(String(m?.predictions?.total_2_5?.pick || ''))).length;
    const overCount = matches.filter((m) => /over/i.test(String(m?.predictions?.total_2_5?.pick || ''))).length;
    const biggestRisk = getRiskSorted('upset').at(0)?.title || getLowestConfidence().at(0)?.title || FALLBACK;

    const tiles = [
      { value: matches.length, label: 'meccs időrendben' },
      { value: strongCount, label: 'erősebb fő tipp' },
      { value: `${underCount}/${overCount}`, label: '2,5 alatt / felett' },
      { value: 'Top', label: `legnagyobb kockázat: ${biggestRisk}` }
    ];

    els.summaryStrip.innerHTML = tiles.map((tile) => `
      <article class="summary-tile">
        <strong>${escapeHtml(tile.value)}</strong>
        <span>${escapeHtml(tile.label)}</span>
      </article>
    `).join('');
  }

  function renderMatches() {
    els.matchList.innerHTML = state.matches.map((match, index) => {
      const prediction = match?.predictions || {};
      const one = prediction.one_x_two || {};
      const tags = (match?.pwa?.tags || []).slice(0, 4);
      const venue = [match?.fixture?.city, match?.fixture?.venue].filter(Boolean).join(' · ');
      return `
        <button class="match-card" type="button" data-match-id="${escapeHtml(match.match_id)}" style="animation-delay:${index * 42}ms" aria-label="${escapeHtml(match.title)} részletei">
          <div class="card-top">
            <span class="match-number">#${escapeHtml(match.match_no_chronological || index + 1)}</span>
            <span class="time-text">${escapeHtml(formatHungaryDate(match?.fixture?.kickoff_hungary))}</span>
          </div>
          <h3 class="card-title">${escapeHtml(safe(match.title))}</h3>
          <div class="pick-row">
            <div class="pick-label">
              <small>Kimenetel</small>
              <strong>${escapeHtml(safe(one.label))}</strong>
            </div>
            <span class="badge">${escapeHtml(pct(one.confidence_pct))}</span>
          </div>
          <div class="card-meta">
            <div class="meta-pill"><small>Gólirány</small><span>${escapeHtml(goalLabel(prediction.total_2_5))}</span></div>
            <div class="meta-pill"><small>Pontos eredmény</small><span>${escapeHtml(scoreText(match))}</span></div>
            <div class="meta-pill"><small>Gólváltás</small><span>${escapeHtml(bttsLabel(prediction.btts))}</span></div>
            <div class="meta-pill"><small>Helyszín</small><span>${escapeHtml(safe(venue))}</span></div>
          </div>
          <div class="tag-row" aria-label="Jelölések">
            ${tags.map((tag) => `<span class="mini-badge">${escapeHtml(translateTag(tag))}</span>`).join('')}
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
      { title: 'Magasabb hosszabbítási esély', items: getRiskSorted('extra').slice(0, 5), getValue: (m) => pct(m?.predictions?.extra_time_chance_pct) },
      { title: 'Magasabb büntető esély', items: getRiskSorted('penalties').slice(0, 5), getValue: (m) => pct(m?.predictions?.penalties_chance_pct) },
      { title: 'Váratlan kockázat', items: getRiskSorted('upset').slice(0, 5), getValue: (m) => pct(m?.pwa?.sort_scores?.upset_risk_score) },
      { title: 'Alacsonyabb összbizalom', items: getLowestConfidence().slice(0, 5), getValue: (m) => pct(m?.confidence?.overall_prediction_pct) }
    ];

    els.riskGrid.innerHTML = panels.map((panel) => `
      <article class="risk-panel">
        <h3>${escapeHtml(panel.title)}</h3>
        ${panel.items.map((match) => `
          <button class="risk-item" type="button" data-match-id="${escapeHtml(match.match_id)}" aria-label="${escapeHtml(match.title)} részletei">
            <span><strong>${escapeHtml(safe(match.title))}</strong><br>${escapeHtml(formatHungaryDate(match?.fixture?.kickoff_hungary))}</span>
            <span class="badge">${escapeHtml(panel.getValue(match))}</span>
          </button>
        `).join('')}
      </article>
    `).join('');

    els.riskGrid.querySelectorAll('.risk-item').forEach((item) => {
      item.addEventListener('click', () => openMatch(item.dataset.matchId));
    });
  }

  function getRiskSorted(type) {
    const key = type === 'extra' ? 'extra_time_risk_score' : type === 'penalties' ? 'penalties_risk_score' : 'upset_risk_score';
    return [...state.matches].sort((a, b) => Number(b?.pwa?.sort_scores?.[key] || 0) - Number(a?.pwa?.sort_scores?.[key] || 0));
  }

  function getLowestConfidence() {
    return [...state.matches].sort((a, b) => Number(a?.confidence?.overall_prediction_pct || 999) - Number(b?.confidence?.overall_prediction_pct || 999));
  }

  function renderMethod() {
    const methodology = state.bundle?.methodology || {};
    const source = state.bundle?.source_policy || {};
    const factors = Array.isArray(methodology.weighted_factors) ? methodology.weighted_factors : [];
    els.methodCard.hidden = false;
    els.methodContent.innerHTML = `
      <p>${escapeHtml(safe(methodology.confidence_scale_note, 'A százalékok predikciós bizalmi szintek.'))}</p>
      <p><strong>Forrás:</strong> ${escapeHtml(safe(source.source_file || source.source_file_uploaded_name))}</p>
      <p><strong>Külső adat:</strong> ${source.internet_used ? 'igen' : 'nem'} · <strong>Odds:</strong> ${source.external_odds_used ? 'igen' : 'nem'}</p>
      ${factors.length ? `<ul>${factors.slice(0, 8).map((item) => `<li>${escapeHtml(safe(item))}</li>`).join('')}</ul>` : ''}
    `;
  }

  function openMatch(matchId) {
    const match = state.matches.find((item) => item.match_id === matchId);
    if (!match) return;
    state.focusedBeforeSheet = document.activeElement;
    els.sheetContent.innerHTML = renderSheet(match);
    els.overlay.hidden = false;
    els.sheet.hidden = false;
    requestAnimationFrame(() => {
      els.overlay.classList.add('is-open');
      els.sheet.classList.add('is-open');
      els.sheetContent.focus({ preventScroll: true });
    });
    document.body.style.overflow = 'hidden';
  }

  function closeSheet() {
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
      <h2 class="sheet-title" id="sheetTitle">${escapeHtml(safe(match.title))}</h2>
      <p class="sheet-subtitle">${escapeHtml(formatHungaryDate(match?.fixture?.kickoff_hungary))} · ${escapeHtml(safe(venue))}<br>Továbbjutó tipp: <strong>${escapeHtml(safe(pred?.qualifier?.pick || pred?.qualifier))}</strong></p>

      <section class="sheet-section">
        <h3>Fő predikciók</h3>
        <div class="pred-grid">
          ${predBox('Kimenetel', `${safe(one.label)} · ${pct(one.confidence_pct)}`)}
          ${predBox('Dupla esély', safe(pred?.double_chance?.label || pred?.double_chance?.pick))}
          ${predBox('Döntetlen esetén visszajár', safe(pred?.dnb?.pick || pred?.dnb))}
          ${predBox('Mindkét csapat szerez gólt', bttsLabel(pred?.btts))}
          ${predBox('Gólirány', goalLabel(pred?.total_2_5))}
          ${predBox('Hosszabbítás', pct(pred?.extra_time_chance_pct))}
          ${predBox('Büntetők', pct(pred?.penalties_chance_pct))}
          ${predBox('Bizalom', pct(match?.confidence?.overall_prediction_pct))}
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
          ${predBox('Bizalom', pct(unexpected.confidence_pct))}
          ${predBox('Miért váratlan?', safe(unexpected.why_unexpected))}
        </div>
        <ul class="score-list"><li><strong>Miért védhető?</strong><br>${escapeHtml(safe(unexpected.why_defensible))}</li></ul>
      </section>

      <section class="sheet-section">
        <h3>Legvalószínűbb forgatókönyv</h3>
        <p class="story-text">${escapeHtml(safe(scenario.most_likely_scenario_text))}</p>
      </section>

      <section class="sheet-section">
        <h3>Adatalap</h3>
        ${reasonBlock('Közvetlenül kiolvasható adatok', reasoning.directly_readable_from_json)}
        ${reasonBlock('Számított következtetések', reasoning.calculated_conclusions)}
        ${reasonBlock('Óvatos becslések', reasoning.cautious_estimates)}
      </section>

      <section class="sheet-section">
        <h3>Kockázatok</h3>
        <ul class="risk-list">
          ${risks.length ? risks.map((risk) => `<li>${escapeHtml(safe(risk))}</li>`).join('') : `<li>${FALLBACK}</li>`}
        </ul>
      </section>
    `;
  }

  function predBox(label, value) {
    return `<div class="pred-box"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>`;
  }

  function reasonBlock(title, items) {
    const list = Array.isArray(items) ? items : [];
    return `
      <details class="reason-block">
        <summary>${escapeHtml(title)}</summary>
        <ul class="reason-list">
          ${list.length ? list.map((item) => `<li>${escapeHtml(safe(item))}</li>`).join('') : `<li>${FALLBACK}</li>`}
        </ul>
      </details>
    `;
  }

  function renderError(error) {
    els.loadStatus.textContent = 'Betöltési hiba';
    els.summaryStrip.innerHTML = '';
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
  els.methodToggle.addEventListener('click', () => {
    const expanded = els.methodToggle.getAttribute('aria-expanded') === 'true';
    els.methodToggle.setAttribute('aria-expanded', String(!expanded));
    els.methodContent.hidden = expanded;
  });

  loadData();
})();
