/* 雇主人事成本試算：畫面 */
(function(){
'use strict';
var D = window.EPC;
var $ = function(id){ return document.getElementById(id); };
var PFX = 'epc.';
function lsGet(k){ try{ return localStorage.getItem(PFX + k); }catch(e){ return null; } }
function lsSet(k, v){ try{ localStorage.setItem(PFX + k, v); }catch(e){} }
function lsDel(k){ try{ localStorage.removeItem(PFX + k); }catch(e){} }
function lsJson(k, d){ try{ var v = JSON.parse(lsGet(k)); return v == null ? d : v; }catch(e){ return d; } }
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]; }); }
function money(n){ return Math.round(n).toLocaleString('zh-TW'); }
function wan(n){ return n >= 100000 ? (n / 10000).toFixed(n >= 1000000 ? 0 : 1) + ' 萬' : money(n); }
var standalone = window.matchMedia && matchMedia('(display-mode: standalone)').matches || navigator.standalone;
var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);

/* ---------- 狀態 ---------- */
function defaults(){ return {co:{name:'', ind:54, oaCustom:'', liOff:false, margin:40}, emps:[D.newEmp({name:'員工 A', role:'正職', base:32000})], P:{}}; }
function load(){
  var s = lsJson('state', null);
  if(!s || !Array.isArray(s.emps)) return defaults();
  s.co = Object.assign(defaults().co, s.co || {});
  s.emps = s.emps.map(function(e){ return D.newEmp(e); });
  s.P = s.P || {};
  return s;
}
var S = load(), saved = null, demo = null;
var V = {tab:lsGet('tab') || 'calc', sel:null, berg:lsGet('berg') || 'one', budget:Number(lsGet('budget')) || 50000, raise:Number(lsGet('raise')) || 3, lookup:''};
function save(){ if(demo) return; lsSet('state', JSON.stringify(S)); }
function P(){ return Object.assign({}, D.DEFAULTS, S.P); }
function selEmp(){ var e = S.emps.filter(function(x){ return x.id === V.sel; })[0]; if(!e){ e = S.emps[0]; V.sel = e ? e.id : null; } return e; }
function calc(){ return D.calcAll(S.emps, S.co, P()); }
function rowOf(A, e){ return A.rows.filter(function(r){ return r.e === e; })[0]; }

/* ---------- 冰山 ---------- */
function bergSvg(y, title){
  var parts = D.PARTS.filter(function(p){ return y[p.k] > 0.5; });
  var total = parts.reduce(function(a, p){ return a + y[p.k]; }, 0) || 1;
  var top = 46, H = 320, cx = 215, above = (y.salary + y.ot) / total;
  var Wy = top + Math.max(H * above, 40);
  var tw = (Wy - top) / H;
  function half(t){
    var pts = [[0, 6], [tw * .45, 52], [tw, 92], [tw + .001, 104], [tw + (1 - tw) * .38, 178], [tw + (1 - tw) * .78, 150], [1, 46]];
    for(var i = 1; i < pts.length; i++) if(t <= pts[i][0]){ var a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / ((b[0] - a[0]) || 1); }
    return 46;
  }
  function edge(yy, side){ var t = (yy - top) / H; return cx + side * (half(t) + Math.sin(yy * .09 + side) * 4); }
  var h = '<svg viewBox="0 0 640 400" role="img" aria-label="' + esc(title) + '：薪水與水面下成本的冰山圖">' +
    '<defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B6A9C"/><stop offset="1" stop-color="#0B2340"/></linearGradient>' +
    '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9F3F9"/><stop offset="1" stop-color="#F8FCFE"/></linearGradient></defs>' +
    '<rect width="640" height="' + Wy + '" fill="url(#sky)"/><rect y="' + Wy + '" width="640" height="' + (400 - Wy) + '" fill="url(#sea)"/>';
  var yy = top, labels = [];
  parts.forEach(function(p){
    var bh = H * y[p.k] / total, y0 = yy, y1 = yy + bh, L = [], R = [];
    for(var s = 0; s <= 6; s++){ var q = y0 + (y1 - y0) * s / 6; L.push(edge(q, -1).toFixed(1) + ',' + q.toFixed(1)); R.unshift(edge(q, 1).toFixed(1) + ',' + q.toFixed(1)); }
    var under = y0 >= Wy - 0.5;
    h += '<polygon points="' + L.concat(R).join(' ') + '" fill="' + p.c + '" ' + (under ? 'fill-opacity=".92" ' : '') + 'stroke="' + (under ? '#0B2340' : '#9FB9CC') + '" stroke-width=".8"/>';
    labels.push({p:p, y:(y0 + y1) / 2, x:edge((y0 + y1) / 2, 1), under:under});
    yy = y1;
  });
  // 標籤避免重疊
  for(var i = 1; i < labels.length; i++) labels[i].ly = Math.max(labels[i].y, (labels[i - 1].ly || labels[i - 1].y) + 25);
  if(labels.length) labels[0].ly = labels[0].y;
  var over = labels.length ? labels[labels.length - 1].ly - 388 : 0;
  if(over > 0) labels.forEach(function(l){ l.ly -= over; });
  labels.forEach(function(l){
    var c = l.ly > Wy + 6 ? '#EAF4FB' : '#13263A', pct = Math.round(y[l.p.k] / total * 1000) / 10;
    h += '<polyline points="' + (l.x + 2).toFixed(1) + ',' + l.y.toFixed(1) + ' 418,' + l.ly.toFixed(1) + ' 428,' + l.ly.toFixed(1) + '" fill="none" stroke="' + c + '" stroke-width="1" opacity=".7"/>' +
      '<text x="432" y="' + (l.ly + 4).toFixed(1) + '" font-size="13" fill="' + c + '" font-weight="700">' + esc(l.p.s) + ' <tspan font-family="JetBrains Mono,Consolas,monospace">' + money(y[l.p.k] / 12) + '</tspan><tspan font-size="11" opacity=".8"> /月・' + pct + '%</tspan></text>';
  });
  h += '<path d="M0 ' + Wy + ' q20 -5 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" fill="none" stroke="#fff" stroke-width="2" opacity=".75"/>' +
    '<text x="14" y="' + (Wy - 8) + '" font-size="12" fill="#566A7D" font-weight="700">▲ 水面上：員工看得到的薪水</text>' +
    '<text x="14" y="390" font-size="12" fill="#CFE5F5" font-weight="700">▼ 水面下：雇主另外要付的</text></svg>';
  return h;
}

