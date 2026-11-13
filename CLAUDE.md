# employer-payroll-cost-calculator — 雇主人事成本試算

輸入員工月薪（或時薪）、固定津貼、加班、年終、年資、福利，依 2026 年費率算出雇主真實人事成本：勞保＋就保、職災＋工資墊償、健保（×1.56）、二代健保補充保費、勞退、特休未休折發、福利。主視覺是「冰山」：水面上＝薪水，水面下＝雇主另外要付的。

- 純靜態：`index.html`（CSS）＋`data.js`（費率、級距表、行業別職災費率、計算引擎，node 也能 require）＋`app.js`（畫面）＋`watermark.js`（`EPC_WATERMARK` 馬克老師浮水印，列印用）＋`manual.html`＋PWA。
- 本機預覽 port **8876**（`.claude/launch.json` 的 `employer-payroll-cost-calculator`）。visitor-badge `m255525.employerpayrollcostcalculator`。
- 部署：`.github/workflows/pages.yml`（push master 自動部署 GitHub Pages）。**尚未建立遠端 repo／未上線**（使用者自己跑 `gh repo create`）。

## 費率與級距（2026-11 查證，改數字要同步三處：`data.js`、`tools/manual_body.html`、`app.js` 的 `WARN_HTML`）
- 基本工資 29,500／時薪 196；勞保 11.5%＋就保 1%（雇主 70%、勞工 20%），級距 29,500～45,800 共 11 級；部分工時另有 11,100～28,590 的 17 級（職災同樣套用，這點未在官方查到明文，警語有寫「以主管機關認定為準」）。
- 職災級距上限 72,800；行業別費率表來自勞動部開放資料 data.gov.tw/dataset/6262（114.1.1 施行，55 類，已含上下班 0.07%），存在 `INDUSTRY`。
- 健保 5.17%、雇主 60%×(1+0.56)，58 級 29,500～313,000；部分工時健保最低仍 29,500。
- 勞退 62 級 1,500～150,000，雇主至少 6%；工資墊償 0.025%（以勞保級距）；補充保費 2.11%（公司層級：每月實付薪資合計−健保投保合計，年度獎金假設同月發放，再依超出金額比例分攤到每人）。
- 捨入照官方：每一項分開四捨五入（`r()` 加 1e-7 防浮點）。29,500 級距驗證值：勞保雇主 2,582／勞工 738、健保雇主 1,428／本人 458、勞退 1,770；部分工時 11,100：雇主 972／勞工 277。
- 投保依據＝本薪＋固定津貼（不含加班）。加班時薪＝（本薪＋津貼）÷240；平日 4/3、5/3，休息日 4/3、5/3、8/3。特休依勞基法 §38，只有「未休折發天數」算成本（日薪＝月薪÷30）。
- 員工未滿 5 人可勾「不加普通事故勞保」；`calcAll` 會在 5 人以上自動忽略此選項。
- 改 `data.js` 跑 `node tools/test_engine.mjs`（官方表對照＋3000 組亂數）。
- 新年度費率：使用者可在 ⚙ 費率參數覆寫（存在 `S.P`），級距表要改程式。

## 架構
- localStorage 前綴 `epc.`：`state`（`{co, emps[], P}`）、`tab`、`berg`、`budget`、`raise`、`fold`、`fsize`、`warnSeen`、`marquee`。
- 輸入不整頁重繪：`input` 事件只呼叫 `refresh()` 更新冰山、員工清單與明細，編輯器保留焦點。
- 字體屬性用 `html[data-fsize]`、按鈕 `data-fontsize`（避開 shop-opening-checklist 的 `data-fs` 事件委派踩坑）。
- 範例（3 家虛構）：`S` 換成記憶體資料、`save()` 不寫入。
- 匯出：列印／存 PDF（`@media print` 印冰山＋目前分頁，`#pdfWatermark` 每頁）、CSV（BOM）、備份 JSON（`app:'employer-payroll-cost-calculator'`）。
- 測試掛鉤 `window._epc`。

## 標準配備
跑馬燈（工作區公告 GAS，滑鼠移入暫停，不可關）、⚙ 常用設定（收合式：費率參數／顯示／資料備份／看範例／關於本工具）、首訪警語＋頁面入口、`manual.html#creator` 完整版（`tools/build_manual.py` 組，改手冊改 `tools/manual_body.html` 再重跑）、PWA（`tools/make_icons.py`；上線改版升 `service-worker.js` 的 `CACHE_NAME`）、訪客計數器。

## 未計入（警語有寫）
所得稅扣繳、職工福利金、舊制退休準備、資遣費、外勞就業安定費、身障進用差額補助費、到離職當月按日計費。
