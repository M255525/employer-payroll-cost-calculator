/* 雇主人事成本試算：費率、級距表與計算引擎（瀏覽器與 node 共用）
   數字依 2026（民國 115）年 1 月 1 日起適用之公告，2026-11 查證。改數字要同步 tools/manual_body.html 與 app.js 的 WARN_HTML。 */
(function(root){
'use strict';

var DEFAULTS = {
  year: 2026,
  minWage: 29500,        // 基本工資月薪
  minHourly: 196,        // 基本工資時薪
  liRate: 0.115,         // 勞保普通事故費率
  eiRate: 0.01,          // 就業保險費率
  liEmp: 0.7, liWorker: 0.2,
  nhiRate: 0.0517,       // 健保費率
  nhiEmp: 0.6, nhiWorker: 0.3,
  avgDep: 0.56,          // 平均眷口數（投保單位負擔用）
  penRate: 0.06,         // 勞退雇主提繳下限
  wageFund: 0.00025,     // 積欠工資墊償基金
  suppRate: 0.0211,      // 二代健保雇主補充保費
  otCap: 46              // 每月延長工時上限（勞基法 §32，未經勞資會議）
};

// 級距表（115.1.1 起）
var LI_FULL = [29500,30300,31800,33300,34800,36300,38200,40100,42000,43900,45800];
var LI_PART = [11100,12540,13500,15840,16500,17280,17880,19047,20008,21009,22000,23100,24000,25250,26400,27600,28590];
var OA = LI_FULL.concat([48200,50600,53000,55400,57800,60800,63800,66800,69800,72800]);
var NHI = [29500,30300,31800,33300,34800,36300,38200,40100,42000,43900,45800,48200,50600,53000,55400,57800,60800,63800,66800,69800,72800,76500,80200,83900,87600,92100,96600,101100,105600,110100,115500,120900,126300,131700,137100,142500,147900,150000,156400,162800,169200,175600,182000,189500,197000,204500,212000,219500,228200,236900,245600,254300,263000,273000,283000,293000,303000,313000];
var PEN = [1500,3000,4500,6000,7500,8700,9900,11100,12540,13500,15840,16500,17280,17880,19047,20008,21009,22000,23100,24000,25250,26400,27600,28590,29500,30300,31800,33300,34800,36300,38200,40100,42000,43900,45800,48200,50600,53000,55400,57800,60800,63800,66800,69800,72800,76500,80200,83900,87600,92100,96600,101100,105600,110100,115500,120900,126300,131700,137100,142500,147900,150000];

// 勞動部「勞工職業災害保險適用行業別及費率表」（114.1.1 施行，行業別費率＋上下班 0.07%，單位 %）
var INDUSTRY = [["農、林、漁、牧業","農、林、牧業",0.25],["農、林、漁、牧業","漁業",0.21],["礦業及土石採取業","石油及天然氣礦業、砂、石採取及其他礦業",0.96],["製造業","食品及飼品、飲料及菸草製造業",0.22],["製造業","紡織業（紡織品製造業除外）",0.21],["製造業","紡織品製造業",0.17],["製造業","成衣及服飾品製造業",0.15],["製造業","皮革、毛皮及其製品製造業",0.2],["製造業","木竹製品及家具製造業",0.43],["製造業","紙漿、紙及紙製品製造業",0.39],["製造業","印刷及資料儲存媒體複製業",0.21],["製造業","石油及煤製品、化學材料及肥料、其他化學製品、藥品及醫用化學製品製造業",0.22],["製造業","橡膠製品、塑膠製品製造業",0.26],["製造業","非金屬礦物製品製造業",0.4],["製造業","基本金屬製造業",0.43],["製造業","金屬製品製造業（金屬刀具、手工具及模具、金屬容器製造業除外）",0.34],["製造業","金屬刀具、手工具及模具、金屬容器製造業",0.27],["製造業","電子零組件、電腦、電子產品及光學製品、電力設備及配備製造業",0.12],["製造業","機械設備製造業、產業用機械設備維修及安裝業",0.26],["製造業","汽車及其零件、其他運輸工具及其零件製造業",0.26],["製造業","其他製造業",0.2],["電力及燃氣供應業","電力及燃氣供應業",0.28],["用水供應及污染整治業","廢水及污水處理業、廢棄物清除、處理及資源物回收處理業、污染整治業",0.39],["用水供應及污染整治業","用水供應業",0.25],["營建工程業","建築工程業",0.57],["營建工程業","土木工程業",0.37],["營建工程業","庭園景觀工程業",0.45],["營建工程業","專門營造業（庭園景觀工程業；機電、管道及其他建築設備安裝業除外）",0.53],["營建工程業","機電、管道及其他建築設備安裝業",0.44],["批發及零售業","批發業",0.19],["批發及零售業","零售業",0.17],["運輸及倉儲業","陸上運輸業",0.39],["運輸及倉儲業","水上運輸業",0.87],["運輸及倉儲業","航空運輸業",0.21],["運輸及倉儲業","報關業及船務代理業",0.17],["運輸及倉儲業","運輸輔助業（報關業及船務代理業、陸上運輸輔助業除外）、倉儲業",0.23],["運輸及倉儲業","陸上運輸輔助業",0.21],["運輸及倉儲業","郵政及遞送服務業",0.2],["住宿及餐飲業","住宿業、餐飲業",0.19],["出版影音及資通訊業","出版業、影片及電視節目業、聲音錄製及音樂發行業、廣播、電視節目編排及傳播業",0.13],["出版影音及資通訊業","電信業",0.13],["出版影音及資通訊業","電腦程式設計、諮詢及相關服務業、資訊服務業",0.12],["金融及保險業","金融服務業、保險業、證券期貨及金融輔助業",0.12],["不動產業","不動產開發業、不動產經營及相關服務業",0.16],["專業、科學及技術服務業","法律及會計服務業、企業總管理機構及管理顧問業、建築、工程服務及技術檢測、分析服務業、廣告業及市場研究業、專門設計業、獸醫業、其他專業、科學及技術服務業",0.15],["專業、科學及技術服務業","研究發展服務業",0.13],["支援服務業","旅行及其他相關服務業",0.14],["支援服務業","租賃業、人力仲介及供應業、保全及偵探業、建築物及綠化服務業、行政支援服務業",0.25],["公共行政及國防；強制性社會安全","公共行政及國防、強制性社會安全、國際組織及外國機構",0.19],["教育業","教育業",0.12],["醫療保健及社會工作服務業","醫療保健業、居住型照顧服務業、其他社會工作服務業",0.12],["藝術、娛樂及休閒服務業","創作及藝術表演業、圖書館、檔案保存、博物館及類似機構、博弈業、運動、娛樂及休閒服務業",0.16],["其他服務業","宗教、職業及類似組織",0.14],["其他服務業","個人及家庭用品維修業",0.25],["其他服務業","未分類其他服務業",0.19]];

function r(x){ return Math.round(x + (x >= 0 ? 1e-7 : -1e-7)); }
function num(v, d){ v = Number(v); return isFinite(v) ? v : (d || 0); }
function grade(list, w){ for(var i = 0; i < list.length; i++) if(list[i] >= w) return list[i]; return list[list.length - 1]; }

// 勞基法 §38 特休天數（年資以年計，可有小數）
function leaveDays(y){
  y = num(y);
  if(y < 0.5) return 0;
  if(y < 1) return 3;
  if(y < 2) return 7;
  if(y < 3) return 10;
  if(y < 5) return 14;
  if(y < 10) return 15;
  return Math.min(30, 15 + Math.floor(y) - 9);
}

// 加班費：平日每次 h 小時（前 2 小時 4/3、後 2 小時 5/3）；休息日每次 h 小時（前 2 小時 4/3、3–8 小時 5/3、9–12 小時 8/3）
function otWeekday(hourly, h){ h = Math.min(Math.max(num(h), 0), 4); return hourly * (Math.min(h, 2) * 4 / 3 + Math.max(h - 2, 0) * 5 / 3); }
function otRestday(hourly, h){ h = Math.min(Math.max(num(h), 0), 12); return hourly * (Math.min(h, 2) * 4 / 3 + Math.max(Math.min(h, 8) - 2, 0) * 5 / 3 + Math.max(h - 8, 0) * 8 / 3); }

function newEmp(o){
  var e = {id:'e' + Math.random().toString(36).slice(2, 8), name:'', role:'', n:1, type:'full', base:32000, allow:0, hourly:200, hours:80,
    otDays:0, otHrs:2, rdDays:0, rdHrs:8, yearEndM:1, bonusY:0, years:1, unusedLeave:0, penRate:6, selfPen:0, deps:0, nhiHere:true, welfareM:0, otherY:0};
  if(o) for(var k in o) e[k] = o[k];
  return e;
}

// 單一員工（1 人份）的月與年成本；co 為公司設定，P 為費率
function calcEmp(e, co, P){
  P = P || DEFAULTS; co = co || {};
  var part = e.type === 'part';
  var regular = part ? num(e.hourly) * num(e.hours) : num(e.base) + num(e.allow);     // 經常性月薪資（投保依據）
  var hourlyBase = part ? num(e.hourly) : regular / 240;
  var otM = part ? 0 : num(e.otDays) * otWeekday(hourlyBase, e.otHrs) + num(e.rdDays) * otRestday(hourlyBase, e.rdHrs);
  otM = r(otM);
  var otHours = part ? 0 : num(e.otDays) * Math.min(num(e.otHrs), 4) + num(e.rdDays) * Math.min(num(e.rdHrs), 12);
  var paidM = regular + otM;                                                        // 每月實付薪資（不含年度獎金）
  var liG = part ? grade(LI_PART.concat(LI_FULL), regular) : grade(LI_FULL, Math.max(regular, P.minWage));
  var oaG = part ? grade(LI_PART.concat(OA), regular) : grade(OA, Math.max(regular, P.minWage));
  var nhiG = grade(NHI, Math.max(regular, P.minWage));
  var penG = grade(PEN, regular);
  var liOff = !!co.liOff;                                                           // 未滿 5 人選擇不加普通事故勞保
  var oaRate = oaRateOf(co) / 100;
  var m = {
    li: liOff ? 0 : r(liG * P.liRate * P.liEmp),
    ei: r(liG * P.eiRate * P.liEmp),
    oa: r(oaG * oaRate),
    fund: r(liG * P.wageFund),
    nhi: e.nhiHere === false ? 0 : r(nhiG * P.nhiRate * P.nhiEmp * (1 + P.avgDep)),
    pen: r(penG * Math.max(num(e.penRate, 6), P.penRate * 100) / 100)
  };
  var yearEnd = r(num(e.yearEndM) * regular);
  var bonusY = num(e.bonusY);
  var dayWage = regular / 30;
  var leave = part ? 0 : leaveDays(e.years);
  var leaveCash = r(Math.min(Math.max(num(e.unusedLeave), 0), leave) * dayWage);
  var worker = {
    li: liOff ? 0 : r(liG * P.liRate * P.liWorker),
    ei: r(liG * P.eiRate * P.liWorker),
    nhi: e.nhiHere === false ? 0 : r(nhiG * P.nhiRate * P.nhiWorker) * (1 + Math.min(Math.max(num(e.deps), 0), 3)),
    pen: r(penG * Math.min(Math.max(num(e.selfPen), 0), 6) / 100)
  };
  var insM = m.li + m.ei + m.oa + m.fund + m.nhi + m.pen;
  var y = {
    salary: regular * 12, ot: otM * 12, bonus: yearEnd + bonusY,
    li: (m.li + m.ei) * 12, oa: (m.oa + m.fund) * 12, nhi: m.nhi * 12, pen: m.pen * 12,
    supp: 0, leave: leaveCash, welfare: num(e.welfareM) * 12 + num(e.otherY)
  };
  var res = {
    part:part, regular:regular, hourlyBase:hourlyBase, otM:otM, otHours:otHours, paidM:paidM, yearEnd:yearEnd, bonusY:bonusY,
    grades:{li:liG, oa:oaG, nhi:nhiG, pen:penG}, m:m, insM:insM, worker:worker, leaveDays:leave, leaveCash:leaveCash, y:y,
    // 補充保費的計算基礎（公司層級合計後才算）
    suppBase:{paid:paidM, ins:e.nhiHere === false ? 0 : nhiG, bonus:yearEnd + bonusY + leaveCash},
    takeHome: paidM - worker.li - worker.ei - worker.nhi - worker.pen,
    warn:[]
  };
  if(!part && regular < P.minWage) res.warn.push('月薪 ' + regular + ' 元低於基本工資 ' + P.minWage + ' 元');
  if(part && num(e.hourly) < P.minHourly) res.warn.push('時薪 ' + e.hourly + ' 元低於基本工資時薪 ' + P.minHourly + ' 元');
  if(otHours > P.otCap) res.warn.push('每月加班約 ' + r(otHours) + ' 小時，超過 ' + P.otCap + ' 小時上限（經勞資會議同意可延到 54 小時、每 3 個月 138 小時）');
  if(num(e.otHrs) > 4) res.warn.push('平日每天加班最多 4 小時（一天工時合計不得超過 12 小時），超過部分沒有列入計算');
  if(num(e.rdHrs) > 12) res.warn.push('休息日加班每天最多 12 小時，超過部分沒有列入計算');
  if(num(e.penRate, 6) < 6) res.warn.push('雇主提繳勞退不得低於 6%，已以 6% 計算');
  if(part && e.nhiHere !== false && regular < P.minWage) res.warn.push('部分工時者若在本公司加健保，投保金額最低仍是 ' + P.minWage + ' 元；若員工已在其他地方加保（例如依附家人），可取消「在本公司加健保」');
  return res;
}

// 公司層級：逐人算完再算補充保費（每月：實付薪資合計 − 健保投保金額合計，超過部分 × 2.11%；年度獎金假設集中在同一個月發放）
function calcAll(emps, co, P){
  P = P || DEFAULTS;
  var head = emps.reduce(function(a, e){ return a + Math.max(1, Math.floor(num(e.n, 1))); }, 0);
  var co2 = Object.assign({}, co || {}, {liOff:!!(co && co.liOff) && head < 5});   // 5 人以上勞保強制加保
  var rows = emps.map(function(e){ return {e:e, c:calcEmp(e, co2, P), n:Math.max(1, Math.floor(num(e.n, 1)))}; });
  var paid = 0, ins = 0, bonus = 0;
  rows.forEach(function(x){ paid += x.c.suppBase.paid * x.n; ins += x.c.suppBase.ins * x.n; bonus += x.c.suppBase.bonus * x.n; });
  var gapM = paid - ins;
  var suppYear = r(Math.max(0, gapM) * P.suppRate) * 11 + r(Math.max(0, gapM + bonus) * P.suppRate);
  // 依各人「超出投保金額的年薪資」比例分攤
  var weights = rows.map(function(x){ return Math.max(0, (x.c.suppBase.paid - x.c.suppBase.ins) * 12 + x.c.suppBase.bonus) * x.n; });
  var wsum = weights.reduce(function(a, b){ return a + b; }, 0);
  var T = {salary:0, ot:0, bonus:0, li:0, oa:0, nhi:0, pen:0, supp:0, leave:0, welfare:0};
  rows.forEach(function(x, i){
    x.c.y.supp = wsum ? r(suppYear * weights[i] / wsum / x.n) : 0;
    x.c.year = sumY(x.c.y);
    x.c.month = x.c.year / 12;
    x.c.ratio = x.c.y.salary ? x.c.year / x.c.y.salary : 0;
    for(var k in T) T[k] += x.c.y[k] * x.n;
  });
  var year = sumY(T);
  return {rows:rows, head:head, T:T, year:year, month:year / 12, suppYear:suppYear, gapM:gapM,
    ratio:T.salary ? year / T.salary : 0, liOffAllowed:head < 5};
}
function oaRateOf(co){ if(co && co.oaCustom !== '' && co.oaCustom != null && isFinite(Number(co.oaCustom))) return Number(co.oaCustom); var it = INDUSTRY[co && co.ind != null ? co.ind : 54]; return it ? it[2] : 0.19; }
function sumY(y){ var s = 0; for(var k in y) s += y[k]; return s; }

// 反推：每人每月總成本預算 → 可給的最高月薪（以 100 元為單位）
function maxSalary(budgetM, e, co, P){
  var lo = 0, hi = 400000, best = null;
  while(lo <= hi){
    var mid = Math.floor((lo + hi) / 200) * 100;
    var t = Object.assign({}, e, {type:'full', base:mid, allow:0});
    var c = calcAll([t], co, P).rows[0].c;
    if(c.month <= budgetM){ best = {base:mid, c:c}; lo = mid + 100; } else hi = mid - 100;
  }
  return best;
}

var PARTS = [
  {k:'salary', n:'月薪（本薪＋固定津貼）', s:'薪水', c:'#F7FBFF', above:true},
  {k:'ot', n:'加班費', s:'加班', c:'#DCEBF7', above:true},
  {k:'bonus', n:'年終與獎金', s:'年終', c:'#B9D7EE'},
  {k:'li', n:'勞保＋就保（雇主 70%）', s:'勞保', c:'#93C1E3'},
  {k:'oa', n:'職災保險＋工資墊償', s:'職災', c:'#6FA8D6'},
  {k:'nhi', n:'健保（雇主 60%×1.56 人）', s:'健保', c:'#4F8CC4'},
  {k:'supp', n:'二代健保補充保費', s:'補充', c:'#3C74AB'},
  {k:'pen', n:'勞退提繳', s:'勞退', c:'#2D5D90'},
  {k:'leave', n:'特休未休折發', s:'特休', c:'#244C77'},
  {k:'welfare', n:'福利與其他（伙食、團保、訓練、招募）', s:'福利', c:'#1B3B5F'}
];

var EXAMPLES = [
  {key:'cafe', label:'☕ 巷口早午餐店（5 人）', co:{name:'晨光早午餐（虛構）', ind:38, liOff:false, margin:55}, emps:[
    {name:'店長', role:'正職', base:38000, allow:2400, years:4, yearEndM:1, otDays:4, otHrs:2, welfareM:1500, unusedLeave:3},
    {name:'廚房', role:'正職', base:33000, allow:2400, years:2, yearEndM:1, otDays:6, otHrs:2, welfareM:1500},
    {name:'外場', role:'正職', base:30500, allow:2400, years:0.8, yearEndM:0.5, welfareM:1500},
    {name:'假日工讀生', role:'計時', n:2, type:'part', hourly:200, hours:64, nhiHere:false, yearEndM:0, welfareM:500}
  ]},
  {key:'studio', label:'🎨 設計工作室（6 人）', co:{name:'方格設計（虛構）', ind:44, liOff:false, margin:70}, emps:[
    {name:'設計總監', role:'正職', base:68000, allow:0, years:8, yearEndM:2, bonusY:30000, deps:2, welfareM:2000, otherY:15000},
    {name:'資深設計師', role:'正職', base:48000, n:2, years:3, yearEndM:1.5, otDays:5, otHrs:3, deps:1, welfareM:2000, otherY:8000},
    {name:'設計師', role:'正職', base:36000, n:2, years:1, yearEndM:1, otDays:6, otHrs:2, welfareM:2000, otherY:8000},
    {name:'行政', role:'正職', base:31000, years:5, yearEndM:1, welfareM:2000}
  ]},
  {key:'factory', label:'🔧 金屬零件加工廠（12 人）', co:{name:'永順精密（虛構）', ind:15, liOff:false, margin:28}, emps:[
    {name:'廠長', role:'正職', base:62000, allow:3000, years:12, yearEndM:2, deps:2, welfareM:2400},
    {name:'技術員', role:'正職', base:36000, allow:3000, n:6, years:4, yearEndM:1.5, otDays:10, otHrs:2, rdDays:2, rdHrs:8, welfareM:2400, deps:1},
    {name:'學徒', role:'正職', base:30000, allow:3000, n:3, years:0.5, yearEndM:1, otDays:8, otHrs:2, welfareM:2400},
    {name:'會計', role:'正職', base:40000, years:6, yearEndM:1.5, welfareM:2400, unusedLeave:5},
    {name:'清潔', role:'計時', type:'part', hourly:210, hours:60, welfareM:0, yearEndM:0}
  ]}
];

var API = {DEFAULTS:DEFAULTS, LI_FULL:LI_FULL, LI_PART:LI_PART, OA:OA, NHI:NHI, PEN:PEN, INDUSTRY:INDUSTRY, PARTS:PARTS, EXAMPLES:EXAMPLES,
  r:r, grade:grade, oaRateOf:oaRateOf, leaveDays:leaveDays, otWeekday:otWeekday, otRestday:otRestday, newEmp:newEmp, calcEmp:calcEmp, calcAll:calcAll, maxSalary:maxSalary};
if(typeof module !== 'undefined' && module.exports) module.exports = API; else root.EPC = API;
})(this);
