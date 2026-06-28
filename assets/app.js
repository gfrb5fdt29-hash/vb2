(() => {
  'use strict';

  const app = document.querySelector('#app');
  const navButtons = Array.from(document.querySelectorAll('.nav-btn'));
  const state = { data: null, view: 'matches', activeMatch: null };

  const strengthRank = {
    'erős-közepes': 4,
    'közepes-erős': 3,
    'közepes': 2,
    'közepes-alacsony': 1
  };

  const absenceExactHu = new Map(Object.entries({
    'three-match ban / red-card disciplinary suspension': 'hárommeccses eltiltás / piros lap miatti fegyelmi eltiltás',
    'suspended for Round of 32 vs Canada': 'eltiltva a Kanada elleni playoff-meccsen',
    'broken leg vs Qatar': 'lábtörés a Katar elleni meccsen',
    'confirmed injury absence / not considered available': 'megerősített sérülés miatti hiányzó / nem számít bevethetőnek',
    'confirmed right-thigh/hamstring muscle injury': 'megerősített jobb comb / combhajlító izomsérülés',
    'injury confirmed; Round of 32 status update required': 'sérülés megerősítve; a playoff előtt állapotfrissítés szükséges',
    'injury': 'sérülés',
    'reported unavailable': 'jelentés szerint nem bevethető',
    'left-knee ACL injury': 'bal térd keresztszalag-sérülés',
    'knee issue / injury': 'térdprobléma / sérülés',
    'reported injury before Ecuador match': 'sérülésről szóló jelentés az Ecuador elleni meccs előtt',
    'red card vs Turkey; one-game suspension': 'piros lap Törökország ellen; egymeccses eltiltás',
    'one-game ban applied to Australia match; no confirmed active Round of 32 ban': 'az egymeccses eltiltás az Ausztrália elleni meccsre vonatkozott; nincs megerősített aktív eltiltás a playoffra',
    'reported knee injury vs Australia': 'térdsérülésről szóló jelentés Ausztrália ellen',
    'groin injury; ruled out of World Cup by Dutch FA': 'ágyéksérülés; a holland szövetség szerint kiesett a világbajnokságról',
    'unavailable for Round of 32': 'nem bevethető a playoff-meccsen',
    'injury; replaced in World Cup squad before tournament': 'sérülés; a torna előtt kikerült a vb-keretből',
    'pre-tournament injury concern': 'torna előtti sérüléses kérdés',
    'update_before_match; not treated as confirmed absence': 'meccs előtti állapotfrissítés szükséges; nem megerősített hiányzóként kezelve',
    'injury vs Germany; encouraging post-match examinations reported': 'sérülés Németország ellen; biztató meccs utáni vizsgálatokról szólt a jelentés',
    'left hamstring injury vs Japan; ruled out of remainder of World Cup by Swedish FA': 'bal combhajlító-sérülés Japán ellen; a svéd szövetség szerint kiesett a világbajnokság hátralévő részére',
    'unavailable for Round of 32 vs France': 'nem bevethető a Franciaország elleni playoff-meccsen'
  }));

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function hasValue(value) {
    return value !== null && value !== undefined && value !== '';
  }

  function humanize(text) {
    if (!hasValue(text)) return '';
    let value = String(text);

    value = value
      .replace(/BTTS:\s*inkább nem/gi, 'Mindkét csapat szerez gólt: inkább nem')
      .replace(/BTTS:\s*inkább igen/gi, 'Mindkét csapat szerez gólt: inkább igen')
      .replace(/BTTS:\s*enyhe igen/gi, 'Mindkét csapat szerez gólt: enyhe igen')
      .replace(/BTTS:\s*igen/gi, 'Mindkét csapat szerez gólt: igen')
      .replace(/BTTS:\s*nem/gi, 'Mindkét csapat szerez gólt: nem')
      .replace(/BTTS\s+nem/gi, 'Mindkét csapat szerez gólt: nem')
      .replace(/BTTS\s+igen/gi, 'Mindkét csapat szerez gólt: igen')
      .replace(/BTTS\s+enyhe igen/gi, 'Mindkét csapat szerez gólt: enyhe igen')
      .replace(/\bBTTS\b/gi, 'Mindkét csapat szerez gólt')
      .replace(/\bDNB\b/g, 'Döntetlen esetén tét visszajár')
      .replace(/Over\s*1,5\s*gól/gi, '1,5 gól felett')
      .replace(/Over\s*2,5\s*gól/gi, '2,5 gól felett')
      .replace(/Over\s*3,5\s*gól/gi, '3,5 gól felett')
      .replace(/Under\s*1,5\s*gól/gi, '1,5 gól alatt')
      .replace(/Under\s*2,5\s*gól/gi, '2,5 gól alatt')
      .replace(/Under\s*3,5\s*gól/gi, '3,5 gól alatt')
      .replace(/Over\s*1,5/gi, '1,5 gól felett')
      .replace(/Over\s*2,5/gi, '2,5 gól felett')
      .replace(/Over\s*3,5/gi, '3,5 gól felett')
      .replace(/Under\s*1,5/gi, '1,5 gól alatt')
      .replace(/Under\s*2,5/gi, '2,5 gól alatt')
      .replace(/Under\s*3,5/gi, '3,5 gól alatt')
      .replace(/clean sheet/gi, 'kapott gól nélkül')
      .replace(/last5/gi, 'utolsó 5 meccs')
      .replace(/last10/gi, 'utolsó 10 meccs')
      .replace(/last20/gi, 'utolsó 20 meccs');

    return value;
  }

  function humanizeAbsence(text) {
    if (!hasValue(text)) return '';
    const raw = String(text);
    if (absenceExactHu.has(raw)) return absenceExactHu.get(raw);
    return raw
      .replace(/Round of 32/gi, 'playoff')
      .replace(/World Cup/gi, 'világbajnokság')
      .replace(/confirmed/gi, 'megerősített')
      .replace(/reported/gi, 'jelentés szerint')
      .replace(/unavailable/gi, 'nem bevethető')
      .replace(/injury/gi, 'sérülés')
      .replace(/suspension/gi, 'eltiltás')
      .replace(/red card/gi, 'piros lap')
      .replace(/ruled out/gi, 'kiesett')
      .replace(/update_before_match/gi, 'meccs előtti állapotfrissítés')
      .replace(/status update required/gi, 'állapotfrissítés szükséges')
      .replace(/not treated as confirmed absence/gi, 'nem megerősített hiányzóként kezelve')
      .replace(/vs/gi, 'ellen');
  }

  function kickoffOnly(match) {
    return match.kickoff_hungary ? `Kezdés: ${match.kickoff_hungary}` : '';
  }

  function teams(match) {
    return {
      a: match.teams?.home_like_team_a,
      b: match.teams?.away_like_team_b
    };
  }

  function mainProbability(match) {
    const { a, b } = teams(match);
    const probs = match.prediction?.probabilities_90min_percent || {};
    const tip = String(match.prediction?.main_1x2 || '').toLowerCase();
    if (a?.name_hu && tip.includes(a.name_hu.toLowerCase())) return Number(probs.home_team_win || 0);
    if (b?.name_hu && tip.includes(b.name_hu.toLowerCase())) return Number(probs.away_team_win || 0);
    if (tip.includes('döntetlen')) return Number(probs.draw || 0);
    return Math.max(Number(probs.home_team_win || 0), Number(probs.draw || 0), Number(probs.away_team_win || 0));
  }

  function rankedMatches() {
    return [...(state.data?.matches || [])].sort((m1, m2) => {
      const s1 = strengthRank[m1.prediction?.stake_strength] || 0;
      const s2 = strengthRank[m2.prediction?.stake_strength] || 0;
      if (s2 !== s1) return s2 - s1;
      return mainProbability(m2) - mainProbability(m1);
    });
  }

  function strengthClass(strength) {
    if (strength === 'erős-közepes' || strength === 'közepes-erős') return 'strength-strong';
    if (strength === 'közepes-alacsony') return 'strength-low';
    return '';
  }

  function setActiveNav(view) {
    navButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.view === view);
    });
  }

  function renderHero() {
    return `
      <section class="hero">
        <p class="eyebrow">Playoff</p>
        <h1>VB 2026</h1>
        <p>Minden egyenes kieséses meccs szerdától szombatig</p>
      </section>`;
  }

  function renderMatches() {
    const matches = state.data?.matches || [];
    app.innerHTML = `
      ${renderHero()}
      <div class="section-title">
        <h2>Meccsek</h2>
        <span>${matches.length} meccs</span>
      </div>
      <section class="match-grid" aria-label="Meccskártyák">
        ${matches.map(renderMatchCard).join('')}
      </section>`;

    app.querySelectorAll('.match-card').forEach((card) => {
      card.addEventListener('click', () => {
        const no = Number(card.dataset.matchNo);
        state.activeMatch = matches.find((m) => m.match_no_chronological === no) || null;
        state.view = 'detail';
        setActiveNav('matches');
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  function renderMatchCard(match) {
    const prediction = match.prediction || {};
    return `
      <button class="match-card" type="button" data-match-no="${esc(match.match_no_chronological)}">
        <div class="match-topline">
          <span>${esc(kickoffOnly(match))}</span>
          <span>#${esc(match.match_no_chronological)}</span>
        </div>
        <h2 class="match-title">${esc(match.title_hu)}</h2>
        <div class="card-prediction card-prediction-clean">
          <span class="primary-tip">${esc(humanize(prediction.main_1x2))}</span>
          <span class="percent-chip"><strong>${esc(mainProbability(match))}%</strong></span>
        </div>
      </button>`;
  }

  function renderDetail(match) {
    const prediction = match.prediction || {};
    app.innerHTML = `
      <section class="detail-view">
        <div class="topbar">
          <button class="back-btn" type="button" id="backToMatches">← Vissza</button>
          <span class="mini-pill">${esc(kickoffOnly(match))}</span>
        </div>
        <section class="detail-hero">
          <p class="eyebrow">Meccsrészletek</p>
          <h1>${esc(match.title_hu)}</h1>
          <div class="meta-line">
            <span class="primary-tip">${esc(humanize(prediction.main_1x2))}</span>
            <span class="strength-pill ${strengthClass(prediction.stake_strength)}">Tipp erőssége: <strong>&nbsp;${esc(prediction.stake_strength || '—')}</strong></span>
          </div>
          ${hasValue(prediction.most_likely_exact_score) ? `<div class="exact-score"><span>Legvalószínűbb pontos eredmény</span><strong>${esc(prediction.most_likely_exact_score)}</strong></div>` : ''}
        </section>
        <div class="content-stack">
          ${renderMainPrediction(match)}
          ${renderRiskSignals(prediction)}
          ${renderScenario(prediction)}
          ${renderPriority(prediction)}
          ${renderGoalMarket(prediction)}
          ${renderSaferAngles(prediction)}
          ${renderTeams(match)}
          ${renderAbsences(match)}
        </div>
      </section>`;

    app.querySelector('#backToMatches')?.addEventListener('click', () => {
      state.view = 'matches';
      state.activeMatch = null;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function renderMainPrediction(match) {
    const prediction = match.prediction || {};
    const { a, b } = teams(match);
    const probs = prediction.probabilities_90min_percent || {};
    const altScores = Array.isArray(prediction.alternative_exact_scores) ? prediction.alternative_exact_scores : [];
    return `
      <section class="panel">
        <h2>Fő predikció</h2>
        <div class="prob-list">
          ${renderProbability(`${a?.name_hu || 'A csapat'} győzelem`, probs.home_team_win)}
          ${renderProbability('Döntetlen', probs.draw)}
          ${renderProbability(`${b?.name_hu || 'B csapat'} győzelem`, probs.away_team_win)}
        </div>
        <div class="pill-row" style="margin-top:14px">
          ${altScores.map(score => `<span class="mini-pill">Alternatív pontos eredmény: <strong>&nbsp;${esc(score)}</strong></span>`).join('')}
          ${hasValue(prediction.qualifier_lean) ? `<span class="mini-pill">Továbbjutási irány: <strong>&nbsp;${esc(humanize(prediction.qualifier_lean))}</strong></span>` : ''}
        </div>
      </section>`;
  }

  function renderProbability(label, value) {
    if (!hasValue(value)) return '';
    const num = Math.max(0, Math.min(100, Number(value)));
    return `
      <div class="prob-item">
        <div class="prob-head"><span>${esc(label)}</span><strong>${esc(num)}%</strong></div>
        <div class="prob-bar"><div class="prob-fill" style="--w:${num}%"></div></div>
      </div>`;
  }


  function renderRiskSignals(prediction) {
    const risk = prediction.risk_signals || {};
    const rows = [
      ['Döntetlen esélye', risk.draw_chance_percent, risk.short_reason],
      ['Mindkét csapat szerez gólt', risk.btts_percent, 'Támadó-védekező formaadatokból becsült irány.'],
      ['2,5 gól felett', risk.over25_percent, 'A csoportkörös és last20 gólprofil alapján.'],
      ['2,5 gól alatt', risk.under25_percent, 'A playoff-jelleg és a kapott gól nélküli arány is befolyásolja.']
    ].filter(([, value]) => hasValue(value));
    if (!rows.length) return '';
    return `
      <section class="panel risk-panel">
        <div class="panel-title-row">
          <h2>Kockázati jelek</h2>
          ${hasValue(risk.risk_level) ? `<span class="mini-pill">Kockázat: <strong>&nbsp;${esc(risk.risk_level)}</strong></span>` : ''}
        </div>
        <div class="risk-list">
          ${rows.map(([label, value, note]) => renderRiskBar(label, value, note)).join('')}
        </div>
      </section>`;
  }

  function renderRiskBar(label, value, note) {
    const num = Math.max(0, Math.min(100, Number(value)));
    return `
      <div class="risk-item">
        <div class="prob-head"><span>${esc(label)}</span><strong>${esc(num)}%</strong></div>
        <div class="risk-bar"><div class="prob-fill" style="--w:${num}%"></div></div>
        ${hasValue(note) ? `<p>${esc(humanize(note))}</p>` : ''}
      </div>`;
  }

  function renderScenario(prediction) {
    if (!hasValue(prediction.scenario)) return '';
    return `
      <section class="panel">
        <h2>Forgatókönyv</h2>
        <p>${esc(humanize(prediction.scenario))}</p>
      </section>`;
  }

  function renderPriority(prediction) {
    const items = Array.isArray(prediction.final_priority_order) ? prediction.final_priority_order : [];
    if (!items.length) return '';
    return `
      <section class="panel">
        <h2>Tipp-prioritás</h2>
        <ol class="ordered-list">
          ${items.map(item => `<li>${esc(humanize(item))}</li>`).join('')}
        </ol>
      </section>`;
  }

  function renderGoalMarket(prediction) {
    const market = prediction.goal_market_lean || {};
    const rows = [
      ['Elsődleges', market.primary],
      ['Másodlagos', market.secondary],
      ['Mindkét csapat szerez gólt', market.btts_estimate]
    ].filter(([, value]) => hasValue(value));
    if (!rows.length) return '';
    return `
      <section class="panel">
        <h2>Gólpiaci irány</h2>
        <div class="pill-row">
          ${rows.map(([label, value]) => `<span class="mini-pill">${esc(label)}: <strong>&nbsp;${esc(humanize(value))}</strong></span>`).join('')}
        </div>
      </section>`;
  }

  function renderSaferAngles(prediction) {
    const items = Array.isArray(prediction.safer_angles) ? prediction.safer_angles : [];
    if (!items.length) return '';
    return `
      <section class="panel">
        <h2>Biztonságosabb irányok</h2>
        <div class="badge-row">
          ${items.map(item => `<span class="badge">${esc(humanize(item))}</span>`).join('')}
        </div>
      </section>`;
  }

  function renderTeams(match) {
    const { a, b } = teams(match);
    return `
      <section class="panel">
        <h2>Fontos csapatadatok</h2>
        <div class="two-col">
          ${renderTeamCard(a)}
          ${renderTeamCard(b)}
        </div>
      </section>`;
  }

  function renderTeamCard(team) {
    if (!team) return '';
    const rating = team.rating || {};
    const group = team.group_stage || {};
    const form = team.recent_form_last20 || {};
    const stats = [
      ['Elo', rating.elo],
      ['FIFA-rang', rating.fifa_rank ? `${rating.fifa_rank}.` : null],
      ['Csoportkörös mérleg', group.record],
      ['Rúgott / kapott gól', hasValue(group.goals_for) && hasValue(group.goals_against) ? `${group.goals_for} / ${group.goals_against}` : null],
      ['Pont', group.points],
      ['Utolsó 5 meccs', form.last5],
      ['Utolsó 10 meccs', form.last10],
      ['Utolsó 20 meccs', form.last20],
      ['Gól/meccs', form.goals_per_game],
      ['Kapott gól/meccs', form.conceded_per_game],
      ['Kapott gól nélkül', hasValue(form.clean_sheet_pct) ? `${form.clean_sheet_pct}%` : null],
      ['Mindkét csapat szerez gólt', hasValue(form.btts_pct) ? `${form.btts_pct}%` : null],
      ['2,5 gól felett', hasValue(form.over25_pct) ? `${form.over25_pct}%` : null],
      ['2,5 gól alatt', hasValue(form.under25_pct) ? `${form.under25_pct}%` : null]
    ].filter(([, value]) => hasValue(value));

    return `
      <article class="team-card">
        <h3>${esc(team.name_hu || team.name_original || 'Csapat')}</h3>
        <div class="stat-grid">
          ${stats.map(([label, value]) => `<div class="stat"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}
        </div>
      </article>`;
  }

  function renderAbsences(match) {
    const abs = match.confirmed_absences_or_suspensions_from_json || {};
    const { a, b } = teams(match);
    const items = [
      ...normalizeAbsences(abs.team_a, a?.name_hu),
      ...normalizeAbsences(abs.team_b, b?.name_hu)
    ];
    return `
      <section class="panel">
        <h2>Sérülések és eltiltások</h2>
        ${items.length ? `<div class="absence-list">${items.map(renderAbsenceCard).join('')}</div>` : '<p>Nincs megerősített hiányzó a JSON-ban.</p>'}
      </section>`;
  }

  function normalizeAbsences(list, teamName) {
    if (!Array.isArray(list)) return [];
    return list.map((item) => ({ ...item, teamName }));
  }

  function renderAbsenceCard(item) {
    return `
      <article class="absence-card">
        <strong>${esc(item.player || 'Játékos')}</strong>
        <p>${esc(item.teamName || 'Csapat')}</p>
        ${hasValue(item.reason) ? `<p>Ok: ${esc(humanizeAbsence(item.reason))}</p>` : ''}
        ${hasValue(item.status) ? `<p>Státusz: ${esc(humanizeAbsence(item.status))}</p>` : ''}
      </article>`;
  }

  function renderRank() {
    const ranked = rankedMatches();
    const strongest = ranked[0];
    const weakest = ranked[ranked.length - 1];
    app.innerHTML = `
      ${renderHero()}
      <div class="section-title"><h2>Rangsor</h2><span>főirány szerint</span></div>
      <section aria-label="Rangsorolt tippek">
        ${ranked.map((match, index) => renderRankCard(match, index + 1)).join('')}
      </section>
      <section class="panel">
        <h2>Pontos eredmény tippek egy helyen</h2>
        <div class="score-strip">
          ${ranked.map(match => `<span class="mini-pill">${esc(match.title_hu)}: <strong>&nbsp;${esc(match.prediction?.most_likely_exact_score || '—')}</strong></span>`).join('')}
        </div>
      </section>
      <section class="panel">
        <h2>Legóvatosabb / legkockázatosabb meccsek</h2>
        <div class="pill-row">
          ${strongest ? `<span class="mini-pill">Legerősebb irány: <strong>&nbsp;${esc(strongest.title_hu)}</strong></span>` : ''}
          ${weakest ? `<span class="mini-pill">Legóvatosabb irány: <strong>&nbsp;${esc(weakest.title_hu)}</strong></span>` : ''}
        </div>
      </section>`;
  }

  function renderRankCard(match, index) {
    const prediction = match.prediction || {};
    return `
      <article class="rank-card">
        <div class="rank-row">
          <span class="rank-no">${index}</span>
          <div class="rank-main">
            <h3>${esc(match.title_hu)}</h3>
            <p>${esc(humanize(prediction.main_1x2))}</p>
          </div>
        </div>
        <div class="pill-row">
          <span class="strength-pill ${strengthClass(prediction.stake_strength)}">Tipp erőssége: <strong>&nbsp;${esc(prediction.stake_strength || '—')}</strong></span>
          <span class="mini-pill">Főirány: <strong>&nbsp;${esc(mainProbability(match))}%</strong></span>
          <span class="mini-pill">Pontos eredmény: <strong>&nbsp;${esc(prediction.most_likely_exact_score || '—')}</strong></span>
        </div>
      </article>`;
  }

  function renderInfo() {
    app.innerHTML = `
      ${renderHero()}
      <div class="section-title"><h2>Infó</h2><span>statikus PWA</span></div>
      <section class="info-card">
        <p>Az app a frissített <strong>app-data.json</strong> adatfájlból épül. A számolt százalékok kizárólag a feltöltött történeti JSON mezőiből készültek, odds és internetes frissítés nélkül.</p>
        <p>A ZIP statikus fájlokat tartalmaz, ezért GitHub Pages-en build step nélkül hostolható.</p>
      </section>`;
  }

  function renderError() {
    app.innerHTML = `
      <section class="error-card">
        <div>
          <span class="orb"></span>
          <h1>Az adatfájl nem tölthető be.</h1>
          <p>GitHub Pages vagy lokális szerver alatt nyisd meg.</p>
        </div>
      </section>`;
  }

  function render() {
    if (!state.data) return;
    setActiveNav(state.view === 'detail' ? 'matches' : state.view);
    if (state.view === 'matches') renderMatches();
    if (state.view === 'detail' && state.activeMatch) renderDetail(state.activeMatch);
    if (state.view === 'rank') renderRank();
    if (state.view === 'info') renderInfo();
  }

  navButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.view = button.dataset.view;
      state.activeMatch = null;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  async function start() {
    try {
      const response = await fetch('./assets/app-data.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('adatfájl nem elérhető');
      state.data = await response.json();
      render();
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('./service-worker.js').catch(() => undefined);
        });
      }
    } catch (error) {
      renderError();
    }
  }

  start();
})();
