import React, { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, ComposedChart,
  ScatterChart, Scatter, ZAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, ReferenceArea, Cell
} from "recharts";

/* =============================================================================
 * FWD PREMIUM FINANCING PROFESSIONAL DEMO  ·  v5.0
 * FWD Insurance Hong Kong
 * Products: Wealth ICON Horizon (WIH) · Wealth ICON Supreme III (WIS3)
 * =============================================================================
 *
 * V5 KEY CHANGE — SIMPLIFIED RATE INPUT (for entry-level consultants)
 * -------------------------------------------------------------------
 * Rate Assumptions section redesigned:
 *   • DEFAULT (Simple Mode): Just ONE field — "Annual Loan Rate"
 *     - Bank selection auto-fills its currently-published rate
 *     - User can override directly (no need to understand HIBOR/spread/cap)
 *   • OPTIONAL (Advanced Mode): Hidden behind toggle, exposes:
 *     - Cap during early years
 *     - Tier rate schedule (Y1-N rate1, Y(N+1)+ rate2)
 *
 * Inherited from V4: Cash vs PF side-by-side comparison, opportunity cost chart
 * Inherited from V3: IRR replaces ROI (industry standard)
 * Inherited from V2: Print/PDF, full Y114 lifetime data
 *
 * MAINTENANCE — UPDATE BANK RATES
 * --------------------------------
 * Edit BANK_PLATFORMS.publishedRateHKD / publishedRateUSD when banks update
 * their public rate sheets. The simple-mode "Loan Rate" field will auto-populate.
 *
 * VALIDATION (Excel cross-checks, HKD scenario 4.85%/3.15% tier)
 * --------------------------------------------------------------
 * Y5  IRR = 4.02% ✓     Y10 IRR = 6.96% ✓
 * Y15 IRR = 6.60% ✓     Y20 IRR = 7.22% ✓ (proves leverage uplift)
 * ============================================================================= */

// ─── BANK PLATFORMS (last updated 2026-04-24) ────────────────────────────────
// Simplified: publishedRateHKD/USD = current effective rate the bank is charging.
// This is what the consultant sees when they call/email the bank.
// To update: Just change publishedRateHKD/USD when banks publish new rates.
const BANK_PLATFORMS = {
  shacombank: {
    id: "shacombank",
    name_tc: "上海商業銀行",
    name_en: "Shanghai Commercial Bank",
    ltv: 0.90,
    publishedRateHKD: 0.0349,    // Current effective HKD rate
    publishedRateUSD: null,       // Not offering USD financing
    capRate: 0.038,               // Year 1-2 capped at 3.8%
    capYears: 2,
    setupFee: 0,
    notes_tc: "首2年利率封頂 3.8%；無上限費；最高貸款 3,000萬港元",
    notes_en: "Year 1-2 cap at 3.8%, no setup fee, max loan HKD 30M",
  },
  citic: {
    id: "citic",
    name_tc: "中信銀行（國際）",
    name_en: "China CITIC Bank International",
    ltv: 0.90,
    publishedRateHKD: 0.0399,
    publishedRateUSD: null,
    capRate: null,
    capYears: 0,
    setupFee: 0,
    notes_tc: "CITICdiamond 留存資產 100萬港元；簡易申請",
    notes_en: "CITICdiamond requires HKD 1M AUM; streamlined process",
  },
  airstar: {
    id: "airstar",
    name_tc: "天星銀行（AirStar）",
    name_en: "AirStar Bank",
    ltv: 0.90,
    publishedRateHKD: 0.0409,
    publishedRateUSD: null,
    capRate: null,
    capYears: 0,
    setupFee: 0.0025,
    notes_tc: "純線上虛擬銀行；最快速申請流程",
    notes_en: "Pure online virtual bank; fastest application",
  },
  ocbc: {
    id: "ocbc",
    name_tc: "華僑銀行（OCBC）",
    name_en: "OCBC Hong Kong",
    ltv: 0.90,
    publishedRateHKD: 0.0379,
    publishedRateUSD: 0.0480,
    capRate: null,
    capYears: 0,
    setupFee: 0.003,
    notes_tc: "需開立 Premier 戶口；接受 USD 與 HKD 保單",
    notes_en: "Premier account required; accepts USD & HKD policies",
  },
  dbs: {
    id: "dbs",
    name_tc: "星展銀行（DBS）",
    name_en: "DBS Hong Kong",
    ltv: 0.90,
    publishedRateHKD: 0.0379,
    publishedRateUSD: 0.0480,
    capRate: null,
    capYears: 0,
    setupFee: 0.0025,
    notes_tc: "Treasures 客戶可享優惠；最高貸款 4,000萬港元",
    notes_en: "Treasures clients enjoy promo; max loan HKD 40M",
  },
  dahsing: {
    id: "dahsing",
    name_tc: "大新銀行",
    name_en: "Dah Sing Bank",
    ltv: 0.90,
    publishedRateHKD: 0.0379,
    publishedRateUSD: 0.0470,
    capRate: null,
    capYears: 0,
    setupFee: 0,
    notes_tc: "VIP Banking 客戶；同貨幣 90% LTV，跨貨幣 90%×97%",
    notes_en: "VIP Banking; same-ccy 90% LTV, cross-ccy 90%×97%",
  },
  custom: {
    id: "custom",
    name_tc: "自訂",
    name_en: "Custom",
    ltv: 0.90,
    publishedRateHKD: 0.0400,
    publishedRateUSD: 0.0500,
    capRate: null,
    capYears: 0,
    setupFee: 0,
    notes_tc: "手動輸入所有條款",
    notes_en: "Manually enter all terms",
  },
};

// ─── PRODUCT VALUES — full lifetime data per USD 200,000 baseline ────────────
// Source: Official Policy Illustrations "累積週年紅利情況" tables (Y1-Y114)
const WIH_DATA = [
  [1,160000,0,160000],[2,162000,5600,167600],[3,162000,29444,191444],[4,162000,44934,206934],[5,162000,75870,237870],
  [6,162200,87451,249651],[7,162400,100079,262479],[8,162600,115753,278353],[9,163000,141474,304474],[10,163156,167243,330399],
  [11,167256,181259,348515],[12,172840,195124,367964],[13,180038,208437,388475],[14,189026,221398,410424],[15,200030,234010,434040],
  [16,200206,263671,463877],[17,200404,296582,496986],[18,200624,332743,533367],[19,200866,372555,573421],[20,201128,416619,617747],
  [21,201414,455134,656548],[22,201724,496302,698026],[23,202054,540722,742776],[24,202408,587995,790403],[25,203004,638521,841525],
  [26,203718,692701,896419],[27,204480,750936,955416],[28,207320,811225,1018545],[29,210160,876369,1086529],[30,213000,946569,1159569],
  [31,213920,1024025,1237945],[32,214800,1107337,1322137],[33,215720,1196906,1412626],[34,216600,1293532,1510132],[35,217520,1397617,1615137],
  [36,218400,1509759,1728159],[37,219320,1630360,1849680],[38,220200,1760621,1980821],[39,221120,1900941,2122061],[40,222000,2052521,2274521],
  [41,222880,2215962,2438842],[42,223720,2392664,2616384],[43,224600,2583228,2807828],[44,225440,2789454,3014894],[45,226320,3012142,3238462],
  [46,227160,3252894,3480054],[47,228040,3513309,3741349],[48,228880,3795188,4024068],[49,229760,4100332,4330092],[50,230600,4430541,4661141],
  [51,231560,4732616,4964176],[52,232480,5054357,5286837],[53,233440,5397165,5630605],[54,234360,5762240,5996600],[55,235320,6150982,6386302],
  [56,236240,6565193,6801433],[57,237200,7006273,7243473],[58,238120,7476223,7714343],[59,239080,7976842,8215922],[60,240000,8509932,8749932],
  [61,241000,9077693,9318693],[62,241960,9682326,9924286],[63,242960,10326431,10569391],[64,243920,11012609,11256529],[65,244920,11743260,11988180],
  [66,245880,12521385,12767265],[67,246880,13350385,13597265],[68,247840,14233260,14481100],[69,248840,15173411,15422251],[70,249800,16175038,16424838],
  [71,250800,17241543,17492343],[72,251800,18377525,18629325],[73,252800,19587585,19840385],[74,253800,20876124,21129924],[75,254800,22248543,22503343],
  [76,255800,23710441,23966241],[77,256800,25267221,25524021],[78,257800,26925282,27183082],[79,258800,28691225,28950025],[80,259800,30571851,30831651],
  [81,260880,32574960,32835840],[82,261920,34708153,34970073],[83,263000,36980231,37243231],[84,264040,39399995,39664035],[85,265120,41977044,42242164],
  [86,266160,44721781,44987941],[87,267240,47644804,47912044],[88,268280,50758117,51026397],[89,269360,54073717,54343077],[90,270400,57605008,57875408],
  [91,271320,61365989,61637309],[92,272240,65371461,65643701],[93,273160,69637424,69910584],[94,274080,74180681,74454761],[95,275040,79019230,79294270],
  [96,275960,84172474,84448434],[97,276920,89660812,89937732],[98,277840,95505845,95783685],[99,278800,101730775,102009575],[100,279720,108360402,108640122],
  [101,280660,115421127,115701787],[102,281604,122940751,123222355],[103,282550,130949273,131231823],[104,283498,139478496,139761994],[105,284452,148562020,148846472],
  [106,285408,158236046,158521454],[107,286366,168538975,168825341],[108,287328,179511806,179799134],[109,288294,191197742,191486036],[110,289262,203643384,203932646],
  [111,290236,216897931,217188167],[112,291210,231014185,231305395],[113,292188,246048146,246340334],[114,293170,262059216,262352386],
];

