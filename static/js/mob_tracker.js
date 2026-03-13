/* ══════════════════════════════════════════════════════════
   MOBILE TRACKER — mob_tracker.js
   Original v3 design — bugs fixed:
   ① Checkmark shows as black dot  → removed <span> from button,
     day number comes from data-d via CSS attr()
   ② New habit needs reload        → hooks on submitHabit / deleteHabit
   ③ Toggle double-writes          → toggle() writes to storage once,
     App.toggleCell receives a dummy element (no double-write)
══════════════════════════════════════════════════════════ */
(function () {
  const DB_KEY = "habitTracker_v2";
  const MONTHS_AR = [
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
  const CAT_AR = {
    health: "الصحة",
    learning: "التعلم",
    fitness: "اللياقة",
    mindfulness: "التأمل",
    productivity: "الإنتاجية",
    other: "أخرى",
  };

  function loadDB() {
    try {
      return JSON.parse(localStorage.getItem(DB_KEY)) || {};
    } catch {
      return {};
    }
  }
  function saveDB(d) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(d));
    } catch {}
  }
  function getKey(y, m, hid, d) {
    return y + "-" + m + "-" + hid + "-" + d;
  }
  function isOn(data, y, m, hid, d) {
    return !!(data.checks || {})[getKey(y, m, hid, d)];
  }
  function toggle(y, m, hid, d) {
    const data = loadDB();
    data.checks = data.checks || {};
    const k = getKey(y, m, hid, d);
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
    let c = 0;
    for (let d = 1; d <= daysInMonth(y, m); d++)
      if (isOn(data, y, m, hid, d)) c++;
    return c;
  }
  function calcStreak(data, hid, y, m, d) {
    let cur = 0,
      td = d,
      tm = m,
      ty = y;
    for (let i = 0; i < 400; i++) {
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
      if (ty < 2026) break;
    }
    return cur;
  }
  function isMobile() {
    return window.innerWidth <= 767;
  }

  /* ── SVG ring ── */
  function ringHTML(p) {
    const r = 22,
      circ = 2 * Math.PI * r;
    const offset = circ * (1 - p / 100);
    return (
      '<svg viewBox="0 0 52 52" width="52" height="52">' +
      '<circle cx="26" cy="26" r="' +
      r +
      '" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="5"/>' +
      '<circle cx="26" cy="26" r="' +
      r +
      '" fill="none" stroke="#fff" stroke-width="5"' +
      ' stroke-linecap="round"' +
      ' stroke-dasharray="' +
      circ.toFixed(1) +
      '"' +
      ' stroke-dashoffset="' +
      offset.toFixed(1) +
      '"' +
      ' transform="rotate(-90 26 26)"/>' +
      "</svg>" +
      '<div class="mt-ring-pct">' +
      p +
      "%</div>"
    );
  }

  /* ══════════════════════════════════════════
     MAIN RENDER
  ══════════════════════════════════════════ */
  function render() {
    if (!isMobile()) return;

    const yEl = document.getElementById("sel-year");
    const mEl = document.getElementById("sel-month");
    if (!yEl || !mEl) return;

    const y = +yEl.value;
    const m = +mEl.value;
    const days = daysInMonth(y, m);
    const data = loadDB();
    const habits = data.habits || [];

    const now = new Date();
    const todayD =
      now.getFullYear() === y && now.getMonth() === m ? now.getDate() : -1;

    /* hide desktop table */
    const tableWrap = document.querySelector("#view-tracker .table-scroll");
    if (tableWrap) tableWrap.style.display = "none";

    /* get or create wrapper */
    let wrap = document.getElementById("mob-tracker-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "mob-tracker-wrap";
      document.getElementById("view-tracker").appendChild(wrap);
    }

    /* month % */
    let mDone = 0,
      mTotal = 0;
    habits.forEach((hb) => {
      for (let d = 1; d <= days; d++) {
        mTotal++;
        if (isOn(data, y, m, hb.id, d)) mDone++;
      }
    });
    const mPct = pct(mDone, mTotal);

    /* week stats */
    const wCount = Math.ceil(days / 7);
    const weeks = [];
    for (let w = 0; w < wCount; w++) {
      const s = w * 7 + 1,
        e = Math.min(s + 6, days);
      let wt = 0,
        wp = 0;
      for (let d = s; d <= e; d++)
        habits.forEach((hb) => {
          wp++;
          if (isOn(data, y, m, hb.id, d)) wt++;
        });
      weeks.push(pct(wt, wp));
    }

    /* ── build HTML ── */
    let html =
      '<div class="mt-banner">' +
      '<div class="mt-banner-left">' +
      '<div class="mt-banner-month">' +
      MONTHS_AR[m] +
      " " +
      y +
      "</div>" +
      '<div class="mt-banner-sub">Habit Tracker</div>' +
      "</div>" +
      '<div class="mt-banner-ring">' +
      ringHTML(mPct) +
      "</div>" +
      "</div>" +
      '<div class="mt-weeks">' +
      weeks
        .map(function (p, i) {
          return (
            '<div class="mt-week-pill">' +
            '<div class="mt-wp-label">W' +
            (i + 1) +
            "</div>" +
            '<div class="mt-wp-bar"><div class="mt-wp-fill" style="width:' +
            p +
            '%"></div></div>' +
            '<div class="mt-wp-pct">' +
            p +
            "%</div>" +
            "</div>"
          );
        })
        .join("") +
      "</div>";

    if (!habits.length) {
      html +=
        '<div class="mt-empty">لا توجد عادات بعد<br><span>اضغط عادة جديدة للبدء</span></div>';
    } else {
      habits.forEach(function (hb) {
        const cat = hb.category || "other";
        const goal = hb.goal || 30;
        const cnt = countMonth(data, y, m, hb.id);
        const p2 = pct(cnt, goal);
        const str = calcStreak(data, hb.id, y, m, todayD > 0 ? todayD : days);

        /* ── day buttons ──
           FIX: button has NO children — day number shown via CSS attr(data-d)
           This prevents the black-dot bug caused by <span> children
           conflicting with ::after checkmark
        */
        let daysCells = "";
        for (let d = 1; d <= days; d++) {
          const on = isOn(data, y, m, hb.id, d);
          const isToday = d === todayD;
          daysCells +=
            '<button class="mt-day' +
            (on ? " on" : "") +
            (isToday ? " today" : "") +
            '"' +
            ' data-y="' +
            y +
            '" data-m="' +
            m +
            '" data-hid="' +
            hb.id +
            '" data-d="' +
            d +
            '"' +
            ' aria-label="' +
            d +
            " " +
            MONTHS_AR[m] +
            '">' +
            /* NO children here — number comes from CSS attr(data-d) */
            "</button>";
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
          esc(CAT_AR[cat] || "") +
          "</span>" +
          (str > 1
            ? '<span class="mt-badge-streak">🔥 ' + str + "</span>"
            : "") +
          '<span class="mt-badge-pct">' +
          p2 +
          "%</span>" +
          "</div>" +
          "</div>" +
          '<div class="mt-prog-track"><div class="mt-prog-fill" style="width:' +
          p2 +
          '%"></div></div>' +
          '<div class="mt-prog-label">' +
          cnt +
          " من " +
          goal +
          " يوم</div>" +
          '<div class="mt-days-grid">' +
          daysCells +
          "</div>" +
          "</div>";
      });
    }

    wrap.innerHTML = html;

    /* ── click handlers ── */
    wrap.querySelectorAll(".mt-day").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        const dy = +this.dataset.y;
        const dm = +this.dataset.m;
        const hid = +this.dataset.hid;
        const dd = +this.dataset.d;

        /* write to storage once */
        const nowOn = toggle(dy, dm, hid, dd);

        /* instant visual feedback */
        this.classList.toggle("on", nowOn);

        /* notify App (toast, live row) — dummy element so App doesn't crash */
        if (typeof App !== "undefined" && App.toggleCell) {
          App.toggleCell(dy, dm, hid, dd, {
            textContent: nowOn ? "✓" : "·",
            classList: {
              toggle: function () {},
              add: function () {},
              remove: function () {},
            },
          });
        }

        /* full re-render for accurate stats */
        render();
      });
    });
  }

  /* ── hooks ── */
  function hook() {
    if (typeof App === "undefined") {
      setTimeout(hook, 80);
      return;
    }

    const origRender = App.renderTracker.bind(App);
    App.renderTracker = function () {
      origRender();
      render();
    };

    const origSubmit = App.submitHabit.bind(App);
    App.submitHabit = function () {
      origSubmit();
      if (isMobile()) setTimeout(render, 40);
    };

    const origDel = App.deleteHabit.bind(App);
    App.deleteHabit = function (id) {
      origDel(id);
      if (isMobile()) setTimeout(render, 40);
    };

    if (App.submitEditHabit) {
      const origEdit = App.submitEditHabit.bind(App);
      App.submitEditHabit = function () {
        origEdit();
        if (isMobile()) setTimeout(render, 40);
      };
    }

    let _t;
    window.addEventListener("resize", function () {
      clearTimeout(_t);
      _t = setTimeout(function () {
        const t = document.querySelector("#view-tracker .table-scroll");
        if (isMobile()) {
          if (t) t.style.display = "none";
          render();
        } else {
          if (t) t.style.display = "";
          const w = document.getElementById("mob-tracker-wrap");
          if (w) w.style.display = "none";
        }
      }, 150);
    });

    render();
  }

  document.addEventListener("DOMContentLoaded", hook);
})();
