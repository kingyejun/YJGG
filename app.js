/* YJGG - 설정 없이 GitHub Pages에서 바로 동작하는 정적 앱
   챔피언/스킨/이미지: Riot Data Dragon (공식, 무료, API 키 불필요)
   카운터/승률 등: data/*.json  (직접 편집 가능) */
const DD = 'https://ddragon.leagueoflegends.com';
const LOCALE = 'ko_KR';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const ROLES = { Fighter:'전사', Tank:'탱커', Mage:'마법사', Assassin:'암살자', Marksman:'원거리 딜러', Support:'서포터' };
const LANES = { top:'탑', jungle:'정글', mid:'미드', adc:'원딜', support:'서포터' };
const INFO = { attack:'공격', defense:'방어', magic:'마법', difficulty:'난이도' };

const state = { v:null, champs:{}, role:'all', q:'', lane:'top',
  stats:{}, matchups:{}, reviews:{}, detail:{} };

/* ---------- 로컬 저장소 (내 별점 / 내 리뷰) ---------- */
const store = {
  get(k, d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d; }catch{ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{} }
};
const ratings = () => store.get('yjgg.ratings', {});
const myReviews = () => store.get('yjgg.reviews', {});

/* ---------- 데이터 로딩 ---------- */
async function getJSON(url, fallback){
  try{ const r = await fetch(url, {cache:'no-cache'}); if(!r.ok) throw 0; return await r.json(); }
  catch{ return fallback; }
}
async function init(){
  const versions = await getJSON(`${DD}/api/versions.json`, null);
  if(!versions){ $('#patch').textContent = '데이터를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.'; return; }
  state.v = versions[0];
  const [cd, stats, matchups, reviews] = await Promise.all([
    getJSON(`${DD}/cdn/${state.v}/data/${LOCALE}/champion.json`, {data:{}}),
    getJSON('data/stats.json', {champions:{}}),
    getJSON('data/matchups.json', {}),
    getJSON('data/skin-reviews.json', {})
  ]);
  state.champs = cd.data; state.stats = stats; state.matchups = matchups; state.reviews = reviews;
  const n = Object.keys(state.champs).length;
  $('#patch').textContent = `현재 클라이언트 버전 ${state.v} · 챔피언 ${n}명`;
  buildRoleChips(); buildLaneChips(); renderChamps(); renderLanes(); renderMeta(); renderMyRanking();
}

/* ---------- 탭 ---------- */
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === b));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + b.dataset.tab));
  if(b.dataset.tab === 'skins') renderMyRanking();
}));

/* ---------- 챔피언 목록 ---------- */
const icon = id => `${DD}/cdn/${state.v}/img/champion/${id}.png`;
function buildRoleChips(){
  const el = $('#roleChips');
  el.innerHTML = `<button class="chip on" data-r="all">전체</button>` +
    Object.entries(ROLES).map(([k,v]) => `<button class="chip" data-r="${k}">${v}</button>`).join('');
  el.onclick = e => { const b = e.target.closest('.chip'); if(!b) return;
    state.role = b.dataset.r; el.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b)); renderChamps(); };
}
$('#search').addEventListener('input', e => { state.q = e.target.value.trim().toLowerCase(); renderChamps(); });
function renderChamps(){
  const list = Object.values(state.champs)
    .filter(c => state.role === 'all' || c.tags.includes(state.role))
    .filter(c => !state.q || c.name.toLowerCase().includes(state.q) || c.id.toLowerCase().includes(state.q))
    .sort((a,b) => a.name.localeCompare(b.name, 'ko'));
  $('#champGrid').innerHTML = list.length ? list.map(c =>
    `<div class="card" tabindex="0" role="button" data-id="${esc(c.id)}">
      <img loading="lazy" src="${icon(c.id)}" alt=""><span>${esc(c.name)}</span></div>`).join('')
    : `<div class="empty">검색 결과가 없어요. 다른 이름이나 영문 이름으로 검색해 보세요.</div>`;
}
$('#champGrid').addEventListener('click', e => { const c = e.target.closest('.card'); if(c) openChamp(c.dataset.id); });
$('#champGrid').addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' '){ const c = e.target.closest('.card'); if(c){ e.preventDefault(); openChamp(c.dataset.id);} } });

/* ---------- 외부 통계 링크 (공식 통계 사이트의 현재 패치 데이터) ---------- */
const slug = id => id.toLowerCase();
const extLinks = id => `
  <a href="https://lolalytics.com/lol/${slug(id)}/counters/" target="_blank" rel="noopener">카운터 (Lolalytics)</a>
  <a href="https://www.op.gg/champions/${slug(id)}/counters" target="_blank" rel="noopener">카운터 (OP.GG)</a>
  <a href="https://www.op.gg/champions/${slug(id)}/build" target="_blank" rel="noopener">승률·빌드 (OP.GG)</a>
  <a href="https://u.gg/lol/champions/${slug(id)}/counter" target="_blank" rel="noopener">카운터 (U.GG)</a>`;
