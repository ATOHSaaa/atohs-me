(() => {
  "use strict";

  const { t, formatNum, setLang, applyStaticI18n, getLang } = window.I18N;

  const SAVE_KEY = "hanoi-clicker-v2";
  const MAX_DISKS = 100;
  const COST_GROWTH = 1.18;
  const PROGRESS_PIVOT = 14;
  const PROGRESS_ALPHA = 0.44;
  const COMPLETION_CAP_SEC = 900;
  const TICKER_MS = 9000;
  const GOLDEN_MIN = 45;
  const GOLDEN_MAX = 140;
  const OFFLINE_CAP = 8 * 3600;

  const BUILDINGS = [
    { id: "novice", icon: "🙏", baseCost: 10, baseMps: 0.1 },
    { id: "servant", icon: "🧹", baseCost: 180, baseMps: 0.5 },
    { id: "monk", icon: "🧘", baseCost: 2500, baseMps: 2.5 },
    { id: "abbot", icon: "📿", baseCost: 40000, baseMps: 12 },
    { id: "sutra", icon: "📜", baseCost: 6e5, baseMps: 60 },
    { id: "abacus", icon: "🧮", baseCost: 1e7, baseMps: 280 },
    { id: "machine", icon: "⚙️", baseCost: 1.8e8, baseMps: 1300 },
    { id: "computer", icon: "💻", baseCost: 3.5e9, baseMps: 6000 },
    { id: "super", icon: "🖥️", baseCost: 7e10, baseMps: 28000 },
    { id: "priest", icon: "✨", baseCost: 1.5e12, baseMps: 130000 },
    { id: "recursion", icon: "♾️", baseCost: 3.5e13, baseMps: 6e5 },
    { id: "brahma", icon: "🕉️", baseCost: 8e14, baseMps: 2.8e6 },
  ];

  const UPGRADES = [
    { id: "c1", icon: "👆", cost: 40, click: 2, cond: (s) => s.clicks >= 8 },
    { id: "c2", icon: "✌️", cost: 600, click: 2, cond: (s) => s.clicks >= 40 },
    { id: "c3", icon: "🖐️", cost: 25000, click: 2, cond: (s) => s.clicks >= 200 },
    { id: "c4", icon: "⚡", cost: 4e5, click: 2, cond: (s) => s.clicks >= 800 },
    { id: "m1", icon: "🥇", cost: 2000, merit: 2, cond: (s) => s.towers >= 1 },
    { id: "m2", icon: "🪵", cost: 1.5e5, merit: 2, cond: (s) => s.towers >= 7 },
    { id: "m3", icon: "💎", cost: 8e6, merit: 2, cond: (s) => s.n >= 12 },
    { id: "m4", icon: "🌏", cost: 6e8, merit: 2, cond: (s) => s.n >= 16 },
    { id: "m5", icon: "🏔️", cost: 8e10, merit: 2, cond: (s) => s.n >= 20 },
  ];


  const UPGRADE_OWNED = [1, 5, 25, 50, 100];
  const UPGRADE_COST = [15, 80, 800, 10000, 120000];

  for (const b of BUILDINGS) {
    UPGRADE_OWNED.forEach((req, i) => {
      UPGRADES.push({
        id: `${b.id}_u${i}`,
        icon: b.icon,
        cost: b.baseCost * UPGRADE_COST[i],
        building: b.id,
        buildingTier: i,
        buildingMult: 2,
        cond: (s) => (s.buildings[b.id] || 0) >= req,
      });
    });
  }

  const UPGRADE_MAP = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

  function totalOwnedBuildings(s) {
    return BUILDINGS.reduce((sum, b) => sum + (s.buildings[b.id] || 0), 0);
  }

  function buildAchievements() {
    const list = [
      { id: "first", check: (s) => s.totalMoves >= 1 },
      { id: "tower1", check: (s) => s.towers >= 1 },
      { id: "tower10", check: (s) => s.towers >= 10 },
      { id: "tower1000", check: (s) => s.towers >= 1000 },
      { id: "n4", check: (s) => s.n >= 4 },
      { id: "n8", check: (s) => s.n >= 8 },
      { id: "n16", check: (s) => s.n >= 16 },
      { id: "n64", check: (s) => s.n >= 64 },
      { id: "n100", check: (s) => s.ended },
      { id: "click100", check: (s) => s.clicks >= 100 },
      { id: "click10000", check: (s) => s.clicks >= 10000 },
      { id: "merit1e6", check: (s) => s.totalMerit >= 1e6 },
      { id: "merit1e12", check: (s) => s.totalMerit >= 1e12 },
      { id: "idle", check: (s) => s.idleMoves >= 10000 },
      { id: "golden", check: (s) => s.goldens >= 1 },
      { id: "horin", check: (s) => s.horin >= 1 },
      { id: "brahma", check: (s) => (s.buildings.brahma || 0) >= 1 },
    ];
    const push = (item) => list.push(item);

    [25, 50, 100, 250, 500, 2500, 5000, 10000, 25000, 50000].forEach((n) =>
      push({ id: `tower${n}`, check: (s) => s.towers >= n, series: "towers", value: n }),
    );
    [5, 6, 7, 10, 12, 20, 24, 32, 48, 56, 60, 62, 80].forEach((n) =>
      push({ id: `n${n}`, check: (s) => s.n >= n, series: "disks", value: n }),
    );
    [500, 1000, 5000, 50000, 100000, 500000, 1000000].forEach((n) =>
      push({ id: `click${n}`, check: (s) => s.clicks >= n, series: "clicks", value: n }),
    );
    [1e4, 1e5, 1e7, 1e8, 1e9, 1e10, 1e15, 1e18, 1e24].forEach((n) =>
      push({ id: `merit${n}`, check: (s) => s.totalMerit >= n, series: "merit", value: n }),
    );
    [1e5, 1e6, 1e7, 1e8, 1e9].forEach((n) =>
      push({ id: `idle${n}`, check: (s) => s.idleMoves >= n, series: "idle", value: n }),
    );
    [1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e12].forEach((n) =>
      push({ id: `moves${n}`, check: (s) => s.totalMoves >= n, series: "moves", value: n }),
    );
    [5, 10, 25, 50].forEach((n) =>
      push({ id: `golden${n}`, check: (s) => s.goldens >= n, series: "golden", value: n }),
    );
    [2, 3, 5, 10, 25, 50].forEach((n) =>
      push({ id: `horin${n}`, check: (s) => s.horin >= n, series: "horin", value: n }),
    );
    [5, 10, 25].forEach((n) =>
      push({ id: `upgrade${n}`, check: (s) => s.upgrades.length >= n, series: "upgrades", value: n }),
    );
    [1, 10, 24].forEach((h) =>
      push({ id: `play${h}h`, check: (s) => s.playTime >= h * 3600, series: "playtime", value: h }),
    );
    [10, 100].forEach((n) =>
      push({ id: `buildings${n}`, check: (s) => totalOwnedBuildings(s) >= n, series: "buildings", value: n }),
    );
    [10, 100, 1000].forEach((n) =>
      push({
        id: `novice${n}`,
        check: (s) => (s.buildings.novice || 0) >= n,
        series: "owned",
        building: "novice",
        value: n,
      }),
    );
    [1e6].forEach((n) => push({ id: `wallet${n}`, check: (s) => s.merit >= n, series: "wallet", value: n }));

    for (const b of BUILDINGS) {
      if (b.id === "brahma") continue;
      push({
        id: `hire_${b.id}`,
        check: (s) => (s.buildings[b.id] || 0) >= 1,
        series: "hire",
        building: b.id,
      });
    }

    return list;
  }

  const ACHIEVEMENTS = buildAchievements();

  function buildingName(id) {
    return t(`buildings.${id}.name`);
  }

  function buildingDesc(id) {
    return t(`buildings.${id}.desc`);
  }

  function upgradeName(u) {
    if (u.building != null) {
      return t("buildingUpgrade.name", {
        building: buildingName(u.building),
        tier: t(`upgradeTiers.${u.buildingTier}`),
      });
    }
    return t(`upgrades.${u.id}.name`);
  }

  function upgradeDesc(u) {
    if (u.building != null) {
      return t("buildingUpgrade.desc", { building: buildingName(u.building) });
    }
    return t(`upgrades.${u.id}.desc`);
  }

  function achievementName(a) {
    if (a.series === "hire") return t("achievementSeries.hire.name", { who: buildingName(a.building) });
    if (a.series === "owned") {
      return t("achievementSeries.owned.name", { who: buildingName(a.building), n: formatNum(a.value) });
    }
    if (a.series === "playtime") return t("achievementSeries.playtime.name", { n: String(a.value) });
    if (a.series) return t(`achievementSeries.${a.series}.name`, { n: formatNum(a.value) });
    return t(`achievements.${a.id}.name`);
  }

  function achievementDesc(a) {
    if (a.series === "hire") return t("achievementSeries.hire.desc", { who: buildingName(a.building) });
    if (a.series === "owned") {
      return t("achievementSeries.owned.desc", { who: buildingName(a.building), n: formatNum(a.value) });
    }
    if (a.series === "playtime") {
      return t("achievementSeries.playtime.desc", { n: String(a.value) });
    }
    if (a.series) return t(`achievementSeries.${a.series}.desc`, { n: formatNum(a.value) });
    return t(`achievements.${a.id}.desc`);
  }

  function newsPool() {
    return window.I18N.STRINGS[getLang()].news;
  }

  const el = {
    merit: document.getElementById("merit"),
    mps: document.getElementById("mps"),
    board: document.getElementById("board"),
    stacks: [0, 1, 2].map((i) => document.getElementById(`stack-${i}`)),
    progressBar: document.getElementById("progress-bar"),
    progressLabel: document.getElementById("progress-label"),
    towerMeta: document.getElementById("tower-meta"),
    btnPrestige: document.getElementById("btn-prestige"),
    upgrades: document.getElementById("upgrades"),
    buildings: document.getElementById("buildings"),
    buyMode: document.getElementById("buy-mode"),
    ticker: document.getElementById("ticker"),
    toasts: document.getElementById("toasts"),
    floaters: document.getElementById("floaters"),
    golden: document.getElementById("golden"),
    options: document.getElementById("options"),
    achievements: document.getElementById("achievements"),
    achievementTitle: document.getElementById("achievement-title"),
    stats: document.getElementById("stats"),
    achievementList: document.getElementById("achievement-list"),
    achievementCount: document.getElementById("achievement-count"),
    btnAchievements: document.getElementById("btn-achievements"),
    optMute: document.getElementById("opt-mute"),
    saveBox: document.getElementById("save-box"),
    btnMute: document.getElementById("btn-mute"),
    clickHint: document.getElementById("click-hint"),
    legend: document.getElementById("legend"),
    langToggle: document.getElementById("lang-toggle"),
  };

  function defaultState() {
    const buildings = {};
    const buildingMerit = {};
    const buildingMoves = {};
    for (const b of BUILDINGS) {
      buildings[b.id] = 0;
      buildingMerit[b.id] = 0;
      buildingMoves[b.id] = 0;
    }
    return {
      merit: 0,
      totalMerit: 0,
      n: 3,
      cycleMoves: 0,
      towers: 0,
      totalMoves: 0,
      idleMoves: 0,
      clicks: 0,
      goldens: 0,
      horin: 0,
      buildings,
      buildingMerit,
      buildingMoves,
      upgrades: [],
      achievements: [],
      completedAtN: { 3: 0 },
      buyMode: 1,
      lang: "ja",
      muted: true,
      playTime: 0,
      lastSave: Date.now(),
      goldenAt: Date.now() + randRange(GOLDEN_MIN, GOLDEN_MAX) * 1000,
      tickerIndex: 0,
      ended: false,
    };
  }

  let state = defaultState();
  let audioCtx = null;
  let towerDirty = true;
  let shopDirty = true;
  let lastShop = 0;
  let lastSave = 0;
  let lastTicker = 0;
  let lastAchieveCheck = 0;
  let clickBurst = 0;
  let lastUpgradeKey = "";

  function randRange(a, b) {
    return a + Math.random() * (b - a);
  }

  function cycleLen(n) {
    if (n >= 1024) return Infinity;
    return 2 ** n - 1;
  }

  function potentialHorin() {
    return Math.floor(Math.sqrt(state.totalMerit / 5e6));
  }

  function getMults() {
    let merit = 1;
    let click = 1;
    const building = Object.fromEntries(BUILDINGS.map((b) => [b.id, 1]));
    for (const id of state.upgrades) {
      const u = UPGRADE_MAP[id];
      if (!u) continue;
      if (u.merit) merit *= u.merit;
      if (u.click) click *= u.click;
      if (u.building) building[u.building] *= u.buildingMult || 2;
    }
    const horin = 1 + state.horin * 0.15;
    return { merit: merit * horin, click, building };
  }

  function meritPerMove() {
    return (1 + 0.15 * (state.n - 3)) * getMults().merit;
  }

  function progressMult(n = state.n) {
    if (n <= PROGRESS_PIVOT) return 1;
    return 2 ** ((n - PROGRESS_PIVOT) * PROGRESS_ALPHA);
  }

  function completionBonus() {
    const cycle = cycleLen(state.n);
    const mpm = meritPerMove();
    const raw = (!Number.isFinite(cycle) ? mpm * 1e6 : cycle * mpm * 0.25) + 5 * mpm;
    if (state.n <= 16) return raw;
    const cap = Math.max(mps(), clickPower()) * mpm * COMPLETION_CAP_SEC;
    return Math.min(raw, Math.max(cap, 5 * mpm));
  }

  function clickPower() {
    return getMults().click;
  }

  function mps() {
    const mults = getMults();
    let v = 0;
    for (const b of BUILDINGS) {
      v += (state.buildings[b.id] || 0) * b.baseMps * (mults.building[b.id] || 1);
    }
    return v;
  }

  function buildingCost(b, owned = state.buildings[b.id] || 0) {
    return b.baseCost * COST_GROWTH ** owned;
  }

  function costOfCount(b, count) {
    let total = 0;
    const owned = state.buildings[b.id] || 0;
    for (let i = 0; i < count; i++) total += buildingCost(b, owned + i);
    return total;
  }

  function maxAffordable(b) {
    let owned = state.buildings[b.id] || 0;
    let left = state.merit;
    let c = 0;
    while (c < 9999) {
      const cost = buildingCost(b, owned + c);
      if (left < cost) break;
      left -= cost;
      c++;
    }
    return c;
  }

  function buyCountFor(b) {
    if (state.buyMode === "max") return Math.max(1, maxAffordable(b));
    return state.buyMode;
  }

  function gainMerit(amount) {
    if (amount <= 0) return;
    state.merit += amount;
    state.totalMerit += amount;
  }

  function attributeIdleProduction(moves, merit) {
    if (moves <= 0 && merit <= 0) return;
    const mults = getMults();
    const parts = [];
    let totalMps = 0;
    for (const b of BUILDINGS) {
      const share = (state.buildings[b.id] || 0) * b.baseMps * (mults.building[b.id] || 1);
      if (share > 0) {
        parts.push({ id: b.id, share });
        totalMps += share;
      }
    }
    if (totalMps <= 0) return;
    let assignedMerit = 0;
    let assignedMoves = 0;
    parts.forEach((part, i) => {
      const ratio = part.share / totalMps;
      const meritSlice = i === parts.length - 1 ? merit - assignedMerit : merit * ratio;
      const moveSlice = i === parts.length - 1 ? moves - assignedMoves : moves * ratio;
      state.buildingMerit[part.id] = (state.buildingMerit[part.id] || 0) + meritSlice;
      state.buildingMoves[part.id] = (state.buildingMoves[part.id] || 0) + moveSlice;
      assignedMerit += meritSlice;
      assignedMoves += moveSlice;
    });
  }

  function performIdleMoves(amount) {
    const beforeMerit = state.totalMerit;
    performMoves(amount, "idle");
    attributeIdleProduction(amount, state.totalMerit - beforeMerit);
  }

  function pegsAfter(n, k) {
    let f = 0;
    let t = 2;
    let a = 1;
    const pegs = [[], [], []];
    for (let d = n; d >= 1; d--) {
      const half = d >= 1024 ? Infinity : 2 ** (d - 1);
      const stay = k < half;
      pegs[stay ? f : t].push(d);
      if (stay) {
        const tmp = t;
        t = a;
        a = tmp;
      } else {
        k -= half;
        const tmp = f;
        f = a;
        a = tmp;
      }
    }
    return pegs;
  }

  function completeTower(reason) {
    const finishedN = state.n;
    const bonus = completionBonus();
    gainMerit(bonus);
    state.towers += 1;
    state.completedAtN[state.n] = (state.completedAtN[state.n] || 0) + 1;
    towerDirty = true;
    shopDirty = true;

    if (finishedN < MAX_DISKS) {
      state.cycleMoves = 0;
      state.n += 1;
      toast(t("toast.towerComplete", { n: finishedN, next: state.n, bonus: formatNum(bonus) }));
      if (reason !== "idle") playBuy();
      checkAchievements();
      return;
    }

    state.ended = true;
    state.cycleMoves = cycleLen(MAX_DISKS);
    toast(t("toast.worldEnd", { n: MAX_DISKS }));
    playBuy();
    checkAchievements();
  }

  function performMoves(amount, reason) {
    if (amount <= 0 || state.ended) return 0;
    let gained = 0;
    const add = (x) => {
      gained += x;
      gainMerit(x);
    };

    if (reason === "click") state.clicks += 1;

    let prodLeft = amount;
    let guard = 0;
    while (prodLeft > 0 && !state.ended && guard++ < 80) {
      const cycle = cycleLen(state.n);
      const mpm = meritPerMove();
      const mul = progressMult();

      if (!Number.isFinite(cycle) || cycle <= 0) {
        add(prodLeft * mpm);
        break;
      }

      const remain = Math.max(0, cycle - (state.cycleMoves || 0));
      if (remain <= 0) {
        completeTower(reason);
        continue;
      }

      const prodToFinish = remain / mul;
      if (prodLeft < prodToFinish) {
        const progress = prodLeft * mul;
        state.cycleMoves += progress;
        state.totalMoves += progress;
        if (reason === "idle") state.idleMoves += progress;
        add(prodLeft * mpm);
        prodLeft = 0;
        break;
      }

      state.totalMoves += remain;
      if (reason === "idle") state.idleMoves += remain;
      add(prodToFinish * mpm);
      prodLeft -= prodToFinish;
      completeTower(reason);
    }

    towerDirty = true;
    return gained;
  }

  function clickTower(ev) {
    if (state.ended) return;
    const gained = performMoves(clickPower(), "click");
    clickBurst = 1;
    playClick();
    if (ev && gained > 0) {
      floatText(ev.clientX, ev.clientY, `+${formatNum(gained)}`);
    }
    shopDirty = true;
    checkAchievements();
  }

  function buyBuilding(id) {
    const b = BUILDINGS.find((x) => x.id === id);
    if (!b) return;
    const count = buyCountFor(b);
    const cost = costOfCount(b, count);
    if (count <= 0 || state.merit < cost) return;
    state.merit -= cost;
    state.buildings[id] = (state.buildings[id] || 0) + count;
    shopDirty = true;
    lastUpgradeKey = null;
    renderShop();
    playBuy();
    checkAchievements();
  }

  function buyUpgrade(id) {
    const u = UPGRADE_MAP[id];
    if (!u || state.upgrades.includes(id)) return;
    if (!u.cond(state) || state.merit < u.cost) return;
    state.merit -= u.cost;
    state.upgrades.push(id);
    shopDirty = true;
    lastUpgradeKey = null;
    toast(t("toast.upgrade", { name: upgradeName(u) }));
    playBuy();
    checkAchievements();
    renderShop();
  }

  function doPrestige() {
    const next = potentialHorin();
    if (next <= state.horin) return;
    const gain = next - state.horin;
    if (!confirm(t("confirm.prestige", { gain }))) return;
    const kept = {
      horin: next,
      achievements: state.achievements,
      lang: state.lang,
      muted: state.muted,
      playTime: state.playTime,
    };
    state = defaultState();
    Object.assign(state, kept);
    lastUpgradeKey = null;
    towerDirty = true;
    shopDirty = true;
    toast(t("toast.prestigeDone", { horin: state.horin, bonus: (state.horin * 15).toFixed(0) }));
    checkAchievements();
  }

  function checkAchievements() {
    for (const a of ACHIEVEMENTS) {
      if (state.achievements.includes(a.id)) continue;
      if (a.check(state)) {
        state.achievements.push(a.id);
        toast(t("toast.achievement", { name: achievementName(a), desc: achievementDesc(a) }));
        if (el.achievements.open) renderAchievements();
      }
    }
  }

  function toast(text) {
    const node = document.createElement("div");
    node.className = "toast";
    node.textContent = text;
    el.toasts.appendChild(node);
    setTimeout(() => node.remove(), 3600);
    if (el.toasts.children.length > 4) el.toasts.firstChild.remove();
  }

  function floatText(x, y, text) {
    const node = document.createElement("div");
    node.className = "floater";
    node.textContent = text;
    node.style.left = `${x}px`;
    node.style.top = `${y - 8}px`;
    el.floaters.appendChild(node);
    setTimeout(() => node.remove(), 900);
  }

  function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function beep(freq, dur, type, vol) {
    if (state.muted) return;
    try {
      const ctx = getAudio();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.value = vol;
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + dur);
    } catch {
      /* ignore */
    }
  }

  function playClick() {
    beep(180 + Math.random() * 90, 0.06, "triangle", 0.03);
  }

  function playBuy() {
    beep(420, 0.08, "sine", 0.03);
  }

  function diskStyle(d, n) {
    const t = (d - 1) / Math.max(n - 1, 1);
    const h = 16 + t * 44;
    const s = 72 + t * 12;
    const l = 30 + t * 26;
    const width = 22 + (d / n) * 76;
    const height = Math.max(5, Math.min(22, 230 / n));
    return {
      width: `${width}%`,
      height: `${height}px`,
      background: `linear-gradient(180deg, hsl(${h} ${s}% ${l + 14}%), hsl(${h} ${s}% ${l}%))`,
    };
  }

  function renderTower() {
    const n = state.n;
    const pegs = state.ended
      ? [[], [], Array.from({ length: n }, (_, i) => n - i)]
      : pegsAfter(n, state.cycleMoves);
    for (let i = 0; i < 3; i++) {
      const stack = el.stacks[i];
      stack.replaceChildren();
      let disks = pegs[i];
      if (disks.length > 18) disks = disks.slice(-18);
      disks.forEach((d, idx) => {
        const disk = document.createElement("div");
        disk.className = "disk";
        if (idx === disks.length - 1) disk.classList.add("is-top");
        Object.assign(disk.style, diskStyle(d, n));
        stack.appendChild(disk);
      });
    }
    towerDirty = false;
  }

  function progressFrac() {
    if (state.ended) return 1;
    const cycle = cycleLen(state.n);
    if (!Number.isFinite(cycle) || cycle <= 0) return 0;
    return Math.min(1, state.cycleMoves / cycle);
  }

  function renderMerit() {
    el.merit.textContent = formatNum(state.merit);
    const frac = progressFrac();
    el.progressBar.style.width = `${frac * 100}%`;
    el.board.classList.toggle("is-ended", state.ended);
    if (state.ended) {
      el.mps.textContent = t("mps.ended");
      el.progressLabel.textContent = t("progress.ended", { n: MAX_DISKS });
      return;
    }
    const speed = mps();
    const mpm = meritPerMove();
    el.mps.textContent = t("mps.live", {
      speed: formatNum(speed),
      merit: formatNum(speed * mpm),
      click: formatNum(clickPower()),
    });
    el.progressLabel.textContent = t("progress.live", {
      n: state.n,
      current: formatNum(state.cycleMoves),
      total: formatNum(cycleLen(state.n)),
    });
  }

  function renderMeta() {
    const items = [
      [t("labels.disks"), String(state.n)],
      [t("labels.totalMoves"), formatNum(state.totalMoves)],
      [t("labels.totalMerit"), formatNum(state.totalMerit)],
      [t("labels.horin"), formatNum(state.horin)],
    ];
    el.towerMeta.innerHTML = items
      .map(([label, value]) => `<div class="meta-card"><b>${value}</b><span>${label}</span></div>`)
      .join("");
  }

  function renderPrestige() {
    const next = potentialHorin();
    const gain = next - state.horin;
    if (gain <= 0) {
      el.btnPrestige.hidden = true;
      return;
    }
    el.btnPrestige.hidden = false;
    el.btnPrestige.disabled = false;
    el.btnPrestige.innerHTML = t("prestige.ready", {
      gain,
      total: next,
      bonus: (next * 15).toFixed(0),
    });
  }

  function renderUpgrades() {
    const available = UPGRADES.filter((u) => {
      if (state.upgrades.includes(u.id) || !u.cond(state)) return false;
      return u.cost <= Math.max(80, state.merit * 60, state.totalMerit * 0.35);
    })
      .sort((a, b) => a.cost - b.cost)
      .slice(0, 12);
    const key = available.map((u) => u.id).join(",");
    if (key !== lastUpgradeKey) {
      lastUpgradeKey = key;
      el.upgrades.replaceChildren();
      for (const u of available) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "upgrade";
        btn.dataset.id = u.id;
        btn.title = `${upgradeName(u)}\n${upgradeDesc(u)}\n${t("shop.upgradeCost", { cost: formatNum(u.cost) })}`;
        btn.textContent = u.icon;
        btn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          buyUpgrade(u.id);
        });
        el.upgrades.appendChild(btn);
      }
    }
    for (const u of available) {
      const btn = el.upgrades.querySelector(`[data-id="${u.id}"]`);
      if (btn) {
        btn.classList.toggle("is-locked", state.merit < u.cost);
        btn.title = `${upgradeName(u)}\n${upgradeDesc(u)}\n${t("shop.upgradeCost", { cost: formatNum(u.cost) })}`;
      }
    }
  }

  function nextBuildingIndex() {
    for (let i = 0; i < BUILDINGS.length; i++) {
      if ((state.buildings[BUILDINGS[i].id] || 0) === 0) return i;
    }
    return BUILDINGS.length;
  }

  function buildingVisibility(i) {
    const b = BUILDINGS[i];
    const owned = state.buildings[b.id] || 0;
    if (owned > 0) return { show: true, preview: false };

    const nextIdx = nextBuildingIndex();
    if (i === nextIdx) return { show: true, preview: false };

    if (i === nextIdx + 1 && b.baseCost <= state.merit * 8) {
      return { show: true, preview: true };
    }

    return { show: false, preview: false };
  }

  function renderBuildings(force = false) {
    if (force || el.buildings.childElementCount !== BUILDINGS.length || !el.buildings.querySelector(".costline")) {
      el.buildings.replaceChildren();
      for (const b of BUILDINGS) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "building";
        btn.dataset.id = b.id;
        btn.innerHTML = `
          <div class="icon">${b.icon}</div>
          <div>
            <h3></h3>
            <p><span class="desc"></span><br><span class="costline"></span></p>
          </div>
          <div class="owned">0</div>
        `;
        btn.addEventListener("click", () => buyBuilding(b.id));
        el.buildings.appendChild(btn);
      }
    }
    const buildingMult = getMults().building;
    for (let i = 0; i < BUILDINGS.length; i++) {
      const b = BUILDINGS[i];
      const btn = el.buildings.querySelector(`[data-id="${b.id}"]`);
      const owned = state.buildings[b.id] || 0;
      const count = buyCountFor(b);
      const cost = costOfCount(b, count);
      const vis = buildingVisibility(i);
      btn.hidden = !vis.show;
      btn.classList.toggle("is-preview", vis.preview);
      btn.disabled = vis.preview || state.merit < cost;
      btn.querySelector("h3").textContent = buildingName(b.id);
      btn.querySelector(".desc").textContent = buildingDesc(b.id);
      btn.querySelector(".owned").textContent = owned;
      const earned = state.buildingMerit[b.id] || 0;
      const moved = state.buildingMoves[b.id] || 0;
      btn.querySelector(".costline").innerHTML =
        t("shop.costLine", {
          cost: formatNum(cost),
          mps: formatNum(b.baseMps * (buildingMult[b.id] || 1)),
        }) +
        `<span class="merit-total">${t("shop.buildingTotal", {
          moves: formatNum(moved),
          merit: formatNum(earned),
        })}</span>`;
    }
  }

  function renderShop() {
    renderMeta();
    renderPrestige();
    renderUpgrades();
    renderBuildings();
    el.btnMute.textContent = state.muted ? t("ui.soundOff") : t("ui.soundOn");
    if (el.clickHint) {
      el.clickHint.textContent = state.ended ? t("hint.ended") : t("hint.live");
    }
    if (el.legend) {
      el.legend.textContent = state.ended ? t("legend.ended") : t("legend.live");
    }
    shopDirty = false;
  }

  function renderTicker() {
    if (state.ended) {
      el.ticker.textContent = t("ticker.ended");
      return;
    }
    const extra = [];
    if (state.n >= 8) {
      extra.push(t("ticker.towerInfo", { n: state.n, moves: formatNum(cycleLen(state.n)) }));
    }
    if (state.horin > 0) extra.push(t("ticker.horinBoost", { horin: state.horin }));
    if (mps() >= 1) extra.push(t("ticker.mpsOffering", { mps: formatNum(mps()) }));
    const pool = newsPool().concat(extra);
    state.tickerIndex = (state.tickerIndex + 1) % pool.length;
    el.ticker.textContent = pool[state.tickerIndex];
  }

  function spawnGolden() {
    if (state.ended || !el.golden.hidden) return;
    el.golden.hidden = false;
    el.golden.style.left = `${randRange(8, 86)}vw`;
    el.golden.style.top = `${randRange(12, 72)}vh`;
    setTimeout(() => {
      el.golden.hidden = true;
      state.goldenAt = Date.now() + randRange(GOLDEN_MIN, GOLDEN_MAX) * 1000;
    }, 13000);
  }

  function catchGolden() {
    if (state.ended) return;
    el.golden.hidden = true;
    state.goldens += 1;
    state.goldenAt = Date.now() + randRange(GOLDEN_MIN, GOLDEN_MAX) * 1000;
    const burst = Math.max(mps() * 77, meritPerMove() * 66, state.merit * 0.13);
    gainMerit(burst);
    toast(t("toast.golden", { merit: formatNum(burst) }));
    shopDirty = true;
    checkAchievements();
    playBuy();
  }

  function renderStats() {
    const rows = [
      [t("labels.currentMerit"), formatNum(state.merit)],
      [t("labels.totalMerit"), formatNum(state.totalMerit)],
      [t("labels.disksCount"), String(state.n)],
      [t("labels.towersCompleted"), formatNum(state.towers)],
      [t("labels.totalMoves"), formatNum(state.totalMoves)],
      [t("labels.clicks"), formatNum(state.clicks)],
      [t("labels.horin"), formatNum(state.horin)],
      [t("labels.achievements"), formatNum(state.achievements.length)],
      [
        t("labels.playTime"),
        t("stats.playTime", {
          hours: Math.floor(state.playTime / 3600),
          minutes: Math.floor((state.playTime / 60) % 60),
        }),
      ],
    ];
    el.stats.innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
    el.optMute.checked = state.muted;
  }

  function renderAchievements() {
    if (!el.achievementList) return;
    if (el.achievementTitle) el.achievementTitle.textContent = t("labels.achievements");
    el.achievementCount.textContent = formatNum(state.achievements.length);
    const unlocked = ACHIEVEMENTS.filter((a) => state.achievements.includes(a.id));
    if (unlocked.length === 0) {
      el.achievementList.innerHTML = `<li class="achievement-empty"><span class="achievement-empty-icon" aria-hidden="true">◎</span>${t("achievementsUi.empty")}</li>`;
      return;
    }
    el.achievementList.innerHTML = unlocked
      .map(
        (a) => `<li class="achievement-item">
        <div class="achievement-seal" aria-hidden="true">功</div>
        <div class="achievement-body">
          <p class="achievement-name">${achievementName(a)}</p>
          <p class="achievement-desc">${achievementDesc(a)}</p>
        </div>
      </li>`,
      )
      .join("");
  }

  function save() {
    state.lastSave = Date.now();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota */
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      const base = defaultState();
      state = {
        ...base,
        ...data,
        buildings: { ...base.buildings, ...(data.buildings || {}) },
        buildingMerit: { ...base.buildingMerit, ...(data.buildingMerit || {}) },
        buildingMoves: { ...base.buildingMoves, ...(data.buildingMoves || {}) },
      };
    } catch {
      state = defaultState();
    }
  }

  function applyOffline() {
    const elapsed = Math.min(OFFLINE_CAP, Math.max(0, (Date.now() - (state.lastSave || Date.now())) / 1000));
    if (elapsed < 10) return;
    const moves = mps() * elapsed;
    if (moves <= 0) return;
    const before = state.merit;
    performIdleMoves(moves);
    toast(t("toast.offline", { merit: formatNum(state.merit - before), minutes: Math.floor(elapsed / 60) }));
  }

  function wipe() {
    if (!confirm(t("confirm.wipe"))) return;
    localStorage.removeItem(SAVE_KEY);
    state = defaultState();
    lastUpgradeKey = null;
    towerDirty = true;
    applyLanguage(state.lang);
    el.options.close();
    toast(t("toast.wipeDone"));
  }

  function tick(dt) {
    state.playTime += dt;
    const speed = mps();
    if (!state.ended && speed > 0) performIdleMoves(speed * dt);
    if (!state.ended && Date.now() >= state.goldenAt && el.golden.hidden) spawnGolden();

    if (clickBurst > 0) {
      el.board.classList.add("is-click");
      clickBurst -= dt * 8;
      if (clickBurst <= 0) el.board.classList.remove("is-click");
    }

    renderMerit();
    if (towerDirty) renderTower();

    const now = performance.now();
    if (shopDirty || now - lastShop > 250) {
      renderShop();
      lastShop = now;
    }
    if (now - lastTicker > TICKER_MS) {
      renderTicker();
      lastTicker = now;
    }
    if (now - lastAchieveCheck > 1000) {
      checkAchievements();
      lastAchieveCheck = now;
    }
    if (now - lastSave > 8000) {
      save();
      lastSave = now;
    }
  }

  function applyLanguage(lang) {
    state.lang = lang === "en" ? "en" : "ja";
    setLang(state.lang);
    applyStaticI18n();
    for (const btn of el.langToggle.querySelectorAll("[data-lang]")) {
      btn.classList.toggle("is-on", btn.dataset.lang === state.lang);
    }
    lastUpgradeKey = null;
    el.upgrades.replaceChildren();
    shopDirty = true;
    renderShop();
    renderMerit();
    renderTicker();
    renderAchievements();
    save();
  }

  function bind() {
    el.board.addEventListener("click", clickTower);
    document.addEventListener("keydown", (ev) => {
      if (ev.code !== "Space") return;
      if (ev.target.closest("input, textarea, button, select, dialog")) return;
      ev.preventDefault();
      const rect = el.board.getBoundingClientRect();
      clickTower({ clientX: rect.left + rect.width / 2, clientY: rect.top + 80 });
    });
    el.btnPrestige.addEventListener("click", doPrestige);
    el.golden.addEventListener("click", catchGolden);
    el.btnMute.addEventListener("click", () => {
      state.muted = !state.muted;
      if (!state.muted) getAudio();
      shopDirty = true;
    });
    document.getElementById("btn-options").addEventListener("click", () => {
      renderStats();
      el.options.showModal();
    });
    el.btnAchievements.addEventListener("click", () => {
      renderAchievements();
      el.achievements.showModal();
    });
    el.optMute.addEventListener("change", () => {
      state.muted = el.optMute.checked;
      shopDirty = true;
    });
    document.getElementById("btn-export").addEventListener("click", () => {
      save();
      el.saveBox.value = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
      el.saveBox.select();
      toast(t("toast.exportReady"));
    });
    document.getElementById("btn-import").addEventListener("click", () => {
      try {
        const data = JSON.parse(decodeURIComponent(escape(atob(el.saveBox.value.trim()))));
        const base = defaultState();
        state = {
        ...base,
        ...data,
        buildings: { ...base.buildings, ...(data.buildings || {}) },
        buildingMerit: { ...base.buildingMerit, ...(data.buildingMerit || {}) },
        buildingMoves: { ...base.buildingMoves, ...(data.buildingMoves || {}) },
      };
        lastUpgradeKey = null;
        towerDirty = true;
        setLang(state.lang || "ja");
        applyStaticI18n();
        for (const btn of el.langToggle.querySelectorAll("[data-lang]")) {
          btn.classList.toggle("is-on", btn.dataset.lang === getLang());
        }
        el.upgrades.replaceChildren();
        shopDirty = true;
        toast(t("toast.importDone"));
        el.options.close();
      } catch {
        toast(t("toast.importFail"));
      }
    });
    document.getElementById("btn-wipe").addEventListener("click", wipe);
    el.buyMode.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-buy]");
      if (!btn) return;
      const v = btn.dataset.buy;
      state.buyMode = v === "max" ? "max" : Number(v);
      for (const b of el.buyMode.querySelectorAll("button")) b.classList.toggle("is-on", b === btn);
      shopDirty = true;
    });
    el.langToggle.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-lang]");
      if (!btn || btn.dataset.lang === state.lang) return;
      applyLanguage(btn.dataset.lang);
    });
    window.addEventListener("beforeunload", save);
  }

  function start() {
    load();
    setLang(state.lang || "ja");
    applyStaticI18n();
    for (const btn of el.langToggle.querySelectorAll("[data-lang]")) {
      btn.classList.toggle("is-on", btn.dataset.lang === getLang());
    }
    bind();
    applyOffline();
    renderTower();
    renderShop();
    renderMerit();
    renderTicker();
    checkAchievements();
    if (state.totalMoves < 1) toast(t("toast.welcome"));
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      tick(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  start();
})();
