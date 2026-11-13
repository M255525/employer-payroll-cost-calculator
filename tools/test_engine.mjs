// 引擎測試：node tools/test_engine.mjs
import {createRequire} from 'module';
const require = createRequire(import.meta.url);
const D = require('../data.js');
let fail = 0;
const eq = (name, a, b) => { if(a !== b){ fail++; console.log('FAIL', name, a, '!==', b); } };
const co = {ind:38};
// 官方表 29,500：勞保雇主 2,582、勞工 738；健保雇主 1,428、本人 458；勞退 1,770
let c = D.calcEmp(D.newEmp({base:29500}), co);
eq('li emp', c.m.li + c.m.ei, 2582); eq('li worker', c.worker.li + c.worker.ei, 738);
eq('nhi emp', c.m.nhi, 1428); eq('nhi worker', c.worker.nhi, 458); eq('pen', c.m.pen, 1770);
eq('oa 0.19%', c.m.oa, 56); eq('fund', c.m.fund, 7);
// 部分工時 11,100：雇主 972、勞工 277
c = D.calcEmp(D.newEmp({type:'part', hourly:200, hours:50}), co);
eq('part grade', c.grades.li, 11100); eq('part li emp', c.m.li + c.m.ei, 972); eq('part li worker', c.worker.li + c.worker.ei, 277);
eq('part nhi min', c.grades.nhi, 29500);
// 級距上限
c = D.calcEmp(D.newEmp({base:400000}), co);
eq('li cap', c.grades.li, 45800); eq('oa cap', c.grades.oa, 72800); eq('nhi cap', c.grades.nhi, 313000); eq('pen cap', c.grades.pen, 150000);
// 眷屬最多算 3 口
c = D.calcEmp(D.newEmp({base:29500, deps:5}), co); eq('deps cap', c.worker.nhi, 458 * 4);
// 特休
[[0.3,0],[0.5,3],[1,7],[2,10],[3,14],[5,15],[10,16],[24,30],[40,30]].forEach(([y,d]) => eq('leave ' + y, D.leaveDays(y), d));
// 加班：時薪 150、平日 3 小時 = 2×200 + 1×250 = 650；休息日 10 小時 = 2×200+6×250+2×400 = 2700
eq('ot weekday', Math.round(D.otWeekday(150, 3)), 650); eq('ot rest', Math.round(D.otRestday(150, 10)), 2700);
// 未滿 5 人不加普通事故勞保
c = D.calcEmp(D.newEmp({base:29500}), {ind:38, liOff:true}); eq('liOff', c.m.li, 0); eq('liOff ei', c.m.ei, 207);
// 補充保費：月薪 29,500 剛好等於投保金額，只有年終超出 → 29,500×2.11% = 622
let A = D.calcAll([D.newEmp({base:29500, yearEndM:1})], co); eq('supp', A.suppYear, 622);
// 範例都能算、合計一致
D.EXAMPLES.forEach(x => {
  const r = D.calcAll(x.emps.map(e => D.newEmp(e)), x.co);
  const s = r.rows.reduce((a, b) => a + b.c.year * b.n, 0);
  if(Math.abs(s - r.year) > 1) { fail++; console.log('FAIL total', x.key, s, r.year); }
  if(!(r.ratio > 1.1 && r.ratio < 2)) { fail++; console.log('FAIL ratio', x.key, r.ratio); }
  console.log(x.key, r.head + '人', '年成本', Math.round(r.year), '倍率', r.ratio.toFixed(3));
});
// 反推單調
const m = D.maxSalary(50000, D.newEmp({}), co); const chk = D.calcAll([D.newEmp({base:m.base})], co).rows[0].c.month;
if(chk > 50000 || D.calcAll([D.newEmp({base:m.base + 100})], co).rows[0].c.month <= 50000) { fail++; console.log('FAIL maxSalary', m.base); }
console.log('maxSalary(50000)=', m.base);
// 亂數壓力測試
for(let i = 0; i < 3000; i++){
  const e = D.newEmp({type:Math.random() < .3 ? 'part' : 'full', base:Math.random() * 200000, allow:Math.random() * 5000, hourly:150 + Math.random() * 300, hours:Math.random() * 170,
    otDays:Math.floor(Math.random() * 15), otHrs:Math.random() * 6, rdDays:Math.floor(Math.random() * 4), rdHrs:Math.random() * 14, yearEndM:Math.random() * 3, years:Math.random() * 30,
    unusedLeave:Math.random() * 20, penRate:Math.random() * 10, selfPen:Math.random() * 8, deps:Math.floor(Math.random() * 6), nhiHere:Math.random() < .8, n:1 + Math.floor(Math.random() * 3)});
  const r = D.calcAll([e, D.newEmp({})], {ind:Math.floor(Math.random() * 55), liOff:Math.random() < .2});
  r.rows.forEach(x => { for(const k in x.c.y) if(!isFinite(x.c.y[k]) || x.c.y[k] < 0){ fail++; console.log('FAIL neg', k, x.c.y[k]); } });
  if(!isFinite(r.year)) { fail++; break; }
}
console.log(fail ? fail + ' 項失敗' : '全部通過');
process.exit(fail ? 1 : 0);