const minis = ids => (ids||[]).map(i => state.champs[i]
  ? `<img class="mini" loading="lazy" src="${icon(i)}" alt="${esc(state.champs[i].name)}" title="${esc(state.champs[i].name)}">`
  : '').join('');

/* ---------- 챔피언 상세 ---------- */
async function loadDetail(id){
  if(state.detail[id]) return state.detail[id];
  const d = await getJSON(`${DD}/cdn/${state.v}/data/${LOCALE}/champion/${id}.json`, null);
  return d ? (state.detail[id] = d.data[id]) : null;
}
async function openChamp(id){
  const c = state.champs[id]; const modal = $('#champModal'); const body = $('#champBody');
  body.innerHTML = `<p>불러오는 중…</p>`; modal.hidden = false; document.body.style.overflow = 'hidden';
  const d = await loadDetail(id);
  if(!d){ body.innerHTML = `<div class="empty">챔피언 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</div>`; return; }
  const bars = Object.entries(INFO).map(([k,l]) =>
    `<span>${l}</span><div class="bar"><i style="width:${c.info[k]*10}%"></i></div><b>${c.info[k]}</b>`).join('');
  const st = state.stats.champions?.[id];
  const mu = state.matchups[id] || {};
  const rated = ratings();
  body.innerHTML = `
    <div class="head">
      <img src="${icon(id)}" alt="">
      <div><h2>${esc(c.name)}</h2><div class="title">${esc(c.title)}</div>
        <div class="tags" style="margin-top:8px">${c.tags.map(t => `<span>${ROLES[t]||t}</span>`).join('')}</div></div>
    </div>
    <p>${esc(d.blurb)}</p>
    <div class="bars">${bars}</div>

    <h3>카운터 · 승률 보기</h3>
    <div class="linkrow">${extLinks(id)}</div>
    ${st ? `<div class="bars" style="grid-template-columns:110px 1fr;max-width:340px">
        ${st.lane?`<span>주 라인</span><b>${LANES[st.lane]||esc(st.lane)}</b>`:''}
        <span>승률</span><b>${st.winRate}%</b><span>픽률</span><b>${st.pickRate}%</b>
        ${st.banRate!=null?`<span>밴률</span><b>${st.banRate}%</b>`:''}
        ${st.laneKill!=null?`<span>라인킬 확률</span><b>${st.laneKill}%</b>`:''}</div>` : ''}
    ${Object.keys(mu).length ? Object.entries(mu).map(([ln, m]) => `
      <div class="lane" style="grid-template-columns:90px 1fr 1fr">
        <h4>${LANES[ln]||esc(ln)}</h4>
        <div><span class="lbl bad">상대하기 어려움</span><div class="minis">${minis(m.weak)}</div></div>
        <div><span class="lbl good">상대하기 쉬움</span><div class="minis">${minis(m.strong)}</div></div>
      </div>`).join('') : `<p class="empty" style="margin-top:12px">이 챔피언의 라인별 카운터 데이터가 아직 <code>data/matchups.json</code>에 없어요. 위 버튼으로 현재 패치 기준 카운터를 바로 확인할 수 있어요.</p>`}

    <h3>스킨 (${d.skins.length})</h3>
    <div class="skins">${d.skins.map(s => {
      const r = rated[`${id}:${s.num}`];
      return `<div class="skin" tabindex="0" role="button" data-id="${esc(id)}" data-num="${s.num}">
        <img loading="lazy" src="${DD}/cdn/img/champion/loading/${id}_${s.num}.jpg" alt="">
        <b>${esc(s.num===0?'기본':s.name)}</b>${r?`<small>★ ${r}</small>`:''}</div>`; }).join('')}</div>`;
}
$('#champBody').addEventListener('click', e => { const s = e.target.closest('.skin'); if(s) openSkin(s.dataset.id, +s.dataset.num); });
$('#champBody').addEventListener('keydown', e => { if(e.key==='Enter'){ const s = e.target.closest('.skin'); if(s) openSkin(s.dataset.id, +s.dataset.num); } });

/* ---------- 스킨 상세: 별점 + 리뷰 ---------- */
const INVEN_Q = (champ, skin) =>
  `https://www.google.com/search?q=${encodeURIComponent(`site:inven.co.kr 리그오브레전드 ${champ} ${skin} 스킨 리뷰`)}`;