/* ---------- 主畫面 ---------- */
function render(){
  var A = calc(), e = selEmp();
  var h = '<div class="print-head"><h1>雇主人事成本試算</h1><p class="small">' + esc(S.co.name || '我的公司') + '・' + P().year + ' 年費率・列印日期 ' + new Date().toLocaleDateString('zh-TW') + '</p></div>' +
    '<header class="bar"><h1>雇主人事成本試算<small>請一個人，到底要花多少錢？薪水只是冰山露出水面的那一角</small></h1>' +
    '<button class="ibtn" data-act="print">🖨 列印／存 PDF</button><a class="ibtn" href="manual.html">📖 操作手冊</a><button class="ibtn" data-act="settings">⚙ 常用設定</button></header>' +
    '<p class="warn-line">依 ' + P().year + ' 年勞保、健保、勞退、職災費率試算，僅供參考，實際以主管機關核定為準。<button data-act="warn">⚠ 使用警語</button></p>' +
    '<div class="exbar noprint"><b>看範例：</b>' + D.EXAMPLES.map(function(x){ return '<button class="chipbtn" data-demo="' + x.key + '" aria-pressed="' + (demo === x.key) + '">' + esc(x.label) + '</button>'; }).join('') + '</div>' +
    (demo ? '<div class="demo-on noprint"><span>正在看範例（虛構店家）。在這裡改的數字不會存檔，您自己的資料不受影響。</span><button data-act="leaveDemo">離開範例</button></div>' : '') +
    '<section class="hero" id="hero"></section>' +
    '<nav class="tabs noprint" role="tablist">' + [['calc', '💰 員工試算'], ['team', '📊 全公司總覽'], ['plan', '🎯 預算反推與調薪'], ['grades', '📋 級距速查']].map(function(t){
      return '<button role="tab" data-tab="' + t[0] + '" aria-selected="' + (V.tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</nav>' +
    '<div class="panel" data-print="' + (V.tab === 'calc' || V.tab === 'team' ? 1 : 0) + '" id="panel"></div>' +
    '<footer class="foot">👤 創作者 Mark Tsai（蔡豐全）<a href="mailto:tsaimark@gmail.com">tsaimark@gmail.com</a><br><a href="manual.html">📖 操作手冊</a><a href="#" data-act="warn">⚠ 使用警語</a>' + (standalone ? '' : '<a href="#" data-act="install">📲 加入主畫面</a>') +
    '<br><img src="https://visitor-badge.laobi.icu/badge?page_id=m255525.employerpayrollcostcalculator" alt="訪客次數" height="20" loading="lazy" style="vertical-align:middle;margin-top:.4rem"></footer>';
  $('app').innerHTML = h;
  renderPanel(A);
  renderHero(A);
}
function renderHero(A){
  A = A || calc();
  var e = selEmp(), one = V.berg === 'one' && e, r = one ? rowOf(A, e) : null;
  var y = one ? r.c.y : A.T, year = one ? r.c.year : A.year, ratio = one ? r.c.ratio : A.ratio;
  var title = one ? (e.name || '這位員工') + (r.n > 1 ? '（每人）' : '') : (S.co.name || '全公司') + '・' + A.head + ' 人';
  var monthlyPay = one ? r.c.paidM : (A.T.salary + A.T.ot) / 12;
  var ins = (y.li + y.oa + y.nhi + y.pen + y.supp) / 12;
  var h = '<div class="berg"><div class="berg-sel noprint"><select id="bergSel" aria-label="冰山顯示對象"><option value="team"' + (one ? '' : ' selected') + '>全公司（' + A.head + ' 人）</option>' +
    S.emps.map(function(x){ return '<option value="' + x.id + '"' + (one && x.id === e.id ? ' selected' : '') + '>' + esc(x.name || '未命名') + (x.n > 1 ? '（每人）' : '') + '</option>'; }).join('') + '</select></div>' + bergSvg(y, title) + '<div class="berg-leg">' + D.PARTS.filter(function(p){ return y[p.k] > 0.5; }).map(function(p){ return '<span><i style="background:' + p.c + '"></i>' + p.s + (p.above ? '（水面上）' : '') + '</span><b>' + money(y[p.k] / 12) + ' /月</b>'; }).join('') + '</div></div>' +
    '<div class="sum"><h2>' + esc(title) + '・一年總成本</h2><div class="big">' + money(year) + '<small>元／年</small></div>' +
    '<div class="ratio">平均每月 <b>' + money(year / 12) + '</b> 元<br>每發 1 元月薪，實際要花 <b>' + ratio.toFixed(2) + '</b> 元</div>' +
    '<div class="kp"><div><span>' + (one ? '每月薪資（含加班）' : '每月薪資合計') + '</span><b>' + money(monthlyPay) + '</b></div><div><span>保險＋勞退（月平均）</span><b>' + money(ins) + '</b></div>' +
    '<div><span>年終與獎金（年）</span><b>' + money(y.bonus) + '</b></div>' +
    (one ? '<div><span>員工每月實領（未扣稅）</span><b>' + money(r.c.takeHome) + '</b></div>' : '<div><span>補充保費（年）</span><b>' + money(A.suppYear) + '</b></div>') + '</div>' +
    '<p class="note">' + (one ? '投保級距：勞保 ' + money(r.c.grades.li) + '・職災 ' + money(r.c.grades.oa) + '・健保 ' + money(r.c.grades.nhi) + '・勞退 ' + money(r.c.grades.pen) : '職災費率 ' + D.oaRateOf(S.co) + '%（' + esc(indName()) + '）') + '</p></div>';
  $('hero').innerHTML = h;
}
function indName(){ if(S.co.oaCustom !== '' && S.co.oaCustom != null) return '自訂費率'; var it = D.INDUSTRY[S.co.ind]; return it ? (it[1].length > 18 ? it[1].slice(0, 18) + '…' : it[1]) : ''; }

function renderPanel(A){
  A = A || calc();
  var p = $('panel'); p.dataset.print = (V.tab === 'calc' || V.tab === 'team') ? 1 : 0;
  if(V.tab === 'team') p.innerHTML = teamHtml(A);
  else if(V.tab === 'plan') p.innerHTML = planHtml(A);
  else if(V.tab === 'grades') p.innerHTML = gradesHtml();
  else { p.innerHTML = calcHtml(A); }
}

/* ---------- 員工試算 ---------- */
function coCard(A){
  var co = S.co;
  var opts = '', last = '';
  D.INDUSTRY.forEach(function(it, i){ if(it[0] !== last){ if(last) opts += '</optgroup>'; opts += '<optgroup label="' + esc(it[0]) + '">'; last = it[0]; } opts += '<option value="' + i + '"' + (+co.ind === i ? ' selected' : '') + '>' + esc(it[1].length > 30 ? it[1].slice(0, 30) + '…' : it[1]) + '（' + it[2] + '%）</option>'; });
  opts += '</optgroup>';
  return '<div class="card noprint"><h3>🏢 公司設定</h3><div class="row">' +
    '<label class="fld">公司／店名<input data-co="name" value="' + esc(co.name) + '" placeholder="可空白"></label>' +
    '<label class="fld">行業別 <small>決定職災保險費率</small><select data-co="ind">' + opts + '</select></label>' +
    '<label class="fld">自訂職災費率 % <small>勞保局通知單上的費率，空白＝依行業別</small><input type="number" step="0.01" min="0" data-co="oaCustom" value="' + esc(co.oaCustom) + '"></label></div>' +
    (A.liOffAllowed ? '<label class="chk"><input type="checkbox" data-co="liOff"' + (co.liOff ? ' checked' : '') + '> 未滿 5 人，普通事故勞保選擇不加保（就保、職災仍要加）</label>' : '') +
    (!A.liOffAllowed && co.liOff ? '<div class="alert">員工已達 5 人，勞保強制加保，已改回計入勞保。</div>' : '') + '</div>';
}
function empList(A){
  return '<div class="emps" id="empList">' + A.rows.map(function(r){
    var e = r.e;
    return '<button class="emp" data-sel="' + e.id + '" aria-current="' + (e.id === V.sel) + '"><span class="av">' + esc((e.name || '員')[0]) + '</span><span><b>' + esc(e.name || '未命名') + (r.n > 1 ? ' ×' + r.n + ' 人' : '') + (r.c.warn.length ? ' <span class="wn" title="有提醒">⚠</span>' : '') + '</b>' +
      '<span class="meta">' + esc(e.role ? e.role + '・' : '') + (r.c.part ? '時薪 ' + e.hourly + ' × ' + e.hours + ' 小時' : '月薪 ' + money(r.c.regular)) + '</span></span>' +
      '<span class="cost">' + money(r.c.month) + '<small>每人每月成本</small></span></button>'; }).join('') + '</div>' +
    '<div class="btns noprint"><button class="btn" data-act="add">＋ 新增員工</button></div>';
}
function f(label, key, val, o){
  o = o || {};
  return '<label class="fld">' + label + (o.hint ? ' <small>' + o.hint + '</small>' : '') + '<input ' + (o.text ? '' : 'type="number" inputmode="decimal" min="0" step="' + (o.step || 1) + '" ') + 'data-f="' + key + '" value="' + esc(val) + '"></label>';
}
function editor(e, r){
  var part = e.type === 'part';
  var h = '<div class="card noprint" id="editor"><h3>✏ ' + esc(e.name || '員工') + '</h3>' +
    '<div class="row">' + f('姓名／代號', 'name', e.name, {text:1}) + f('職稱／備註', 'role', e.role, {text:1}) + f('人數', 'n', e.n, {hint:'同條件幾位'}) + '</div>' +
    '<div class="grp"><b>薪資</b><div class="seg" role="group" aria-label="計薪方式"><button data-type="full" aria-pressed="' + !part + '">月薪制</button><button data-type="part" aria-pressed="' + part + '">時薪制（部分工時）</button></div><div class="row" style="margin-top:.5rem">' +
    (part ? f('時薪', 'hourly', e.hourly, {hint:'基本工資 ' + P().minHourly}) + f('每月工時', 'hours', e.hours, {hint:'小時'})
          : f('本薪（月）', 'base', e.base) + f('固定津貼（月）', 'allow', e.allow, {hint:'職務、伙食、全勤等每月固定發的'})) + '</div></div>';
  if(!part) h += '<div class="grp"><b>加班（每月）</b><div class="row">' + f('平日加班天數', 'otDays', e.otDays) + f('平日每次幾小時', 'otHrs', e.otHrs, {step:.5, hint:'最多 4'}) +
    f('休息日加班天數', 'rdDays', e.rdDays) + f('休息日每次幾小時', 'rdHrs', e.rdHrs, {step:.5, hint:'最多 12'}) + '</div><p class="small">時薪以（本薪＋固定津貼）÷ 240 計：平日前 2 小時 ×4/3、再 2 小時 ×5/3；休息日前 2 小時 ×4/3、3–8 小時 ×5/3、9–12 小時 ×8/3。</p></div>';
  h += '<div class="grp"><b>獎金與特休</b><div class="row">' + f('年終幾個月', 'yearEndM', e.yearEndM, {step:.1}) + f('其他年度獎金', 'bonusY', e.bonusY, {hint:'三節、績效（全年）'}) +
    (part ? '' : f('年資（年）', 'years', e.years, {step:.1, hint:'特休 ' + D.leaveDays(e.years) + ' 天'}) + f('特休未休折發天數', 'unusedLeave', e.unusedLeave, {step:.5, hint:'年底沒休完要折發工資'})) + '</div></div>' +
    '<div class="grp"><b>保險與勞退</b><label class="chk"><input type="checkbox" data-f="nhiHere"' + (e.nhiHere !== false ? ' checked' : '') + '> 在本公司加健保</label><div class="row">' +
    f('雇主勞退提繳 %', 'penRate', e.penRate, {step:.5, hint:'至少 6%'}) + f('員工自提 %', 'selfPen', e.selfPen, {step:.5, hint:'0–6%，只影響實領'}) + f('健保眷屬人數', 'deps', e.deps, {hint:'只影響實領，最多算 3 口'}) + '</div></div>' +
    '<div class="grp"><b>福利與其他</b><div class="row">' + f('每月福利', 'welfareM', e.welfareM, {hint:'伙食、團保、交通補助'}) + f('每年其他', 'otherY', e.otherY, {hint:'教育訓練、招募、尾牙、制服'}) + '</div></div>' +
    '<div class="btns"><button class="btn alt" data-act="dup">複製這位</button>' + (S.emps.length > 1 ? '<button class="btn red" data-act="del">刪除</button>' : '') + '</div></div>';
  return h;
}
function resultCard(r){
  var c = r.c, m = c.m, w = c.worker, y = c.y;
  var rows = [
    ['本薪＋固定津貼', c.regular, c.regular * 12], ['加班費', c.otM, y.ot], ['年終與獎金（攤到每月）', y.bonus / 12, y.bonus],
    ['勞保普通事故（雇主 70%）', m.li, m.li * 12], ['就業保險（雇主 70%）', m.ei, m.ei * 12], ['職災保險（雇主全額）', m.oa, m.oa * 12], ['工資墊償基金', m.fund, m.fund * 12],
    ['健保（雇主 60% × 1.56 人）', m.nhi, y.nhi], ['二代健保補充保費（分攤）', y.supp / 12, y.supp], ['勞退提繳', m.pen, y.pen],
    ['特休未休折發', y.leave / 12, y.leave], ['福利與其他', y.welfare / 12, y.welfare]
  ].filter(function(x){ return x[2] > 0; });
  var h = '<div class="card" id="result"><h3>🧾 ' + esc(r.e.name || '這位員工') + (r.n > 1 ? '（每人）' : '') + '的成本明細</h3>' +
    (c.warn.length ? '<ul class="alert">' + c.warn.map(function(x){ return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
    '<div class="tw"><table><thead><tr><th>項目</th><th class="num">每月</th><th class="num">每年</th></tr></thead><tbody>' +
    rows.map(function(x){ return '<tr><td>' + x[0] + '</td><td class="num">' + money(x[1]) + '</td><td class="num">' + money(x[2]) + '</td></tr>'; }).join('') +
    '<tr class="tot"><td>雇主總成本' + (r.n > 1 ? '（每人）' : '') + '</td><td class="num">' + money(c.month) + '</td><td class="num">' + money(c.year) + '</td></tr>' +
    (r.n > 1 ? '<tr class="tot"><td>' + r.n + ' 人合計</td><td class="num">' + money(c.month * r.n) + '</td><td class="num">' + money(c.year * r.n) + '</td></tr>' : '') +
    '</tbody></table></div>' +
    '<div class="info"><b>員工那邊：</b>每月薪資 ' + money(c.paidM) + ' − 勞保就保自付 ' + money(w.li + w.ei) + ' − 健保自付 ' + money(w.nhi) + (w.pen ? ' − 勞退自提 ' + money(w.pen) : '') + ' ＝ 實領約 <b>' + money(c.takeHome) + '</b> 元（未扣所得稅）</div>' +
    (c.part ? '' : '<p class="small">依勞基法第 38 條，年資 ' + r.e.years + ' 年的特休是 ' + c.leaveDays + ' 天。特休本來就含在月薪裡；只有年底沒休完、要折發工資的天數才另外算成本。</p>') + '</div>';
  return h;
}
function calcHtml(A){
  var e = selEmp(), r = rowOf(A, e);
  return '<div class="ed"><div>' + coCard(A) + '<div class="card noprint"><h3>👥 員工（' + A.head + ' 人）</h3><p class="small">點一位員工，右邊可以改條件。同條件的人可以用「人數」一次算。</p>' + empList(A) + '</div></div>' +
    '<div>' + editor(e, r) + '<div id="resultWrap">' + resultCard(r) + '</div></div></div>';
}
function refresh(){
  var A = calc();
  renderHero(A);
  if(V.tab === 'calc'){
    var l = $('empList'); if(l) l.outerHTML = empList(A).replace(/<div class="btns noprint">[\s\S]*$/, '');
    var rw = $('resultWrap'); if(rw) rw.innerHTML = resultCard(rowOf(A, selEmp()));
    var ed = $('editor'); if(ed){ var t = ed.querySelector('h3'); t.textContent = '✏ ' + (selEmp().name || '員工'); }
    var lv = document.querySelector('[data-f="years"]'); if(lv) lv.previousElementSibling.textContent = '特休 ' + D.leaveDays(selEmp().years) + ' 天';
  }
}

/* ---------- 全公司 ---------- */
function teamHtml(A){
  var co = S.co, T = A.T, total = A.year || 1;
  var h = '<div class="card"><h3>📊 ' + esc(co.name || '全公司') + '：' + A.head + ' 人，一年人事成本 ' + money(A.year) + ' 元</h3>' +
    '<div class="tw"><table><thead><tr><th>員工</th><th class="num">人數</th><th class="num">月薪</th><th class="num">每人月成本</th><th class="num">倍率</th><th class="num">年成本小計</th></tr></thead><tbody>' +
    A.rows.map(function(r){ return '<tr><td>' + esc(r.e.name || '未命名') + (r.e.role ? '<span class="small">・' + esc(r.e.role) + '</span>' : '') + '</td><td class="num">' + r.n + '</td><td class="num">' + money(r.c.regular) + '</td><td class="num">' + money(r.c.month) + '</td><td class="num">' + r.c.ratio.toFixed(2) + '</td><td class="num">' + money(r.c.year * r.n) + '</td></tr>'; }).join('') +
    '<tr class="tot"><td>合計</td><td class="num">' + A.head + '</td><td class="num">' + money(T.salary / 12) + '</td><td class="num">' + money(A.month / A.head) + '</td><td class="num">' + A.ratio.toFixed(2) + '</td><td class="num">' + money(A.year) + '</td></tr></tbody></table></div>' +
    '<div class="stack" aria-hidden="true">' + D.PARTS.filter(function(p){ return T[p.k] > 0; }).map(function(p){ return '<i style="width:' + (T[p.k] / total * 100) + '%;background:' + p.c + '" title="' + p.n + '"></i>'; }).join('') + '</div>' +
    '<div class="bk" style="margin-top:.8rem">' + D.PARTS.filter(function(p){ return T[p.k] > 0; }).map(function(p){
      return '<span><span class="sw" style="background:' + p.c + '"></span>' + p.n + '</span><span class="barw"><i style="width:' + (T[p.k] / total * 100) + '%;background:' + p.c + '"></i></span><span class="v">' + money(T[p.k]) + '・' + (T[p.k] / total * 100).toFixed(1) + '%</span>'; }).join('') + '</div>' +
    '<p class="small">二代健保補充保費以「每月實付薪資合計 − 健保投保金額合計」超過的部分 × ' + (P().suppRate * 100).toFixed(2) + '% 計，年終等年度獎金假設集中在同一個月發放，全年約 ' + money(A.suppYear) + ' 元，依各人超出的金額分攤。</p></div>';
  var mg = Math.max(1, Math.min(100, +co.margin || 40));
  h += '<div class="card"><h3>🛒 要賣多少，才養得起這個團隊？</h3><div class="row"><label class="fld">毛利率 % <small>營業額扣掉進貨／材料成本後剩下的比例</small><input type="number" min="1" max="100" data-co="margin" value="' + esc(co.margin) + '"></label></div>' +
    '<p>每月人事成本 <span class="hl">' + money(A.month) + '</span> 元 ÷ 毛利率 ' + mg + '% ＝ 每月至少要有 <span class="hl">' + money(A.month / mg * 100) + '</span> 元營業額，才夠付薪水（還沒算房租、水電等其他費用）。</p>' +
    '<p class="small">換算每天（以每月營業 26 天計）約 ' + money(A.month / mg * 100 / 26) + ' 元。</p>' +
    '<div class="btns noprint"><button class="btn alt" data-act="csv">⬇ 下載 CSV（Excel 可開）</button><button class="btn alt" data-act="print">🖨 列印／存 PDF</button></div></div>';
  return h;
}

/* ---------- 預算反推與調薪 ---------- */
function planHtml(A){
  var e = selEmp(), co = S.co, b = Math.max(0, +V.budget || 0);
  var best = D.maxSalary(b, e, co, P());
  var h = '<div class="card"><h3>🎯 每月預算有限，最多能開多少月薪？</h3><p class="small">以目前選的員工「' + esc(e.name || '未命名') + '」的加班、年終、福利等條件，反推在預算內能給的最高本薪（固定津貼併入本薪計算）。</p>' +
    '<div class="row"><label class="fld">這個職缺每月總成本預算<input type="number" min="0" step="1000" data-v="budget" value="' + b + '"></label></div>' +
    (best ? '<p>最高可開月薪 <span class="hl">' + money(best.base) + '</span> 元，實際每月總成本 ' + money(best.c.month) + ' 元。' + (best.base < P().minWage ? '<br><b style="color:var(--warn)">低於基本工資 ' + money(P().minWage) + ' 元，這個預算請不到全職員工。</b>' : '') + '</p>'
          : '<p style="color:var(--warn)"><b>這個預算連月薪 0 元都不夠（福利或年度費用已超過預算）。</b></p>') + '</div>';
  var pct = +V.raise || 0;
  var emps2 = S.emps.map(function(x){ var y = D.newEmp(x); y.id = x.id; if(y.type === 'part') y.hourly = Math.round(y.hourly * (1 + pct / 100)); else { y.base = Math.round(y.base * (1 + pct / 100)); y.allow = Math.round(y.allow * (1 + pct / 100)); } return y; });
  var B = D.calcAll(emps2, co, P());
  h += '<div class="card"><h3>📈 全員調薪，成本會多多少？</h3><div class="row"><label class="fld">調薪幅度 %<input type="number" step="0.5" data-v="raise" value="' + pct + '"></label></div>' +
    '<div class="tw"><table><thead><tr><th></th><th class="num">月薪合計</th><th class="num">每月總成本</th><th class="num">一年總成本</th></tr></thead><tbody>' +
    '<tr><td>現在</td><td class="num">' + money(A.T.salary / 12) + '</td><td class="num">' + money(A.month) + '</td><td class="num">' + money(A.year) + '</td></tr>' +
    '<tr><td>調薪 ' + pct + '% 後</td><td class="num">' + money(B.T.salary / 12) + '</td><td class="num">' + money(B.month) + '</td><td class="num">' + money(B.year) + '</td></tr>' +
    '<tr class="tot"><td>增加</td><td class="num">' + money((B.T.salary - A.T.salary) / 12) + '</td><td class="num">' + money(B.month - A.month) + '</td><td class="num">' + money(B.year - A.year) + '</td></tr></tbody></table></div>' +
    '<p class="small">月薪每加 1 元，連同保險、勞退、年終一起，雇主實際多付約 ' + ((B.year - A.year) / Math.max(1, B.T.salary - A.T.salary)).toFixed(2) + ' 元。投保級距是跳級的，小幅調薪有時不會改變保費。</p></div>';
  var hire = D.calcAll([D.newEmp({base:P().minWage})], co, P()).rows[0].c;
  h += '<div class="card"><h3>🙋 再請一位基本工資的全職員工</h3><p>月薪 ' + money(P().minWage) + ' 元、年終 1 個月：每月總成本約 <span class="hl">' + money(hire.month) + '</span> 元，一年約 ' + money(hire.year) + ' 元（倍率 ' + hire.ratio.toFixed(2) + '）。</p></div>';
  return h;
}

/* ---------- 級距速查 ---------- */
function gradesHtml(){
  var p = P(), oa = D.oaRateOf(S.co) / 100, q = +V.lookup || 0;
  var hit = q ? D.grade(D.NHI, Math.max(q, p.minWage)) : 0;
  var rows = D.NHI.map(function(g){
    var li = D.grade(D.LI_FULL, g), og = D.grade(D.OA, g), pg = D.grade(D.PEN, g);
    var le = D.r(li * p.liRate * p.liEmp) + D.r(li * p.eiRate * p.liEmp), lw = D.r(li * p.liRate * p.liWorker) + D.r(li * p.eiRate * p.liWorker);
    return '<tr' + (g === hit ? ' style="background:#FFF3D1;font-weight:900" id="hitRow"' : '') + '><td class="num">' + money(g) + '</td><td class="num">' + money(li) + '</td><td class="num">' + money(le) + '</td><td class="num">' + money(lw) + '</td><td class="num">' + money(D.r(og * oa)) + '</td><td class="num">' + money(D.r(g * p.nhiRate * p.nhiEmp * (1 + p.avgDep))) + '</td><td class="num">' + money(D.r(g * p.nhiRate * p.nhiWorker)) + '</td><td class="num">' + money(D.r(pg * p.penRate)) + '</td></tr>';
  }).join('');
  return '<div class="card"><h3>📋 ' + p.year + ' 年全職員工投保級距速查</h3><p class="small">勞保 ' + D.LI_FULL.length + ' 級（上限 ' + money(D.LI_FULL[D.LI_FULL.length - 1]) + '）、職災上限 ' + money(D.OA[D.OA.length - 1]) + '、健保 ' + D.NHI.length + ' 級（上限 ' + money(D.NHI[D.NHI.length - 1]) + '）、勞退上限 ' + money(D.PEN[D.PEN.length - 1]) + '。職災欄依目前行業費率 ' + (oa * 100).toFixed(2) + '%。部分工時另有 ' + money(D.LI_PART[0]) + ' 元起的勞保級距。</p>' +
    '<div class="row"><label class="fld">輸入月薪，找出所在級距<input type="number" min="0" data-v="lookup" value="' + esc(V.lookup) + '"></label></div>' +
    '<div class="tw" style="max-height:28rem;overflow:auto"><table><thead><tr><th>健保投保金額</th><th class="num">勞保投保</th><th class="num">勞保＋就保 雇主</th><th class="num">勞保＋就保 員工</th><th class="num">職災 雇主</th><th class="num">健保 雇主</th><th class="num">健保 員工本人</th><th class="num">勞退 6%</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
}

/* ---------- 彈窗與設定 ---------- */
function openModal(h){ $('modalBox').innerHTML = h; $('modal').classList.add('show'); $('modalBox').scrollTop = 0; }
function closeModal(){ $('modal').classList.remove('show'); }
var toastT;
function toast(m){ var o = document.querySelector('.toast'); if(o) o.remove(); var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = m; document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(function(){ t.remove(); }, 3000); }
var WARN_HTML = '<h2>⚠ 使用警語</h2><p><b>本工具是試算，不是薪資計算或會計、法律意見。</b></p><ul>' +
  '<li>費率與級距依 2026（民國 115）年 1 月 1 日起適用的公告，於 2026 年 11 月查證：基本工資月薪 29,500 元、時薪 196 元；勞保 11.5%＋就保 1%（雇主 70%）；健保 5.17%、平均眷口數 0.56（雇主 60%）；勞退至少 6%；工資墊償 0.025%；補充保費 2.11%；職災依勞動部 114 年起適用的行業別費率表。之後若調整（例如新年度基本工資），請到「⚙ 常用設定 → 費率參數」修改，或以勞保局、健保署公告為準。</li>' +
  '<li>實際保費依勞保局、健保署核定的投保級距與計費天數（到職、離職當月按日計）計算，本工具一律以整月、經常性薪資對應級距估算；加班費未列入投保薪資。</li>' +
  '<li>職災費率：員工 50 人以上的投保單位適用實績費率，請改填勞保局通知的費率。</li>' +
  '<li>補充保費是以全公司合計估算，年度獎金假設在同一個月發放；實際依每月發放情形而定。</li>' +
  '<li>部分工時者的勞保、職災級距採 11,100 元起的分級表估算，健保最低仍為 29,500 元；個案以主管機關認定為準。</li>' +
  '<li>未計入：所得稅扣繳、職工福利金、資遣費與退休金準備（舊制）、外籍勞工就業安定費、身心障礙者進用差額補助費等。</li>' +
  '<li>資料只存在這台裝置的瀏覽器，不會上傳。範例公司與人物全部是虛構的。</li></ul>';
function showWarn(){ openModal(WARN_HTML + '<div class="vstack"><button class="btn" data-act="close">我知道了</button></div>'); }
function sec(id, title, val, body){ return '<details class="set-sec" data-sec="' + id + '"><summary><span class="sst">' + title + '</span><span class="ssv">' + esc(val) + '</span></summary><div class="set-body">' + body + '</div></details>'; }
var PFIELDS = [['minWage', '基本工資月薪', 1], ['minHourly', '基本工資時薪', 1], ['liRate', '勞保普通事故費率 %', 100], ['eiRate', '就業保險費率 %', 100], ['nhiRate', '健保費率 %', 100], ['avgDep', '平均眷口數', 1], ['penRate', '勞退提繳下限 %', 100], ['wageFund', '工資墊償費率 %', 100], ['suppRate', '補充保費費率 %', 100]];
function openSettings(){
  var p = P(), changed = Object.keys(S.P).length;
  var h = '<div class="bar"><h2 style="flex:1 1 0">⚙ 常用設定</h2><button class="ibtn" data-act="foldall">全部展開／收合</button></div>' +
    sec('rate', '費率參數', changed ? '已自訂 ' + changed + ' 項' : p.year + ' 年預設', '<p class="small">新年度公告調整時改這裡。級距表本身沒辦法在這裡改。</p><div class="vstack">' +
      PFIELDS.map(function(x){ return '<label class="fld">' + x[1] + '<input type="number" step="any" data-p="' + x[0] + '" data-mul="' + x[2] + '" value="' + +(p[x[0]] * x[2]).toFixed(6) + '"></label>'; }).join('') +
      '<button class="btn alt" data-act="resetP">恢復 ' + D.DEFAULTS.year + ' 年預設</button></div>') +
    sec('view', '顯示', lsGet('fsize') === 'xl' ? '大字' : '標準字', '<div class="vstack"><button class="btn' + (lsGet('fsize') === 'xl' ? ' alt' : '') + '" data-fontsize="m">標準字</button><button class="btn' + (lsGet('fsize') === 'xl' ? '' : ' alt') + '" data-fontsize="xl">大字</button></div>') +
    sec('data', '資料備份', S.emps.length + ' 筆員工', '<p class="small">資料只存在這台裝置。換電腦或手機前先下載備份檔，再到新裝置還原。</p><div class="vstack"><button class="btn" data-act="backup">下載備份檔</button><button class="btn alt" data-act="restore">從備份檔還原</button><button class="btn alt" data-act="csv">下載 CSV</button><button class="btn red" data-act="wipe">清除全部資料</button></div><input type="file" id="restoreFile" accept=".json,application/json" hidden>') +
    sec('demo', '看範例', demo ? '範例模式中' : '', '<p class="small">用虛構的公司看看成果，您自己的資料不受影響。</p><div class="vstack">' + D.EXAMPLES.map(function(x){ return '<button class="btn alt" data-demo="' + x.key + '">' + esc(x.label) + '</button>'; }).join('') + (demo ? '<button class="btn" data-act="leaveDemo">離開範例</button>' : '') + '</div>') +
    sec('about', '關於本工具', '', '<p>👤 創作者 Mark Tsai（蔡豐全）<br><a href="mailto:tsaimark@gmail.com">tsaimark@gmail.com</a></p><div class="vstack"><a class="btn alt" href="manual.html">📖 操作手冊</a><button class="btn alt" data-act="warn">⚠ 使用警語</button>' +
      (standalone ? '' : '<button class="btn alt" data-act="install">📲 加入主畫面</button>') + '</div><p class="small" style="margin-top:.5rem">訪客數 <img src="https://visitor-badge.laobi.icu/badge?page_id=m255525.employerpayrollcostcalculator" alt="訪客次數" height="20" loading="lazy" style="vertical-align:middle"></p>') +
    '<div class="vstack"><button class="btn" data-act="close">關閉</button></div>';
  openModal(h);
  var open = lsJson('fold', []);
  document.querySelectorAll('.set-sec').forEach(function(d){ d.open = open.indexOf(d.dataset.sec) >= 0; d.addEventListener('toggle', saveFold); });
  $('restoreFile').addEventListener('change', restoreFile);
}
function saveFold(){ var o = []; document.querySelectorAll('.set-sec').forEach(function(d){ if(d.open) o.push(d.dataset.sec); }); lsSet('fold', JSON.stringify(o)); }
function applyView(){ document.documentElement.dataset.fsize = lsGet('fsize') === 'xl' ? 'xl' : 'm'; }

/* ---------- 匯出 ---------- */
function download(name, text, type){ var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], {type:type})); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500); }
function today(){ var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function csvText(){
  var A = calc(), q = function(v){ v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  var head = ['姓名', '職稱', '人數', '計薪', '經常性月薪', '每月加班費', '勞保投保', '健保投保', '勞退提繳工資'].concat(D.PARTS.map(function(p){ return p.n + '（每人每年）'; })).concat(['每人年成本', '每人月平均', '倍率', '小計（年）', '員工實領（月）']);
  var L = [head.map(q).join(',')];
  A.rows.forEach(function(r){ var c = r.c; L.push([r.e.name, r.e.role, r.n, c.part ? '時薪' : '月薪', c.regular, c.otM, c.grades.li, c.grades.nhi, c.grades.pen].concat(D.PARTS.map(function(p){ return Math.round(c.y[p.k]); })).concat([Math.round(c.year), Math.round(c.month), c.ratio.toFixed(3), Math.round(c.year * r.n), c.takeHome]).map(q).join(',')); });
  L.push(['合計', '', A.head, '', '', '', '', '', ''].concat(D.PARTS.map(function(p){ return Math.round(A.T[p.k]); })).concat(['', '', A.ratio.toFixed(3), Math.round(A.year), '']).map(q).join(','));
  return '﻿' + L.join('\r\n');
}
function restoreFile(ev){
  var file = ev.target.files[0]; if(!file) return;
  var fr = new FileReader();
  fr.onload = function(){
    try{
      var o = JSON.parse(fr.result);
      if(o.app !== 'employer-payroll-cost-calculator' || !Array.isArray(o.emps)) throw 0;
      if(demo) leaveDemo(true);
      S = {co:Object.assign(defaults().co, o.co || {}), emps:o.emps.map(function(e){ return D.newEmp(e); }), P:o.P || {}};
      if(!S.emps.length) S.emps = defaults().emps;
      V.sel = null; save(); closeModal(); render(); toast('已還原 ' + S.emps.length + ' 筆員工資料');
    }catch(e){ toast('這不是本工具的備份檔'); }
  };
  fr.readAsText(file);
}

/* ---------- 範例 ---------- */
function enterDemo(key){
  var x = D.EXAMPLES.filter(function(e){ return e.key === key; })[0]; if(!x) return;
  if(!demo) saved = S;
  demo = key;
  S = {co:Object.assign(defaults().co, x.co), emps:x.emps.map(function(e){ return D.newEmp(e); }), P:{}};
  V.sel = null; closeModal(); render();
}
function leaveDemo(quiet){ if(!demo) return; demo = null; S = saved || load(); saved = null; V.sel = null; if(quiet !== true){ render(); toast('已回到您自己的資料'); } }

/* ---------- 事件 ---------- */
var ACT = {
  settings:openSettings, close:closeModal, warn:showWarn, print:function(){ window.print(); },
  foldall:function(){ var d = document.querySelectorAll('.set-sec'), any = Array.prototype.some.call(d, function(x){ return !x.open; }); d.forEach(function(x){ x.open = any; }); saveFold(); },
  add:function(){ var e = D.newEmp({name:'員工 ' + String.fromCharCode(65 + S.emps.length % 26), role:'正職', base:P().minWage}); S.emps.push(e); V.sel = e.id; save(); render(); },
  dup:function(){ var e = selEmp(), c = D.newEmp(e); c.id = 'e' + Math.random().toString(36).slice(2, 8); c.name = (e.name || '員工') + '（複製）'; S.emps.splice(S.emps.indexOf(e) + 1, 0, c); V.sel = c.id; save(); render(); },
  del:function(){ var e = selEmp(); openModal('<h2>刪除「' + esc(e.name || '未命名') + '」？</h2><div class="vstack"><button class="btn red" data-act="delYes">刪除</button><button class="btn alt" data-act="close">取消</button></div>'); },
  delYes:function(){ var e = selEmp(); S.emps = S.emps.filter(function(x){ return x !== e; }); V.sel = null; save(); closeModal(); render(); },
  resetP:function(){ S.P = {}; save(); closeModal(); render(); openSettings(); toast('已恢復預設費率'); },
  backup:function(){ download('雇主人事成本備份-' + today() + '.json', JSON.stringify({app:'employer-payroll-cost-calculator', v:1, saved:new Date().toISOString(), co:S.co, emps:S.emps, P:S.P}, null, 1), 'application/json'); },
  restore:function(){ $('restoreFile').click(); },
  csv:function(){ download('人事成本試算-' + (S.co.name || '我的公司') + '-' + today() + '.csv', csvText(), 'text/csv;charset=utf-8'); },
  wipe:function(){ openModal('<h2>清除全部資料？</h2><p>公司設定、所有員工與自訂費率都會刪掉，無法復原。建議先下載備份檔。</p><div class="vstack"><button class="btn red" data-act="wipeYes">確定清除</button><button class="btn alt" data-act="close">取消</button></div>'); },
  wipeYes:function(){ lsDel('state'); demo = null; saved = null; S = load(); V.sel = null; closeModal(); render(); toast('已清除'); },
  leaveDemo:leaveDemo,
  install:function(){
    var m = ios ? '請按 Safari 下方的「分享」圖示，選「加入主畫面」。' : '請按瀏覽器網址列右側的安裝圖示，或右上角選單的「安裝應用程式／加到主畫面」。';
    if(window._dp){ window._dp.prompt(); window._dp.userChoice.then(function(){ window._dp = null; }); }
    else openModal('<h2>📲 加入主畫面</h2><p>' + m + '</p><div class="vstack"><button class="btn" data-act="close">知道了</button></div>');
  }
};
document.addEventListener('click', function(ev){
  var el = ev.target.closest('[data-act],[data-tab],[data-sel],[data-type],[data-demo],[data-fontsize]');
  if(!el){ if(ev.target.id === 'modal') closeModal(); return; }
  var ds = el.dataset;
  if(ds.act){ if(el.tagName === 'A') ev.preventDefault(); if(ACT[ds.act]) ACT[ds.act](); return; }
  if(ds.tab){ V.tab = ds.tab; lsSet('tab', V.tab); renderPanel(); document.querySelectorAll('.tabs button').forEach(function(b){ b.setAttribute('aria-selected', b.dataset.tab === V.tab); }); return; }
  if(ds.sel){ V.sel = ds.sel; V.berg = 'one'; lsSet('berg', 'one'); renderPanel(); renderHero(); return; }
  if(ds.type){ selEmp().type = ds.type; save(); renderPanel(); renderHero(); return; }
  if(ds.demo){ enterDemo(ds.demo); return; }
  if(ds.fontsize){ lsSet('fsize', ds.fontsize); applyView(); openSettings(); return; }
});
document.addEventListener('input', function(ev){
  var t = ev.target, ds = t.dataset;
  if(ds.f){
    var e = selEmp();
    if(t.type === 'checkbox') e[ds.f] = t.checked;
    else if(t.type === 'number') e[ds.f] = t.value === '' ? 0 : Number(t.value);
    else e[ds.f] = t.value;
    if(ds.f === 'n') e.n = Math.max(1, Math.floor(e.n) || 1);
    save(); refresh(); return;
  }
  if(ds.co){
    if(t.type === 'checkbox') S.co[ds.co] = t.checked;
    else if(ds.co === 'ind') S.co.ind = Number(t.value);
    else if(ds.co === 'name') S.co.name = t.value;
    else S.co[ds.co] = t.value === '' ? '' : Number(t.value);
    if(ds.co === 'margin'){ save(); var x = t.selectionStart; renderPanel(); var n = document.querySelector('[data-co="margin"]'); if(n){ n.focus(); } renderHero(); return; }
    save(); refresh(); return;
  }
  if(ds.v){ V[ds.v] = t.value; lsSet(ds.v, t.value); renderPanel(); var m = document.querySelector('[data-v="' + ds.v + '"]'); if(m){ m.focus(); try{ m.setSelectionRange(m.value.length, m.value.length); }catch(_){} }
    if(ds.v === 'lookup'){ var hr = $('hitRow'); if(hr) hr.scrollIntoView({block:'nearest'}); } return; }
  if(ds.p){ var v = Number(t.value); if(t.value !== '' && isFinite(v)){ S.P[ds.p] = v / Number(ds.mul); if(Math.abs(S.P[ds.p] - D.DEFAULTS[ds.p]) < 1e-12) delete S.P[ds.p]; save(); render(); } return; }
});
document.addEventListener('change', function(ev){ if(ev.target.id === 'bergSel'){ var v = ev.target.value; if(v === 'team') V.berg = 'team'; else { V.berg = 'one'; V.sel = v; } lsSet('berg', V.berg); renderHero(); if(V.tab === 'calc') renderPanel(); } });
document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && $('modal').classList.contains('show')) closeModal(); });

/* ---------- 跑馬燈（工作區共用公告，不可關） ---------- */
function initMarquee(){
  var URL_ = "https://script.google.com/macros/s/AKfycbwKX0DNNbY8y4nf90BFTHtxgfqJcHHcZasRrgycl4QAe52_hkjMWSkYk4xOsqU-JPCROw/exec";
  var REFRESH = 20 * 60 * 1000, bar = $('marqueeBar'), track = $('marqueeTrack'), lastKey = null;
  function appendText(c, text){ var re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, li = 0, m; while((m = re.exec(text))){ if(m.index > li) c.appendChild(document.createTextNode(text.slice(li, m.index))); var a = document.createElement('a'); a.href = m[2]; a.textContent = m[1]; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.style.color = 'inherit'; a.style.textDecoration = 'underline'; c.appendChild(a); li = re.lastIndex; } if(li < text.length) c.appendChild(document.createTextNode(text.slice(li))); }
  function renderM(items){
    if(!items || !items.length) return;
    var k = JSON.stringify(items); if(k === lastKey) return; lastKey = k; track.innerHTML = '';
    var fr = document.createDocumentFragment();
    function pass(){ items.forEach(function(it, i){ if(i > 0) fr.appendChild(document.createTextNode('　★　')); appendText(fr, String(it)); }); }
    pass(); fr.appendChild(document.createTextNode('　★　')); pass(); track.appendChild(fr);
    bar.classList.add('show'); document.body.classList.add('has-marquee');
    track.style.animationDuration = Math.max(track.scrollWidth / 2 / 60, 12) + 's';
  }
  function fetchM(){ fetch(URL_, {method:'POST', body:JSON.stringify({serial:''})}).then(function(r){ return r.json(); }).then(function(d){ if(d && Array.isArray(d.marquee) && d.marquee.length){ lsSet('marquee', JSON.stringify(d.marquee)); renderM(d.marquee); } }).catch(function(){}); }
  renderM(lsJson('marquee', [])); fetchM(); setInterval(fetchM, REFRESH);
}

window.addEventListener('beforeinstallprompt', function(e){ e.preventDefault(); window._dp = e; });
if('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('service-worker.js').catch(function(){});
(function(){ if(!window.EPC_WATERMARK) return; var w = document.createElement('div'); w.id = 'pdfWatermark'; w.setAttribute('aria-hidden', 'true'); w.innerHTML = '<img alt="" src="' + window.EPC_WATERMARK + '">'; document.body.appendChild(w); })();
applyView(); render(); initMarquee();
if(!lsGet('warnSeen')){ lsSet('warnSeen', '1'); showWarn(); }
window._epc = {render:render, calc:calc, csvText:csvText, enterDemo:enterDemo, leaveDemo:leaveDemo, get S(){ return S; }, get V(){ return V; }};
})();
