/* ══════════════════════════════════════════════════════════
   MOBILE TRACKER — mob_tracker.js  (English-only, no i18n)
   Only active on ≤767px screens.
   Shows daily habit grid per card, plus live-updating
   Weekly / Monthly / Yearly summary sections below.
══════════════════════════════════════════════════════════ */
(function () {
  var DB_KEY = "habitTracker_v2";

  var MONTHS_FULL = [
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
  var MONTHS_S = [
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
  var CAT_LABELS = {
    health: "Health",
    learning: "Learning",
    fitness: "Fitness",
    mindfulness: "Mindfulness",
    productivity: "Productivity",
    other: "Other",
  };

  function catLabel(k) {
    return CAT_LABELS[k] || k;
  }

  /* ── Storage ── */
  function loadDB() {
    try {
      return JSON.parse(localStorage.getItem(DB_KEY)) || {};
    } catch (e) {
      return {};
    }
  }
  function saveDB(d) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(d));
    } catch (e) {}
  }
  function ck(y, m, hid, d) {
    return y + "-" + m + "-" + hid + "-" + d;
  }
  function isOn(data, y, m, hid, d) {
    return !!(data.checks || {})[ck(y, m, hid, d)];
  }
  function toggle(y, m, hid, d) {
    var data = loadDB();
    data.checks = data.checks || {};
    var k = ck(y, m, hid, d);
    if (data.checks[k]) delete data.checks[k];
    else data.checks[k] = 1;
    saveDB(data);
    return !!data.checks[k];
  }
  function daysInMonth(y, m) {
    return new Date(y, m + 1, 0).getDate();
  }
  function pct(n, d) {
    return d > 0 ? Math.min(Math.round((n / d) * 100), 100) : 0;
  }
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function countMonth(data, y, m, hid) {
    var c = 0;
    for (var d = 1; d <= daysInMonth(y, m); d++)
      if (isOn(data, y, m, hid, d)) c++;
    return c;
  }
  function countWeek(data, y, m, hid, w) {
    var s = (w - 1) * 7 + 1,
      e = Math.min(s + 6, daysInMonth(y, m)),
      c = 0;
    for (var d = s; d <= e; d++) if (isOn(data, y, m, hid, d)) c++;
    return { done: c, total: e - s + 1 };
  }
  function calcStreak(data, hid, y, m, d) {
    var cur = 0,
      td = d,
      tm = m,
      ty = y;
    for (var i = 0; i < 400; i++) {
      if (isOn(data, ty, tm, hid, td)) cur++;
      else break;
      td--;
      if (td < 1) {
        tm--;
        if (tm < 0) {
          tm = 11;
          ty--;
        }
        td = daysInMonth(ty, tm);
      }
      if (ty < 2020) break;
    }
    return cur;
  }
  function isMobile() {
    return window.innerWidth <= 767;
  }

  /* ── SVG ring ── */
  function ringHTML(p) {
    var r = 22,
      circ = 2 * Math.PI * r,
      off = circ * (1 - p / 100);
    return (
      '<svg viewBox="0 0 52 52" width="52" height="52">' +
      '<circle cx="26" cy="26" r="' +
      r +
      '" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="5"/>' +
      '<circle cx="26" cy="26" r="' +
      r +
      '" fill="none" stroke="#fff" stroke-width="5"' +
      ' stroke-linecap="round" stroke-dasharray="' +
      circ.toFixed(1) +
      '"' +
      ' stroke-dashoffset="' +
      off.toFixed(1) +
      '" transform="rotate(-90 26 26)"/></svg>' +
      '<div class="mt-ring-pct">' +
      p +
      "%</div>"
    );
  }

  /* ── Mini SVG bar chart ── */
  function miniBar(values, labels) {
    var W = 100,
      H = 40,
      pad = 2,
      n = values.length;
    var bw = Math.floor((W - pad * (n + 1)) / n);
    var mx = Math.max.apply(null, values.concat([1]));
    var svg =
      '<svg viewBox="0 0 ' +
      W +
      " " +
      H +
      '" width="100%" height="' +
      H +
      '" xmlns="http://www.w3.org/2000/svg">';
    for (var i = 0; i < n; i++) {
      var v = values[i],
        bh = Math.max(2, Math.round((v / mx) * (H - 12)));
      var x = pad + i * (bw + pad),
        y = H - bh - 8;
      svg +=
        '<rect x="' +
        x +
        '" y="' +
        y +
        '" width="' +
        bw +
        '" height="' +
        bh +
        '" rx="1" fill="rgba(17,17,17,' +
        (v === 0 ? "0.12" : "0.85") +
        ')"/>';
      if (labels && labels[i])
        svg +=
          '<text x="' +
          (x + bw / 2) +
          '" y="' +
          (H - 1) +
          '" text-anchor="middle" font-size="4.5" fill="#aaa" font-family="monospace">' +
          labels[i] +
          "</text>";
    }
    return svg + "</svg>";
  }

  /* ── Period cell helper ── */
  function periodCell(label, val, p, isCurrent) {
    var cls =
      p >= 100 ? "perfect" : p >= 50 ? "good" : p > 0 ? "partial" : "empty";
    if (isCurrent) cls += " current";
    return (
      '<div class="mt-period-cell ' +
      cls +
      '">' +
      '<div class="mt-pc-label">' +
      label +
      "</div>" +
      '<div class="mt-pc-val">' +
      val +
      "</div>" +
      '<div class="mt-pc-bar"><div class="mt-pc-fill" style="width:' +
      p +
      '%"></div></div></div>'
    );
  }

  /* ══════════════════════════════════════════════════════
     WEEKLY SECTION
  ══════════════════════════════════════════════════════ */
  function buildWeeklySection(data, y, m, habits) {
    var days = daysInMonth(y, m),
      numW = Math.ceil(days / 7);
    var html =
      '<div class="mt-section"><div class="mt-section-header">📊 Weekly Tracking</div>';
    for (var hi = 0; hi < habits.length; hi++) {
      var hb = habits[hi],
        values = [],
        labels = [];
      var total = 0;
      for (var w = 1; w <= numW; w++) {
        var r = countWeek(data, y, m, hb.id, w);
        values.push(pct(r.done, r.total));
        labels.push("W" + w);
        total += r.done;
      }
      var op = pct(total, days);
      html +=
        '<div class="mt-period-card">' +
        '<div class="mt-period-head">' +
        '<span class="mt-period-dot cat-' +
        esc(hb.category || "other") +
        '"></span>' +
        '<span class="mt-period-name">' +
        esc(hb.name) +
        "</span>" +
        '<span class="mt-period-pct">' +
        op +
        "%</span></div>" +
        '<div class="mt-period-chart">' +
        miniBar(values, labels) +
        "</div>" +
        '<div class="mt-period-cells">';
      for (var w2 = 1; w2 <= numW; w2++) {
        var r2 = countWeek(data, y, m, hb.id, w2),
          p2 = pct(r2.done, r2.total);
        html += periodCell("W" + w2, r2.done + "/" + r2.total, p2, false);
      }
      html += "</div></div>";
    }
    return html + "</div>";
  }

  /* ══════════════════════════════════════════════════════
     MONTHLY SECTION (last 6 months)
  ══════════════════════════════════════════════════════ */
  function buildMonthlySection(data, y, m, habits) {
    var months6 = [];
    for (var i = 5; i >= 0; i--) {
      var mm = m - i,
        yy = y;
      if (mm < 0) {
        mm += 12;
        yy--;
      }
      months6.push({ y: yy, m: mm });
    }
    var html =
      '<div class="mt-section"><div class="mt-section-header">📆 Monthly Tracking</div>';
    for (var hi = 0; hi < habits.length; hi++) {
      var hb = habits[hi],
        values = [],
        labels = [];
      for (var mi = 0; mi < months6.length; mi++) {
        var mo = months6[mi];
        values.push(pct(countMonth(data, mo.y, mo.m, hb.id), hb.goal || 30));
        labels.push(MONTHS_S[mo.m]);
      }
      var curPct = values[values.length - 1];
      html +=
        '<div class="mt-period-card">' +
        '<div class="mt-period-head">' +
        '<span class="mt-period-dot cat-' +
        esc(hb.category || "other") +
        '"></span>' +
        '<span class="mt-period-name">' +
        esc(hb.name) +
        "</span>" +
        '<span class="mt-period-pct">' +
        curPct +
        "%</span></div>" +
        '<div class="mt-period-chart">' +
        miniBar(values, labels) +
        "</div>" +
        '<div class="mt-period-cells">';
      for (var mi2 = 0; mi2 < months6.length; mi2++) {
        var mo2 = months6[mi2];
        var cnt = countMonth(data, mo2.y, mo2.m, hb.id),
          p2 = pct(cnt, hb.goal || 30);
        var isCur = mo2.y === y && mo2.m === m;
        html += periodCell(MONTHS_S[mo2.m], p2 + "%", p2, isCur);
      }
      html += "</div></div>";
    }
    return html + "</div>";
  }

  /* ══════════════════════════════════════════════════════
     YEARLY SECTION
  ══════════════════════════════════════════════════════ */
  function buildYearlySection(data, y, m, habits) {
    var html =
      '<div class="mt-section"><div class="mt-section-header">🗓 Yearly Tracking — ' +
      y +
      "</div>";
    for (var hi = 0; hi < habits.length; hi++) {
      var hb = habits[hi],
        values = [],
        labels = [];
      var tDone = 0,
        tGoal = 0;
      for (var mo = 0; mo < 12; mo++) {
        var cnt = countMonth(data, y, mo, hb.id),
          goal = hb.goal || 30;
        values.push(pct(cnt, goal));
        labels.push(MONTHS_S[mo].charAt(0));
        tDone += cnt;
        tGoal += goal;
      }
      var yp = pct(tDone, tGoal);
      html +=
        '<div class="mt-period-card">' +
        '<div class="mt-period-head">' +
        '<span class="mt-period-dot cat-' +
        esc(hb.category || "other") +
        '"></span>' +
        '<span class="mt-period-name">' +
        esc(hb.name) +
        "</span>" +
        '<span class="mt-period-pct">' +
        yp +
        "%</span></div>" +
        '<div class="mt-period-chart">' +
        miniBar(values, labels) +
        "</div>" +
        '<div class="mt-year-grid">';
      for (var mo2 = 0; mo2 < 12; mo2++) {
        var cnt2 = countMonth(data, y, mo2, hb.id),
          p2 = pct(cnt2, hb.goal || 30);
        var isCur = mo2 === m;
        var cls =
          p2 >= 100
            ? "perfect"
            : p2 >= 50
              ? "good"
              : p2 > 0
                ? "partial"
                : "empty";
        if (isCur) cls += " current";
        html +=
          '<div class="mt-year-cell ' +
          cls +
          '">' +
          '<div class="mt-yc-label">' +
          MONTHS_S[mo2].charAt(0) +
          "</div>" +
          '<div class="mt-yc-val">' +
          p2 +
          "%</div></div>";
      }
      html += "</div></div>";
    }
    return html + "</div>";
  }

  /* ══════════════════════════════════════════════════════
     MAIN RENDER
  ══════════════════════════════════════════════════════ */
  function render() {
    if (!isMobile()) return;
    var yEl = document.getElementById("sel-year"),
      mEl = document.getElementById("sel-month");
    if (!yEl || !mEl) return;
    var y = +yEl.value,
      m = +mEl.value,
      days = daysInMonth(y, m);
    var data = loadDB(),
      habits = data.habits || [];
    var now = new Date();
    var todayD =
      now.getFullYear() === y && now.getMonth() === m ? now.getDate() : -1;

    /* hide desktop table */
    var tbl = document.querySelector("#view-tracker .table-scroll");
    if (tbl) tbl.style.display = "none";
    var secs = document.querySelectorAll("#view-tracker .tracker-section");
    for (var si = 0; si < secs.length; si++) secs[si].style.display = "none";

    var wrap = document.getElementById("mob-tracker-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "mob-tracker-wrap";
      document.getElementById("view-tracker").appendChild(wrap);
    }

    /* monthly % */
    var mDone = 0,
      mTotal = 0;
    for (var hi = 0; hi < habits.length; hi++) {
      for (var d = 1; d <= days; d++) {
        mTotal++;
        if (isOn(data, y, m, habits[hi].id, d)) mDone++;
      }
    }
    var mPct = pct(mDone, mTotal);

    /* week bars */
    var wCount = Math.ceil(days / 7),
      weeks = [];
    for (var wi = 0; wi < wCount; wi++) {
      var s = wi * 7 + 1,
        e = Math.min(s + 6, days),
        wt = 0,
        wp = 0;
      for (var d2 = s; d2 <= e; d2++)
        for (var hj = 0; hj < habits.length; hj++) {
          wp++;
          if (isOn(data, y, m, habits[hj].id, d2)) wt++;
        }
      weeks.push(pct(wt, wp));
    }

    var html =
      '<div class="mt-banner">' +
      '<div class="mt-banner-left">' +
      '<div class="mt-banner-month">' +
      MONTHS_FULL[m] +
      " " +
      y +
      "</div>" +
      '<div class="mt-banner-sub">Habit Tracker</div>' +
      "</div>" +
      '<div class="mt-banner-ring">' +
      ringHTML(mPct) +
      "</div>" +
      "</div>" +
      '<div class="mt-weeks">';
    for (var wi2 = 0; wi2 < weeks.length; wi2++)
      html +=
        '<div class="mt-week-pill"><div class="mt-wp-label">W' +
        (wi2 + 1) +
        "</div>" +
        '<div class="mt-wp-bar"><div class="mt-wp-fill" style="width:' +
        weeks[wi2] +
        '%"></div></div>' +
        '<div class="mt-wp-pct">' +
        weeks[wi2] +
        "%</div></div>";
    html += "</div>";

    /* daily section */
    html +=
      '<div class="mt-section-header" style="margin-bottom:8px">📅 Daily Tracking</div>';

    if (!habits.length) {
      html +=
        '<div class="mt-empty">No habits yet — tap New Habit to get started.</div>';
    } else {
      for (var hi2 = 0; hi2 < habits.length; hi2++) {
        var hb = habits[hi2],
          cat = hb.category || "other",
          goal = hb.goal || 30;
        var cnt = countMonth(data, y, m, hb.id),
          p = pct(cnt, goal);
        var str = calcStreak(data, hb.id, y, m, todayD > 0 ? todayD : days);
        var cells = "";
        for (var d3 = 1; d3 <= days; d3++) {
          var on = isOn(data, y, m, hb.id, d3),
            isT = d3 === todayD;
          cells +=
            '<button class="mt-day' +
            (on ? " on" : "") +
            (isT ? " today" : "") +
            '"' +
            ' data-y="' +
            y +
            '" data-m="' +
            m +
            '" data-hid="' +
            hb.id +
            '" data-d="' +
            d3 +
            '"' +
            ' aria-label="' +
            d3 +
            " " +
            MONTHS_FULL[m] +
            '"><span class="mt-day-n">' +
            d3 +
            "</span></button>";
        }
        html +=
          '<div class="mt-card" data-hid="' +
          hb.id +
          '">' +
          '<div class="mt-card-head">' +
          '<div class="mt-card-dot cat-' +
          esc(cat) +
          '"></div>' +
          '<div class="mt-card-name">' +
          esc(hb.name) +
          "</div>" +
          '<div class="mt-card-badges">' +
          '<span class="mt-badge-cat">' +
          esc(catLabel(cat)) +
          "</span>" +
          (str > 1
            ? '<span class="mt-badge-streak">🔥 ' + str + "</span>"
            : "") +
          '<span class="mt-badge-pct">' +
          p +
          "%</span>" +
          "</div></div>" +
          '<div class="mt-prog-track"><div class="mt-prog-fill" style="width:' +
          p +
          '%"></div></div>' +
          '<div class="mt-prog-label">' +
          cnt +
          " of " +
          goal +
          " days</div>" +
          '<div class="mt-days-grid">' +
          cells +
          "</div></div>";
      }
      html += buildWeeklySection(data, y, m, habits);
      html += buildMonthlySection(data, y, m, habits);
      html += buildYearlySection(data, y, m, habits);
    }

    wrap.innerHTML = html;

    /* click handlers */
    var btns = wrap.querySelectorAll(".mt-day");
    for (var bi = 0; bi < btns.length; bi++) {
      (function (btn) {
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          var dy = +this.dataset.y,
            dm = +this.dataset.m,
            hid = +this.dataset.hid,
            dd = +this.dataset.d;
          var nowOn = toggle(dy, dm, hid, dd);
          this.classList.toggle("on", nowOn);
          if (typeof App !== "undefined" && App.toggleCell)
            App.toggleCell(dy, dm, hid, dd, {
              textContent: nowOn ? "✓" : "·",
              classList: {
                toggle: function () {},
                add: function () {},
                remove: function () {},
              },
            });
          render();
        });
      })(btns[bi]);
    }
  }

  /* ── hooks ── */
  function hook() {
    if (typeof App === "undefined") {
      setTimeout(hook, 80);
      return;
    }

    var origRender = App.renderTracker.bind(App);
    App.renderTracker = function () {
      origRender();
      render();
    };

    var origSubmit = App.submitHabit.bind(App);
    App.submitHabit = function () {
      origSubmit();
      if (isMobile()) setTimeout(render, 40);
    };

    var origDel = App.deleteHabit.bind(App);
    App.deleteHabit = function (id) {
      origDel(id);
      if (isMobile()) setTimeout(render, 40);
    };

    if (App.submitEditHabit) {
      var origEdit = App.submitEditHabit.bind(App);
      App.submitEditHabit = function () {
        origEdit();
        if (isMobile()) setTimeout(render, 40);
      };
    }

    var _t;
    window.addEventListener("resize", function () {
      clearTimeout(_t);
      _t = setTimeout(function () {
        var tb = document.querySelector("#view-tracker .table-scroll");
        var secs = document.querySelectorAll("#view-tracker .tracker-section");
        if (isMobile()) {
          if (tb) tb.style.display = "none";
          for (var i = 0; i < secs.length; i++) secs[i].style.display = "none";
          render();
        } else {
          if (tb) tb.style.display = "";
          for (var i = 0; i < secs.length; i++) secs[i].style.display = "";
          var w = document.getElementById("mob-tracker-wrap");
          if (w) w.style.display = "none";
        }
      }, 150);
    });

    render();
  }

  document.addEventListener("DOMContentLoaded", hook);
})();