const WIS3_DATA = [
  [1,160000,0,160000],[2,160000,0,160000],[3,173000,19300,192300],[4,184200,22043,206243],[5,196000,27232,223232],
  [6,200400,38429,238829],[7,203200,51272,254472],[8,206200,67585,273785],[9,209800,79909,289709],[10,213400,97286,310686],
  [11,215400,109677,325077],[12,217400,122522,339922],[13,219600,135784,355384],[14,221800,149864,371664],[15,224200,164601,388801],
  [16,226800,180159,406959],[17,229400,196337,425737],[18,232200,213177,445377],[19,235200,231041,466241],[20,238200,249531,487731],
  [21,241400,269105,510505],[22,244800,289709,534509],[23,248200,311184,559384],[24,252000,333890,585890],[25,255800,357671,613471],
  [26,259800,382689,642489],[27,264000,408785,672785],[28,268400,436362,704762],[29,273000,465383,738383],[30,277800,495910,773710],
  [31,281000,529606,810606],[32,284000,565399,849399],[33,287400,602892,890292],[34,290600,642508,933108],[35,293800,684432,978232],
  [36,297200,728268,1025468],[37,300600,774620,1075220],[38,304000,823554,1127554],[39,307400,875015,1182415],[40,311000,929208,1240208],
  [41,314600,986378,1300978],[42,318200,1046552,1364752],[43,321800,1109878,1431678],[44,325400,1176801,1502201],[45,329200,1247148,1576348],
  [46,333000,1321549,1654549],[47,336800,1399592,1736392],[48,340800,1482067,1822867],[49,344600,1569042,1913642],[50,348600,1660508,2009108],
  [51,352800,1757097,2109897],[52,356800,1858801,2215601],[53,361000,1966091,2327091],[54,365200,2079182,2444382],[55,369400,2198289,2567689],
  [56,373800,2323967,2697767],[57,378200,2456451,2834651],[58,382600,2596136,2978736],[59,387000,2743256,3130256],[60,391600,2898608,3290208],
  [61,396200,3062228,3458428],[62,401000,3234934,3635934],[63,405600,3417124,3822724],[64,410400,3609236,4019636],[65,415400,3811670,4227070],
  [66,420200,4025465,4445665],[67,425200,4251023,4676223],[68,430400,4488784,4919184],[69,435400,4739771,5175171],[70,440600,5004587,5445187],
  [71,446000,5283877,5729877],[72,451200,5578844,6030044],[73,456600,5889936,6346536],[74,462200,6218559,6680759],[75,467600,6565160,7032760],
  [76,473400,6931168,7404568],[77,479000,7317595,7796595],[78,484800,7725489,8210289],[79,490600,8156065,8646665],[80,496600,8610975,9107575],
  [81,502600,9091234,9593834],[82,508800,9598498,10107298],[83,515000,10134204,10649204],[84,521200,10700172,11221372],[85,527600,11298061,11825661],
  [86,534000,11929693,12463693],[87,540600,12596932,13137532],[88,547200,13302002,13849202],[89,553400,14047569,14600969],[90,559800,14835483,15395283],
  [91,566200,15668374,16234574],[92,572800,16548513,17121313],[93,579400,17479135,18058535],[94,586000,18462915,19048915],[95,592800,19502892,20095692],
  [96,599600,20602745,21202345],[97,606400,21765938,22372338],[98,613400,22995916,23609316],[99,620400,24296765,24917165],[100,627600,25672996,26300596],
  [101,634800,26980684,27615484],[102,642200,28354104,28996304],[103,649600,29796558,30446158],[104,657000,31311509,31968509],[105,664600,32902263,33566863],
  [106,672200,34572911,35245111],[107,679800,36327545,37007345],[108,687800,38170083,38857883],[109,695600,40105006,40800606],[110,703600,42137039,42840639],
  [111,711800,44270890,44982690],[112,719800,46511873,47231673],[113,728200,48865106,49593306],[114,736600,51336530,52073130],
];

const PRODUCT_VALUES = {
  WIH: {
    name_tc: "智盈．超凡保險計劃",
    name_en: "Wealth ICON Horizon",
    code: "GMA1",
    baseline: 200000,
    description_tc: "更高長線增長潛力，適合中長線財富傳承（被保人終身保障）",
    description_en: "Higher long-term growth potential, lifetime coverage for legacy",
    rows: WIH_DATA.map(([year, gv, ngv, tsv]) => ({ year, gv, ngv, tsv })),
  },
  WIS3: {
    name_tc: "智盈匯聚（優越版）III 壽險計劃",
    name_en: "Wealth ICON Supreme III",
    code: "UWO1",
    baseline: 200000,
    description_tc: "保證現金價值較高，初年回本快，平衡型方案（保障 138 歲）",
    description_en: "Higher guaranteed value, faster early break-even (covers age 138)",
    rows: WIS3_DATA.map(([year, gv, ngv, tsv]) => ({ year, gv, ngv, tsv })),
  },
};

