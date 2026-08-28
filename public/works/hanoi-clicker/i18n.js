(() => {
  "use strict";

  const UNITS_JA = [
    { value: 1e48, name: "極" },
    { value: 1e44, name: "載" },
    { value: 1e40, name: "正" },
    { value: 1e36, name: "澗" },
    { value: 1e32, name: "溝" },
    { value: 1e28, name: "穣" },
    { value: 1e24, name: "秭" },
    { value: 1e20, name: "垓" },
    { value: 1e16, name: "京" },
    { value: 1e12, name: "兆" },
    { value: 1e8, name: "億" },
    { value: 1e4, name: "万" },
  ];

  const UNITS_EN = [
    { value: 1e48, name: "Qid" },
    { value: 1e45, name: "Qd" },
    { value: 1e42, name: "Td" },
    { value: 1e39, name: "Dd" },
    { value: 1e36, name: "Ud" },
    { value: 1e33, name: "Dc" },
    { value: 1e30, name: "No" },
    { value: 1e27, name: "Oc" },
    { value: 1e24, name: "Sp" },
    { value: 1e21, name: "Sx" },
    { value: 1e18, name: "Qi" },
    { value: 1e15, name: "Qa" },
    { value: 1e12, name: "T" },
    { value: 1e9, name: "B" },
    { value: 1e6, name: "M" },
    { value: 1e3, name: "K" },
  ];

  const STRINGS = {
    ja: {
      meta: {
        title: "ハノイクリッカー",
        description: "ハノイの塔のクッキークリッカー。円盤を移して功徳を積め。",
      },
      ui: {
        title: "ハノイクリッカー",
        tagline: "円盤を移し、功徳を積む",
        merit: "功徳",
        settings: "設定",
        sound: "音声",
        soundOff: "♪オフ",
        soundOn: "♪オン",
        temple: "伽藍",
        buyAmount: "購入数",
        buyMax: "最大",
        upgrades: "強化",
        goldenDisk: "流星の円盤",
        moveDisk: "円盤を一手動かす",
        optionsTitle: "設定",
        mute: "音声をオフ",
        exportSave: "セーブをコピー",
        importSave: "セーブを読み込む",
        savePlaceholder: "セーブデータを貼り付け",
        wipe: "データを消す",
        close: "閉じる",
        language: "言語",
      },
      achievementsUi: {
        empty: "まだ実績はない。",
      },
      labels: {
        disks: "枚数",
        totalMoves: "通算手数",
        totalMerit: "通算功徳",
        horin: "法輪",
        currentMerit: "今の功徳",
        disksCount: "円盤",
        towersCompleted: "完成した塔",
        clicks: "クリック",
        achievements: "実績",
        playTime: "プレイ時間",
      },
      stats: {
        playTime: "{hours}時間 {minutes}分",
      },
      mps: {
        live: "毎秒 {speed} 手（{merit} 功徳） · クリック {click} 手",
        ended: "円盤はすべて丙へ移った。",
      },
      progress: {
        live: "{n}枚の塔 · {current} / {total} 手",
        ended: "{n}枚の塔 · 完成",
      },
      hint: {
        live: "塔をクリックして一手移す · スペースキーでも可",
        ended: "塔は完成した。もう動かすものはない。",
      },
      legend: {
        live: "伝説では、64枚の黄金の円盤を移し終えたとき、世界は終わる。",
        ended: "僧侶たちは手を置いた。世界は終わった。",
      },
      prestige: {
        locked: "<strong>輪廻</strong><br>まだ法輪は得られない",
        ready: "<strong>輪廻する</strong><br>法輪 +{gain}（合計 {total} · 功徳 +{bonus}%）",
      },
      shop: {
        costLine: "{cost} 功徳 · {mps} 手/秒",
        buildingTotal: " · 通算 {moves}手 {merit}功徳",
        upgradeCost: "{cost} 功徳",
      },
      upgradeTiers: ["心得", "熟練", "極意", "開眼", "神業"],
      buildingUpgrade: {
        name: "{building}の{tier}",
        desc: "{building}の手数が2倍になる。",
      },
      buildings: {
        novice: { name: "見習い僧", desc: "円盤の動かし方を覚え始めた。" },
        servant: { name: "寺男", desc: "柱のほこりを払いながら移す。" },
        monk: { name: "修行僧", desc: "一日一万回の移し替え。" },
        abbot: { name: "住職", desc: "寺の規律が手数を生む。" },
        sutra: { name: "算法経", desc: "再帰の経文を唱える。" },
        abacus: { name: "算盤衆", desc: "珠を弾くたび円盤が躍る。" },
        machine: { name: "自動機関", desc: "歯車がハノイを解く。" },
        computer: { name: "電子計算機", desc: "ビットが円盤になる。" },
        super: { name: "超計算機", desc: "毎秒何層もの塔を崩す。" },
        priest: { name: "梵天の祭司", desc: "64枚の伝説を生きる者たち。" },
        recursion: { name: "再帰の化身", desc: "関数が自分自身を呼ぶ。" },
        brahma: { name: "ブラフマー", desc: "世界がその手で移される。" },
      },
      upgrades: {
        c1: { name: "指先三昧", desc: "クリックの手が2倍になる。" },
        c2: { name: "連撃の印", desc: "クリックの手が2倍になる。" },
        c3: { name: "千手の業", desc: "クリックの手が2倍になる。" },
        c4: { name: "万手不動", desc: "クリックの手が2倍になる。" },
        m1: { name: "金箔の円盤", desc: "すべての功徳が2倍。" },
        m2: { name: "紫檀の柱", desc: "すべての功徳が2倍。" },
        m3: { name: "金剛の円盤", desc: "すべての功徳が2倍。" },
        m4: { name: "世界軸", desc: "すべての功徳が2倍。" },
        m5: { name: "須弥の影", desc: "すべての功徳が2倍。" },
      },
      achievements: {
        first: { name: "初手", desc: "円盤を1回動かす。" },
        tower1: { name: "三枚成就", desc: "塔を1回完成させる。" },
        tower10: { name: "十の塔", desc: "塔を10回完成させる。" },
        tower1000: { name: "伽藍建立", desc: "塔を1,000回完成させる。" },
        n4: { name: "四枚目", desc: "円盤を4枚にする。" },
        n8: { name: "八枚の壁", desc: "円盤を8枚にする。" },
        n16: { name: "十六夜", desc: "円盤を16枚にする。" },
        n64: { name: "六十四夜", desc: "円盤を64枚にする。" },
        n100: { name: "世界の終わり", desc: "100枚の塔を移し終える。" },
        click100: { name: "百手", desc: "100回クリックする。" },
        click10000: { name: "指先の羅漢", desc: "10,000回クリックする。" },
        merit1e6: { name: "百万功徳", desc: "通算100万功徳。" },
        merit1e12: { name: "兆の功徳", desc: "通算1兆功徳。" },
        idle: { name: "手放し", desc: "自動で1万手以上。" },
        golden: { name: "流星", desc: "流星の円盤を掴む。" },
        horin: { name: "輪廻", desc: "法輪を得る。" },
        brahma: { name: "創造主", desc: "ブラフマーを雇う。" },
      },
      achievementSeries: {
        towers: { name: "塔{n}", desc: "塔を{n}回完成させる。" },
        disks: { name: "{n}枚の塔", desc: "円盤を{n}枚にする。" },
        clicks: { name: "{n}クリック", desc: "{n}回クリックする。" },
        merit: { name: "通算{n}功徳", desc: "通算{n}功徳に達する。" },
        idle: { name: "自動{n}手", desc: "自動で{n}手以上。" },
        moves: { name: "通算{n}手", desc: "通算{n}手を動かす。" },
        golden: { name: "流星{n}回", desc: "流星の円盤を{n}回掴む。" },
        horin: { name: "法輪{n}個", desc: "法輪を{n}個得る。" },
        upgrades: { name: "強化{n}個", desc: "強化を{n}個得る。" },
        playtime: { name: "{n}時間の修行", desc: "合計{n}時間プレイする。" },
        buildings: { name: "伽藍{n}人", desc: "伽藍を合計{n}雇う。" },
        owned: { name: "{who}{n}", desc: "{who}を{n}雇う。" },
        wallet: { name: "懐{n}功徳", desc: "手持ちの功徳が{n}に達する。" },
        hire: { name: "{who}登場", desc: "{who}を初めて雇う。" },
      },
      news: [
        "僧侶たちは今日も円盤を移している。",
        "大きな円盤の上に小さな円盤。それが唯一の戒律だ。",
        "乙の柱は、いつでも仮の宿。",
        "再帰とは、終わりを信じて自分を呼ぶこと。",
        "64枚を1秒に1手で移すと、終わりまで約5850億年。宇宙より長い。",
        "甲から丙へ。その間に宇宙が一度生まれる。",
        "手を止めても、功徳は消えない。セーブされている。",
        "算法経の奥に、自分自身を呼ぶ偈があった。",
        "見習い僧が初めての一手を誤り、住職は黙って見て見ぬふりをした。",
        "黄金の円盤が空を横切ることがある。逃すな。",
        "ハノイの王は、祭司たちが移し終えるまで世界を信じている。",
        "クリックは祈り。自動は信仰。円盤は世界。",
      ],
      ticker: {
        ended: "64枚が丙に重なった。世界は終わった。",
        towerInfo: "いまの塔は{n}枚。最短{moves}手。",
        horinBoost: "法輪 {horin} が功徳を底上げしている。",
        mpsOffering: "伽藍は毎秒 {mps} 手を捧げている。",
      },
      toast: {
        towerComplete: "{n}枚を完成。+{bonus} 功徳 · 円盤が{next}枚に増えた。",
        worldEnd: "{n}枚を移し終えた。世界は終わった。",
        upgrade: "強化: {name}",
        prestigeDone: "輪廻した。法輪 {horin}（功徳 +{bonus}%）",
        achievement: "実績: {name} — {desc}",
        golden: "流星の円盤！ +{merit} 功徳",
        offline: "不在の間に {merit} 功徳を積んだ（{minutes}分）",
        wipeDone: "データは灰になった。",
        exportReady: "セーブをコピーできる",
        importDone: "セーブを読み込んだ。",
        importFail: "セーブが読めなかった。",
        welcome: "塔をクリックして円盤を移そう。完成するたび、円盤が1枚増える。",
      },
      confirm: {
        prestige: "輪廻して法輪を {gain} 得る？（伽藍と功徳は消える。法輪は永続）",
        wipe: "すべてのデータを消します。よろしいですか？",
      },
    },
    en: {
      meta: {
        title: "Hanoi Clicker",
        description: "A Cookie Clicker take on the Tower of Hanoi. Move disks and earn merit.",
      },
      ui: {
        title: "Hanoi Clicker",
        tagline: "Move disks. Earn merit.",
        merit: "merit",
        settings: "Settings",
        sound: "Sound",
        soundOff: "♪ off",
        soundOn: "♪ on",
        temple: "Temple",
        buyAmount: "Buy amount",
        buyMax: "Max",
        upgrades: "Upgrades",
        goldenDisk: "Shooting disk",
        moveDisk: "Move one disk",
        optionsTitle: "Settings",
        mute: "Mute sound",
        exportSave: "Copy save",
        importSave: "Load save",
        savePlaceholder: "Paste save data",
        wipe: "Delete data",
        close: "Close",
        language: "Language",
      },
      achievementsUi: {
        empty: "No achievements yet.",
      },
      labels: {
        disks: "Disks",
        totalMoves: "Total moves",
        totalMerit: "Total merit",
        horin: "Dharma wheels",
        currentMerit: "Current merit",
        disksCount: "Disks",
        towersCompleted: "Towers completed",
        clicks: "Clicks",
        achievements: "Achievements",
        playTime: "Play time",
      },
      stats: {
        playTime: "{hours}h {minutes}m",
      },
      mps: {
        live: "{speed} moves/s ({merit} merit) · click {click} moves",
        ended: "Every disk has reached the far peg.",
      },
      progress: {
        live: "{n}-disk tower · {current} / {total} moves",
        ended: "{n}-disk tower · complete",
      },
      hint: {
        live: "Click the tower to move a disk · Space works too",
        ended: "The tower is complete. Nothing left to move.",
      },
      legend: {
        live: "Legend says the world ends when all 64 golden disks are moved.",
        ended: "The monks set down their hands. The world is over.",
      },
      prestige: {
        locked: "<strong>Rebirth</strong><br>No dharma wheel yet",
        ready: "<strong>Rebirth</strong><br>+{gain} wheel(s) (total {total} · merit +{bonus}%)",
      },
      shop: {
        costLine: "{cost} merit · {mps} moves/s",
        buildingTotal: " · total {moves} moves {merit} merit",
        upgradeCost: "{cost} merit",
      },
      upgradeTiers: ["Basics", "Practice", "Mastery", "Enlightenment", "Divinity"],
      buildingUpgrade: {
        name: "{building}: {tier}",
        desc: "Doubles {building} output.",
      },
      buildings: {
        novice: { name: "Novice Monk", desc: "Learning how disks move." },
        servant: { name: "Temple Servant", desc: "Dusts the pegs while moving disks." },
        monk: { name: "Ascetic Monk", desc: "Ten thousand moves a day." },
        abbot: { name: "Abbot", desc: "Temple discipline becomes moves." },
        sutra: { name: "Algorithm Sutra", desc: "Chants recursive verses." },
        abacus: { name: "Abacus Guild", desc: "Each bead makes a disk leap." },
        machine: { name: "Automaton", desc: "Gears solve Hanoi." },
        computer: { name: "Computer", desc: "Bits become disks." },
        super: { name: "Supercomputer", desc: "Collapses towers every second." },
        priest: { name: "Priests of Brahma", desc: "They live the 64-disk legend." },
        recursion: { name: "Incarnation of Recursion", desc: "A function calls itself." },
        brahma: { name: "Brahma", desc: "The world moves in their hands." },
      },
      upgrades: {
        c1: { name: "Focused Fingertips", desc: "Doubles click moves." },
        c2: { name: "Combo Seal", desc: "Doubles click moves." },
        c3: { name: "Thousand Hands", desc: "Doubles click moves." },
        c4: { name: "Ten Thousand Hands", desc: "Doubles click moves." },
        m1: { name: "Gilded Disks", desc: "Doubles all merit." },
        m2: { name: "Rosewood Pegs", desc: "Doubles all merit." },
        m3: { name: "Diamond Disks", desc: "Doubles all merit." },
        m4: { name: "World Axis", desc: "Doubles all merit." },
        m5: { name: "Shadow of Sumeru", desc: "Doubles all merit." },
      },
      achievements: {
        first: { name: "First Move", desc: "Move a disk once." },
        tower1: { name: "Three-Disk Victory", desc: "Complete a tower once." },
        tower10: { name: "Ten Towers", desc: "Complete 10 towers." },
        tower1000: { name: "Temple Founded", desc: "Complete 1,000 towers." },
        n4: { name: "Fourth Disk", desc: "Reach 4 disks." },
        n8: { name: "Wall of Eight", desc: "Reach 8 disks." },
        n16: { name: "Sixteenth Night", desc: "Reach 16 disks." },
        n64: { name: "Sixty-Four Disks", desc: "Reach 64 disks." },
        n100: { name: "End of the World", desc: "Finish the 100-disk tower." },
        click100: { name: "Hundred Clicks", desc: "Click 100 times." },
        click10000: { name: "Finger Arhat", desc: "Click 10,000 times." },
        merit1e6: { name: "Million Merit", desc: "Reach 1M total merit." },
        merit1e12: { name: "Trillion Merit", desc: "Reach 1T total merit." },
        idle: { name: "Hands Off", desc: "10,000+ idle moves." },
        golden: { name: "Shooting Star", desc: "Catch a shooting disk." },
        horin: { name: "Rebirth", desc: "Earn a dharma wheel." },
        brahma: { name: "Creator", desc: "Hire Brahma." },
      },
      achievementSeries: {
        towers: { name: "{n} towers", desc: "Complete {n} towers." },
        disks: { name: "{n} disks", desc: "Reach {n} disks." },
        clicks: { name: "{n} clicks", desc: "Click {n} times." },
        merit: { name: "{n} total merit", desc: "Reach {n} total merit." },
        idle: { name: "{n} idle moves", desc: "Make {n}+ idle moves." },
        moves: { name: "{n} total moves", desc: "Make {n} total moves." },
        golden: { name: "{n} shooting disks", desc: "Catch {n} shooting disks." },
        horin: { name: "{n} wheels", desc: "Earn {n} dharma wheels." },
        upgrades: { name: "{n} upgrades", desc: "Own {n} upgrades." },
        playtime: { name: "{n} hours", desc: "Play for {n} hours." },
        buildings: { name: "{n} hires", desc: "Own {n} temple hires total." },
        owned: { name: "{n} {who}", desc: "Own {n} {who}." },
        wallet: { name: "{n} in hand", desc: "Hold {n} merit at once." },
        hire: { name: "Meet {who}", desc: "Hire {who} for the first time." },
      },
      news: [
        "The monks move disks again today.",
        "A smaller disk on a larger one. That is the only law.",
        "The middle peg is always a temporary home.",
        "Recursion is calling yourself while trusting the end exists.",
        "At one move per second, 64 disks take about 585 billion years. Longer than the universe.",
        "From the first peg to the last, a universe is born in between.",
        "Even if you stop, merit remains. It is saved.",
        "Deep in the Algorithm Sutra was a verse that calls itself.",
        "A novice misstepped; the abbot watched in silence.",
        "Golden disks sometimes cross the sky. Do not miss them.",
        "The king of Hanoi trusts the world until the priests finish.",
        "Click is prayer. Automation is faith. Disks are the world.",
      ],
      ticker: {
        ended: "All 64 disks rest on the far peg. The world is over.",
        towerInfo: "Current tower: {n} disks. Minimum {moves} moves.",
        horinBoost: "{horin} dharma wheel(s) boost merit.",
        mpsOffering: "The temple offers {mps} moves per second.",
      },
      toast: {
        towerComplete: "Completed {n} disks. +{bonus} merit · tower grew to {next}.",
        worldEnd: "All {n} disks moved. The world is over.",
        upgrade: "Upgrade: {name}",
        prestigeDone: "Reborn. {horin} wheel(s) (merit +{bonus}%)",
        achievement: "Achievement: {name} — {desc}",
        golden: "Shooting disk! +{merit} merit",
        offline: "Earned {merit} merit while away ({minutes} min)",
        wipeDone: "Your data turned to ash.",
        exportReady: "Save copied to the box",
        importDone: "Save loaded.",
        importFail: "Could not read the save.",
        welcome: "Click the tower to move disks. Each completion adds one disk.",
      },
      confirm: {
        prestige: "Rebirth for {gain} dharma wheel(s)? (Temple and merit reset. Wheels are permanent.)",
        wipe: "Delete all data. Are you sure?",
      },
    },
  };

  let currentLang = "ja";

  function getLang() {
    return currentLang;
  }

  function setLang(lang) {
    currentLang = lang === "en" ? "en" : "ja";
    document.documentElement.lang = currentLang === "ja" ? "ja" : "en";
  }

  function lookup(dict, path) {
    return path.split(".").reduce((obj, key) => (obj == null ? undefined : obj[key]), dict);
  }

  function t(key, params = {}) {
    const table = STRINGS[currentLang] || STRINGS.ja;
    let text = lookup(table, key);
    if (text == null) text = lookup(STRINGS.ja, key) ?? key;
    if (typeof text !== "string") return text;
    return text.replace(/\{(\w+)\}/g, (_, name) => (params[name] != null ? String(params[name]) : `{${name}}`));
  }

  function formatNum(n) {
    if (!Number.isFinite(n)) return "∞";
    const sign = n < 0 ? "-" : "";
    n = Math.abs(n);
    const locale = currentLang === "ja" ? "ja-JP" : "en-US";
    const units = currentLang === "ja" ? UNITS_JA : UNITS_EN;
    if (n < 10) return sign + (Math.round(n * 10) / 10).toString();
    if (n < 10000) return sign + Math.floor(n).toLocaleString(locale);
    for (const u of units) {
      if (n >= u.value) {
        const x = n / u.value;
        const d = x >= 100 ? 0 : x >= 10 ? 1 : 2;
        return sign + x.toFixed(d) + u.name;
      }
    }
    return sign + n.toExponential(2);
  }

  function applyStaticI18n() {
    document.title = t("meta.title");
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.content = t("meta.description");
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      if (key) node.textContent = t(key);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      const key = node.getAttribute("data-i18n-placeholder");
      if (key) node.placeholder = t(key);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
      const key = node.getAttribute("data-i18n-aria");
      if (key) node.setAttribute("aria-label", t(key));
    });
    document.querySelectorAll("[data-i18n-title]").forEach((node) => {
      const key = node.getAttribute("data-i18n-title");
      if (key) node.title = t(key);
    });
  }

  window.I18N = { getLang, setLang, t, formatNum, applyStaticI18n, STRINGS };
})();