async function openSkin(id, num){
  const d = await loadDetail(id); const s = d.skins.find(x => x.num === num); if(!s) return;
  const key = `${id}:${num}`; const nm = num===0 ? '기본' : s.name;
  const modal = $('#skinModal'); modal.hidden = false;
  const draw = () => {
    const r = ratings()[key] || 0;
    const curated = (state.reviews[key] || []);
    const mine = (myReviews()[key] || []);
    $('#skinBody').innerHTML = `
      <div class="skin-layout">
        <div><img class="splash" src="${DD}/cdn/img/champion/splash/${id}_${num}.jpg" alt="${esc(nm)}"></div>
        <div>
          <h2 style="font-size:24px">${esc(nm)}</h2>
          <div class="title">${esc(state.champs[id].name)}</div>
          <h3 style="margin-top:18px">내 별점</h3>
          <div class="stars" role="radiogroup" aria-label="별점">
            ${[1,2,3,4,5].map(n => `<button class="star ${n<=r?'on':''}" data-n="${n}" aria-label="${n}점">★</button>`).join('')}
          </div>
          <div class="linkrow"><a href="${INVEN_Q(state.champs[id].name, nm)}" target="_blank" rel="noopener">인벤 스킨 리뷰 보러가기</a>
          <a href="https://www.inven.co.kr/webzine/wznews.php?site=lol" target="_blank" rel="noopener">인벤 롤 웹진</a></div>
          <h3>리뷰</h3>
          ${curated.map(c => `<div class="review">${esc(c.text)}<small>${esc(c.author||'')} ${c.url?`· <a href="${esc(c.url)}" target="_blank" rel="noopener">원문</a>`:''}</small></div>`).join('')}
          ${mine.map((t,i) => `<div class="review">${esc(t)}<small>내 리뷰 · <a href="#" data-del="${i}">삭제</a></small></div>`).join('')}
          ${(curated.length||mine.length) ? '' : `<p class="empty">아직 리뷰가 없어요. 아래에 첫 리뷰를 남겨 보세요.</p>`}
          <textarea id="rv" maxlength="500" placeholder="이 스킨에 대한 내 생각을 적어 보세요 (이 브라우저에 저장돼요)"></textarea>
          <p><button class="btn" id="saveRv">리뷰 저장</button></p>
        </div>
      </div>`;
  };
  draw();
  const body = $('#skinBody');
  body.onclick = e => {
    const st = e.target.closest('.star');
    if(st){ const all = ratings(); const n = +st.dataset.n; if(all[key]===n) delete all[key]; else all[key]=n; store.set('yjgg.ratings', all); draw(); renderMyRanking(); return; }
    if(e.target.id === 'saveRv'){ const t = $('#rv').value.trim(); if(!t) return;
      const all = myReviews(); (all[key] ||= []).push(t); store.set('yjgg.reviews', all); draw(); return; }
    const del = e.target.closest('[data-del]');
    if(del){ e.preventDefault(); const all = myReviews(); all[key].splice(+del.dataset.del, 1); store.set('yjgg.reviews', all); draw(); }
  };
}

/* ---------- 라인별 카운터 ---------- */
function buildLaneChips(){
  const el = $('#laneChips');
  el.innerHTML = Object.entries(LANES).map(([k,v]) => `<button class="chip ${k===state.lane?'on':''}" data-l="${k}">${v}</button>`).join('');
  el.onclick = e => { const b = e.target.closest('.chip'); if(!b) return; state.lane = b.dataset.l;
    el.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b)); renderLanes(); };
}
function renderLanes(){
  const rows = Object.entries(state.matchups).filter(([id, m]) => m[state.lane] && state.champs[id]);
  $('#laneList').innerHTML = rows.length ? rows.map(([id, m]) => `
    <div class="lane" data-open="${esc(id)}" style="cursor:pointer">
      <h4><img src="${icon(id)}" alt="">${esc(state.champs[id].name)}</h4>
      <div><span class="lbl bad">상대하기 어려움</span><div class="minis">${minis(m[state.lane].weak)}</div></div>
      <div><span class="lbl good">상대하기 쉬움</span><div class="minis">${minis(m[state.lane].strong)}</div></div>
    </div>`).join('')
  : `<div class="empty"><b>${LANES[state.lane]}</b> 라인의 카운터 데이터가 아직 없어요.<br>
      챔피언을 선택하면 Lolalytics · OP.GG · U.GG의 현재 패치 카운터로 바로 연결돼요.<br>
      직접 데이터를 넣으려면 <code>data/matchups.json</code>을 편집하세요. (README 참고)</div>`;
}
$('#laneList').addEventListener('click', e => { const r = e.target.closest('[data-open]'); if(r) openChamp(r.dataset.open); });

