/* ═══════════════════════════════════════════════════════════
   HABIT TRACKER — app.js
   ───────────────────────────────────────────────────────────
   NEW features:
   ① Goals multi-line chart  — one line per type (weekly/monthly/yearly)
   ② Goals donut charts      — visual completion per type
   ③ Goals summary chips     — quick stats at top of Goals tab
   ④ Consistency Score ring  — weighted grade S/A/B/C/D/F
   ⑤ Smart Insights          — best day, worst habit, trend
   ⑥ Streak Board            — current + all-time best per habit
   ⑦ Focus Mode              — today ring + motivational banner + 7-day timeline
   ⑧ Day notes               — per-day journal in Focus tab
   ⑨ Toast notifications     — feedback on every action
   ⑩ CSV export              — full month data download
═══════════════════════════════════════════════════════════ */

const App = (() => {
  /* ── CONSTANTS ──────────────────────────────────────── */
  const YEARS = [2026, 2027, 2028, 2029, 2030];
  const MONTHS = [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر",
  ];
  const MONTHS_EN = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const DAYS_AR = ["أح", "إث", "ثل", "أر", "خم", "جم", "سب"];
  const DAYS_FULL = [
    "الأحد",
    "الإثنين",
    "الثلاثاء",
    "الأربعاء",
    "الخميس",
    "الجمعة",
    "السبت",
  ];
  const CAT = {
    health: "الصحة",
    learning: "التعلم",
    fitness: "اللياقة",
    mindfulness: "التأمل",
    productivity: "الإنتاجية",
    other: "أخرى",
  };
  const FREQ = { daily: "يومي", weekdays: "أيام العمل", custom: "مخصص" };

  /* Chart defaults */
  const FONT = "IBM Plex Mono";
  const TIP = {
    backgroundColor: "#111",
    titleFont: { family: FONT, size: 10 },
    bodyFont: { family: FONT, size: 10 },
    cornerRadius: 3,
    padding: 8,
  };
  const TICK = { color: "#999", font: { family: FONT, size: 9 } };
  const GRID = { color: "#ebebeb" };

  /* Goal type line colors */
  const G_CLR = { weekly: "#111", monthly: "#666", yearly: "#bbb" };
  const G_LBL = { weekly: "أسبوعي", monthly: "شهري", yearly: "سنوي" };

  const QUOTES = [
    "كل يوم هو فرصة جديدة للنجاح",
    "الانتظام يصنع الفارق",
    "لا تقلل من قوة يوم واحد",
    "القوة تأتي من الاستمرارية",
    "ابدأ صغيراً، استمر طويلاً",
    "الإنجاز اليومي يبني المستقبل",
    "أنت أقرب مما تظن",
  ];

  let _charts = {};
  let _focusDate = new Date();

  /* ── STORAGE ────────────────────────────────────────── */
  const DB = {
    KEY: "habitTracker_v2",
    load() {
      try {
        const raw = localStorage.getItem(this.KEY);
        if (!raw) return this._default();
        const d = JSON.parse(raw);
        d.habits = d.habits || [];
        d.checks = d.checks || {};
        d.goals = d.goals || [];
        d.dayNotes = d.dayNotes || {};
        d.nextId =
          d.nextId ||
          (d.habits.length ? Math.max(...d.habits.map((h) => h.id)) + 1 : 1);
        d.habits.forEach((h) => {
          h.category = h.category || "other";
          h.freq = h.freq || "daily";
          h.reminder = h.reminder || "";
          h.note = h.note || "";
        });
        return d;
      } catch (e) {
        return this._default();
      }
    },
    save(d) {
      try {
        localStorage.setItem(this.KEY, JSON.stringify(d));
      } catch (e) {
        alert("تعذّر الحفظ — مساحة التخزين ممتلئة.");
      }
    },
    _default() {
      return {
        habits: [
          {
            id: 1,
            name: "Habit 1",
            goal: 30,
            category: "health",
            freq: "daily",
            reminder: "",
            note: "",
          },
          {
            id: 2,
            name: "Habit 2",
            goal: 30,
            category: "learning",
            freq: "daily",
            reminder: "",
            note: "",
          },
          {
            id: 3,
            name: "Habit 3",
            goal: 30,
            category: "fitness",
            freq: "daily",
            reminder: "",
            note: "",
          },
          {
            id: 4,
            name: "Habit 4",
            goal: 30,
            category: "productivity",
            freq: "daily",
            reminder: "",
            note: "",
          },
          {
            id: 5,
            name: "Habit 5",
            goal: 30,
            category: "other",
            freq: "daily",
            reminder: "",
            note: "",
          },
        ],
        checks: {},
        goals: [],
        dayNotes: {},
        nextId: 6,
      };
    },
  };

  let D = DB.load();
  const save = () => DB.save(D);

  /* ── HELPERS ────────────────────────────────────────── */
  const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();
  const weekOf = (d) => Math.ceil(d / 7);
  const ck = (y, m, h, d) => `${y}-${m}-${h}-${d}`;
  const isOn = (y, m, h, d) => !!D.checks[ck(y, m, h, d)];
  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const use = (id, sz = 13) =>
    `<svg width="${sz}" height="${sz}"><use href="#ic-${id}"/></svg>`;
  const pct = (n, d) => (d > 0 ? Math.min(Math.round((n / d) * 100), 100) : 0);

  function countHabit(y, m, hid) {
    const n = daysIn(y, m);
    let c = 0;
    for (let d = 1; d <= n; d++) if (isOn(y, m, hid, d)) c++;
    return c;
  }
  function countDay(y, m, d) {
    return D.habits.filter((h) => isOn(y, m, h.id, d)).length;
  }

  /* Current streak for one habit ending at (y,m,d) */
  function streakAt(hid, y, m, d) {
    let cur = 0,
      td = d,
      tm = m,
      ty = y;
    while (ty >= 2026) {
      if (isOn(ty, tm, hid, td)) {
        cur++;
      } else break;
      td--;
      if (td < 1) {
        tm--;
        if (tm < 0) {
          tm = 11;
          ty--;
        }
        td = daysIn(ty, tm);
      }
    }
    return cur;
  }
  /* Best ever streak for one habit */
  function bestStreak(hid) {
    let best = 0,
      cur = 0;
    YEARS.forEach((y) => {
      for (let m = 0; m < 12; m++) {
        const n = daysIn(y, m);
        for (let d = 1; d <= n; d++) {
          if (isOn(y, m, hid, d)) {
            cur++;
            best = Math.max(best, cur);
          } else cur = 0;
        }
      }
    });
    return best;
  }

  /* Toast */
  let _toastTimer;
  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  function killChart(id) {
    if (_charts[id]) {
      _charts[id].destroy();
      delete _charts[id];
    }
  }

  /* ── SELECTS ────────────────────────────────────────── */
  function fillSelects() {
    const now = new Date(),
      cy = Math.max(now.getFullYear(), 2026),
      cm = now.getMonth();
    ["sel-year", "stats-year", "hm-year"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = YEARS.map(
        (y) =>
          `<option value="${y}"${y === cy ? " selected" : ""}>${y}</option>`,
      ).join("");
    });
    ["sel-month", "stats-month"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = MONTHS.map(
        (mn, i) =>
          `<option value="${i}"${i === cm ? " selected" : ""}>${mn}</option>`,
      ).join("");
    });
    fillHmHabit();
  }
  function fillHmHabit() {
    const el = document.getElementById("hm-habit");
    if (!el) return;
    el.innerHTML =
      '<option value="all">كل العادات</option>' +
      D.habits
        .map((h) => `<option value="${h.id}">${esc(h.name)}</option>`)
        .join("");
  }

  /* ── TRACKER ────────────────────────────────────────── */
  function renderTracker() {
    const y = +document.getElementById("sel-year").value;
    const m = +document.getElementById("sel-month").value;
    const days = daysIn(y, m),
      maxW = weekOf(days);
    const weeks = [];
    for (let w = 1; w <= maxW; w++) {
      const s = (w - 1) * 7 + 1,
        e = Math.min(w * 7, days),
        ds = [];
      for (let d = s; d <= e; d++) ds.push(d);
      weeks.push({ w, days: ds });
    }

    let o = "<thead>";
    o += `<tr><th colspan="${3 + days}" class="th-title">${MONTHS[m]} ${y} — Habit Tracker</th></tr>`;
    o += `<tr><th class="col-name" rowspan="3">العادة</th>`;
    weeks.forEach((wk) => {
      const cls = wk.w > 1 ? `th-week th-week-${wk.w}` : "th-week";
      o += `<th colspan="${wk.days.length}" class="${cls}">W${wk.w}</th>`;
    });
    o += `<th class="col-goal" rowspan="2">Goal</th><th class="col-prog" rowspan="2">Progress</th></tr>`;
    o += "<tr>";
    for (let d = 1; d <= days; d++) o += `<th class="hd">${d}</th>`;
    o += "</tr>";
    o += "<tr>";
    for (let d = 1; d <= days; d++)
      o += `<th class="hd">${DAYS_AR[new Date(y, m, d).getDay()]}</th>`;
    o += "</tr>";
    o += "</thead><tbody>";

    D.habits.forEach((hb) => {
      const cnt = countHabit(y, m, hb.id),
        goal = hb.goal || 30,
        p = pct(cnt, goal),
        cat = hb.category || "other";
      o += `<tr data-hid="${hb.id}">`;
      o += `<td class="col-name"><div class="col-name-inner"><div class="cat-dot cat-${cat}" title="${esc(CAT[cat] || "")}"></div><span class="habit-name-text" title="${esc(hb.name)}">${esc(hb.name)}</span></div></td>`;
      for (let d = 1; d <= days; d++) {
        const on = isOn(y, m, hb.id, d);
        o += `<td class="cb dw${weekOf(d)}${on ? " on" : ""}" onclick="App.toggleCell(${y},${m},${hb.id},${d},this)">${on ? "✓" : "·"}</td>`;
      }
      o += `<td class="col-goal" id="gc-${hb.id}">${cnt}/${goal}</td>`;
      o += `<td class="col-prog" id="gp-${hb.id}"><span class="prog-pct">${p}%</span><div class="prog-bar"><div class="prog-fill" style="width:${p}%"></div></div></td>`;
      o += "</tr>";
    });

    // Day summary
    o += '<tr class="sum-row"><td class="sum-label">% اليوم</td>';
    for (let d = 1; d <= days; d++) {
      const c = countDay(y, m, d),
        t = D.habits.length;
      o += `<td id="sd-${d}">${c > 0 ? pct(c, t) + "%" : ""}</td>`;
    }
    o += '<td colspan="2"></td></tr>';

    // Week summary
    o += '<tr class="sum-row"><td class="sum-label">Week %</td>';
    const usedW = {};
    for (let d = 1; d <= days; d++) {
      const wn = weekOf(d);
      if (usedW[wn]) continue;
      usedW[wn] = 1;
      const wk = weeks[wn - 1];
      let wt = 0,
        wp = 0;
      wk.days.forEach((dd) => {
        wt += countDay(y, m, dd);
        wp += D.habits.length;
      });
      o += `<td colspan="${wk.days.length}" id="sw-${wn}">${pct(wt, wp)}%</td>`;
      d += wk.days.length - 1;
    }
    o += '<td colspan="2"></td></tr></tbody>';
    document.getElementById("main-table").innerHTML = o;
  }

  function toggleCell(y, m, hid, d, el) {
    const k = ck(y, m, hid, d);
    if (D.checks[k]) delete D.checks[k];
    else D.checks[k] = 1;
    save();
    const on = !!D.checks[k];
    el.textContent = on ? "✓" : "·";
    el.classList.toggle("on", on);
    _liveRow(y, m, hid);
    _liveDay(y, m, d);
    _liveWeek(y, m, weekOf(d));
    toast(on ? "✓ مكتمل" : "○ ألغيت");
  }
  function _liveRow(y, m, hid) {
    const hb = D.habits.find((h) => h.id === hid);
    if (!hb) return;
    const cnt = countHabit(y, m, hid),
      goal = hb.goal || 30,
      p = pct(cnt, goal);
    const gc = document.getElementById(`gc-${hid}`),
      gp = document.getElementById(`gp-${hid}`);
    if (gc) gc.textContent = `${cnt}/${goal}`;
    if (gp)
      gp.innerHTML = `<span class="prog-pct">${p}%</span><div class="prog-bar"><div class="prog-fill" style="width:${p}%"></div></div>`;
  }
  function _liveDay(y, m, d) {
    const el = document.getElementById(`sd-${d}`);
    if (!el) return;
    const c = countDay(y, m, d),
      t = D.habits.length;
    el.textContent = c > 0 ? pct(c, t) + "%" : "";
  }
  function _liveWeek(y, m, wn) {
    const el = document.getElementById(`sw-${wn}`);
    if (!el) return;
    const days = daysIn(y, m),
      weeks = [];
    for (let w = 1; w <= weekOf(days); w++) {
      const s = (w - 1) * 7 + 1,
        e = Math.min(w * 7, days),
        ds = [];
      for (let d = s; d <= e; d++) ds.push(d);
      weeks.push({ w, days: ds });
    }
    const wk = weeks[wn - 1];
    if (!wk) return;
    let wt = 0,
      wp = 0;
    wk.days.forEach((dd) => {
      wt += countDay(y, m, dd);
      wp += D.habits.length;
    });
    el.textContent = pct(wt, wp) + "%";
  }

  /* ── STATS ──────────────────────────────────────────── */
  function renderStats() {
    const y = +document.getElementById("stats-year").value;
    const m = +document.getElementById("stats-month").value;
    const days = daysIn(y, m),
      maxW = weekOf(days);

    let totChk = 0;
    for (let d = 1; d <= days; d++) totChk += countDay(y, m, d);
    const monthPct = pct(totChk, D.habits.length * days);

    let streak = 0,
      cur = 0;
    for (let d = 1; d <= days; d++) {
      if (D.habits.length && D.habits.every((h) => isOn(y, m, h.id, d))) {
        cur++;
        streak = Math.max(streak, cur);
      } else cur = 0;
    }
    let perfect = 0;
    for (let d = 1; d <= days; d++)
      if (D.habits.length && D.habits.every((h) => isOn(y, m, h.id, d)))
        perfect++;

    // Consistency
    const streakSc = Math.min((streak / 7) * 100, 100);
    const perfectSc = pct(perfect, days);
    const consistency = Math.round(
      monthPct * 0.5 + streakSc * 0.3 + perfectSc * 0.2,
    );
    const grade =
      consistency >= 90
        ? "S"
        : consistency >= 75
          ? "A"
          : consistency >= 60
            ? "B"
            : consistency >= 45
              ? "C"
              : consistency >= 30
                ? "D"
                : "F";

    document.getElementById("stat-cards").innerHTML =
      sc(`${monthPct}%`, "إنجاز الشهر") +
      sc(`${totChk}`, "مهام منجزة") +
      sc(`${streak}`, "Best Streak") +
      sc(`${perfect}`, "أيام مثالية") +
      sc(`${D.habits.length}`, "العادات");

    // Consistency ring
    const circ = 2 * Math.PI * 34,
      fill = circ * (1 - consistency / 100);
    document.getElementById("consistency-card").innerHTML = `
      <div class="card-title">Consistency Score</div>
      <div class="score-wrap">
        <div class="score-ring-wrap">
          <svg viewBox="0 0 80 80" width="80" height="80">
            <circle class="score-ring-bg" cx="40" cy="40" r="34"/>
            <circle class="score-ring-fg" cx="40" cy="40" r="34"
              stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${fill.toFixed(1)}"/>
          </svg>
          <div class="score-num">${consistency}</div>
        </div>
        <div class="score-info">
          <div class="score-title">نقاط الانتظام هذا الشهر</div>
          <div class="score-desc">إنجاز (50%) + Streak (30%) + أيام مثالية (20%)</div>
        </div>
        <div class="score-grade">${grade}</div>
      </div>`;

    // Weekly bar
    killChart("weekly");
    const wL = [],
      wD = [];
    for (let w = 1; w <= maxW; w++) {
      const s = (w - 1) * 7 + 1,
        e = Math.min(w * 7, days);
      let wt = 0,
        wp = 0;
      for (let d = s; d <= e; d++) {
        wt += countDay(y, m, d);
        wp += D.habits.length;
      }
      wL.push(`W${w}`);
      wD.push(pct(wt, wp));
    }
    _charts["weekly"] = new Chart(document.getElementById("chart-weekly"), {
      type: "bar",
      data: {
        labels: wL,
        datasets: [
          {
            data: wD,
            backgroundColor: "#111",
            borderRadius: 3,
            hoverBackgroundColor: "#555",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: TIP },
        scales: {
          x: { grid: GRID, ticks: TICK },
          y: {
            grid: GRID,
            ticks: { ...TICK, callback: (v) => v + "%" },
            beginAtZero: true,
            max: 100,
          },
        },
      },
    });

    // Daily line
    killChart("daily");
    const dL = [],
      dD = [];
    const tot = D.habits.length || 1;
    for (let d = 1; d <= days; d++) {
      dL.push(`${d}`);
      dD.push(pct(countDay(y, m, d), tot));
    }
    _charts["daily"] = new Chart(document.getElementById("chart-daily"), {
      type: "line",
      data: {
        labels: dL,
        datasets: [
          {
            data: dD,
            borderColor: "#111",
            backgroundColor: "rgba(17,17,17,.07)",
            borderWidth: 1.5,
            pointRadius: 0,
            fill: true,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: TIP },
        scales: {
          x: { grid: GRID, ticks: TICK },
          y: {
            grid: GRID,
            ticks: { ...TICK, callback: (v) => v + "%" },
            beginAtZero: true,
            max: 100,
          },
        },
      },
    });

    // Habit bars
    let hbHtml = "";
    D.habits.forEach((hb) => {
      const c = countHabit(y, m, hb.id),
        g = hb.goal || days,
        p = pct(c, g);
      const cStr = streakAt(hb.id, y, m, days);
      hbHtml += `<div class="hb-row">
        <div class="hb-top">
          <span class="hb-name" title="${esc(hb.name)}">${esc(hb.name)}</span>
          <span class="hb-cat">${esc(CAT[hb.category] || "")}</span>
          <span class="hb-streak">${cStr}d streak</span>
          <span class="hb-meta">${c}/${g} (${p}%)</span>
        </div>
        <div class="prog-bar" style="height:5px"><div class="prog-fill" style="width:${p}%"></div></div>
      </div>`;
    });
    document.getElementById("habit-bars").innerHTML =
      hbHtml || '<div class="empty">لا توجد عادات</div>';

    // Radar
    killChart("radar");
    const rEl = document.getElementById("chart-radar");
    if (D.habits.length >= 2) {
      _charts["radar"] = new Chart(rEl, {
        type: "radar",
        data: {
          labels: D.habits.map((h) => h.name),
          datasets: [
            {
              label: `${MONTHS[m]} ${y}`,
              data: D.habits.map((h) => {
                const c = countHabit(y, m, h.id),
                  g = h.goal || days;
                return pct(c, g);
              }),
              borderColor: "#111",
              backgroundColor: "rgba(17,17,17,.08)",
              borderWidth: 1.5,
              pointBackgroundColor: "#111",
              pointRadius: 3,
              pointHoverRadius: 5,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              labels: { font: { family: FONT, size: 10 }, color: "#555" },
            },
            tooltip: TIP,
          },
          scales: {
            r: {
              grid: { color: "#ddd" },
              angleLines: { color: "#ddd" },
              ticks: {
                color: "#aaa",
                font: { family: FONT, size: 8 },
                backdropColor: "transparent",
                stepSize: 25,
              },
              pointLabels: { font: { family: FONT, size: 10 }, color: "#555" },
              beginAtZero: true,
              max: 100,
            },
          },
        },
      });
    } else {
      rEl.parentElement.innerHTML =
        '<div class="empty">أضف عادتين أو أكثر لعرض مخطط الرادار</div>';
    }

    _renderInsights(y, m, days);
    _renderStreakBoard(y, m, days);
  }

  function _renderInsights(y, m, days) {
    const insights = [];
    if (!D.habits.length) {
      document.getElementById("insights-container").innerHTML =
        '<div class="empty">لا توجد بيانات</div>';
      return;
    }

    const dowTot = Array(7).fill(0),
      dowCnt = Array(7).fill(0);
    for (let d = 1; d <= days; d++) {
      const dow = new Date(y, m, d).getDay();
      dowTot[dow] += pct(countDay(y, m, d), D.habits.length);
      dowCnt[dow]++;
    }
    const dowAvg = dowTot.map((t, i) => (dowCnt[i] > 0 ? t / dowCnt[i] : 0));
    const bestDow = dowAvg.indexOf(Math.max(...dowAvg));
    const worstDow = dowAvg.reduce(
      (bi, v, i, a) => (v > 0 && v < a[bi] ? i : bi),
      bestDow,
    );

    if (dowAvg[bestDow] > 0)
      insights.push({
        icon: "zap",
        text: `أفضل يوم لديك هذا الشهر هو <strong>${DAYS_FULL[bestDow]}</strong> — معدل إنجاز ${Math.round(dowAvg[bestDow])}%`,
      });
    if (worstDow !== bestDow && dowAvg[worstDow] < dowAvg[bestDow])
      insights.push({
        icon: "info",
        text: `أضعف يوم هو <strong>${DAYS_FULL[worstDow]}</strong> — يحتاج دفعة إضافية`,
      });

    const half = Math.floor(days / 2);
    let h1 = 0,
      h2 = 0;
    for (let d = 1; d <= half; d++)
      h1 += pct(countDay(y, m, d), D.habits.length || 1);
    for (let d = half + 1; d <= days; d++)
      h2 += pct(countDay(y, m, d), D.habits.length || 1);
    h1 = Math.round(h1 / half);
    h2 = Math.round(h2 / (days - half));
    if (h2 > h1)
      insights.push({
        icon: "award",
        text: `أداؤك في <strong>تصاعد مستمر</strong> — النصف الثاني أفضل بـ ${h2 - h1}% من الأول`,
      });
    else if (h1 > h2 + 5)
      insights.push({
        icon: "info",
        text: `بدأت بقوة لكن <strong>الأداء تراجع</strong> — أنهِ الشهر بنفس حماسة البداية`,
      });

    let bestH = null,
      bestP = 0,
      worstH = null,
      worstP = 101;
    D.habits.forEach((h) => {
      const p2 = pct(countHabit(y, m, h.id), h.goal || days);
      if (p2 > bestP) {
        bestP = p2;
        bestH = h;
      }
      if (p2 < worstP) {
        worstP = p2;
        worstH = h;
      }
    });
    if (bestH && bestP > 0)
      insights.push({
        icon: "award",
        text: `أفضل عادة: <strong>${esc(bestH.name)}</strong> بإنجاز ${bestP}%`,
      });
    if (worstH && worstP < 100 && worstH.id !== bestH?.id)
      insights.push({
        icon: "info",
        text: `تحتاج عناية: <strong>${esc(worstH.name)}</strong> — ${worstP}% فقط`,
      });

    if (!insights.length)
      insights.push({ icon: "zap", text: "سجّل بياناتك وستظهر هنا رؤى مخصصة" });

    document.getElementById("insights-container").innerHTML = insights
      .map(
        (i) =>
          `<div class="insight-item"><div class="insight-icon">${use(i.icon, 14)}</div><div class="insight-text">${i.text}</div></div>`,
      )
      .join("");
  }

  function _renderStreakBoard(y, m, days) {
    if (!D.habits.length) {
      document.getElementById("streak-board").innerHTML =
        '<div class="empty">لا توجد عادات</div>';
      return;
    }
    let html = '<div class="streak-grid">';
    D.habits.forEach((hb) => {
      const cur = streakAt(hb.id, y, m, days),
        best = bestStreak(hb.id),
        month = countHabit(y, m, hb.id);
      html += `<div class="streak-card">
        <div class="streak-name" title="${esc(hb.name)}">${esc(hb.name)}</div>
        <div class="streak-nums">
          <div class="streak-item"><span class="streak-val">${cur}</span><span class="streak-lbl">Current</span></div>
          <div class="streak-item"><span class="streak-val">${best}</span><span class="streak-lbl">Best</span></div>
          <div class="streak-item"><span class="streak-val">${month}</span><span class="streak-lbl">Month</span></div>
        </div>
      </div>`;
    });
    document.getElementById("streak-board").innerHTML = html + "</div>";
  }

  function sc(n, l) {
    return `<div class="stat-box"><span class="num">${n}</span><span class="lbl">${l}</span></div>`;
  }

  /* ── GOALS ──────────────────────────────────────────── */
  function renderGoals() {
    _renderGoalsSummary();
    _renderGoalsLineChart();
    _renderGoalsDonuts();
    _renderGoalsList();
  }

  /* Summary chips at the top */
  function _renderGoalsSummary() {
    const types = ["weekly", "monthly", "yearly"];
    let html = "";
    types.forEach((t) => {
      const list = D.goals.filter((g) => g.type === t);
      const done = list.filter((g) => g.done).length;
      const p = pct(done, list.length);
      html += `<div class="goal-chip">
        <div class="goal-chip-line" style="background:${G_CLR[t]}"></div>
        <div class="goal-chip-body">
          <div class="goal-chip-title">${G_LBL[t]}</div>
          <div class="goal-chip-nums">${done} / ${list.length}</div>
          <div class="goal-chip-pct">${p}%</div>
        </div>
      </div>`;
    });
    document.getElementById("goals-summary").innerHTML = html;
  }

  /* ─────────────────────────────────────────────────────────
     GOALS MULTI-LINE CHART
     X-axis  = goal index 1…N (cumulative across all goals of that type)
     Y-axis  = cumulative completion % at that point
     One line per type: weekly (dark), monthly (grey), yearly (light)
  ───────────────────────────────────────────────────────── */
  function _renderGoalsLineChart() {
    killChart("goals-line");

    const types = ["weekly", "monthly", "yearly"];
    const maxLen = Math.max(
      ...types.map((t) => D.goals.filter((g) => g.type === t).length),
      1,
    );
    const labels = Array.from({ length: maxLen }, (_, i) => `#${i + 1}`);

    const datasets = [];
    types.forEach((t) => {
      const list = D.goals.filter((g) => g.type === t);
      if (!list.length) return;
      let done = 0;
      const data = list.map((g, i) => {
        if (g.done) done++;
        return Math.round((done / (i + 1)) * 100);
      });
      // pad to maxLen with null
      while (data.length < maxLen) data.push(null);
      datasets.push({
        label: G_LBL[t],
        data,
        borderColor: G_CLR[t],
        backgroundColor: "transparent",
        borderWidth: 2.5,
        pointBackgroundColor: G_CLR[t],
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.3,
        spanGaps: false,
      });
    });

    // Legend
    document.getElementById("goals-legend").innerHTML = [
      "weekly",
      "monthly",
      "yearly",
    ]
      .map(
        (t) => `
        <div class="gcl-item">
          <div class="gcl-dot" style="background:${G_CLR[t]}"></div>${G_LBL[t]}
        </div>`,
      )
      .join("");

    if (!datasets.length) {
      const wrap = document.getElementById("chart-goals");
      if (wrap)
        wrap.parentElement.querySelector(".chart-wrap").innerHTML =
          '<div class="empty">أضف أهدافاً لرؤية المخطط</div>';
      return;
    }

    const canvas = document.getElementById("chart-goals");
    if (!canvas) return;

    _charts["goals-line"] = new Chart(canvas, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...TIP,
            callbacks: {
              title: (items) => `هدف ${items[0].label}`,
              label: (item) => `${item.dataset.label}: ${item.parsed.y}%`,
            },
          },
        },
        scales: {
          x: {
            grid: GRID,
            ticks: TICK,
            title: {
              display: true,
              text: "رقم الهدف",
              color: "#aaa",
              font: { family: FONT, size: 9 },
            },
          },
          y: {
            grid: GRID,
            ticks: { ...TICK, callback: (v) => v + "%" },
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: "نسبة الإنجاز %",
              color: "#aaa",
              font: { family: FONT, size: 9 },
            },
          },
        },
      },
    });
  }

  /* Donut chart per type */
  function _renderGoalsDonuts() {
    ["weekly", "monthly", "yearly"].forEach((t) => {
      killChart(`donut-${t}`);
      const list = D.goals.filter((g) => g.type === t);
      const done = list.filter((g) => g.done).length;
      const rem = list.length - done;
      const lbl = document.getElementById(`dlbl-${t}`);
      if (!list.length) {
        if (lbl) lbl.innerHTML = `<span>—</span><span>لا يوجد</span>`;
        return;
      }
      if (lbl) lbl.innerHTML = `${done}<span>${list.length} هدف</span>`;
      _charts[`donut-${t}`] = new Chart(document.getElementById(`donut-${t}`), {
        type: "doughnut",
        data: {
          datasets: [
            {
              data: [done, rem],
              backgroundColor: [done ? "#111" : "#e8e8e8", "#e8e8e8"],
              borderWidth: 0,
              hoverOffset: 0,
            },
          ],
        },
        options: {
          responsive: false,
          cutout: "70%",
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
        },
      });
    });
  }

  function _renderGoalsList() {
    const types = [
      { t: "yearly", lbl: "أهداف سنوية", b: "سنوي" },
      { t: "monthly", lbl: "أهداف شهرية", b: "شهري" },
      { t: "weekly", lbl: "أهداف أسبوعية", b: "أسبوعي" },
    ];
    let html = "",
      any = false;
    types.forEach((tp) => {
      const list = D.goals.filter((g) => g.type === tp.t);
      if (!list.length) return;
      any = true;
      const done = list.filter((g) => g.done).length;
      html += `<div class="gsec-title">${tp.lbl} <span style="color:#111;font-weight:700">${done}/${list.length}</span></div>`;
      list.forEach((g) => {
        html += `<div class="goal-item${g.done ? " done" : ""}">
          <input type="checkbox"${g.done ? " checked" : ""} onchange="App.toggleGoal(${g.id},this.checked)">
          <div class="goal-body">
            <div class="goal-text">${esc(g.text)}</div>
            ${g.deadline ? `<div class="goal-deadline">${esc(g.deadline)}</div>` : ""}
          </div>
          <span class="badge">${tp.b}</span>
          <button class="del-btn" onclick="App.deleteGoal(${g.id})">${use("trash", 13)}</button>
        </div>`;
      });
    });
    if (!any)
      html =
        '<div class="empty">لم تضف أي أهداف بعد — استخدم الأزرار أعلاه</div>';
    document.getElementById("goals-container").innerHTML = html;
  }

  function toggleGoal(id, v) {
    const g = D.goals.find((x) => x.id === id);
    if (g) {
      g.done = v;
      save();
      renderGoals();
      toast(v ? "✓ هدف مكتمل" : "○ ألغيت");
    }
  }
  function deleteGoal(id) {
    D.goals = D.goals.filter((x) => x.id !== id);
    save();
    renderGoals();
    toast("حُذف الهدف");
  }
  function openAddGoal(type) {
    const L = { weekly: "أسبوعي", monthly: "شهري", yearly: "سنوي" };
    document.getElementById("goal-modal-title").textContent =
      "هدف " + L[type] + " جديد";
    document.getElementById("goal-type").value = type;
    document.getElementById("goal-text").value = "";
    document.getElementById("goal-deadline").value = "";
    _openModal("m-add-goal");
  }
  function submitGoal() {
    const text = document.getElementById("goal-text").value.trim();
    if (!text) return;
    const type = document.getElementById("goal-type").value;
    const dl = document.getElementById("goal-deadline").value.trim();
    D.goals.push({ id: D.nextId++, text, type, deadline: dl, done: false });
    save();
    closeModal("m-add-goal");
    renderGoals();
    toast("تمت إضافة الهدف");
  }

  /* ── HEATMAP ────────────────────────────────────────── */
  function renderHeatmap() {
    const y = +document.getElementById("hm-year").value;
    const hid = document.getElementById("hm-habit").value;
    let html = '<div class="hm-months">';
    for (let mo = 0; mo < 12; mo++) {
      const days = daysIn(y, mo),
        fd = new Date(y, mo, 1).getDay();
      html += `<div><div class="hm-month-title">${MONTHS_EN[mo]}</div><div class="hm-grid">`;
      for (let p = 0; p < fd; p++)
        html += '<div class="hm-cell" style="background:transparent"></div>';
      for (let d = 1; d <= days; d++) {
        let cnt = 0,
          mx = 1;
        if (hid === "all") {
          cnt = countDay(y, mo, d);
          mx = Math.max(D.habits.length, 1);
        } else {
          cnt = isOn(y, mo, +hid, d) ? 1 : 0;
          mx = 1;
        }
        const i = mx > 0 ? cnt / mx : 0;
        const bg =
          i === 0
            ? "#e8e8e8"
            : i < 0.25
              ? "#bbb"
              : i < 0.5
                ? "#888"
                : i < 0.75
                  ? "#444"
                  : "#111";
        html += `<div class="hm-cell" style="background:${bg}" title="${MONTHS_EN[mo]} ${d}: ${cnt}/${mx}"></div>`;
      }
      html += "</div></div>";
    }
    document.getElementById("heatmap-grid").innerHTML = html + "</div>";
  }

  /* ── FOCUS MODE ─────────────────────────────────────── */
  function renderFocus() {
    const y = _focusDate.getFullYear(),
      m = _focusDate.getMonth(),
      d = _focusDate.getDate();
    const dow = _focusDate.getDay();
    const isToday = (() => {
      const n = new Date();
      return n.getFullYear() === y && n.getMonth() === m && n.getDate() === d;
    })();

    document.getElementById("focus-date-main").textContent =
      `${DAYS_FULL[dow]}، ${d} ${MONTHS[m]} ${y}`;
    document.getElementById("focus-date-sub").textContent = isToday
      ? "اليوم"
      : "";

    // Ring
    const done = D.habits.filter((h) => isOn(y, m, h.id, d)).length;
    const total = D.habits.length || 1;
    const p = pct(done, total);
    const circ = 2 * Math.PI * 44,
      fill = circ * (1 - p / 100);

    // Per-habit mini bars for ring card
    let miniRows = "";
    D.habits.forEach((hb) => {
      const on = isOn(y, m, hb.id, d);
      miniRows += `<div class="focus-ring-prog-row">
        <div class="focus-ring-prog-label">${esc(hb.name)}</div>
        <div class="focus-ring-prog-bar"><div class="focus-ring-prog-fill" style="width:${on ? 100 : 0}%"></div></div>
      </div>`;
    });

    document.getElementById("focus-ring-wrap").innerHTML = `
      <div class="focus-ring-card">
        <div class="focus-ring-svg-wrap">
          <svg viewBox="0 0 100 100" width="100" height="100">
            <circle class="focus-ring-bg" cx="50" cy="50" r="44"/>
            <circle class="focus-ring-fg" cx="50" cy="50" r="44"
              stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${fill.toFixed(1)}"/>
          </svg>
          <div class="focus-ring-text">
            <div class="focus-ring-pct">${p}%</div>
            <div class="focus-ring-sub">${done}/${total}</div>
          </div>
        </div>
        <div class="focus-ring-info">
          <div class="focus-ring-title">${p === 100 ? "يوم مثالي ✓" : p >= 75 ? "أداء ممتاز" : "تقدم اليوم"}</div>
          <div class="focus-ring-prog-wrap">${miniRows}</div>
        </div>
      </div>`;

    // Motivational banner
    const q = QUOTES[d % QUOTES.length];
    document.getElementById("focus-banner").innerHTML =
      `<span style="opacity:.5;margin-left:6px">"</span>${q}<span style="opacity:.5;margin-right:6px">"</span>`;

    // Habit cards
    let hCards = '<div class="focus-habits-grid">';
    D.habits.forEach((hb) => {
      const on = isOn(y, m, hb.id, d);
      const str = streakAt(hb.id, y, m, d);
      hCards += `<div class="focus-habit-card${on ? " done" : ""}" onclick="App.focusToggle(${y},${m},${hb.id},${d})">
        <div class="fhc-check">${on ? "✓" : ""}</div>
        <div class="fhc-info">
          <div class="fhc-name">${esc(hb.name)}</div>
          <div class="fhc-cat">${esc(CAT[hb.category] || "")}</div>
          ${str > 1 ? `<div class="fhc-streak">${str}d streak</div>` : ""}
        </div>
      </div>`;
    });
    document.getElementById("focus-habits").innerHTML = hCards + "</div>";

    // Day note
    const noteKey = `${y}-${m}-${d}`;
    const ne = document.getElementById("focus-note");
    if (ne) ne.value = D.dayNotes[noteKey] || "";

    // 7-day timeline
    let tlHtml = '<div class="focus-tl">';
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(_focusDate);
      dt.setDate(dt.getDate() - i);
      const dy = dt.getFullYear(),
        dm = dt.getMonth(),
        dd2 = dt.getDate();
      const c = countDay(dy, dm, dd2),
        t = D.habits.length || 1;
      const barH = Math.max(2, Math.round((c / t) * 48));
      const isT = i === 0;
      tlHtml += `<div class="focus-tl-day${isT ? " today" : ""}">
        <div class="focus-tl-bar-wrap">
          <div class="focus-tl-bar" style="height:${barH}px;background:${isT ? "#111" : "#bbb"}"></div>
        </div>
        <div class="focus-tl-date">${DAYS_AR[dt.getDay()]}<br>${dd2}</div>
      </div>`;
    }
    document.getElementById("focus-timeline").innerHTML = tlHtml + "</div>";
  }

  function focusToggle(y, m, hid, d) {
    const k = ck(y, m, hid, d);
    if (D.checks[k]) delete D.checks[k];
    else D.checks[k] = 1;
    save();
    renderFocus();
    _liveRow(y, m, hid);
    _liveDay(y, m, d);
    _liveWeek(y, m, weekOf(d));
    toast(D.checks[k] ? "✓ مكتمل" : "○ ألغيت");
  }
  function focusChangeDay(delta) {
    _focusDate = new Date(_focusDate);
    _focusDate.setDate(_focusDate.getDate() + delta);
    if (_focusDate.getFullYear() < 2026) _focusDate = new Date(2026, 0, 1);
    if (_focusDate.getFullYear() > 2030) _focusDate = new Date(2030, 11, 31);
    renderFocus();
  }
  function focusToday() {
    _focusDate = new Date();
    renderFocus();
  }
  function saveDayNote(text) {
    const y = _focusDate.getFullYear(),
      m = _focusDate.getMonth(),
      d = _focusDate.getDate();
    const k = `${y}-${m}-${d}`;
    if (text.trim()) D.dayNotes[k] = text;
    else delete D.dayNotes[k];
    save();
  }

  /* ── EXPORT CSV ─────────────────────────────────────── */
  function exportCSV() {
    const y = +document.getElementById("sel-year").value;
    const m = +document.getElementById("sel-month").value;
    const days = daysIn(y, m);
    const header = ["Date", ...D.habits.map((h) => h.name), "Total", "%"].join(
      ",",
    );
    const rows = [];
    for (let d = 1; d <= days; d++) {
      const date = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const vals = D.habits.map((h) => (isOn(y, m, h.id, d) ? 1 : 0));
      const tot = vals.reduce((a, b) => a + b, 0);
      rows.push(
        [date, ...vals, tot, pct(tot, D.habits.length) + "%"].join(","),
      );
    }
    const blob = new Blob(["\ufeff" + [header, ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `habits_${y}_${String(m + 1).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("تم تصدير CSV");
  }

  /* ── HABITS CRUD ────────────────────────────────────── */
  function openAddHabitModal() {
    document.getElementById("habit-modal-title").textContent = "عادة جديدة";
    document.getElementById("habit-submit-btn").textContent = "إضافة";
    ["in-name", "in-reminder", "in-note"].forEach(
      (id) => (document.getElementById(id).value = ""),
    );
    document.getElementById("in-goal").value = "30";
    document.getElementById("in-category").value = "health";
    document.getElementById("in-freq").value = "daily";
    _openModal("m-add-habit");
  }
  function submitHabit() {
    const name = document.getElementById("in-name").value.trim();
    if (!name) {
      document.getElementById("in-name").focus();
      return;
    }
    D.habits.push({
      id: D.nextId++,
      name,
      goal: parseInt(document.getElementById("in-goal").value) || 30,
      category: document.getElementById("in-category").value,
      freq: document.getElementById("in-freq").value,
      reminder: document.getElementById("in-reminder").value.trim(),
      note: document.getElementById("in-note").value.trim(),
    });
    save();
    closeModal("m-add-habit");
    fillHmHabit();
    renderTracker();
    toast("تمت إضافة العادة");
  }
  function openManage() {
    _buildManageList();
    _openModal("m-manage");
  }
  function _buildManageList() {
    let html = D.habits.length ? "" : '<div class="empty">لا توجد عادات</div>';
    D.habits.forEach((hb) => {
      html += `<div class="manage-row">
        <div class="manage-dot cat-${hb.category || "other"}"></div>
        <div class="manage-info">
          <div class="manage-name">${esc(hb.name)}</div>
          <div class="manage-meta">${esc(CAT[hb.category] || "")} · ${esc(FREQ[hb.freq] || "")} · ${hb.goal} يوم/شهر${hb.reminder ? " · " + esc(hb.reminder) : ""}</div>
        </div>
        <div class="manage-actions">
          <button class="btn btn-sm" onclick="App.openEditHabit(${hb.id})">${use("edit", 13)}</button>
          <button class="btn btn-sm" onclick="App.deleteHabit(${hb.id})">${use("trash", 13)}</button>
        </div>
      </div>`;
    });
    document.getElementById("manage-list").innerHTML = html;
  }
  function openEditHabit(id) {
    const hb = D.habits.find((h) => h.id === id);
    if (!hb) return;
    document.getElementById("edit-habit-id").value = id;
    document.getElementById("edit-name").value = hb.name;
    document.getElementById("edit-goal").value = hb.goal;
    document.getElementById("edit-category").value = hb.category || "other";
    document.getElementById("edit-freq").value = hb.freq || "daily";
    document.getElementById("edit-reminder").value = hb.reminder || "";
    document.getElementById("edit-note").value = hb.note || "";
    closeModal("m-manage");
    _openModal("m-edit-habit");
  }
  function submitEditHabit() {
    const id = +document.getElementById("edit-habit-id").value;
    const hb = D.habits.find((h) => h.id === id);
    if (!hb) return;
    const name = document.getElementById("edit-name").value.trim();
    if (!name) {
      document.getElementById("edit-name").focus();
      return;
    }
    hb.name = name;
    hb.goal = parseInt(document.getElementById("edit-goal").value) || 30;
    hb.category = document.getElementById("edit-category").value;
    hb.freq = document.getElementById("edit-freq").value;
    hb.reminder = document.getElementById("edit-reminder").value.trim();
    hb.note = document.getElementById("edit-note").value.trim();
    save();
    closeModal("m-edit-habit");
    fillHmHabit();
    renderTracker();
    openManage();
    toast("تم حفظ التعديلات");
  }
  function deleteHabit(id) {
    if (!confirm("Delete this Habit and it's Data ")) return;
    D.habits = D.habits.filter((h) => h.id !== id);
    Object.keys(D.checks).forEach((k) => {
      if (k.split("-")[2] === String(id)) delete D.checks[k];
    });
    save();
    _buildManageList();
    fillHmHabit();
    renderTracker();
    toast("تم الحذف");
  }

  /* ── TABS & MODALS ──────────────────────────────────── */
  function switchTab(name, btn) {
    document
      .querySelectorAll(".view")
      .forEach((v) => v.classList.remove("active"));
    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));
    document.getElementById("view-" + name).classList.add("active");
    btn.classList.add("active");
    if (name === "stats") renderStats();
    if (name === "goals") renderGoals();
    if (name === "heatmap") renderHeatmap();
    if (name === "focus") renderFocus();
  }
  function _openModal(id) {
    document.getElementById(id).classList.add("open");
  }
  function closeModal(id) {
    document.getElementById(id).classList.remove("open");
  }

  /* ── INIT ───────────────────────────────────────────── */
  function init() {
    document.querySelectorAll(".overlay").forEach((o) => {
      o.addEventListener("click", (e) => {
        if (e.target === o) o.classList.remove("open");
      });
    });
    document.getElementById("in-name").addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitHabit();
    });
    fillSelects();
    renderTracker();
  }
  document.addEventListener("DOMContentLoaded", init);

  /* ── PUBLIC API ─────────────────────────────────────── */
  return {
    switchTab,
    renderTracker,
    renderStats,
    renderGoals,
    renderHeatmap,
    openModal: (id) => {
      if (id === "m-add-habit") openAddHabitModal();
      else _openModal(id);
    },
    closeModal,
    openAddHabitModal,
    submitHabit,
    openManage,
    openEditHabit,
    submitEditHabit,
    deleteHabit,
    toggleCell,
    focusToggle,
    focusChangeDay,
    focusToday,
    saveDayNote,
    openAddGoal,
    submitGoal,
    toggleGoal,
    deleteGoal,
    exportCSV,
  };
})();
4;
