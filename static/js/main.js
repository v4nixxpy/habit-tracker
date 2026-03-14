/* ═══════════════════════════════════════════════════════════
   HABIT TRACKER — main.js  (English-only, no i18n)
═══════════════════════════════════════════════════════════ */

const App = (() => {
  /* ── CONSTANTS ──────────────────────────────────────── */
  const YEARS = [2026, 2027, 2028, 2029, 2030];
  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const MONTHS_S = [
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
  const DAYS_S = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const DAYS_F = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const CAT_LABELS = {
    health: "Health",
    learning: "Learning",
    fitness: "Fitness",
    mindfulness: "Mindfulness",
    productivity: "Productivity",
    other: "Other",
  };
  const CAT = (k) => CAT_LABELS[k] || k;
  const FREQ = (k) =>
    ({ daily: "Daily", weekdays: "Weekdays", custom: "Custom" })[k] || k;
  const QUOTES = [
    "Every day is a new chance to succeed.",
    "Consistency makes the difference.",
    "Never underestimate the power of one day.",
    "Strength comes from continuity.",
    "Start small, keep going long.",
    "Daily achievement builds the future.",
    "You are closer than you think.",
  ];

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
  const G_CLR = { weekly: "#111", monthly: "#666", yearly: "#bbb" };
  const G_LBL = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };

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
        alert("Storage full — could not save.");
      }
    },
    _default() {
      return { habits: [], checks: {}, goals: [], dayNotes: {}, nextId: 1 };
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
    let c = 0;
    for (let d = 1; d <= daysIn(y, m); d++) if (isOn(y, m, hid, d)) c++;
    return c;
  }
  function countDay(y, m, d) {
    return D.habits.filter((h) => isOn(y, m, h.id, d)).length;
  }
  function streakAt(hid, y, m, d) {
    let cur = 0,
      td = d,
      tm = m,
      ty = y;
    while (ty >= 2026) {
      if (isOn(ty, tm, hid, td)) cur++;
      else break;
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
  function bestStreak(hid) {
    let best = 0,
      cur = 0;
    YEARS.forEach((y) => {
      for (let m = 0; m < 12; m++) {
        for (let d = 1; d <= daysIn(y, m); d++) {
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
      '<option value="all">All Habits</option>' +
      D.habits
        .map((h) => `<option value="${h.id}">${esc(h.name)}</option>`)
        .join("");
  }

  /* ══════════════════════════════════════════════════════
     TRACKER — daily table + 3 sub-tables
  ══════════════════════════════════════════════════════ */
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

    /* ── header ── */
    let o = "<thead>";
    o += `<tr><th colspan="${3 + days}" class="th-title">${MONTHS[m]} ${y} — Habit Tracker</th></tr>`;
    o += `<tr><th class="col-name" rowspan="3">Habit</th>`;
    weeks.forEach((wk) => {
      const cls = wk.w > 1 ? `th-week th-week-${wk.w}` : "th-week";
      o += `<th colspan="${wk.days.length}" class="${cls}">W${wk.w}</th>`;
    });
    o += `<th class="col-goal" rowspan="2">Goal</th><th class="col-prog" rowspan="2">Progress</th></tr>`;
    o += "<tr>";
    for (let d = 1; d <= days; d++) o += `<th class="hd">${d}</th>`;
    o += "</tr><tr>";
    for (let d = 1; d <= days; d++)
      o += `<th class="hd">${DAYS_S[new Date(y, m, d).getDay()]}</th>`;
    o += "</tr></thead><tbody>";

    /* ── habit rows ── */
    D.habits.forEach((hb) => {
      const cnt = countHabit(y, m, hb.id),
        goal = hb.goal || 30,
        p = pct(cnt, goal),
        cat = hb.category || "other";
      o += `<tr data-hid="${hb.id}">`;
      o +=
        `<td class="col-name"><div class="col-name-inner">` +
        `<div class="cat-dot cat-${cat}" title="${esc(CAT(cat))}"></div>` +
        `<span class="habit-name-text" title="${esc(hb.name)}">${esc(hb.name)}</span></div></td>`;
      for (let d = 1; d <= days; d++) {
        const on = isOn(y, m, hb.id, d);
        o +=
          `<td class="cb dw${weekOf(d)}${on ? " on" : ""}" ` +
          `onclick="App.toggleCell(${y},${m},${hb.id},${d},this)">${on ? "✓" : "·"}</td>`;
      }
      o += `<td class="col-goal" id="gc-${hb.id}">${cnt}/${goal}</td>`;
      o +=
        `<td class="col-prog" id="gp-${hb.id}">` +
        `<span class="prog-pct">${p}%</span>` +
        `<div class="prog-bar"><div class="prog-fill" style="width:${p}%"></div></div></td>`;
      o += "</tr>";
    });

    /* ── day % summary ── */
    o += `<tr class="sum-row"><td class="sum-label">Day %</td>`;
    for (let d = 1; d <= days; d++) {
      const c = countDay(y, m, d),
        t = D.habits.length;
      o += `<td id="sd-${d}">${c > 0 ? pct(c, t) + "%" : ""}</td>`;
    }
    o += '<td colspan="2"></td></tr>';

    /* ── week % summary ── */
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

    /* render sub-tables */
    renderWeeklyTable(y, m);
    renderMonthlyTable(y, m);
    renderYearlyTable(y, m);
  }

  /* ── live update helpers (called by toggleCell) ── */
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
      gp.innerHTML =
        `<span class="prog-pct">${p}%</span>` +
        `<div class="prog-bar"><div class="prog-fill" style="width:${p}%"></div></div>`;
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
  /* live update for the 3 sub-tables after each cell toggle */
  function _liveSubTables(y, m) {
    renderWeeklyTable(y, m);
    renderMonthlyTable(y, m);
    renderYearlyTable(y, m);
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
    _liveSubTables(y, m); /* ← live update weekly/monthly/yearly */
    toast(on ? "✓ Done" : "○ Undone");
  }

  /* ══════════════════════════════════════════════════════
     WEEKLY TRACKING TABLE
     habit × week — shows done/total per week + overall %
  ══════════════════════════════════════════════════════ */
  function renderWeeklyTable(y, m) {
    const el = document.getElementById("table-weekly");
    if (!el) return;
    const days = daysIn(y, m),
      numW = weekOf(days);
    if (!D.habits.length) {
      el.innerHTML =
        '<tbody><tr><td colspan="99" class="empty">No habits yet — add one above.</td></tr></tbody>';
      return;
    }
    const wks = [];
    for (let w = 1; w <= numW; w++) {
      const s = (w - 1) * 7 + 1,
        e = Math.min(w * 7, days);
      wks.push({ w, s, e, total: e - s + 1 });
    }
    let o = `<thead><tr>
      <th class="col-name th-title" style="text-align:left;padding:8px 10px">Habit</th>`;
    wks.forEach(
      (wk) =>
        (o += `<th class="th-week">W${wk.w}<br><span style="font-weight:400;font-size:0.58rem">${wk.s}–${wk.e}</span></th>`),
    );
    o += `<th class="col-goal">Total</th><th class="col-prog" style="min-width:90px">%</th>
    </tr></thead><tbody>`;

    D.habits.forEach((hb) => {
      const cat = hb.category || "other",
        goal = hb.goal || 30;
      let totalDone = 0;
      o +=
        `<tr><td class="col-name"><div class="col-name-inner">` +
        `<div class="cat-dot cat-${cat}"></div>` +
        `<span class="habit-name-text">${esc(hb.name)}</span></div></td>`;
      wks.forEach((wk) => {
        let done = 0;
        for (let d = wk.s; d <= wk.e; d++) if (isOn(y, m, hb.id, d)) done++;
        totalDone += done;
        const p = pct(done, wk.total);
        const bg =
          p === 100
            ? "background:#111;color:#fff"
            : p >= 50
              ? "background:#f0f0ee"
              : "";
        const tc = p === 100 ? "#fff" : "#999";
        o +=
          `<td class="col-goal" style="${bg}">${done}/${wk.total}` +
          `<br><span style="font-size:0.58rem;color:${tc}">${p}%</span></td>`;
      });
      const tp = pct(totalDone, goal);
      o +=
        `<td class="col-goal">${totalDone}/${goal}</td>` +
        `<td class="col-prog"><span class="prog-pct">${tp}%</span>` +
        `<div class="prog-bar"><div class="prog-fill" style="width:${tp}%"></div></div></td></tr>`;
    });

    /* summary row */
    o += `<tr class="sum-row"><td class="sum-label">Week %</td>`;
    wks.forEach((wk) => {
      let wt = 0,
        wp = 0;
      for (let d = wk.s; d <= wk.e; d++) {
        wt += countDay(y, m, d);
        wp += D.habits.length;
      }
      o += `<td style="font-family:var(--mono);font-size:0.68rem;font-weight:700;text-align:center;padding:4px 2px">${pct(wt, wp)}%</td>`;
    });
    o += `<td colspan="2"></td></tr></tbody>`;
    el.innerHTML = o;
  }

  /* ══════════════════════════════════════════════════════
     MONTHLY TRACKING TABLE
     habit × last 6 months — current month highlighted
  ══════════════════════════════════════════════════════ */
  function renderMonthlyTable(y, m) {
    const el = document.getElementById("table-monthly");
    if (!el) return;
    if (!D.habits.length) {
      el.innerHTML =
        '<tbody><tr><td colspan="99" class="empty">No habits yet — add one above.</td></tr></tbody>';
      return;
    }
    const months6 = [];
    for (let i = 5; i >= 0; i--) {
      let mm = m - i,
        yy = y;
      if (mm < 0) {
        mm += 12;
        yy--;
      }
      months6.push({ y: yy, m: mm });
    }
    let o = `<thead><tr>
      <th class="col-name th-title" style="text-align:left;padding:8px 10px">Habit</th>`;
    months6.forEach((mo) => {
      const isCur = mo.y === y && mo.m === m;
      o +=
        `<th class="${isCur ? "th-title" : "th-week"}" style="${isCur ? "" : ""}">` +
        `${MONTHS_S[mo.m]}<br><span style="font-weight:400;font-size:0.58rem;opacity:0.7">${mo.y}</span></th>`;
    });
    o += `<th class="col-goal">Avg</th></tr></thead><tbody>`;

    D.habits.forEach((hb) => {
      const cat = hb.category || "other",
        goal = hb.goal || 30;
      let sumPct = 0;
      o +=
        `<tr><td class="col-name"><div class="col-name-inner">` +
        `<div class="cat-dot cat-${cat}"></div>` +
        `<span class="habit-name-text">${esc(hb.name)}</span></div></td>`;
      months6.forEach((mo) => {
        const cnt = countHabit(mo.y, mo.m, hb.id),
          p = pct(cnt, goal);
        sumPct += p;
        const isCur = mo.y === y && mo.m === m;
        const bg =
          p === 100
            ? "background:#111;color:#fff"
            : p >= 50
              ? "background:#f0f0ee"
              : isCur
                ? "background:#fafafa;border:2px solid #111"
                : "";
        const tc = p === 100 ? "#fff" : "#999";
        o +=
          `<td class="col-goal" style="${bg}">${cnt}/${goal}` +
          `<br><span style="font-size:0.58rem;color:${tc}">${p}%</span></td>`;
      });
      const avg = Math.round(sumPct / months6.length);
      o += `<td class="col-goal" style="font-weight:700">${avg}%</td></tr>`;
    });

    /* overall summary */
    o += `<tr class="sum-row"><td class="sum-label">Overall %</td>`;
    months6.forEach((mo) => {
      const d2 = daysIn(mo.y, mo.m);
      let tot = 0;
      for (let d = 1; d <= d2; d++) tot += countDay(mo.y, mo.m, d);
      const p = pct(tot, D.habits.length * d2);
      o += `<td style="font-family:var(--mono);font-size:0.68rem;font-weight:700;text-align:center;padding:4px">${p}%</td>`;
    });
    o += `<td></td></tr></tbody>`;
    el.innerHTML = o;
  }

  /* ══════════════════════════════════════════════════════
     YEARLY TRACKING TABLE
     habit × all 12 months of selected year
  ══════════════════════════════════════════════════════ */
  function renderYearlyTable(y, m) {
    const el = document.getElementById("table-yearly");
    if (!el) return;
    if (!D.habits.length) {
      el.innerHTML =
        '<tbody><tr><td colspan="99" class="empty">No habits yet — add one above.</td></tr></tbody>';
      return;
    }
    const now = new Date();
    const curM = now.getFullYear() === y ? now.getMonth() : -1;

    let o = `<thead><tr>
      <th class="col-name th-title" style="text-align:left;padding:8px 10px">Habit</th>`;
    for (let mo = 0; mo < 12; mo++) {
      const isCur = mo === curM;
      o += `<th class="${isCur ? "th-title" : "th-week"}" style="${mo % 2 === 1 && !isCur ? "background:#f5f5f4" : ""}">${MONTHS_S[mo]}</th>`;
    }
    o += `<th class="col-goal">Total</th><th class="col-prog" style="min-width:90px">% ${y}</th>
    </tr></thead><tbody>`;

    D.habits.forEach((hb) => {
      const cat = hb.category || "other",
        goal = hb.goal || 30;
      let yearDone = 0;
      o +=
        `<tr><td class="col-name"><div class="col-name-inner">` +
        `<div class="cat-dot cat-${cat}"></div>` +
        `<span class="habit-name-text">${esc(hb.name)}</span></div></td>`;
      for (let mo = 0; mo < 12; mo++) {
        const cnt = countHabit(y, mo, hb.id),
          p = pct(cnt, goal);
        yearDone += cnt;
        const isCur = mo === curM;
        const bg =
          p === 100
            ? "background:#111;color:#fff"
            : p >= 50
              ? "background:#f0f0ee"
              : isCur
                ? "border:2px solid #111"
                : "";
        const tc = p === 100 ? "#fff" : "#aaa";
        o += `<td class="col-goal" style="${bg}">${p}%<br><span style="font-size:0.58rem;color:${tc}">${cnt}</span></td>`;
      }
      const yearGoal = goal * 12,
        yearP = pct(yearDone, yearGoal);
      o +=
        `<td class="col-goal" style="font-weight:700">${yearDone}/${yearGoal}</td>` +
        `<td class="col-prog"><span class="prog-pct">${yearP}%</span>` +
        `<div class="prog-bar"><div class="prog-fill" style="width:${yearP}%"></div></div></td></tr>`;
    });

    /* monthly summary row */
    o += `<tr class="sum-row"><td class="sum-label">Overall %</td>`;
    for (let mo = 0; mo < 12; mo++) {
      const d2 = daysIn(y, mo);
      let tot = 0;
      for (let d = 1; d <= d2; d++) tot += countDay(y, mo, d);
      const p = pct(tot, D.habits.length * d2);
      o += `<td style="font-family:var(--mono);font-size:0.68rem;font-weight:700;text-align:center;padding:4px">${p}%</td>`;
    }
    o += `<td colspan="2"></td></tr></tbody>`;
    el.innerHTML = o;
  }

  /* ══════════════════════════════════════════════════════
     STATS
  ══════════════════════════════════════════════════════ */
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
      sc(`${monthPct}%`, "Month Done") +
      sc(`${totChk}`, "Tasks Done") +
      sc(`${streak}`, "Best Streak") +
      sc(`${perfect}`, "Perfect Days") +
      sc(`${D.habits.length}`, "Habits");

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
          <div class="score-title">This month's consistency</div>
          <div class="score-desc">Completion (50%) + Streak (30%) + Perfect Days (20%)</div>
        </div>
        <div class="score-grade">${grade}</div>
      </div>`;

    /* Weekly bar */
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

    /* Daily line */
    killChart("daily");
    const dL = [],
      dD = [],
      tot2 = D.habits.length || 1;
    for (let d = 1; d <= days; d++) {
      dL.push(`${d}`);
      dD.push(pct(countDay(y, m, d), tot2));
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

    /* Habit bars */
    let hbHtml = "";
    D.habits.forEach((hb) => {
      const c = countHabit(y, m, hb.id),
        g = hb.goal || days,
        p = pct(c, g);
      const cStr = streakAt(hb.id, y, m, days);
      hbHtml += `<div class="hb-row">
        <div class="hb-top">
          <span class="hb-name" title="${esc(hb.name)}">${esc(hb.name)}</span>
          <span class="hb-cat">${esc(CAT(hb.category))}</span>
          <span class="hb-streak">${cStr}d streak</span>
          <span class="hb-meta">${c}/${g} (${p}%)</span>
        </div>
        <div class="prog-bar" style="height:5px"><div class="prog-fill" style="width:${p}%"></div></div>
      </div>`;
    });
    document.getElementById("habit-bars").innerHTML =
      hbHtml || '<div class="empty">No habits yet.</div>';

    /* Radar */
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
              data: D.habits.map((h) =>
                pct(countHabit(y, m, h.id), h.goal || days),
              ),
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
        '<div class="empty">Add 2 or more habits to see the radar chart.</div>';
    }

    _renderInsights(y, m, days);
    _renderStreakBoard(y, m, days);
  }

  function _renderInsights(y, m, days) {
    const insights = [];
    if (!D.habits.length) {
      document.getElementById("insights-container").innerHTML =
        '<div class="empty">No data yet.</div>';
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
        text: `Your best day this month is <strong>${DAYS_F[bestDow]}</strong> — completion rate ${Math.round(dowAvg[bestDow])}%`,
      });
    if (worstDow !== bestDow && dowAvg[worstDow] < dowAvg[bestDow])
      insights.push({
        icon: "info",
        text: `Weakest day is <strong>${DAYS_F[worstDow]}</strong> — needs an extra push`,
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
        text: `Your performance is <strong>rising steadily</strong> — second half is better by ${h2 - h1}% than the first`,
      });
    else if (h1 > h2 + 5)
      insights.push({
        icon: "info",
        text: `Strong start but <strong>performance dropped</strong> — finish the month strong`,
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
        text: `Best habit: <strong>${esc(bestH.name)}</strong> at ${bestP}%`,
      });
    if (worstH && worstP < 100 && worstH.id !== bestH?.id)
      insights.push({
        icon: "info",
        text: `Needs attention: <strong>${esc(worstH.name)}</strong> — ${worstP}% only`,
      });
    if (!insights.length)
      insights.push({
        icon: "zap",
        text: "Log your data and personalized insights will appear here.",
      });

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
        '<div class="empty">No habits yet.</div>';
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

  /* ══════════════════════════════════════════════════════
     GOALS
  ══════════════════════════════════════════════════════ */
  function renderGoals() {
    _renderGoalsSummary();
    _renderGoalsLineChart();
    _renderGoalsDonuts();
    _renderGoalsList();
  }

  function _renderGoalsSummary() {
    const types = ["weekly", "monthly", "yearly"];
    let html = "";
    types.forEach((t) => {
      const list = D.goals.filter((g) => g.type === t);
      const done = list.filter((g) => g.done).length,
        p = pct(done, list.length);
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

    document.getElementById("goals-legend").innerHTML = [
      "weekly",
      "monthly",
      "yearly",
    ]
      .map(
        (t) =>
          `<div class="gcl-item"><div class="gcl-dot" style="background:${G_CLR[t]}"></div>${G_LBL[t]}</div>`,
      )
      .join("");

    if (!datasets.length) {
      const wrap = document.getElementById("chart-goals");
      if (wrap)
        wrap.parentElement.querySelector(".chart-wrap").innerHTML =
          '<div class="empty">Add goals to see the chart.</div>';
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
              title: (items) => "Goal " + items[0].label,
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
              text: "Goal #",
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
              text: "Completion %",
              color: "#aaa",
              font: { family: FONT, size: 9 },
            },
          },
        },
      },
    });
  }

  function _renderGoalsDonuts() {
    ["weekly", "monthly", "yearly"].forEach((t) => {
      killChart(`donut-${t}`);
      const list = D.goals.filter((g) => g.type === t);
      const done = list.filter((g) => g.done).length,
        rem = list.length - done;
      const lbl = document.getElementById(`dlbl-${t}`);
      if (!list.length) {
        if (lbl) lbl.innerHTML = "<span>—</span><span>No goals</span>";
        return;
      }
      if (lbl) lbl.innerHTML = `${done}<span>${list.length} goals</span>`;
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
      { t: "yearly", lbl: "Yearly Goals", b: "Yearly" },
      { t: "monthly", lbl: "Monthly Goals", b: "Monthly" },
      { t: "weekly", lbl: "Weekly Goals", b: "Weekly" },
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
      html = '<div class="empty">No goals yet — use the buttons above.</div>';
    document.getElementById("goals-container").innerHTML = html;
  }

  function toggleGoal(id, v) {
    const g = D.goals.find((x) => x.id === id);
    if (g) {
      g.done = v;
      save();
      renderGoals();
      toast(v ? "✓ Goal done" : "○ Undone");
    }
  }
  function deleteGoal(id) {
    D.goals = D.goals.filter((x) => x.id !== id);
    save();
    renderGoals();
    toast("Goal deleted");
  }
  function openAddGoal(type) {
    const L = {
      weekly: "New Weekly Goal",
      monthly: "New Monthly Goal",
      yearly: "New Yearly Goal",
    };
    document.getElementById("goal-modal-title").textContent = L[type];
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
    toast("Goal added");
  }

  /* ══════════════════════════════════════════════════════
     HEATMAP
  ══════════════════════════════════════════════════════ */
  function renderHeatmap() {
    const y = +document.getElementById("hm-year").value;
    const hid = document.getElementById("hm-habit").value;
    let html = '<div class="hm-months">';
    for (let mo = 0; mo < 12; mo++) {
      const days = daysIn(y, mo),
        fd = new Date(y, mo, 1).getDay();
      html += `<div><div class="hm-month-title">${MONTHS_S[mo]}</div><div class="hm-grid">`;
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
        html += `<div class="hm-cell" style="background:${bg}" title="${MONTHS_S[mo]} ${d}: ${cnt}/${mx}"></div>`;
      }
      html += "</div></div>";
    }
    document.getElementById("heatmap-grid").innerHTML = html + "</div>";
  }

  /* ══════════════════════════════════════════════════════
     FOCUS MODE
  ══════════════════════════════════════════════════════ */
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
      `${DAYS_F[dow]}, ${d} ${MONTHS[m]} ${y}`;
    document.getElementById("focus-date-sub").textContent = isToday
      ? "Today"
      : "";

    const done = D.habits.filter((h) => isOn(y, m, h.id, d)).length,
      total = D.habits.length || 1;
    const p = pct(done, total),
      circ = 2 * Math.PI * 44,
      fill = circ * (1 - p / 100);

    let miniRows = "";
    D.habits.forEach((hb) => {
      const on = isOn(y, m, hb.id, d);
      miniRows += `<div class="focus-ring-prog-row">
        <div class="focus-ring-prog-label">${esc(hb.name)}</div>
        <div class="focus-ring-prog-bar"><div class="focus-ring-prog-fill" style="width:${on ? 100 : 0}%"></div></div>
      </div>`;
    });

    const ringTitle =
      p === 100
        ? "Perfect Day ✓"
        : p >= 75
          ? "Great Performance"
          : "Today's Progress";
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
          <div class="focus-ring-title">${ringTitle}</div>
          <div class="focus-ring-prog-wrap">${miniRows}</div>
        </div>
      </div>`;

    const q = QUOTES[d % QUOTES.length];
    document.getElementById("focus-banner").innerHTML =
      `<span style="opacity:.5;margin-left:6px">"</span>${q}<span style="opacity:.5;margin-right:6px">"</span>`;

    let hCards = '<div class="focus-habits-grid">';
    D.habits.forEach((hb) => {
      const on = isOn(y, m, hb.id, d),
        str = streakAt(hb.id, y, m, d);
      hCards += `<div class="focus-habit-card${on ? " done" : ""}" onclick="App.focusToggle(${y},${m},${hb.id},${d})">
        <div class="fhc-check">${on ? "✓" : ""}</div>
        <div class="fhc-info">
          <div class="fhc-name">${esc(hb.name)}</div>
          <div class="fhc-cat">${esc(CAT(hb.category))}</div>
          ${str > 1 ? `<div class="fhc-streak">${str}d streak</div>` : ""}
        </div>
      </div>`;
    });
    document.getElementById("focus-habits").innerHTML = hCards + "</div>";

    const noteKey = `${y}-${m}-${d}`;
    const ne = document.getElementById("focus-note");
    if (ne) ne.value = D.dayNotes[noteKey] || "";

    let tlHtml = '<div class="focus-tl">';
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(_focusDate);
      dt.setDate(dt.getDate() - i);
      const dy = dt.getFullYear(),
        dm = dt.getMonth(),
        dd2 = dt.getDate();
      const c = countDay(dy, dm, dd2),
        t = D.habits.length || 1;
      const barH = Math.max(2, Math.round((c / t) * 48)),
        isT = i === 0;
      tlHtml += `<div class="focus-tl-day${isT ? " today" : ""}">
        <div class="focus-tl-bar-wrap">
          <div class="focus-tl-bar" style="height:${barH}px;background:${isT ? "#111" : "#bbb"}"></div>
        </div>
        <div class="focus-tl-date">${DAYS_S[dt.getDay()]}<br>${dd2}</div>
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
    toast(D.checks[k] ? "✓ Done" : "○ Undone");
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

  /* ══════════════════════════════════════════════════════
     CSV EXPORT
  ══════════════════════════════════════════════════════ */
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
    toast("CSV exported");
  }

  /* ══════════════════════════════════════════════════════
     HABITS CRUD
  ══════════════════════════════════════════════════════ */
  function openAddHabitModal() {
    document.getElementById("habit-modal-title").textContent = "New Habit";
    document.getElementById("habit-submit-btn").textContent = "Add";
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
    toast("Habit added");
  }
  function openManage() {
    _buildManageList();
    _openModal("m-manage");
  }
  function _buildManageList() {
    let html = D.habits.length ? "" : '<div class="empty">No habits yet.</div>';
    D.habits.forEach((hb) => {
      html += `<div class="manage-row">
        <div class="manage-dot cat-${hb.category || "other"}"></div>
        <div class="manage-info">
          <div class="manage-name">${esc(hb.name)}</div>
          <div class="manage-meta">${esc(CAT(hb.category))} · ${esc(FREQ(hb.freq))} · ${hb.goal} d/mo${hb.reminder ? " · " + esc(hb.reminder) : ""}</div>
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
    toast("Changes saved");
  }
  function deleteHabit(id) {
    if (!confirm("Delete this habit and all its data?")) return;
    D.habits = D.habits.filter((h) => h.id !== id);
    Object.keys(D.checks).forEach((k) => {
      if (k.split("-")[2] === String(id)) delete D.checks[k];
    });
    save();
    _buildManageList();
    fillHmHabit();
    renderTracker();
    toast("Habit deleted");
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
    renderFocus,
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
    renderWeeklyTable,
    renderMonthlyTable,
    renderYearlyTable,
  };
})();