/* ---------- 메타 분석 ---------- */
function renderMeta(){
  $('#metaLinks').innerHTML = `
    <a href="https://lolalytics.com/lol/tierlist/" target="_blank" rel="noopener">현재 티어표 (Lolalytics)</a>
    <a href="https://www.op.gg/champions" target="_blank" rel="noopener">챔피언 통계 (OP.GG)</a>
    <a href="https://u.gg/lol/tier-list" target="_blank" rel="noopener">티어표 (U.GG)</a>
    <a href="https://www.leagueoflegends.com/ko-kr/news/tags/patch-notes/" target="_blank" rel="noopener">공식 패치노트</a>`;
  const rows = Object.entries(state.stats.champions || {}).filter(([id]) => state.champs[id]);
  if(!rows.length){
    $('#metaTable').innerHTML = `<div class="empty">승률 · 픽률 · 라인킬 확률 표가 아직 비어 있어요.<br>
      위 링크에서 현재 패치 통계를 확인하거나, <code>data/stats.json</code>에 값을 넣으면 이 표에 자동으로 정렬 가능한 형태로 표시돼요.</div>`;
    return;
  }
  let sort = {k:'winRate', dir:-1};
  const draw = () => {
    const sorted = [...rows].sort((a,b) => ((a[1][sort.k] ?? -1) - (b[1][sort.k] ?? -1)) * sort.dir);
    $('#metaTable').innerHTML = `<p class="title">${esc(state.stats.patch||'')} ${esc(state.stats.updated||'')}</p>
      <div class="tbl-wrap"><table><thead><tr><th>챔피언</th><th>라인</th>
      ${[['winRate','승률'],['pickRate','픽률'],['banRate','밴률'],['laneKill','라인킬 확률']].map(([k,l]) => `<th data-k="${k}">${l}${sort.k===k?(sort.dir<0?' ▼':' ▲'):''}</th>`).join('')}
      </tr></thead><tbody>${sorted.map(([id,s]) => `<tr><td><img class="mini" style="width:28px;height:28px;vertical-align:middle;margin-right:8px" src="${icon(id)}" alt="">${esc(state.champs[id].name)}</td>
      <td>${LANES[s.lane]||''}</td>${['winRate','pickRate','banRate','laneKill'].map(k => `<td>${s[k]!=null?s[k]+'%':'-'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    $('#metaTable').querySelectorAll('th[data-k]').forEach(th => th.onclick = () => {
      sort = {k:th.dataset.k, dir: sort.k===th.dataset.k ? -sort.dir : -1}; draw(); });
  };
  draw();
}

/* ---------- 내 스킨 랭킹 ---------- */
function renderMyRanking(){
  if(!state.v) return;
  const r = Object.entries(ratings()).sort((a,b) => b[1]-a[1]);
  $('#myRanking').innerHTML = r.length ? r.map(([key, score], i) => {
    const [id, num] = key.split(':'); const c = state.champs[id]; if(!c) return '';
    const sk = state.detail[id]?.skins.find(s => s.num === +num);
    return `<div class="rank-row" data-id="${esc(id)}" data-num="${num}">
      <div class="no">${i+1}</div>
      <img loading="lazy" src="${DD}/cdn/img/champion/loading/${id}_${num}.jpg" alt="">
      <div><div style="color:var(--gold-hi)">${esc(sk ? (+num===0?'기본':sk.name) : c.name + ' 스킨 #' + num)}</div><small>${esc(c.name)}</small></div>
      <div style="color:var(--gold);font-size:18px">${'★'.repeat(score)}</div></div>`; }).join('')
  : `<div class="empty">아직 별점을 준 스킨이 없어요.<br>챔피언 → 스킨을 눌러 별점을 매기면 여기에 나만의 스킨 순위가 만들어져요.</div>`;
}
$('#myRanking').addEventListener('click', e => { const r = e.target.closest('.rank-row'); if(r) loadDetail(r.dataset.id).then(() => openSkin(r.dataset.id, +r.dataset.num)); });

/* ---------- 모달 닫기 ---------- */
function closeTop(){
  if(!$('#skinModal').hidden){ $('#skinModal').hidden = true; return; }
  if(!$('#champModal').hidden){ $('#champModal').hidden = true; document.body.style.overflow = ''; }
}
document.querySelectorAll('.overlay').forEach(o => o.addEventListener('click', e => {
  if(e.target === o || e.target.hasAttribute('data-close')) { o.hidden = true; if(o.id==='champModal') document.body.style.overflow=''; }
}));
document.addEventListener('keydown', e => { if(e.key === 'Escape') closeTop(); });

init();