// ─── i18n DICTIONARY ─────────────────────────────────────────────────────────
const I18N = {
  tc: {
    appTitle: "保費融資專業演示",
    appSubtitle: "Premium Financing Demonstration · 富衛人壽 Wealth ICON 系列",
    consultant: "FWD 理財顧問",
    productSection: "產品選擇",
    inputSection: "個案參數",
    rateSection: "利率假設",
    summarySection: "融資結構概覽",
    comparisonSection: "全現金 vs 保費融資 並排對比",
    chartsSection: "視覺化分析",
    tableSection: "逐年詳細數據",
    disclaimerSection: "重要聲明",

    premium: "躉繳保費",
    currency: "保單貨幣",
    bank: "融資銀行平台",
    ltv: "貸款成數 (LTV)",
    interestRate: "貸款年利率",
    premiumDiscount: "保費折扣",
    setupFee: "開設費",
    bankNotes: "備註",
    loanRate: "貸款年利率",
    loanRateHint: "選擇銀行後會自動填入該行公布利率，您亦可手動修改",
    advancedSettings: "進階設定",
    advancedHint: "壓力測試 / 假設未來利率變化（可選）",
    showAdvanced: "顯示進階",
    hideAdvanced: "隱藏進階",
    earlyCap: "首期封頂利率",
    earlyCapHint: "部份銀行於頭幾年提供利率封頂",
    enableTier: "啟用未來利率調整",
    tierYear: "於第幾年改變利率",
    tierRate: "之後年利率",
    rateAfterTier: "後段假設利率",
    viewRange: "顯示年期範圍",
    print: "列印 / 匯出 PDF",

    totalPremium: "保費總額",
    financingAmount: "融資金額",
    initialOutlay: "首期投入",
    annualInterest: "首年利息",
    day1SV: "首日退保價值",
    leverage: "槓桿倍數",

    chart1Title: "財富累積對比",
    chart1Sub: "保費融資 vs 全現金投入",
    chart2Title: "IRR 年化回報率",
    chart2Sub: "槓桿後 IRR vs 全現金 IRR",
    chart3Title: "現金流分析",
    chart3Sub: "累積利息 vs 累積增值",
    chart4Title: "保證 vs 非保證價值",
    chart4Sub: "現金價值組成結構",

    year: "年度",
    age: "年齡",
    gv: "保證價值",
    ngv: "非保證價值",
    tsv: "退保總值",
    yearRate: "當年利率",
    cumInterest: "累積利息",
    netProfit: "淨利潤",
    irrPF: "IRR (融資後)",
    irrCash: "IRR (全現金)",
    irrSpread: "IRR 差額",
    breakeven: "回本",
    focusYear: "聚焦保單年度",

    pfMode: "融資模式",
    cashMode: "全現金",
    netSurrender: "退保後淨額",
    yearUnit: "年",

    // Comparison section
    cmpAllCash: "全現金投保",
    cmpWithPF: "保費融資",
    cmpDelta: "差距",
    cmpUpfront: "前期投入現金",
    cmpCashFreed: "釋出現金",
    cmpAnnualBurden: "每年支出",
    cmpTotalCost: "累積總成本",
    cmpNetWealth: "淨資產（退保時）",
    cmpIRR: "年化回報 IRR",
    cmpLeverageGain: "槓桿溢價",

    chartCompareTitle: "雙軌財富累積比較",
    chartCompareSub: "相同保費下，兩種策略的口袋實值",
    chartLeverageTitle: "槓桿效益散點圖",
    chartLeverageSub: "每點代表一個保單年度",
    chartOppCostTitle: "機會成本分析",
    chartOppCostSub: "保費融資 + 剩餘現金做其他投資 vs 全現金投保",
    altReturn: "剩餘資金假設年回報率",
    altReturnHint: "假設您將融資釋出的現金投資於股票/基金/REIT 等",

    disclaimer: [
      "本演示僅供內部參考及客戶展示用途，數據基於官方 illustration 及預設假設計算。",
      "Fulfillment Ratio (FR) 假設為 100%，實際派發紅利並非保證，可能高於或低於演示數值。",
      "保監局訂明保險產品 illustration 的非保證部分 IRR cap 為 7%，此限制適用於產品本身（即全現金投保）的 IRR。使用保費融資後，由於槓桿效應，融資後的有效 IRR 可超過 7%，這並不違反監管要求 — 槓桿放大正是保費融資的本質。",
      "貸款利率隨銀行政策及市場 HIBOR/SOFR 浮動，本演示假設利率不變；實際利息支出可能上升或下降，需配合進階設定的「未來利率調整」做壓力測試。",
      "保費融資涉及槓桿風險，當保單退保價值不足以償還貸款時，客戶須補倉或追加抵押。",
      "外幣保單須承擔匯率風險（USD/HKD 聯繫匯率以外的貨幣對沖風險）。",
      "客戶應諮詢專業稅務及法律意見，特別涉及跨境身份（CRS/AEOI 申報）。",
    ],
    bankUpdateNote: "銀行平台資料更新日期：2026 年 4 月 24 日",

    benefitTitle: "保費融資的核心價值",
    benefit1Title: "資金效率",
    benefit1Body: "以較少現金投入鎖定大額保單，把握槓桿放大效應",
    benefit2Title: "中長線增值",
    benefit2Body: "保單年回報潛力高於貸款利息，產生正向利差",
    benefit3Title: "傳承槓桿",
    benefit3Body: "放大身故權益，為下一代創造更大財富傳承",
  },
  en: {
    appTitle: "Premium Financing Demo",
    appSubtitle: "FWD Wealth ICON Series · Professional Sales Tool",
    consultant: "FWD Consultant",
    productSection: "Product Selection",
    inputSection: "Case Parameters",
    rateSection: "Rate Assumptions",
    summarySection: "Financing Structure Overview",
    comparisonSection: "All-Cash vs Premium Financing — Side-by-Side",
    chartsSection: "Visual Analysis",
    tableSection: "Year-by-Year Detail",
    disclaimerSection: "Important Disclaimers",

    premium: "Single Premium",
    currency: "Policy Currency",
    bank: "Bank Platform",
    ltv: "Loan-to-Value",
    interestRate: "Annual Loan Rate",
    premiumDiscount: "Premium Discount",
    setupFee: "Setup Fee",
    bankNotes: "Notes",
    loanRate: "Annual Loan Rate",
    loanRateHint: "Auto-filled with bank's published rate; manually editable",
    advancedSettings: "Advanced Settings",
    advancedHint: "Stress test / future rate change assumption (optional)",
    showAdvanced: "Show Advanced",
    hideAdvanced: "Hide Advanced",
    earlyCap: "Early-Year Cap",
    earlyCapHint: "Some banks cap rate during initial years",
    enableTier: "Assume Rate Change",
    tierYear: "Rate Change at Year",
    tierRate: "Rate After Change",
    rateAfterTier: "Assumed Future Rate",
    viewRange: "Display Range",
    print: "Print / Export PDF",

    totalPremium: "Total Premium",
    financingAmount: "Loan Amount",
    initialOutlay: "Initial Outlay",
    annualInterest: "Year 1 Interest",
    day1SV: "Day 1 Surrender",
    leverage: "Leverage Ratio",

    chart1Title: "Wealth Accumulation",
    chart1Sub: "With PF vs All-Cash",
    chart2Title: "IRR Annualised Return",
    chart2Sub: "Levered vs Unlevered IRR",
    chart3Title: "Cash Flow Analysis",
    chart3Sub: "Cum. Interest vs Cum. Gain",
    chart4Title: "Guaranteed vs Non-Guaranteed",
    chart4Sub: "Cash Value Composition",

    year: "Year",
    age: "Age",
    gv: "Guaranteed",
    ngv: "Non-Guar.",
    tsv: "Total SV",
    yearRate: "Year Rate",
    cumInterest: "Cum. Interest",
    netProfit: "Net Profit",
    irrPF: "IRR (Levered)",
    irrCash: "IRR (Cash)",
    irrSpread: "IRR Spread",
    breakeven: "Break-even",
    focusYear: "Focus Policy Year",

    pfMode: "With PF",
    cashMode: "All-Cash",
    netSurrender: "Net After Surrender",
    yearUnit: "Yr",

    // Comparison section
    cmpAllCash: "All-Cash Strategy",
    cmpWithPF: "With Premium Financing",
    cmpDelta: "Delta",
    cmpUpfront: "Upfront Cash",
    cmpCashFreed: "Cash Freed Up",
    cmpAnnualBurden: "Annual Outflow",
    cmpTotalCost: "Total Cost (Cum.)",
    cmpNetWealth: "Net Wealth (at Surrender)",
    cmpIRR: "Annualised IRR",
    cmpLeverageGain: "Leverage Premium",

    chartCompareTitle: "Wealth Accumulation — Side by Side",
    chartCompareSub: "Same premium, two strategies — net pocket value",
    chartLeverageTitle: "Leverage Efficiency Scatter",
    chartLeverageSub: "Each point = one policy year",
    chartOppCostTitle: "Opportunity Cost Analysis",
    chartOppCostSub: "PF + invested freed cash vs All-Cash policy",
    altReturn: "Assumed Return on Freed Cash",
    altReturnHint: "Assumes freed cash invested in equities/funds/REITs",

    disclaimer: [
      "This demo is for internal & client presentation use only; figures based on official illustration with stated assumptions.",
      "Fulfillment Ratio (FR) assumed at 100%; actual non-guaranteed bonuses may differ.",
      "IA's 7% IRR illustration cap applies to the underlying policy's non-guaranteed return on a cash basis. Post-leverage IRR can legitimately exceed 7% — this is the inherent value of premium financing and does not violate regulations.",
      "Loan rates float with bank policy and market HIBOR/SOFR; this demo assumes rate stays constant. Use the Advanced 'Rate Change' option for stress testing.",
      "Premium financing carries leverage risk: if surrender value falls below loan, top-up may be required.",
      "Foreign-currency policies bear FX risk beyond the USD/HKD peg framework.",
      "Clients should obtain independent tax & legal advice (esp. for cross-border CRS/AEOI matters).",
    ],
    bankUpdateNote: "Bank platform data last updated: 24 Apr 2026",

    benefitTitle: "Core Value of Premium Financing",
    benefit1Title: "Capital Efficiency",
    benefit1Body: "Lock in larger policy with smaller cash outlay via leverage",
    benefit2Title: "Mid-to-Long Term Growth",
    benefit2Body: "Policy returns can exceed loan interest, creating positive spread",
    benefit3Title: "Legacy Multiplier",
    benefit3Body: "Amplifies death benefit for enhanced wealth transfer",
  },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (n, d = 0) => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
};
const fmtCompact = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e4) return `${sign}${(abs / 1e3).toFixed(0)}K`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs.toFixed(0)}`;
};
const fmtCurrency = (n, ccy = "USD") => `${ccy === "HKD" ? "HK$" : "US$"}${fmt(n, 0)}`;
const fmtCurrencyCompact = (n, ccy = "USD") => `${ccy === "HKD" ? "HK$" : "US$"}${fmtCompact(n)}`;
const fmtPct = (n, d = 2) => `${(n * 100).toFixed(d)}%`;
const fmtIRR = (n, d = 2) => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return `${(n * 100).toFixed(d)}%`;
};

/**
 * IRR via bisection — robust against multiple roots and edge cases.
 * Returns the practical root in [-99%, 500%] range.
 * Returns null if no IRR exists (all-positive or all-negative cash flows).
 *
 * Verified against Excel Y1-Y20 With PF TIRR values for HKD scenario:
 *   Y1 -80.40% · Y3 -13.98% · Y5 4.02% · Y10 6.96% · Y20 7.22%
 */
function calculateIRR(cashFlows, low = -0.99, high = 5.0, tol = 1e-9, maxIter = 200) {
  const npv = (rate) => {
    let total = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      total += cashFlows[t] / Math.pow(1 + rate, t);
    }
    return total;
  };

  // Need at least one positive and one negative cash flow
  if (!cashFlows.some(cf => cf > 0) || !cashFlows.some(cf => cf < 0)) return null;

  let nL = npv(low), nH = npv(high);
  if (nL * nH > 0) return null; // No sign change → root outside range

  for (let i = 0; i < maxIter; i++) {
    const mid = (low + high) / 2;
    const nM = npv(mid);
    if (Math.abs(nM) < tol) return mid;
    if (nM * nL < 0) { high = mid; nH = nM; } else { low = mid; nL = nM; }
    if ((high - low) < tol) return mid;
  }
  return (low + high) / 2;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function PremiumFinancingApp() {
  // Inject Google Fonts + print styles
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(link);

    const printStyle = document.createElement("style");
    printStyle.id = "pf-print-styles";
    printStyle.textContent = `
      @media print {
        @page { size: A4 landscape; margin: 1cm; }
        body { background: white !important; }
        .no-print { display: none !important; }
        .print-break { page-break-after: always; }
        .pf-card { break-inside: avoid; }
        header { position: static !important; }
        .recharts-wrapper { width: 100% !important; }
      }
    `;
    document.head.appendChild(printStyle);

    return () => {
      document.head.removeChild(link);
      const ps = document.getElementById("pf-print-styles");
      if (ps) document.head.removeChild(ps);
    };
  }, []);

  // ─── STATE ────────────────────────────────────────────────────────────────
  const [lang, setLang] = useState("tc");
  const [productKey, setProductKey] = useState("WIH");
  const [premium, setPremium] = useState(500000);
  const [currency, setCurrency] = useState("USD");
  const [bankKey, setBankKey] = useState("shacombank");
  const [customLTV, setCustomLTV] = useState(0.90);
  const [customDiscount, setCustomDiscount] = useState(0.05);
  // SIMPLIFIED: One loan rate field that auto-syncs from bank but is user-editable
  const [loanRate, setLoanRate] = useState(0.0349);  // matches default bank (Shacombank HKD)
  const [rateOverridden, setRateOverridden] = useState(false); // tracks if user manually edited
  // Advanced settings (collapsed by default)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tierEnabled, setTierEnabled] = useState(false);
  const [tierYear, setTierYear] = useState(18);
  const [tierRateInput, setTierRateInput] = useState(0.0315);
  // Opportunity cost — alternative investment return for freed cash
  const [altReturn, setAltReturn] = useState(0.05);
  // View
  const [highlightYear, setHighlightYear] = useState(10);
  const [viewRange, setViewRange] = useState(30);

  const t = I18N[lang];
  const product = PRODUCT_VALUES[productKey];
  const bank = BANK_PLATFORMS[bankKey];
  const isCustom = bankKey === "custom";

  // ─── EFFECTIVE PARAMETERS ─────────────────────────────────────────────────
  const ltv = isCustom ? customLTV : bank.ltv;
  const discount = customDiscount;
  const setupFeeRate = bank.setupFee || 0;

  // Bank's published rate for the chosen currency
  const bankPublishedRate = (currency === "USD" && bank.publishedRateUSD !== null)
    ? bank.publishedRateUSD
    : bank.publishedRateHKD;

  // Auto-sync loan rate when bank/currency changes (unless user overrode)
  useEffect(() => {
    setLoanRate(bankPublishedRate);
    setRateOverridden(false);
  }, [bankKey, currency]);

  // Year-aware effective rate (uses simple loan rate; cap & tier are advanced)
  const rateForYear = (y) => {
    let r = loanRate;
    // Apply early-year cap if bank publishes one (auto, no user input needed)
    if (!isCustom && bank.capRate && y <= bank.capYears) {
      r = Math.min(r, bank.capRate);
    }
    // Apply tier rate if user enabled in advanced mode
    if (tierEnabled && y > tierYear) {
      r = tierRateInput;
    }
    return r;
  };

  // For UI display
  const currentEffectiveRate = rateForYear(1);

  // ─── CALCULATIONS ─────────────────────────────────────────────────────────
  const calc = useMemo(() => {
    const day1SV = premium * 0.80;
    const financing = day1SV * ltv;
    const premiumDiscountAmt = premium * discount;
    const setupFeeAmt = financing * setupFeeRate;
    const initialOutlay = premium - financing - premiumDiscountAmt + setupFeeAmt;
    const leverage = premium / Math.max(initialOutlay, 1);
    const scaleFactor = premium / product.baseline;

    // Pre-compute year rates and interests
    const yearRates = product.rows.map((r) => rateForYear(r.year));
    const yearInterests = yearRates.map((r) => financing * r);

    let cumInterest = 0;
    const projection = product.rows.map((row, idx) => {
      const yearRate = yearRates[idx];
      const yearInterest = yearInterests[idx];
      cumInterest += yearInterest;

      const scaledGV = row.gv * scaleFactor;
      const scaledNGV = row.ngv * scaleFactor;
      const scaledTSV = row.tsv * scaleFactor;

      // Net profit (absolute $)
      const netProfitPF = scaledTSV - premium - cumInterest + premiumDiscountAmt - setupFeeAmt;
      const netProfitCash = scaledTSV - premium;
      const cashOnHand = scaledTSV - financing - cumInterest;

      // ─── IRR (Levered, with PF) ─────────────────────────────────────────
      const cfPF = [-initialOutlay];
      for (let y = 1; y < row.year; y++) {
        cfPF.push(-yearInterests[y - 1]);
      }
      cfPF.push(scaledTSV - financing - yearInterests[row.year - 1]);
      const irrPF = calculateIRR(cfPF);

      // ─── IRR (Cash, no PF) ──────────────────────────────────────────────
      let irrCash = null;
      if (scaledTSV > 0 && premium > 0) {
        irrCash = Math.pow(scaledTSV / premium, 1 / row.year) - 1;
      }

      const irrSpread = (irrPF !== null && irrCash !== null) ? irrPF - irrCash : null;

      // ─── OPPORTUNITY COST: PF + freed cash invested at altReturn ────────
      // Strategy A (All-Cash): premium → policy → TSV
      // Strategy B (PF + Alt Invest):
      //   Initial outlay → policy
      //   (Premium - Initial outlay) = Cash freed up → grow at altReturn for N years
      //   Each year, must service interest (deducted from alt investment)
      //   At year N: TSV - Loan + alt investment value
      const cashFreed = premium - initialOutlay;
      // Compound the freed cash less annual interest payments
      let altInvestValue = cashFreed;
      for (let y = 1; y <= row.year; y++) {
        altInvestValue = altInvestValue * (1 + altReturn) - yearInterests[y - 1];
      }
      const pfPlusAltNet = scaledTSV - financing + altInvestValue + premiumDiscountAmt - setupFeeAmt;
      const allCashNet = scaledTSV;

      return {
        year: row.year,
        gv: scaledGV,
        ngv: scaledNGV,
        tsv: scaledTSV,
        yearRate,
        yearInterest,
        cumInterest,
        netProfitPF,
        netProfitCash,
        irrPF,
        irrCash,
        irrSpread,
        cashOnHand,
        // Comparison metrics (cash-vs-PF same scale, comparable)
        netCashAllCash: scaledTSV,                     // All-cash: full TSV at hand if surrendered
        netCashPF: scaledTSV - financing - cumInterest, // PF: TSV minus loan & cum interest
        // Opportunity cost
        pfPlusAltNet,
        allCashNet,
        oppGap: pfPlusAltNet - allCashNet,
      };
    });

    const year1Interest = projection[0].yearInterest;
    const breakEvenPF = projection.find((r) => r.netProfitPF >= 0)?.year || null;
    const breakEvenCash = projection.find((r) => r.netProfitCash >= 0)?.year || null;

    return {
      day1SV, financing, premiumDiscountAmt, setupFeeAmt,
      initialOutlay, year1Interest, leverage, projection,
      breakEvenPF, breakEvenCash,
    };
  }, [premium, ltv, discount, setupFeeRate, loanRate, isCustom, bank, tierEnabled, tierYear, tierRateInput, altReturn, product]);

  // Filtered projection by view range
  const visibleProjection = useMemo(
    () => calc.projection.filter((r) => r.year <= viewRange),
    [calc.projection, viewRange]
  );

  // Adjust highlight year if outside range
  useEffect(() => {
    if (highlightYear > viewRange) setHighlightYear(viewRange);
  }, [viewRange]);

  const highlightRow = calc.projection.find((r) => r.year === highlightYear) || calc.projection[9];

  // ─── STYLE TOKENS ─────────────────────────────────────────────────────────
  const styles = {
    bg: { backgroundColor: "#F8F5F0" },
    accent: "#FF8200",
    accentDark: "#C66700",
    ink: "#1A1A1A",
    inkSoft: "#6B6B6B",
    border: "#E5DFD5",
    success: "#2D6A4F",
    danger: "#9B2226",
    fontDisplay: '"Fraunces", Georgia, serif',
    fontBody: '"Plus Jakarta Sans", system-ui, sans-serif',
    fontMono: '"JetBrains Mono", "Menlo", monospace',
  };

  const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div style={{
        backgroundColor: "#1A1A1A", color: "#F8F5F0", padding: "10px 14px",
        borderRadius: "4px", fontSize: "12px", fontFamily: styles.fontMono,
        border: `1px solid ${styles.accent}`, boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
      }}>
        <div style={{ fontFamily: styles.fontBody, fontWeight: 600, marginBottom: 6, opacity: 0.7, fontSize: 11 }}>
          {t.year} {label}
        </div>
        {payload.map((p, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 16, minWidth: 200 }}>
            <span style={{ color: p.color }}>● {p.name}</span>
            <span>{fmt(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  const handlePrint = () => {
    setTimeout(() => window.print(), 100);
  };

  return (
    <div style={{ ...styles.bg, fontFamily: styles.fontBody, color: styles.ink, minHeight: "100vh" }}>
      {/* ═══════════════════ HEADER ═══════════════════ */}
      <header className="no-print" style={{
        borderBottom: `1px solid ${styles.border}`, backgroundColor: "#FFFFFF",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "16px 32px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 38, height: 38, backgroundColor: styles.accent, borderRadius: "2px",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#FFF", fontFamily: styles.fontDisplay, fontWeight: 700, fontSize: 18,
            }}>FWD</div>
            <div>
              <h1 style={{ fontFamily: styles.fontDisplay, fontSize: 22, fontWeight: 600,
                margin: 0, letterSpacing: "-0.01em" }}>{t.appTitle}</h1>
              <p style={{ fontSize: 11, color: styles.inkSoft, margin: 0, marginTop: 2,
                letterSpacing: "0.02em", textTransform: "uppercase" }}>{t.appSubtitle}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 12, color: styles.inkSoft, fontFamily: styles.fontMono }}>
              {t.consultant}
            </span>
            <button onClick={handlePrint} style={{
              padding: "8px 14px", fontSize: 12, fontWeight: 600,
              backgroundColor: styles.accent, color: "#FFF", border: "none",
              borderRadius: "2px", cursor: "pointer", fontFamily: styles.fontBody,
              letterSpacing: "0.02em",
            }}>
              {t.print}
            </button>
            <div style={{ display: "flex", border: `1px solid ${styles.border}`, borderRadius: "2px", overflow: "hidden" }}>
              <button onClick={() => setLang("tc")} style={langBtnStyle(lang === "tc", styles)}>繁中</button>
              <button onClick={() => setLang("en")} style={langBtnStyle(lang === "en", styles)}>EN</button>
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "32px" }}>

        {/* ═══════════════════ PRODUCT TABS ═══════════════════ */}
        <SectionLabel num="01" label={t.productSection} styles={styles} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12, marginBottom: 32 }} className="pf-card">
          {Object.entries(PRODUCT_VALUES).map(([key, p]) => {
            const active = productKey === key;
            return (
              <button key={key} onClick={() => setProductKey(key)} className="no-print" style={{
                textAlign: "left", padding: "20px 24px", border: "none", cursor: "pointer", borderRadius: "2px",
                backgroundColor: active ? styles.ink : "#FFFFFF",
                color: active ? "#F8F5F0" : styles.ink,
                borderLeft: `4px solid ${active ? styles.accent : styles.border}`,
                fontFamily: styles.fontBody,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 10, opacity: 0.6, letterSpacing: "0.1em",
                      textTransform: "uppercase", marginBottom: 6, fontFamily: styles.fontMono }}>
                      {p.code}
                    </div>
                    <div style={{ fontFamily: styles.fontDisplay, fontSize: 20, fontWeight: 600 }}>
                      {lang === "tc" ? p.name_tc : p.name_en}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6, lineHeight: 1.5 }}>
                      {lang === "tc" ? p.description_tc : p.description_en}
                    </div>
                  </div>
                  {active && (
                    <div style={{
                      backgroundColor: styles.accent, color: "#FFF", fontSize: 10,
                      padding: "3px 8px", borderRadius: "2px", fontWeight: 700,
                      letterSpacing: "0.05em", textTransform: "uppercase",
                    }}>Active</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* ═══════════════════ INPUT PANEL ═══════════════════ */}
        <SectionLabel num="02" label={t.inputSection} styles={styles} />
        <div className="pf-card no-print" style={cardStyle(styles)}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
            <div>
              <FieldLabel styles={styles}>{t.premium} ({currency})</FieldLabel>
              <input type="number" value={premium} onChange={(e) => setPremium(Number(e.target.value) || 0)}
                style={inputStyle(styles)} step="10000" />
            </div>
            <div>
              <FieldLabel styles={styles}>{t.currency}</FieldLabel>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={inputStyle(styles)}>
                <option value="USD">USD · 美元</option>
                <option value="HKD">HKD · 港元</option>
              </select>
            </div>
            <div>
              <FieldLabel styles={styles}>{t.bank}</FieldLabel>
              <select value={bankKey} onChange={(e) => setBankKey(e.target.value)} style={inputStyle(styles)}>
                {Object.entries(BANK_PLATFORMS).map(([k, b]) => (
                  <option key={k} value={k}>{lang === "tc" ? b.name_tc : b.name_en}</option>
                ))}
              </select>
            </div>
            <div>
              <FieldLabel styles={styles}>{t.ltv} (%)</FieldLabel>
              <input type="number" value={(ltv * 100).toFixed(0)}
                onChange={(e) => isCustom && setCustomLTV(Number(e.target.value) / 100)}
                disabled={!isCustom} style={{ ...inputStyle(styles), opacity: isCustom ? 1 : 0.6 }} step="5" />
            </div>
          </div>

          {/* Bank info strip */}
          {!isCustom && (
            <div style={{
              marginTop: 20, paddingTop: 16, borderTop: `1px solid ${styles.border}`,
              display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 24px", fontSize: 12,
            }}>
              <span style={{ color: styles.inkSoft, fontWeight: 600 }}>{t.bankNotes}：</span>
              <span>{lang === "tc" ? bank.notes_tc : bank.notes_en}</span>
              {currency === "USD" && bank.publishedRateUSD === null && (
                <>
                  <span style={{ color: styles.danger, fontWeight: 600 }}>⚠</span>
                  <span style={{ color: styles.danger }}>
                    {lang === "tc"
                      ? "此銀行不支援 USD 保單；建議改選 OCBC、DBS 或大新銀行"
                      : "This bank does not support USD policies; consider OCBC, DBS, or Dah Sing"}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* ═══════════════════ RATE ASSUMPTIONS (SIMPLIFIED) ═══════════════════ */}
        <SectionLabel num="03" label={t.rateSection} styles={styles} />
        <div className="pf-card no-print" style={cardStyle(styles)}>

          {/* SIMPLE MODE — Just one field */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
            <div>
              <FieldLabel styles={styles}>{t.loanRate} (%)</FieldLabel>
              <div style={{ position: "relative" }}>
                <input type="number"
                  value={(loanRate * 100).toFixed(2)}
                  onChange={(e) => {
                    setLoanRate(Number(e.target.value) / 100);
                    setRateOverridden(true);
                  }}
                  style={{
                    ...inputStyle(styles),
                    fontSize: 16, fontWeight: 600,
                    color: styles.accent,
                  }}
                  step="0.05" />
                {rateOverridden && (
                  <button
                    onClick={() => {
                      setLoanRate(bankPublishedRate);
                      setRateOverridden(false);
                    }}
                    style={{
                      position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                      padding: "3px 8px", fontSize: 10, backgroundColor: styles.border,
                      color: styles.ink, border: "none", borderRadius: "2px",
                      cursor: "pointer", fontFamily: styles.fontBody, fontWeight: 600,
                    }}
                    title={lang === "tc" ? "重設為銀行公布利率" : "Reset to bank's published rate"}>
                    ↻ {lang === "tc" ? "重設" : "Reset"}
                  </button>
                )}
              </div>
              <FieldHint styles={styles}>{t.loanRateHint}</FieldHint>
              {!isCustom && bank.capRate && (
                <div style={{
                  marginTop: 8, padding: "6px 10px",
                  backgroundColor: "#E8F3EE", borderLeft: `3px solid ${styles.success}`,
                  fontSize: 11, color: styles.ink, borderRadius: "2px",
                }}>
                  ✓ {lang === "tc"
                    ? `此銀行頭 ${bank.capYears} 年自動封頂於 ${fmtPct(bank.capRate)}`
                    : `Bank auto-caps Year 1-${bank.capYears} at ${fmtPct(bank.capRate)}`}
                </div>
              )}
            </div>

            <div>
              <FieldLabel styles={styles}>{t.premiumDiscount} (%)</FieldLabel>
              <input type="number" value={(discount * 100).toFixed(1)}
                onChange={(e) => setCustomDiscount(Number(e.target.value) / 100)}
                style={inputStyle(styles)} step="0.5" />
              <FieldHint styles={styles}>
                {lang === "tc" ? "FWD 對保費融資客戶的折扣（一般 5%）" : "FWD's premium discount for PF clients (typically 5%)"}
              </FieldHint>
            </div>
          </div>

          {/* ADVANCED TOGGLE */}
          <div style={{
            marginTop: 24, paddingTop: 16,
            borderTop: `1px dashed ${styles.border}`,
          }}>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                background: "none", border: "none",
                color: styles.inkSoft, fontSize: 12, fontWeight: 600,
                cursor: "pointer", padding: 0,
                fontFamily: styles.fontBody,
                display: "flex", alignItems: "center", gap: 8,
                letterSpacing: "0.03em",
              }}>
              <span style={{
                display: "inline-block", width: 16, height: 16,
                lineHeight: "14px", textAlign: "center",
                border: `1px solid ${styles.border}`, borderRadius: "2px",
                fontSize: 12, color: styles.accent,
              }}>{showAdvanced ? "−" : "+"}</span>
              {showAdvanced ? t.hideAdvanced : t.showAdvanced} · {t.advancedSettings}
              <span style={{ color: styles.inkSoft, fontWeight: 400, fontSize: 11 }}>
                ({t.advancedHint})
              </span>
            </button>

            {showAdvanced && (
              <div style={{
                marginTop: 16, padding: 16,
                backgroundColor: "#FAFAF7", borderRadius: "2px",
                border: `1px solid ${styles.border}`,
              }}>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: 16, alignItems: "center" }}>
                  {/* Tier toggle */}
                  <label style={{
                    display: "flex", alignItems: "center", gap: 8,
                    fontSize: 13, cursor: "pointer", padding: "8px 12px",
                    backgroundColor: tierEnabled ? "#FFF4E6" : "#FFF",
                    border: `1px solid ${tierEnabled ? styles.accent : styles.border}`,
                    borderRadius: "2px", fontWeight: 600,
                  }}>
                    <input type="checkbox" checked={tierEnabled}
                      onChange={(e) => setTierEnabled(e.target.checked)}
                      style={{ accentColor: styles.accent, transform: "scale(1.1)" }} />
                    {t.enableTier}
                  </label>

                  {/* Tier inputs (only if enabled) */}
                  {tierEnabled ? (
                    <>
                      <div>
                        <FieldLabel styles={styles}>{t.tierYear}</FieldLabel>
                        <input type="number" value={tierYear}
                          onChange={(e) => setTierYear(Number(e.target.value))}
                          style={inputStyle(styles)} min={1} max={113} />
                      </div>
                      <div>
                        <FieldLabel styles={styles}>{t.rateAfterTier} (%)</FieldLabel>
                        <input type="number" value={(tierRateInput * 100).toFixed(2)}
                          onChange={(e) => setTierRateInput(Number(e.target.value) / 100)}
                          style={inputStyle(styles)} step="0.05" />
                      </div>
                    </>
                  ) : (
                    <div style={{ gridColumn: "span 2", fontSize: 12, color: styles.inkSoft, fontStyle: "italic" }}>
                      {lang === "tc"
                        ? "啟用後可假設未來某年利率改變（例：頭 18 年 4.85%，之後 3.15%）— 用於壓力測試或反映預期降息。"
                        : "Enable to model a future rate change (e.g., Y1-Y18 at 4.85%, then 3.15%) — useful for stress test or rate-cut scenarios."}
                    </div>
                  )}
                </div>

                {tierEnabled && (
                  <div style={{
                    marginTop: 12, padding: "8px 12px",
                    backgroundColor: "#FFF4E6", borderLeft: `3px solid ${styles.accent}`,
                    borderRadius: "2px", fontSize: 12,
                  }}>
                    <strong>{lang === "tc" ? "利率示意：" : "Schedule: "}</strong>
                    Y1{!isCustom && bank.capRate && bank.capYears > 0 ? `-Y${bank.capYears}` : ""} <span style={{ fontFamily: styles.fontMono, color: styles.accent, fontWeight: 600 }}>{fmtPct(rateForYear(1))}</span>
                    {!isCustom && bank.capRate && bank.capYears > 0 && bank.capYears < tierYear && (
                      <> · Y{bank.capYears + 1}-Y{tierYear} <span style={{ fontFamily: styles.fontMono, color: styles.accent, fontWeight: 600 }}>{fmtPct(loanRate)}</span></>
                    )}
                    {(isCustom || !bank.capRate || bank.capYears === 0) && tierYear > 1 && (
                      <> -Y{tierYear} <span style={{ fontFamily: styles.fontMono, color: styles.accent, fontWeight: 600 }}>{fmtPct(loanRate)}</span></>
                    )}
                    {" · "}Y{tierYear + 1}+ <span style={{ fontFamily: styles.fontMono, color: styles.accent, fontWeight: 600 }}>{fmtPct(tierRateInput)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════ SUMMARY METRICS ═══════════════════ */}
        <SectionLabel num="04" label={t.summarySection} styles={styles} />
        <div className="pf-card" style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 12, marginTop: 12, marginBottom: 32,
        }}>
          <MetricCard label={t.totalPremium} value={fmtCurrency(premium, currency)} styles={styles} />
          <MetricCard label={t.day1SV} value={fmtCurrency(calc.day1SV, currency)} styles={styles} />
          <MetricCard label={t.financingAmount} value={fmtCurrency(calc.financing, currency)} styles={styles} accent />
          <MetricCard label={t.initialOutlay} value={fmtCurrency(calc.initialOutlay, currency)} styles={styles} highlight />
          <MetricCard label={t.annualInterest} value={fmtCurrency(calc.year1Interest, currency)} styles={styles} />
          <MetricCard label={t.leverage} value={`${calc.leverage.toFixed(2)}×`} styles={styles} />
        </div>

        {/* ═══════════════════ COMPARISON: CASH vs PF ═══════════════════ */}
        <SectionLabel num="05" label={t.comparisonSection} styles={styles} />

        {/* Side-by-side comparison panel at highlight year */}
        <div className="pf-card" style={{
          ...cardStyle(styles), padding: 0, overflow: "hidden",
        }}>
          {/* Header row with focus year selector */}
          <div style={{
            padding: "16px 24px", backgroundColor: "#FAFAF7",
            borderBottom: `1px solid ${styles.border}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexWrap: "wrap", gap: 12,
          }}>
            <div>
              <div style={{
                fontSize: 11, color: styles.inkSoft, letterSpacing: "0.05em",
                textTransform: "uppercase", fontWeight: 600,
              }}>
                {lang === "tc" ? "對比基準年度" : "Comparison Year"}
              </div>
              <div style={{
                fontFamily: styles.fontDisplay, fontSize: 22, fontWeight: 600,
                color: styles.ink, marginTop: 2,
              }}>
                Y{highlightYear} <span style={{ fontSize: 12, color: styles.inkSoft, fontWeight: 400 }}>
                  ({lang === "tc" ? "用滑桿調整" : "adjust via slider below"})
                </span>
              </div>
            </div>
            <div style={{
              padding: "6px 14px", backgroundColor: "#FFF4E6",
              borderRadius: "2px", fontSize: 11, color: styles.accentDark,
              fontFamily: styles.fontMono, fontWeight: 600,
            }}>
              {fmtCurrency(premium, currency)} {lang === "tc" ? "保費 / 兩種策略對比" : "premium · two strategies"}
            </div>
          </div>

          {/* Two-column comparison */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            borderBottom: `1px solid ${styles.border}`,
          }}>
            {/* LEFT: All-Cash */}
            <ComparisonColumn
              title={t.cmpAllCash}
              subtitle={lang === "tc" ? "傳統做法" : "Traditional"}
              accent="#5C6B7A"
              styles={styles}
              rows={[
                { label: t.cmpUpfront, value: fmtCurrency(premium, currency), note: lang === "tc" ? "拎出全數保費" : "Full premium upfront" },
                { label: t.cmpAnnualBurden, value: "—", note: lang === "tc" ? "無利息支出" : "No interest" },
                { label: t.cmpTotalCost, value: fmtCurrency(premium, currency), note: lang === "tc" ? "等於原保費" : "= Premium" },
                { label: t.cmpNetWealth, value: fmtCurrency(highlightRow.netCashAllCash, currency), note: lang === "tc" ? "退保時可拿全部 TSV" : "Full TSV at surrender" },
                { label: t.cmpIRR, value: fmtIRR(highlightRow.irrCash), note: lang === "tc" ? "受 7% cap 限制" : "Subject to 7% cap", highlight: true },
              ]}
            />
            {/* RIGHT: With PF */}
            <ComparisonColumn
              title={t.cmpWithPF}
              subtitle={lang === "tc" ? "槓桿放大" : "Leverage Strategy"}
              accent={styles.accent}
              styles={styles}
              rightSide
              rows={[
                { label: t.cmpUpfront, value: fmtCurrency(calc.initialOutlay, currency), note: lang === "tc" ? `釋出 ${fmtCurrency(premium - calc.initialOutlay, currency)}` : `${fmtCurrency(premium - calc.initialOutlay, currency)} freed up` },
                { label: t.cmpAnnualBurden, value: fmtCurrency(calc.year1Interest, currency), note: lang === "tc" ? "首年利息（變動）" : "Year-1 interest (variable)" },
                { label: t.cmpTotalCost, value: fmtCurrency(calc.initialOutlay + highlightRow.cumInterest - calc.premiumDiscountAmt, currency), note: lang === "tc" ? `首期 + 累積利息 − 折扣` : "Outlay + cum. interest − discount" },
                { label: t.cmpNetWealth, value: fmtCurrency(highlightRow.netCashPF, currency), note: lang === "tc" ? "TSV − 貸款 − 累積利息" : "TSV − Loan − Cum. Interest" },
                { label: t.cmpIRR, value: fmtIRR(highlightRow.irrPF), note: highlightRow.irrPF !== null && highlightRow.irrPF > 0.07 ? (lang === "tc" ? "槓桿後超越 7% cap" : "Exceeds 7% via leverage") : (lang === "tc" ? "槓桿放大效應" : "Leverage uplift"), highlight: true, accent: highlightRow.irrPF !== null && highlightRow.irrPF > 0.07 },
              ]}
            />
          </div>

          {/* Delta highlights bar */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 0, backgroundColor: styles.ink, color: "#F8F5F0",
          }}>
            <DeltaCell
              label={t.cmpCashFreed}
              value={`+${fmtCurrencyCompact(premium - calc.initialOutlay, currency)}`}
              fullValue={fmtCurrency(premium - calc.initialOutlay, currency)}
              hint={lang === "tc" ? `投入減少 ${(((premium - calc.initialOutlay) / premium) * 100).toFixed(0)}%` : `${(((premium - calc.initialOutlay) / premium) * 100).toFixed(0)}% less upfront`}
              positive
              styles={styles}
            />
            <DeltaCell
              label={t.cmpLeverageGain}
              value={highlightRow.irrSpread !== null ? `+${(highlightRow.irrSpread * 100).toFixed(2)}%` : "—"}
              hint={lang === "tc" ? "IRR 提升幅度" : "IRR uplift"}
              positive={highlightRow.irrSpread !== null && highlightRow.irrSpread > 0}
              styles={styles}
            />
            <DeltaCell
              label={lang === "tc" ? "資金效率" : "Capital Efficiency"}
              value={`${calc.leverage.toFixed(2)}×`}
              hint={lang === "tc" ? "每蚊現金鎖定資產倍數" : "Asset per $1 of cash"}
              positive
              styles={styles}
            />
            <DeltaCell
              label={lang === "tc" ? "Y" + highlightYear + " 淨值差" : "Y" + highlightYear + " Wealth Diff"}
              value={fmtCurrencyCompact(highlightRow.netCashPF - highlightRow.netCashAllCash, currency)}
              fullValue={fmtCurrency(highlightRow.netCashPF - highlightRow.netCashAllCash, currency)}
              hint={lang === "tc" ? "PF 較全現金多/少" : "PF vs All-Cash"}
              positive={highlightRow.netCashPF > highlightRow.netCashAllCash}
              negative={highlightRow.netCashPF < highlightRow.netCashAllCash}
              styles={styles}
            />
          </div>

          {/* Insight callout */}
          <div style={{
            padding: "16px 24px", backgroundColor: "#FFFAF3",
            fontSize: 13, lineHeight: 1.6, color: styles.ink,
          }}>
            <strong style={{ color: styles.accentDark }}>
              {lang === "tc" ? "核心洞察：" : "Key Insight: "}
            </strong>
            {lang === "tc"
              ? `用 ${fmtCurrency(calc.initialOutlay, currency)} 替代 ${fmtCurrency(premium, currency)} 投入，您的年化回報由 ${fmtIRR(highlightRow.irrCash)} 提升至 ${fmtIRR(highlightRow.irrPF)}，同時釋出 ${fmtCurrencyCompact(premium - calc.initialOutlay, currency)} 現金可作其他用途。`
              : `By committing ${fmtCurrency(calc.initialOutlay, currency)} instead of ${fmtCurrency(premium, currency)}, your annualised return rises from ${fmtIRR(highlightRow.irrCash)} to ${fmtIRR(highlightRow.irrPF)}, while ${fmtCurrencyCompact(premium - calc.initialOutlay, currency)} of cash is freed up for other uses.`
            }
          </div>
        </div>

        {/* ═══════════════════ COMPARISON CHART: WEALTH CURVES ═══════════════════ */}
        <div style={chartCardStyle(styles)} className="pf-card">
          <ChartHeader title={t.chartCompareTitle} sub={t.chartCompareSub} styles={styles} />
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={visibleProjection} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#E5DFD5" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: styles.inkSoft }}
                tickFormatter={(v) => `Y${v}`} />
              <YAxis tick={{ fontSize: 11, fill: styles.inkSoft }}
                tickFormatter={(v) => fmtCompact(v)} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: styles.fontBody }} />
              <ReferenceLine y={premium} stroke="#5C6B7A" strokeDasharray="2 2" strokeWidth={1}
                label={{ value: lang === "tc" ? "保費 break-even" : "Premium B/E", position: "left", fontSize: 9, fill: "#5C6B7A" }} />
              <ReferenceLine y={calc.initialOutlay} stroke={styles.accent} strokeDasharray="2 2" strokeWidth={1}
                label={{ value: lang === "tc" ? "首期 break-even" : "Outlay B/E", position: "left", fontSize: 9, fill: styles.accent }} />
              <Line type="monotone" dataKey="netCashAllCash"
                name={lang === "tc" ? "全現金 — 退保淨值" : "All-Cash — Net Surrender"}
                stroke="#5C6B7A" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="netCashPF"
                name={lang === "tc" ? "保費融資 — 退保淨額" : "With PF — Net After Loan"}
                stroke={styles.accent} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{
            marginTop: 8, padding: "8px 12px", backgroundColor: "#F0F4F8",
            borderLeft: `3px solid #5C6B7A`, fontSize: 11, color: styles.inkSoft,
            lineHeight: 1.5,
          }}>
            <strong style={{ color: "#5C6B7A" }}>
              {lang === "tc" ? "重點對比：" : "Key Comparison: "}
            </strong>
            {lang === "tc"
              ? "兩條 line 數字看似全現金較高，但 PF 策略只用了 ~23% 現金；要公平對比，請看下方「機會成本分析」加入剩餘現金的另類投資。"
              : "All-Cash line shows higher absolute value, but PF only used ~23% cash. For fair comparison, see the Opportunity Cost analysis below which factors in the freed cash."}
          </div>
        </div>

        {/* ═══════════════════ OPPORTUNITY COST CHART ═══════════════════ */}
        <div style={chartCardStyle(styles)} className="pf-card">
          <ChartHeader title={t.chartOppCostTitle} sub={t.chartOppCostSub} styles={styles} />

          {/* Alternative return slider */}
          <div className="no-print" style={{
            padding: "12px 16px", backgroundColor: "#FFFAF3",
            border: `1px solid ${styles.border}`, borderRadius: "2px", marginBottom: 16,
            display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 11, color: styles.inkSoft, fontWeight: 600,
                letterSpacing: "0.05em", textTransform: "uppercase" }}>
                {t.altReturn}
              </div>
              <div style={{ fontSize: 10, color: styles.inkSoft, marginTop: 2 }}>
                {t.altReturnHint}
              </div>
            </div>
            <input type="range" min="0" max="0.15" step="0.005" value={altReturn}
              onChange={(e) => setAltReturn(Number(e.target.value))}
              style={{ accentColor: styles.accent }} />
            <div style={{
              fontFamily: styles.fontDisplay, fontSize: 24, fontWeight: 700,
              color: styles.accent, minWidth: 80, textAlign: "right",
            }}>
              {(altReturn * 100).toFixed(1)}%
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={visibleProjection} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#E5DFD5" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: styles.inkSoft }}
                tickFormatter={(v) => `Y${v}`} />
              <YAxis tick={{ fontSize: 11, fill: styles.inkSoft }}
                tickFormatter={(v) => fmtCompact(v)} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: styles.fontBody }} />
              <Line type="monotone" dataKey="allCashNet"
                name={lang === "tc" ? "全現金投保 (淨值)" : "All-Cash Policy (Net)"}
                stroke="#5C6B7A" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="pfPlusAltNet"
                name={lang === "tc" ? `PF + ${(altReturn * 100).toFixed(1)}% 另類投資` : `PF + Alt Invest @ ${(altReturn * 100).toFixed(1)}%`}
                stroke={styles.accent} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{
            marginTop: 8, padding: "8px 12px", backgroundColor: "#FFFAF3",
            borderLeft: `3px solid ${styles.accent}`, fontSize: 11, color: styles.inkSoft,
            lineHeight: 1.5,
          }}>
            <strong style={{ color: styles.accentDark }}>
              {lang === "tc" ? "公平對比：" : "Apples-to-Apples: "}
            </strong>
            {lang === "tc"
              ? `假設您將融資釋出的 ${fmtCurrencyCompact(premium - calc.initialOutlay, currency)} 投資於 ${(altReturn * 100).toFixed(1)}% 年回報的另類資產（同時每年扣除融資利息），與全現金投保策略的最終淨值對比。當另類投資回報 > 貸款利率時，PF 策略勝出。`
              : `Assumes the ${fmtCurrencyCompact(premium - calc.initialOutlay, currency)} freed by financing is invested at ${(altReturn * 100).toFixed(1)}% (with annual interest deducted). When alt return > loan rate, PF wins.`
            }
          </div>
        </div>

        {/* ═══════════════════ KEY BENEFITS STRIP ═══════════════════ */}
        <div className="pf-card" style={{
          backgroundColor: styles.ink, color: "#F8F5F0", padding: "28px 32px",
          borderRadius: "2px", marginBottom: 32, position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, right: 0, width: 200, height: 200,
            background: `radial-gradient(circle, ${styles.accent}40 0%, transparent 70%)`,
            pointerEvents: "none",
          }} />
          <div style={{
            fontFamily: styles.fontDisplay, fontSize: 14, fontWeight: 500,
            letterSpacing: "0.1em", textTransform: "uppercase", color: styles.accent, marginBottom: 16,
          }}>{t.benefitTitle}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
            {[
              [t.benefit1Title, t.benefit1Body],
              [t.benefit2Title, t.benefit2Body],
              [t.benefit3Title, t.benefit3Body],
            ].map(([title, body], i) => (
              <div key={i}>
                <div style={{ fontFamily: styles.fontMono, fontSize: 11, opacity: 0.5, marginBottom: 6 }}>
                  0{i + 1}
                </div>
                <div style={{ fontFamily: styles.fontDisplay, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                  {title}
                </div>
                <div style={{ fontSize: 13, opacity: 0.75, lineHeight: 1.55 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════ HIGHLIGHT YEAR ═══════════════════ */}
        {/* Restructured: slider on top, KPIs below in responsive grid */}
        <div className="pf-card" style={cardStyle(styles)}>
          <div style={{ marginBottom: 20 }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 10, gap: 16, flexWrap: "wrap",
            }}>
              <div style={{ fontSize: 11, color: styles.inkSoft, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                {t.focusYear}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }} className="no-print">
                <span style={{ fontSize: 11, color: styles.inkSoft }}>{t.viewRange}：</span>
                {[30, 50, 75, 100, 114].map((r) => (
                  <button key={r} onClick={() => setViewRange(r)} style={{
                    padding: "4px 10px", fontSize: 11, fontFamily: styles.fontMono,
                    backgroundColor: viewRange === r ? styles.ink : "transparent",
                    color: viewRange === r ? "#FFF" : styles.ink,
                    border: `1px solid ${viewRange === r ? styles.ink : styles.border}`,
                    borderRadius: "2px", cursor: "pointer",
                  }}>{r === 114 ? "Full" : `Y${r}`}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <input type="range" min={1} max={viewRange} value={highlightYear}
                onChange={(e) => setHighlightYear(Number(e.target.value))}
                className="no-print"
                style={{ flex: 1, accentColor: styles.accent }} />
              <div style={{
                fontFamily: styles.fontDisplay, fontSize: 32, fontWeight: 700,
                color: styles.accent, minWidth: 80, textAlign: "right",
              }}>Y{highlightYear}</div>
            </div>
          </div>

          {/* KPI grid - now uses compact format and flexible layout */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 16, paddingTop: 16, borderTop: `1px solid ${styles.border}`,
          }}>
            <KPI label={t.tsv}
              value={fmtCurrencyCompact(highlightRow.tsv, currency)}
              full={fmtCurrency(highlightRow.tsv, currency)}
              styles={styles} />
            <KPI label={t.cumInterest}
              value={fmtCurrencyCompact(highlightRow.cumInterest, currency)}
              full={fmtCurrency(highlightRow.cumInterest, currency)}
              styles={styles} negative />
            <KPI label={t.netProfit}
              value={fmtCurrencyCompact(highlightRow.netProfitPF, currency)}
              full={fmtCurrency(highlightRow.netProfitPF, currency)}
              styles={styles}
              positive={highlightRow.netProfitPF >= 0} />
            <KPI label={t.irrPF}
              value={fmtIRR(highlightRow.irrPF)}
              styles={styles}
              positive={highlightRow.irrPF !== null && highlightRow.irrPF >= 0}
              accent={highlightRow.irrPF !== null && highlightRow.irrPF > 0.07} />
            <KPI label={t.irrCash}
              value={fmtIRR(highlightRow.irrCash)}
              styles={styles}
              positive={highlightRow.irrCash !== null && highlightRow.irrCash >= 0} />
            <KPI label={t.netSurrender}
              value={fmtCurrencyCompact(highlightRow.cashOnHand, currency)}
              full={fmtCurrency(highlightRow.cashOnHand, currency)}
              styles={styles}
              positive={highlightRow.cashOnHand >= 0} />
          </div>

          {/* Leverage gain explanation */}
          {highlightRow.irrPF !== null && highlightRow.irrCash !== null && highlightRow.irrSpread !== null && (
            <div style={{
              marginTop: 14, padding: "10px 14px",
              backgroundColor: highlightRow.irrSpread > 0 ? "#E8F3EE" : "#FFEBEE",
              borderLeft: `3px solid ${highlightRow.irrSpread > 0 ? styles.success : styles.danger}`,
              borderRadius: "2px", fontSize: 12,
            }}>
              <strong>{t.irrSpread}</strong>：
              {fmtIRR(highlightRow.irrCash)} <span style={{ color: styles.inkSoft }}>(全現金)</span>
              {" → "}
              <span style={{ color: highlightRow.irrPF > 0.07 ? styles.accent : styles.success, fontWeight: 700 }}>
                {fmtIRR(highlightRow.irrPF)}
              </span>{" "}
              <span style={{ color: styles.inkSoft }}>(融資後)</span>
              {" · "}
              <span style={{ color: highlightRow.irrSpread > 0 ? styles.success : styles.danger, fontWeight: 600 }}>
                {highlightRow.irrSpread > 0 ? "+" : ""}{(highlightRow.irrSpread * 100).toFixed(2)}%
              </span>
              {highlightRow.irrPF > 0.07 && (
                <span style={{ marginLeft: 12, color: styles.accent, fontStyle: "italic", fontSize: 11 }}>
                  {lang === "tc"
                    ? "(IRR > 7% 屬槓桿放大效應，並非違反 illustration cap)"
                    : "(IRR > 7% reflects leverage effect, not a cap violation)"}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ═══════════════════ CHARTS ═══════════════════ */}
        <SectionLabel num="06" label={t.chartsSection} styles={styles} />

        {/* CHART 1 — Wealth Growth */}
        <div style={chartCardStyle(styles)} className="pf-card">
          <ChartHeader title={t.chart1Title} sub={t.chart1Sub} styles={styles} />
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={visibleProjection} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="gTSV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={styles.accent} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={styles.accent} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#E5DFD5" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: styles.inkSoft }}
                tickFormatter={(v) => `Y${v}`} />
              <YAxis tick={{ fontSize: 11, fill: styles.inkSoft }}
                tickFormatter={(v) => fmtCompact(v)} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: styles.fontBody }} />
              <ReferenceLine y={premium} stroke={styles.inkSoft} strokeDasharray="3 3"
                label={{ value: lang === "tc" ? "保費" : "Premium", position: "left", fontSize: 10, fill: styles.inkSoft }} />
              <ReferenceLine y={calc.initialOutlay} stroke={styles.accent} strokeDasharray="3 3"
                label={{ value: t.initialOutlay, position: "left", fontSize: 10, fill: styles.accent }} />
              <Area type="monotone" dataKey="tsv" name={t.tsv}
                stroke={styles.accent} strokeWidth={2.5} fill="url(#gTSV)" />
              <Line type="monotone" dataKey="gv" name={t.gv}
                stroke={styles.ink} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cumInterest" name={t.cumInterest}
                stroke={styles.danger} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* CHART 2 — IRR Comparison */}
        <div style={chartCardStyle(styles)} className="pf-card">
          <ChartHeader title={t.chart2Title} sub={t.chart2Sub} styles={styles} />
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={visibleProjection.filter(r => r.irrPF !== null)}
              margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#E5DFD5" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: styles.inkSoft }}
                tickFormatter={(v) => `Y${v}`} />
              <YAxis tick={{ fontSize: 11, fill: styles.inkSoft }}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                domain={[(dataMin) => Math.max(dataMin, -0.3), (dataMax) => Math.max(dataMax, 0.10)]} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  return (
                    <div style={{
                      backgroundColor: "#1A1A1A", color: "#F8F5F0", padding: "10px 14px",
                      borderRadius: "4px", fontSize: 12, fontFamily: styles.fontMono,
                      border: `1px solid ${styles.accent}`,
                    }}>
                      <div style={{ marginBottom: 6, opacity: 0.7 }}>{t.year} {label}</div>
                      {payload.map((p, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 16, minWidth: 220 }}>
                          <span style={{ color: p.color }}>● {p.name}</span>
                          <span>{(p.value * 100).toFixed(2)}%</span>
                        </div>
                      ))}
                    </div>
                  );
                }} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: styles.fontBody }} />
              <ReferenceLine y={0} stroke={styles.ink} strokeWidth={1} />
              <ReferenceLine y={0.07} stroke={styles.accent} strokeDasharray="3 3" strokeWidth={1.5}
                label={{ value: lang === "tc" ? "7% IRR cap (產品本身)" : "7% IRR cap (cash basis)",
                  position: "right", fontSize: 10, fill: styles.accent, fontWeight: 600 }} />
              <Bar dataKey="irrPF" name={t.irrPF}>
                {visibleProjection.filter(r => r.irrPF !== null).map((entry, i) => (
                  <Cell key={i} fill={
                    entry.irrPF >= 0.07 ? styles.accent :
                    entry.irrPF >= 0 ? "#2D6A4F" :
                    styles.danger
                  } />
                ))}
              </Bar>
              <Line type="monotone" dataKey="irrCash" name={t.irrCash}
                stroke={styles.ink} strokeWidth={2.5} dot={{ r: 3, fill: styles.ink }} />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{
            marginTop: 8, padding: "8px 12px", backgroundColor: "#FFFAF3",
            borderLeft: `3px solid ${styles.accent}`, fontSize: 11, color: styles.inkSoft,
            lineHeight: 1.5,
          }}>
            <strong style={{ color: styles.accent }}>
              {lang === "tc" ? "解讀提示：" : "Reading note: "}
            </strong>
            {lang === "tc"
              ? "黑色線（全現金 IRR）受保監局 7% cap 限制；橙色 bar（融資後 IRR）超過 7% 屬正常槓桿放大效應，不違反監管。兩者差距 = 槓桿創造的額外回報。"
              : "Black line (cash IRR) is bound by the IA's 7% illustration cap. Orange bars (levered IRR) exceeding 7% reflect the inherent leverage effect — fully compliant. The gap = excess return from leverage."}
          </div>
        </div>

        {/* CHART 3 — Cash Flow */}
        <div style={chartCardStyle(styles)} className="pf-card">
          <ChartHeader title={t.chart3Title} sub={t.chart3Sub} styles={styles} />
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={visibleProjection} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#E5DFD5" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: styles.inkSoft }}
                tickFormatter={(v) => `Y${v}`} />
              <YAxis tick={{ fontSize: 11, fill: styles.inkSoft }}
                tickFormatter={(v) => fmtCompact(v)} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: styles.fontBody }} />
              <Bar dataKey="cumInterest" name={t.cumInterest} fill={styles.danger} fillOpacity={0.7} />
              <Bar dataKey="netProfitPF" name={t.netProfit}>
                {visibleProjection.map((entry, i) => (
                  <Cell key={i} fill={entry.netProfitPF >= 0 ? "#2D6A4F" : "#9B2226"} />
                ))}
              </Bar>
              <Line type="monotone" dataKey="cashOnHand" name={t.netSurrender}
                stroke={styles.accent} strokeWidth={2.5} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* CHART 4 — GV vs NGV */}
        <div style={chartCardStyle(styles)} className="pf-card">
          <ChartHeader title={t.chart4Title} sub={t.chart4Sub} styles={styles} />
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={visibleProjection} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#E5DFD5" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: styles.inkSoft }}
                tickFormatter={(v) => `Y${v}`} />
              <YAxis tick={{ fontSize: 11, fill: styles.inkSoft }}
                tickFormatter={(v) => fmtCompact(v)} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: styles.fontBody }} />
              <Area type="monotone" dataKey="gv" stackId="1" name={t.gv}
                stroke={styles.ink} fill={styles.ink} fillOpacity={0.85} />
              <Area type="monotone" dataKey="ngv" stackId="1" name={t.ngv}
                stroke={styles.accent} fill={styles.accent} fillOpacity={0.7} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* CHART 5 — Leverage Efficiency Scatter */}
        <div style={chartCardStyle(styles)} className="pf-card">
          <ChartHeader title={t.chartLeverageTitle} sub={t.chartLeverageSub} styles={styles} />
          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="#E5DFD5" />
              <XAxis type="number" dataKey="irrCash"
                name={t.irrCash}
                tick={{ fontSize: 11, fill: styles.inkSoft }}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                domain={[(min) => Math.min(min, 0), 0.10]}
                label={{ value: t.irrCash, position: "insideBottom", offset: -5, fontSize: 11, fill: styles.inkSoft }} />
              <YAxis type="number" dataKey="irrPF"
                name={t.irrPF}
                tick={{ fontSize: 11, fill: styles.inkSoft }}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                domain={[(min) => Math.min(min, -0.1), (max) => Math.max(max, 0.10)]}
                label={{ value: t.irrPF, angle: -90, position: "insideLeft", fontSize: 11, fill: styles.inkSoft }} />
              <ZAxis type="number" dataKey="year" range={[40, 200]} name={t.year} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div style={{
                      backgroundColor: "#1A1A1A", color: "#F8F5F0", padding: "10px 14px",
                      borderRadius: "4px", fontSize: 12, fontFamily: styles.fontMono,
                      border: `1px solid ${styles.accent}`, minWidth: 180,
                    }}>
                      <div style={{ marginBottom: 6, opacity: 0.7, fontFamily: styles.fontBody, fontWeight: 600 }}>
                        {t.year} {d.year}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>{t.irrCash}：</span>
                        <span>{fmtIRR(d.irrCash)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>{t.irrPF}：</span>
                        <span style={{ color: styles.accent }}>{fmtIRR(d.irrPF)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid #444`, marginTop: 4, paddingTop: 4 }}>
                        <span>{t.cmpLeverageGain}：</span>
                        <span style={{ color: "#4ADE80" }}>+{((d.irrPF - d.irrCash) * 100).toFixed(2)}%</span>
                      </div>
                    </div>
                  );
                }} />
              <Legend wrapperStyle={{ fontSize: 12, fontFamily: styles.fontBody }} />
              {/* Reference line: y = x (parity, no leverage gain) */}
              <ReferenceLine stroke="#5C6B7A" strokeDasharray="3 3" strokeWidth={1.5}
                segment={[{ x: -0.1, y: -0.1 }, { x: 0.10, y: 0.10 }]}
                label={{ value: lang === "tc" ? "y = x （無槓桿）" : "y = x (no leverage)", position: "right", fontSize: 9, fill: "#5C6B7A" }} />
              {/* Reference line: 7% IRR cap */}
              <ReferenceLine y={0.07} stroke={styles.accent} strokeDasharray="2 2" strokeWidth={1.5} />
              <Scatter
                name={lang === "tc" ? "保單年度（圓圈大小 = 年份）" : "Policy Years (size = year #)"}
                data={visibleProjection.filter(r => r.irrPF !== null && r.irrCash !== null)}
                fill={styles.accent}
              >
                {visibleProjection.filter(r => r.irrPF !== null && r.irrCash !== null).map((entry, i) => (
                  <Cell key={i} fill={
                    entry.irrPF >= 0.07 ? styles.accent :
                    entry.irrPF >= 0 ? "#2D6A4F" :
                    styles.danger
                  } />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          <div style={{
            marginTop: 8, padding: "8px 12px", backgroundColor: "#FFFAF3",
            borderLeft: `3px solid ${styles.accent}`, fontSize: 11, color: styles.inkSoft,
            lineHeight: 1.5,
          }}>
            <strong style={{ color: styles.accentDark }}>
              {lang === "tc" ? "讀法：" : "How to read: "}
            </strong>
            {lang === "tc"
              ? "每個圓點代表一個保單年度。圓圈愈靠左下 = 早期回報未成形；愈靠右上 = 長線勝出。所有點都應該位於灰色「y=x 無槓桿線」上方 — 圓點與該線的垂直距離 = 槓桿創造的額外回報。橙色點表示 IRR 已突破 7% cap。"
              : "Each dot = one policy year. Bottom-left = early years, top-right = long-term wins. All dots should sit above the grey y=x line; the vertical distance = leverage uplift. Orange dots = IRR exceeds 7% cap."
            }
          </div>
        </div>

        {/* ═══════════════════ DATA TABLE ═══════════════════ */}
        <SectionLabel num="07" label={t.tableSection} styles={styles} />
        <div className="pf-card" style={{
          backgroundColor: "#FFFFFF", marginTop: 12, marginBottom: 32,
          border: `1px solid ${styles.border}`, borderRadius: "2px", overflow: "auto",
          maxHeight: viewRange > 30 ? 600 : "none",
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: styles.fontMono }}>
            <thead style={{ position: "sticky", top: 0 }}>
              <tr style={{ backgroundColor: styles.ink, color: "#F8F5F0" }}>
                {[t.year, t.gv, t.ngv, t.tsv, t.yearRate, t.cumInterest, t.netProfit, t.irrCash, t.irrPF].map((h, i) => (
                  <th key={i} style={{
                    padding: "12px 14px", textAlign: i === 0 ? "left" : "right",
                    fontWeight: 600, fontSize: 11, letterSpacing: "0.05em",
                    textTransform: "uppercase", fontFamily: styles.fontBody,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleProjection.map((row) => {
                const isHighlight = row.year === highlightYear;
                const isBreakeven = row.year === calc.breakEvenPF;
                const irrPFAbove7 = row.irrPF !== null && row.irrPF > 0.07;
                return (
                  <tr key={row.year} style={{
                    borderBottom: `1px solid ${styles.border}`,
                    backgroundColor: isHighlight ? "#FFF4E6" : isBreakeven ? "#E8F3EE" : "transparent",
                  }}>
                    <td style={{ padding: "10px 14px", fontWeight: 600 }}>
                      {row.year}
                      {isBreakeven && (
                        <span style={{
                          marginLeft: 8, fontSize: 9, color: styles.success,
                          fontFamily: styles.fontBody, fontWeight: 700,
                          letterSpacing: "0.05em",
                        }}>● {t.breakeven}</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "right" }}>{fmt(row.gv)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", color: styles.accent }}>{fmt(row.ngv)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600 }}>{fmt(row.tsv)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", color: styles.inkSoft }}>{fmtPct(row.yearRate, 2)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", color: styles.danger }}>{fmt(row.cumInterest)}</td>
                    <td style={{
                      padding: "10px 14px", textAlign: "right", fontWeight: 600,
                      color: row.netProfitPF >= 0 ? styles.success : styles.danger,
                    }}>{fmt(row.netProfitPF)}</td>
                    <td style={{
                      padding: "10px 14px", textAlign: "right",
                      color: (row.irrCash !== null && row.irrCash >= 0) ? styles.ink : styles.inkSoft,
                    }}>{fmtIRR(row.irrCash)}</td>
                    <td style={{
                      padding: "10px 14px", textAlign: "right", fontWeight: 700,
                      color: irrPFAbove7 ? styles.accent : ((row.irrPF !== null && row.irrPF >= 0) ? styles.success : styles.danger),
                    }}>{fmtIRR(row.irrPF)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ═══════════════════ DISCLAIMERS ═══════════════════ */}
        <SectionLabel num="08" label={t.disclaimerSection} styles={styles} />
        <div className="pf-card" style={{
          backgroundColor: "#FFFAF3", border: `1px solid ${styles.border}`,
          borderLeft: `4px solid ${styles.accent}`, padding: 24, borderRadius: "2px",
          marginTop: 12, marginBottom: 24, fontSize: 12, lineHeight: 1.7, color: "#3A3A3A",
        }}>
          <ol style={{ paddingLeft: 20, margin: 0 }}>
            {t.disclaimer.map((d, i) => (
              <li key={i} style={{ marginBottom: 6 }}>{d}</li>
            ))}
          </ol>
          <div style={{
            marginTop: 16, paddingTop: 12, borderTop: `1px dashed ${styles.border}`,
            fontFamily: styles.fontMono, fontSize: 11, color: styles.inkSoft,
          }}>
            {t.bankUpdateNote}
          </div>
        </div>

        <footer style={{
          textAlign: "center", padding: "32px 0 16px",
          fontSize: 11, color: styles.inkSoft, fontFamily: styles.fontMono,
          letterSpacing: "0.05em",
        }}>
          FWD INSURANCE · PREMIUM FINANCING DEMO v5.0 · INTERNAL USE ONLY
        </footer>
      </main>
    </div>
  );
}

// ─── REUSABLE SUB-COMPONENTS ─────────────────────────────────────────────────
function SectionLabel({ num, label, styles }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
      <span style={{ fontFamily: styles.fontMono, fontSize: 10, color: styles.inkSoft, letterSpacing: "0.1em" }}>{num}</span>
      <span style={{ flex: 0, height: 1, width: 24, backgroundColor: styles.border }} />
      <span style={{ fontFamily: styles.fontDisplay, fontSize: 16, fontWeight: 600,
        color: styles.ink, letterSpacing: "-0.005em" }}>{label}</span>
    </div>
  );
}

function FieldLabel({ children, styles }) {
  return (
    <label style={{
      display: "block", fontSize: 11, color: styles.inkSoft, marginBottom: 6,
      letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 500,
    }}>{children}</label>
  );
}

function FieldHint({ children, styles }) {
  return (
    <div style={{ fontSize: 10, color: styles.inkSoft, marginTop: 4, lineHeight: 1.4 }}>
      {children}
    </div>
  );
}

const inputStyle = (styles) => ({
  width: "100%", padding: "10px 12px", border: `1px solid ${styles.border}`,
  borderRadius: "2px", fontSize: 14, fontFamily: styles.fontMono,
  backgroundColor: "#FFFFFF", color: styles.ink, outline: "none",
  boxSizing: "border-box",
});

const cardStyle = (styles) => ({
  backgroundColor: "#FFFFFF", padding: 24, borderRadius: "2px",
  border: `1px solid ${styles.border}`, marginTop: 12, marginBottom: 32,
});

const chartCardStyle = (styles) => ({
  backgroundColor: "#FFFFFF", padding: 24, borderRadius: "2px",
  border: `1px solid ${styles.border}`, marginTop: 12, marginBottom: 16,
});

const langBtnStyle = (active, styles) => ({
  padding: "6px 14px", fontSize: 12, fontWeight: 600,
  backgroundColor: active ? styles.ink : "transparent",
  color: active ? "#FFF" : styles.ink,
  border: "none", cursor: "pointer", fontFamily: styles.fontBody,
});

function MetricCard({ label, value, styles, accent, highlight }) {
  return (
    <div style={{
      backgroundColor: highlight ? styles.accent : "#FFFFFF",
      color: highlight ? "#FFFFFF" : styles.ink,
      padding: "16px 18px", borderRadius: "2px",
      border: highlight ? "none" : `1px solid ${styles.border}`,
      borderLeft: accent ? `4px solid ${styles.accent}` : (highlight ? "none" : `1px solid ${styles.border}`),
      minWidth: 0,
    }}>
      <div style={{
        fontSize: 10, opacity: highlight ? 0.85 : 0.55,
        letterSpacing: "0.08em", textTransform: "uppercase",
        marginBottom: 6, fontWeight: 600,
      }}>{label}</div>
      <div style={{
        fontFamily: styles.fontDisplay, fontSize: 20, fontWeight: 600,
        letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>{value}</div>
    </div>
  );
}

function KPI({ label, value, full, styles, positive, negative, accent }) {
  let color = styles.ink;
  if (accent) color = styles.accent;
  else if (positive === false || negative) color = styles.danger;
  else if (positive === true) color = styles.success;
  return (
    <div title={full || value} style={{ minWidth: 0, overflow: "hidden" }}>
      <div style={{
        fontSize: 10, color: styles.inkSoft, letterSpacing: "0.05em",
        textTransform: "uppercase", marginBottom: 4, fontWeight: 600,
      }}>{label}</div>
      <div style={{
        fontFamily: styles.fontMono, fontSize: 18, fontWeight: 600, color,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{value}</div>
    </div>
  );
}

function ComparisonColumn({ title, subtitle, accent, rows, styles, rightSide }) {
  return (
    <div style={{
      padding: "20px 24px",
      borderRight: rightSide ? "none" : `1px solid ${styles.border}`,
      backgroundColor: rightSide ? "#FFFAF3" : "#FFFFFF",
    }}>
      <div style={{
        marginBottom: 16, paddingBottom: 12,
        borderBottom: `2px solid ${accent}`,
      }}>
        <div style={{
          fontSize: 10, color: styles.inkSoft, letterSpacing: "0.1em",
          textTransform: "uppercase", fontWeight: 600, marginBottom: 4,
        }}>{subtitle}</div>
        <div style={{
          fontFamily: styles.fontDisplay, fontSize: 18, fontWeight: 600,
          color: accent, letterSpacing: "-0.005em",
        }}>{title}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {rows.map((row, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "auto 1fr",
            gap: 8, alignItems: "baseline",
            padding: row.highlight ? "10px 12px" : "0",
            backgroundColor: row.highlight ? "#FFF" : "transparent",
            borderRadius: row.highlight ? "2px" : 0,
            border: row.highlight ? `1px solid ${row.accent ? styles.accent : styles.border}` : "none",
          }}>
            <div style={{
              fontSize: 11, color: styles.inkSoft,
              letterSpacing: "0.03em", fontWeight: 600,
              minWidth: 100,
            }}>{row.label}</div>
            <div style={{ textAlign: "right" }}>
              <div style={{
                fontFamily: styles.fontMono,
                fontSize: row.highlight ? 18 : 15,
                fontWeight: row.highlight ? 700 : 600,
                color: row.accent ? styles.accent : styles.ink,
              }}>{row.value}</div>
              {row.note && (
                <div style={{
                  fontSize: 10, color: styles.inkSoft, marginTop: 2,
                  fontStyle: "italic",
                }}>{row.note}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeltaCell({ label, value, fullValue, hint, positive, negative, styles }) {
  let color = "#F8F5F0";
  if (positive) color = "#4ADE80";  // bright green for dark bg
  if (negative) color = "#F87171";  // bright red for dark bg
  return (
    <div title={fullValue || value} style={{
      padding: "16px 18px",
      borderRight: `1px solid rgba(255,255,255,0.08)`,
      minWidth: 0, overflow: "hidden",
    }}>
      <div style={{
        fontSize: 10, opacity: 0.6, letterSpacing: "0.08em",
        textTransform: "uppercase", marginBottom: 6, fontWeight: 600,
      }}>{label}</div>
      <div style={{
        fontFamily: styles.fontDisplay, fontSize: 22, fontWeight: 700,
        color, marginBottom: 4,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{value}</div>
      <div style={{ fontSize: 10, opacity: 0.55, lineHeight: 1.3 }}>{hint}</div>
    </div>
  );
}

function ChartHeader({ title, sub, styles }) {
  return (
    <div style={{
      paddingBottom: 12, marginBottom: 8,
      borderBottom: `1px solid ${styles.border}`,
    }}>
      <div style={{ fontFamily: styles.fontDisplay, fontSize: 18, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 12, color: styles.inkSoft, marginTop: 2 }}>{sub}</div>
    </div>
  );
}
