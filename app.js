(function () {
  'use strict';

  const CFG = window.AGENDA_CONFIG || {};
  const CLASS_NAME = String(CFG.className || 'IBDP2').slice(0, 20);
  const LIVE = !!(CFG.supabaseUrl && CFG.supabaseKey);

  const FAMS = {
    core: { label: 'Core', levels: false },
    lang: { label: 'Languages', levels: true },
    soc: { label: 'Individuals & societies', levels: true },
    sci: { label: 'Sciences', levels: true },
    math: { label: 'Maths', levels: true },
    school: { label: 'School', levels: false }
  };
  const FAM_ORDER = ['core', 'lang', 'soc', 'sci', 'math', 'school'];
  const KINDS = { hw: 'Homework', test: 'Test', deadline: 'Deadline', event: 'Event', reminder: 'Reminder' };
  const KIND_ORDER = ['hw', 'test', 'deadline', 'event', 'reminder'];
  const KIND_HINT = { hw: 'Exercises 24 to 30, page 404', test: 'Paper 1 mock', deadline: 'IA final draft', event: 'Parent orientation', reminder: 'Bring lab coats' };
  const VIEWS = ['week', 'month', 'upcoming'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const STICKY_TILT = [-2.4, 1.8, -1.2, 2.6];
  const THEMES = [['classic', 'Classic (follows light or dark mode)'], ['white', 'White'], ['blue', 'Blue']];
  const THEME_DESK = { classic: '', white: '#F4F5F7', blue: '#6271BB' };
  const THEME_KEY = 'agenda:theme';
  const ME_KEY = 'agenda:' + CLASS_NAME + ':me:v2';
  const DEMO_KEY = 'agenda:' + CLASS_NAME + ':demo:v2';

  // Starting data for preview mode. The real database gets the same rows from supabase-setup.sql.
  const SEED_SUBJECTS = [
    ['tok', 'Theory of Knowledge', 'TOK', 'TOK', 'core', 1],
    ['cas', 'Creativity, Activity, Service', 'CAS', 'CAS', 'core', 2],
    ['ee', 'Extended Essay', 'EE', 'EE', 'core', 3],
    ['eng', 'English Language & Literature', 'English', 'ENG', 'lang', 1],
    ['ara', 'Arabic Language', 'Arabic', 'ARA', 'lang', 2],
    ['bm', 'Business Management', 'Business', 'BM', 'soc', 1],
    ['ds', 'Digital Society', 'Digital Society', 'DS', 'soc', 2],
    ['phy', 'Physics', 'Physics', 'PHY', 'sci', 1],
    ['bio', 'Biology', 'Biology', 'BIO', 'sci', 2],
    ['chem', 'Chemistry', 'Chemistry', 'CHEM', 'sci', 3],
    ['cs', 'Computer Science', 'Computer Science', 'CS', 'sci', 4],
    ['maa', 'Maths: Analysis & Approaches', 'Maths AA', 'MAA', 'math', 1],
    ['mai', 'Maths: Applications & Interpretation', 'Maths AI', 'MAI', 'math', 2],
    ['civ', 'Civics', 'Civics', 'CIV', 'school', 1],
    ['class', 'Whole class', 'Class', 'CLASS', 'school', 999]
  ].map(function (r) { return { id: r[0], name: r[1], short: r[2], code: r[3], fam: r[4], sort: r[5] }; });
  const SEED_ITEMS = [
    ['cas', 'hw', 'Pizza ingredients', 'Continue filling out the feedback sheet.', '2026-10-27', false],
    ['tok', 'hw', 'Exhibition presentation', 'Finish your three-minute presentation about your exhibition project. More details on IB News!', '2026-10-28', false],
    ['ara', 'hw', 'Activity 6 and the first 8 lines', 'Do activity 6 in the poem (more details on IB News), and memorise the first 8 lines of the poem.', '2026-10-28', true],
    ['phy', 'hw', 'Exercises 24 to 30 and 35 to 37', 'Prepare the exercises on pages 404 to 406.', '2026-10-28', false],
    ['civ', 'hw', 'Civics homework', 'Check the groups for more info (no one’s doing it).', '2026-10-28', false],
    ['class', 'event', 'Parent orientation', 'Check ibdp2 for more info.', '2026-10-28', false]
  ].map(function (r) { return { subject: r[0], kind: r[1], title: r[2], notes: r[3], start_date: r[4], end_date: null, at_time: null, place: '', level: '', important: r[5] }; });

  // ---------- hand-drawn marks ----------
  function icon(d, vb) {
    return '<svg viewBox="' + (vb || '0 0 24 24') + '" aria-hidden="true"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  const I = {
    plus: icon('M12 4.5c.2 5 .1 10-.1 15M4.6 12.2c5-.2 10-.1 14.8.1'),
    close: icon('M5.5 5.8c4.3 4 8.5 8.2 12.8 12.6M18.4 5.4c-4.4 4.3-8.6 8.6-12.9 13'),
    left: icon('M26 16.4c-6.6-.4-13.3-.5-19.6 0M12.6 9.6c-2.4 2.3-4.5 4.4-6.6 6.7 2.3 2.2 4.4 4.3 6.8 6.9', '0 0 32 32'),
    right: icon('M6 15.8c6.6.4 13.2.5 19.6-.1M19.3 9.3c2.4 2.3 4.6 4.4 6.6 6.5-2.2 2.3-4.4 4.5-6.8 6.9', '0 0 32 32'),
    copy: icon('M8.5 8.8c3.6-.2 7.3-.2 10.8 0 .3 3.6.3 7.3 0 10.9-3.6.3-7.2.3-10.8 0-.3-3.6-.3-7.3 0-10.9zM15.4 5.6c-.1-.6-.2-1-.3-1.3-3.4-.2-6.8-.2-10.2 0-.3 3.4-.3 6.8 0 10.2.4.1.8.2 1.4.3'),
    filter: icon('M4 6.6c5.4-.3 10.8-.3 16 .1M6.6 12.2c3.6-.2 7.2-.2 10.8 0M9.6 17.6c1.6-.1 3.2-.1 4.8 0'),
    search: icon('M10.5 4.2c3.6-.3 6.4 2.5 6.3 5.9-.1 3.4-2.9 6-6.3 5.9-3.4-.1-6-2.9-5.9-6.2.1-3 2.6-5.4 5.9-5.6zM15.2 15.3c1.6 1.5 3.1 3 4.6 4.5'),
    cal: icon('M4.6 6.4c4.9-.3 9.9-.3 14.8 0 .3 4.5.3 9 0 13.4-4.9.3-9.9.3-14.8 0-.3-4.5-.3-8.9 0-13.4zM4.8 10.4c4.8-.2 9.6-.2 14.4 0M8.4 3.8v4M15.6 3.8v4'),
    download: icon('M12 4c.1 4.6.1 9 0 12M7.6 11.8c1.5 1.5 2.9 2.9 4.4 4.4 1.5-1.5 2.9-2.9 4.4-4.5M5 19.8c4.6.2 9.4.2 14 0'),
    pencil: icon('M15.6 4.8l3.6 3.6L8.6 19l-4.4.9.8-4.5zM13.4 7l3.6 3.6'),
    lock: icon('M6.2 10.6c3.9-.2 7.8-.2 11.6 0 .2 3 .2 6 0 9-3.9.2-7.8.2-11.6 0-.2-3-.2-6 0-9zM8.6 10.4c-.2-2.6.6-5.6 3.4-5.6s3.7 2.9 3.4 5.6')
  };
  const CIRCLE = '<svg class="circle" viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true"><path pathLength="100" d="M14 31C7 17 31 6 58 7c27 1 40 11 37 23-3 12-31 17-55 15C17 43 4 35 10 22c3-6 11-11 19-13"/></svg>';
  const RING = '<svg viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true"><path pathLength="100" d="M14 31C7 17 31 6 58 7c27 1 40 11 37 23-3 12-31 17-55 15C17 43 4 35 10 22c3-6 11-11 19-13"/></svg>';
  const TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="box" d="M4.6 5.3c4.6-.6 9.4-.7 14.6-.3.4 4.7.3 9.6-.1 14.4-4.8.4-9.7.4-14.5-.1-.4-4.6-.4-9.4 0-14z"/><path class="mark" pathLength="100" d="M6.8 12.6c1.3 1.4 2.6 2.9 3.8 4.4 2.9-4.6 6.3-9.3 10.6-13.6"/></svg>';
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.5l6-.7z"/></svg>';
  const CHEV = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5c2.4 2.2 4.6 4.3 6.6 6.5-2 2.2-4.2 4.3-6.6 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const SHARE_ICON = icon('M15.8 6.8c-3 1.5-5.8 3.2-8.4 5.2 2.6 1.9 5.4 3.6 8.4 5.2M18 4.2a2 2 0 1 1-.1 4 2 2 0 0 1 .1-4zM18 15.8a2 2 0 1 1-.1 4 2 2 0 0 1 .1-4zM6 10a2 2 0 1 1-.1 4 2 2 0 0 1 .1-4z');

  function choice(name, value, label) {
    const id = name + '-' + (value || 'all');
    return '<label class="choice" for="' + id + '"><input type="radio" name="' + name + '" id="' + id + '" value="' + value + '"><span>' + label + RING + '</span></label>';
  }
  function closeBtn() { return '<button type="button" class="x-btn" data-close aria-label="Close">' + I.close + '</button>'; }
  function themePicker() {
    return '<div class="themes" role="group" aria-label="Theme"><span class="themes-label">theme</span>' + THEMES.map(function (t) {
      return '<button type="button" class="swatch sw-' + t[0] + '" data-theme-pick="' + t[0] + '" title="' + t[1] + '" aria-label="' + t[1] + ' theme" aria-pressed="false"><i></i>' + RING + '</button>';
    }).join('') + '</div>';
  }

  const SHELL =
    '<header class="masthead">' +
      '<div class="brand"><h1 class="wordmark"><span class="wm-class" id="wm-class"></span><span class="wm-script">agenda<svg viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true"><path pathLength="100" d="M4 12C50 4 120 18 196 7"/></svg></span></h1>' +
      '<p class="tagline">Everything the class has coming up: homework, tests, deadlines, events and reminders.</p></div>' +
      '<div class="actions">' +
        '<label class="search" for="search">' + I.search + '<input id="search" type="search" placeholder="Search the agenda" autocomplete="off" enterkeyhint="search"></label>' +
        '<button type="button" class="tool" id="btn-copy" aria-label="Copy for chat">' + I.copy + '<span class="wide-label">Copy for chat</span><span class="narrow-label">Copy</span></button>' +
        '<button type="button" class="tool" id="btn-subjects" aria-label="My subjects">' + I.filter + '<span class="wide-label">My subjects</span><span class="narrow-label">Subjects</span></button>' +
        '<button type="button" class="pen-btn" id="btn-add">' + I.plus + '<span>Add to agenda</span></button>' +
      '</div>' +
    '</header>' +
    '<section class="upnext" id="upnext" aria-label="Up next" hidden></section>' +
    '<div class="book">' +
      '<div class="tabs" role="tablist" aria-label="View">' +
        '<button type="button" class="tab-btn" role="tab" id="v-week">Week</button>' +
        '<button type="button" class="tab-btn" role="tab" id="v-month">Month</button>' +
        '<button type="button" class="tab-btn" role="tab" id="v-upcoming">Coming up</button>' +
        themePicker() +
      '</div>' +
      '<div class="notebook">' +
        '<div class="nb-bar">' +
          '<div class="period">' +
            '<button type="button" class="arrow" id="prev">' + I.left + '</button>' +
            '<div class="period-label" aria-live="polite"><span class="pl-main" id="pl-main"></span><span class="pl-sub" id="pl-sub"></span></div>' +
            '<button type="button" class="arrow" id="next">' + I.right + '</button>' +
            '<button type="button" class="today-btn" id="btn-today">today</button>' +
          '</div>' +
          '<div class="summary" id="summary" aria-live="polite"><b id="sum-count"></b><span id="sum-label"></span></div>' +
        '</div>' +
        '<div class="margin-notes" id="notes"></div>' +
        '<main id="main" class="main"></main>' +
      '</div>' +
    '</div>' +
    '<footer class="foot">' +
      '<div class="foot-left"><span class="live-dot" id="live"></span><span id="foot-updated"></span></div>' +
      '<div class="foot-right"><button type="button" class="tool" id="btn-history">History of changes</button><span id="foot-editor"></span>' + themePicker() + '</div>' +
    '</footer>' +
    '<button type="button" class="pen-btn fab" id="fab" aria-label="Add to agenda">' + I.plus + '</button>' +
    '<div class="toast" id="toast" role="status" aria-live="polite"></div>' +

    '<dialog class="sheet" id="composer" aria-labelledby="c-heading"><form class="dlg" id="c-form" novalidate>' +
      '<div class="dlg-head"><h2 id="c-heading">New entry</h2>' + closeBtn() + '</div>' +
      '<div class="dlg-body">' +
        '<fieldset><legend>What is it?</legend><div class="choices" id="c-kinds">' + KIND_ORDER.map(function (k) { return choice('c-kind', k, KINDS[k].toLowerCase()); }).join('') + '</div></fieldset>' +
        '<fieldset><legend>Subject</legend><div class="tab-pick" id="c-subjects"></div></fieldset>' +
        '<div class="field"><label for="c-title">Title</label><input id="c-title" class="hand-input" maxlength="120" autocomplete="off"></div>' +
        '<fieldset><legend>When</legend><div class="choices" id="c-days"></div>' +
          '<div class="row-3" style="margin-top:12px">' +
            '<div class="field"><label for="c-date">Date</label><input type="date" id="c-date"></div>' +
            '<div class="field"><label for="c-end">Until (optional)</label><input type="date" id="c-end"></div>' +
            '<div class="field"><label for="c-time">Time (optional)</label><input type="time" id="c-time"></div>' +
          '</div></fieldset>' +
        '<div class="field"><label for="c-place">Where (optional)</label><input id="c-place" maxlength="80" autocomplete="off" placeholder="Room, lab, auditorium"></div>' +
        '<fieldset id="c-level-wrap"><legend>Who it’s for</legend><div class="choices">' + choice('c-level', '', 'everyone') + choice('c-level', 'HL', 'HL only') + choice('c-level', 'SL', 'SL only') + '</div></fieldset>' +
        '<label class="star" for="c-important"><input type="checkbox" id="c-important">' + STAR + '<span class="hl-text">Mark as important</span></label>' +
        '<div class="field"><label for="c-notes">Notes (optional)</label><textarea id="c-notes" class="lined" rows="3" maxlength="1000" placeholder="Pages, links, what to bring"></textarea></div>' +
      '</div>' +
      '<p class="form-error" id="c-error" role="alert"></p>' +
      '<div class="dlg-foot"><button type="button" class="tool" id="c-delete" hidden>Delete</button><span class="grow"></span><button type="button" class="tool" data-close>Cancel</button><button type="submit" class="pen-btn" id="c-save">Add to agenda</button></div>' +
    '</form></dialog>' +

    '<dialog class="sheet" id="detail" aria-labelledby="d-title"><div class="dlg" id="d-body"></div></dialog>' +

    '<dialog class="sheet narrow" id="unlock" aria-labelledby="u-title"><form class="dlg" id="u-form" novalidate>' +
      '<div class="dlg-head"><h2 id="u-title">Write in the agenda</h2>' + closeBtn() + '</div>' +
      '<div class="dlg-body">' +
        '<p class="dlg-lead" id="u-lead"></p>' +
        '<div class="field"><label for="u-name">Your name</label><input id="u-name" class="hand-input" maxlength="40" autocomplete="given-name"></div>' +
        '<div class="field" id="u-code-wrap"><label for="u-code">Class code</label><input id="u-code" type="password" maxlength="80" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="From the group chat"></div>' +
      '</div>' +
      '<p class="form-error" id="u-error" role="alert"></p>' +
      '<div class="dlg-foot"><span class="grow"></span><button type="button" class="tool" data-close>Cancel</button><button type="submit" class="pen-btn" id="u-save">Unlock</button></div>' +
    '</form></dialog>' +

    '<dialog class="sheet" id="subjects" aria-labelledby="s-title"><div class="dlg">' +
      '<div class="dlg-head"><h2 id="s-title">My subjects</h2>' + closeBtn() + '</div>' +
      '<div class="dlg-body"><p class="dlg-lead">Tick what you take and circle your level. Everything for other subjects gets hidden, and HL-only or SL-only entries follow your level. Saved on this device only.</p>' +
        '<div class="s-list" id="s-list"></div>' +
        '<details class="add-subject" id="s-add-wrap" hidden><summary>' + CHEV + 'A subject is missing from the list</summary>' +
          '<form class="s-add" id="s-add" novalidate>' +
            '<div class="field"><label for="s-name">Subject name</label><input id="s-name" maxlength="60" autocomplete="off" placeholder="Economics"></div>' +
            '<div class="field"><label for="s-code">Short code</label><input id="s-code" maxlength="6" autocomplete="off" placeholder="ECON"></div>' +
            '<div class="field"><label for="s-fam">Group</label><select id="s-fam">' + FAM_ORDER.map(function (f) { return '<option value="' + f + '">' + FAMS[f].label.replace('&', '&amp;') + '</option>'; }).join('') + '</select></div>' +
            '<button type="submit" class="pen-btn" id="s-save">Add for everyone</button>' +
            '<p class="form-error" id="s-error" role="alert"></p>' +
          '</form></details>' +
      '</div>' +
      '<div class="dlg-foot"><button type="button" class="tool" id="s-all">Show every subject</button><span class="grow"></span><button type="button" class="pen-btn" data-close>Done</button></div>' +
    '</div></dialog>' +

    '<dialog class="sheet" id="history" aria-labelledby="h-title"><div class="dlg">' +
      '<div class="dlg-head"><h2 id="h-title">History of changes</h2>' + closeBtn() + '</div>' +
      '<div class="dlg-body" id="h-body"></div>' +
    '</div></dialog>' +

    '<dialog class="sheet" id="share" aria-labelledby="sh-title"><div class="dlg">' +
      '<div class="dlg-head"><h2 id="sh-title">Send to the group chat</h2>' + closeBtn() + '</div>' +
      '<div class="dlg-body">' +
        '<div class="two">' +
          '<fieldset><legend>What to send</legend><div class="choices" id="sh-range">' + choice('sh-range', 'week', 'this week') + choice('sh-range', 'next', 'next 2 weeks') + choice('sh-range', 'month', 'this month') + '</div></fieldset>' +
          '<fieldset><legend>Style</legend><div class="choices" id="sh-style">' + choice('sh-style', 'short', 'short') + choice('sh-style', 'notes', 'with notes') + '</div></fieldset>' +
        '</div>' +
        '<div class="chat" aria-label="Message preview"><div class="bubble" id="sh-bubble"><div id="sh-preview"></div><span class="bubble-meta" id="sh-meta">now <b>✓</b></span></div></div>' +
        '<textarea id="sh-text" rows="8" readonly hidden></textarea>' +
        '<p class="hint-line" id="sh-hint" hidden>Copying straight to the clipboard was blocked here. The message is selected above, so copy it with your keyboard or a long press.</p>' +
      '</div>' +
      '<div class="dlg-foot"><span class="grow"></span><button type="button" class="tool" id="sh-native" hidden>' + SHARE_ICON + '<span>Share…</span></button><button type="button" class="pen-btn" id="sh-copy">' + I.copy + '<span>Copy message</span></button></div>' +
    '</div></dialog>' +

    '<dialog class="sheet" id="copy-dlg" aria-labelledby="cp-title"><div class="dlg">' +
      '<div class="dlg-head"><h2 id="cp-title">Copy for the group chat</h2>' + closeBtn() + '</div>' +
      '<div class="dlg-body"><p class="dlg-lead">Copying straight to the clipboard was blocked here. The text is selected below, so copy it with your keyboard or a long press.</p><textarea id="cp-text" rows="12" readonly></textarea></div>' +
    '</div></dialog>';

  // ---------- small helpers ----------
  const $ = function (s) { return document.querySelector(s); };
  const hasOwn = function (o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); };
  function h(tag, props) {
    const el = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      const v = props[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'onclick') el.addEventListener('click', v);
      else el.setAttribute(k, v === true ? '' : String(v));
    });
    for (let i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; }
    el.append(c.nodeType ? c : String(c));
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
  function fail(code) { const e = new Error(code); e.code = code; return e; }
  function str(v, max) { return typeof v === 'string' ? v.slice(0, max) : ''; }

  // ---------- dates ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { const p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function mondayOf(d) { return addDays(d, -((d.getDay() + 6) % 7)); }
  function diffDays(a, b) {
    const x = parse(a), y = parse(b);
    return Math.round((Date.UTC(y.getFullYear(), y.getMonth(), y.getDate()) - Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())) / 864e5);
  }
  function isoWeek(d) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - y0) / 864e5 + 1) / 7);
  }
  function fmtDay(d) { return DOW[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate(); }
  function fmtShort(d) { return MON[d.getMonth()] + ' ' + d.getDate(); }
  function fmtTime(t) {
    if (!t) return '';
    const p = t.split(':');
    try { return new Date(2000, 0, 1, +p[0], +p[1]).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } catch (e) { return t; }
  }
  function relLabel(key) {
    const n = diffDays(today, key);
    if (n === 0) return 'today';
    if (n === 1) return 'tomorrow';
    if (n === -1) return 'yesterday';
    return n > 1 ? 'in ' + n + ' days' : -n + ' days ago';
  }
  function ago(iso) {
    const t = Date.parse(iso);
    if (!t) return '';
    const s = (Date.now() - t) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) { const hh = Math.floor(s / 3600); return hh + (hh === 1 ? ' hour ago' : ' hours ago'); }
    const dd = Math.floor(s / 86400);
    if (dd < 30) return dd + (dd === 1 ? ' day ago' : ' days ago');
    return 'on ' + fmtShort(new Date(t));
  }
  const isDate = function (s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parse(s)); };
  const isTime = function (s) { return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s); };

  // ---------- items ----------
  function lastDay(it) { return it.end || it.start; }
  function onDay(it, key) { return key >= it.start && key <= lastDay(it); }
  function overlaps(it, a, b) { return it.start <= b && lastDay(it) >= a; }
  function sortDay(a, b) {
    if (!!a.time !== !!b.time) return a.time ? 1 : -1;
    if (a.time !== b.time) return a.time < b.time ? -1 : 1;
    return (order[a.subject] || 0) - (order[b.subject] || 0) || a.title.localeCompare(b.title);
  }
  function byStart(a, b) { return a.start < b.start ? -1 : a.start > b.start ? 1 : sortDay(a, b); }
  function whenText(it) {
    let s = it.end ? fmtDay(parse(it.start)) + ' to ' + fmtDay(parse(it.end)) : fmtDay(parse(it.start));
    if (it.time) s += ', ' + fmtTime(it.time);
    return s;
  }

  // ---------- backends ----------
  // Live: Supabase. Reads are public; every change is a database function that checks the class code.
  function liveBackend() {
    if (!window.supabase || !window.supabase.createClient) {
      // The database library didn't load (offline, or the CDN is blocked): show the connection error, never preview data.
      const no = function () { return Promise.reject(fail('offline')); };
      return { live: true, load: no, history: no, itemHistory: no, checkCode: no, addItem: no, updateItem: no, deleteItem: no, restoreItem: no, addSubject: no, subscribe: function (a, onStatus) { onStatus(false); } };
    }
    const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    function toErr(error) {
      const m = String((error && (error.message || error.details)) || '');
      const known = ['wrong_code', 'not_found', 'already_restored', 'subject_exists', 'missing_name'];
      for (let i = 0; i < known.length; i++) if (m.indexOf(known[i]) >= 0) return fail(known[i]);
      return fail(/fetch|network|load failed/i.test(m) ? 'offline' : 'error');
    }
    async function rpc(name, args) {
      const res = await sb.rpc(name, args);
      if (res.error) throw toErr(res.error);
      return res.data;
    }
    async function all(table, col) {
      const out = [], size = 1000;
      for (let from = 0; ; from += size) {
        const res = await sb.from(table).select('*').order(col, { ascending: true }).order('id', { ascending: true }).range(from, from + size - 1);
        if (res.error) throw toErr(res.error);
        out.push.apply(out, res.data);
        if (res.data.length < size) return out;
      }
    }
    function itemArgs(code, f, by) {
      return {
        p_code: code, p_subject: f.subject, p_kind: f.kind, p_title: f.title, p_notes: f.notes,
        p_start: f.start, p_end: f.end || null, p_time: f.time || null, p_place: f.place, p_level: f.level, p_important: f.important, p_by: by
      };
    }
    return {
      live: true,
      load: async function () {
        const r = await Promise.all([all('subjects', 'sort'), all('items', 'start_date')]);
        return { subjects: r[0], items: r[1] };
      },
      history: async function (n) {
        const res = await sb.from('changes').select('*').order('at', { ascending: false }).limit(n);
        if (res.error) throw toErr(res.error);
        return res.data;
      },
      itemHistory: async function (id) {
        const res = await sb.from('changes').select('*').eq('item_id', id).order('at', { ascending: false }).order('id', { ascending: false }).limit(40);
        if (res.error) throw toErr(res.error);
        return res.data;
      },
      checkCode: function (code) { return rpc('check_code', { p_code: code }); },
      addItem: function (code, f, by) { return rpc('add_item', itemArgs(code, f, by)); },
      updateItem: function (code, id, f, by) { return rpc('update_item', Object.assign({ p_id: id }, itemArgs(code, f, by))); },
      deleteItem: function (code, id, by) { return rpc('delete_item', { p_code: code, p_id: id, p_by: by }); },
      restoreItem: function (code, changeId, by) { return rpc('restore_item', { p_code: code, p_change_id: changeId, p_by: by }); },
      addSubject: function (code, s, by) { return rpc('add_subject', { p_code: code, p_name: s.name, p_short: s.short, p_label: s.code, p_fam: s.fam, p_by: by }); },
      subscribe: function (onChange, onStatus) {
        sb.channel('agenda-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, onChange)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'subjects' }, onChange)
          .subscribe(function (status) { onStatus(status === 'SUBSCRIBED'); });
      }
    };
  }

  // Preview: the same shape, kept in this browser, so the site works before the database exists.
  function demoBackend() {
    let db = null;
    try { db = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null'); } catch (e) {}
    if (!db || !Array.isArray(db.items) || !Array.isArray(db.subjects) || !Array.isArray(db.changes)) {
      const now = new Date().toISOString();
      db = {
        subjects: clone(SEED_SUBJECTS),
        items: SEED_ITEMS.map(function (t) { return Object.assign({ id: uuid(), added_by: '', created_at: now, updated_at: now }, t); }),
        changes: [],
        next: 1
      };
    }
    function save() { try { localStorage.setItem(DEMO_KEY, JSON.stringify(db)); } catch (e) {} }
    function log(action, who, itemId, detail) {
      db.changes.unshift({ id: db.next++, at: new Date().toISOString(), action: action, who: who || '', item_id: itemId, detail: clone(detail) });
      db.changes.length = Math.min(db.changes.length, 300);
    }
    function soon(v) { return new Promise(function (r) { setTimeout(function () { r(clone(v)); }, 120); }); }
    function row(f) {
      return { subject: f.subject, kind: f.kind, title: f.title, notes: f.notes, start_date: f.start, end_date: f.end || null, at_time: f.time || null, place: f.place, level: f.level, important: !!f.important };
    }
    return {
      live: false,
      load: function () { return soon({ subjects: db.subjects, items: db.items }); },
      history: function (n) { return soon(db.changes.slice(0, n)); },
      itemHistory: function (id) { return soon(db.changes.filter(function (x) { return x.item_id === id; }).slice(0, 40)); },
      checkCode: function () { return soon(true); },
      addItem: function (code, f, by) {
        const now = new Date().toISOString();
        const t = Object.assign({ id: uuid(), added_by: by, updated_by: '', created_at: now, updated_at: now }, row(f));
        db.items.push(t); log('add', by, t.id, t); save();
        return soon(t);
      },
      updateItem: function (code, id, f, by) {
        const i = db.items.findIndex(function (t) { return t.id === id; });
        if (i < 0) return Promise.reject(fail('not_found'));
        const before = db.items[i];
        const after = Object.assign({}, before, row(f), { updated_by: by, updated_at: new Date().toISOString() });
        db.items[i] = after; log('edit', by, id, { before: before, after: after }); save();
        return soon(after);
      },
      deleteItem: function (code, id, by) {
        const i = db.items.findIndex(function (t) { return t.id === id; });
        if (i < 0) return Promise.reject(fail('not_found'));
        const old = db.items.splice(i, 1)[0]; log('delete', by, id, old); save();
        return soon(null);
      },
      restoreItem: function (code, changeId, by) {
        const c = db.changes.find(function (x) { return x.id === changeId && x.action === 'delete'; });
        if (!c) return Promise.reject(fail('not_found'));
        if (db.items.some(function (t) { return t.id === c.item_id; })) return Promise.reject(fail('already_restored'));
        const t = clone(c.detail);
        t.updated_by = by;
        t.updated_at = new Date().toISOString();
        db.items.push(t); log('restore', by, t.id, t); save();
        return soon(t);
      },
      addSubject: function (code, s, by) {
        if (db.subjects.some(function (x) { return x.name.toLowerCase() === s.name.toLowerCase(); })) return Promise.reject(fail('subject_exists'));
        const base = s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'subject';
        let id = base, n = 2;
        while (db.subjects.some(function (x) { return x.id === id; })) id = base + '-' + n++;
        const r = { id: id, name: s.name, short: s.short, code: s.code, fam: s.fam, sort: 50 };
        db.subjects.push(r); log('subject', by, null, r); save();
        return soon(r);
      },
      subscribe: function (onChange, onStatus) { onStatus(false); }
    };
  }

  // ---------- data shaping ----------
  function toItem(r, seen) {
    if (!r || !r.id || !isDate(r.start_date) || typeof r.title !== 'string') return null;
    return {
      id: String(r.id),
      subject: hasOwn(seen, r.subject) ? r.subject : 'class',
      kind: hasOwn(KINDS, r.kind) ? r.kind : 'hw',
      title: r.title.slice(0, 120),
      notes: str(r.notes, 1000),
      start: r.start_date,
      end: isDate(r.end_date) && r.end_date > r.start_date ? r.end_date : '',
      time: typeof r.at_time === 'string' && isTime(r.at_time.slice(0, 5)) ? r.at_time.slice(0, 5) : '',
      place: str(r.place, 80),
      level: r.level === 'HL' || r.level === 'SL' ? r.level : '',
      important: r.important === true,
      by: str(r.added_by, 40),
      updatedBy: str(r.updated_by, 40),
      created: r.created_at || null,
      updated: r.updated_at || null
    };
  }
  function applyData(d) {
    const seen = Object.create(null), subjects = [];
    (d.subjects || []).forEach(function (s) {
      if (!s || typeof s.id !== 'string' || seen[s.id]) return;
      seen[s.id] = true;
      const name = str(s.name, 60) || s.id;
      subjects.push({ id: s.id, name: name, short: str(s.short, 24) || name, code: (str(s.code, 6) || name.slice(0, 4)).toUpperCase(), fam: hasOwn(FAMS, s.fam) ? s.fam : 'school', sort: +s.sort || 0 });
    });
    if (!seen['class']) { seen['class'] = true; subjects.push({ id: 'class', name: 'Whole class', short: 'Class', code: 'CLASS', fam: 'school', sort: 999 }); }
    subjects.sort(function (a, b) { return FAM_ORDER.indexOf(a.fam) - FAM_ORDER.indexOf(b.fam) || a.sort - b.sort || a.name.localeCompare(b.name); });
    data = { subjects: subjects, items: (d.items || []).map(function (r) { return toItem(r, seen); }).filter(Boolean) };
    subjIndex = Object.create(null);
    order = Object.create(null);
    subjects.forEach(function (s, i) { subjIndex[s.id] = s; order[s.id] = i; });
  }
  function subj(id) { return subjIndex[id] || subjIndex['class']; }
  function findItem(id) { return data.items.find(function (x) { return x.id === id; }) || null; }

  // ---------- this viewer's own state (this device only) ----------
  function loadMe() {
    let m = null;
    try { m = JSON.parse(localStorage.getItem(ME_KEY) || 'null'); } catch (e) {}
    m = m && typeof m === 'object' ? m : {};
    const picks = m.picks && typeof m.picks === 'object' && Object.keys(m.picks).length ? m.picks : null;
    const ed = m.editor && typeof m.editor === 'object' && typeof m.editor.name === 'string' && m.editor.name ? { name: m.editor.name.slice(0, 40), code: String(m.editor.code || '') } : null;
    return {
      picks: picks,
      view: VIEWS.indexOf(m.view) >= 0 ? m.view : 'week',
      nudged: !!m.nudged,
      editor: ed,
      lastName: typeof m.lastName === 'string' ? m.lastName.slice(0, 40) : '',
      seenAt: typeof m.seenAt === 'string' ? m.seenAt : null,
      shareStyle: m.shareStyle === 'notes' ? 'notes' : 'short'
    };
  }
  function saveMe() { try { localStorage.setItem(ME_KEY, JSON.stringify(me)); } catch (e) {} }
  function isMine(t) {
    if (!me.picks || t.subject === 'class') return true;
    if (!hasOwn(me.picks, t.subject)) return false;
    const lvl = me.picks[t.subject];
    return !t.level || !lvl || lvl === t.level;
  }
  function isShown(t) { return showAll || isMine(t); }
  function canEdit() { return !!me.editor; }

  // ---------- state ----------
  const backend = LIVE ? liveBackend() : demoBackend();
  let data = { subjects: [], items: [] };
  let subjIndex = Object.create(null);
  let order = Object.create(null);
  applyData({});
  const me = loadMe();
  let today = ymd(new Date());
  let view = me.view;
  let anchor = today;
  let showAll = false;
  let searchQ = '';
  let focusDay = null;
  let saving = false;
  let loaded = false;
  let loadError = false;
  let dropped = false;
  let lastChange = null;
  let liveOn = false;
  let seq = 0;
  let delTimer = null;
  let toastTimer = null;
  let refreshTimer = null;
  let lastRefresh = 0;
  let compItem = null;
  let prevStickies = null;
  // When this device last opened the agenda, so entries added or changed since then can say so.
  const prevSeen = me.seenAt;
  let seenSaved = false;
  let versionsToken = 0;
  let versionsOpen = false;
  let detailId = null;
  let unlockThen = null;
  const hv = (location.hash || '').slice(1);
  if (VIEWS.indexOf(hv) >= 0) view = hv;

  // ---------- periods ----------
  function periodRange() {
    if (view === 'week') { const s = mondayOf(parse(anchor)); return [ymd(s), ymd(addDays(s, 6))]; }
    if (view === 'month') { const a = parse(anchor); return [ymd(new Date(a.getFullYear(), a.getMonth(), 1)), ymd(new Date(a.getFullYear(), a.getMonth() + 1, 0))]; }
    return [today, '9999-12-31'];
  }
  function periodItems() {
    if (view === 'upcoming') return data.items.filter(function (t) { return lastDay(t) >= today; });
    const r = periodRange();
    return data.items.filter(function (t) { return overlaps(t, r[0], r[1]); });
  }
  function periodWord() {
    const r = periodRange();
    if (view === 'week') return today >= r[0] && today <= r[1] ? 'this week' : 'that week';
    if (view === 'month') return 'in ' + MONTHS[parse(anchor).getMonth()];
    return 'coming up';
  }

  // ---------- render ----------
  function animClass(anim) {
    if (!anim) return '';
    if (anim === 'load') return ' anim';
    if (searchQ || view === 'upcoming') return ' anim fade-in';
    return view === 'week' ? ' anim turn-' + anim : ' anim flip-' + anim;
  }
  function reduceMotion() { return matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function buildMain(target) {
    if (!loaded) target.append(h('div', { class: 'loading' }, h('span', { text: loadError ? 'couldn’t open the agenda' : 'opening the agenda…' })));
    else if (searchQ) renderSearch(target);
    else if (view === 'week') renderWeek(target);
    else if (view === 'month') renderMonth(target);
    else renderUpcoming(target);
  }
  // anim: 'load' / 'next' / 'prev' redraw the page; 'soft' and 'swap' change it in place
  // ('soft' lets rows that disappear fade out first, 'swap' is for typing in search).
  let leaveTimer = null, heightTimer = null;
  function render(anim) {
    seq = 0;
    renderBar();
    renderNotes();
    renderUpNext();
    const main = $('#main');
    clearTimeout(leaveTimer);
    clearTimeout(heightTimer);
    main.style.height = '';
    main.style.overflow = '';
    main.style.transition = '';
    main.querySelectorAll('.leave').forEach(function (el) { el.classList.remove('leave'); });
    if ((anim === 'soft' || anim === 'swap') && loaded && main.querySelector('.entry, .m-cell, .blank, .free')) {
      softSwap(main, anim === 'soft');
    } else {
      main.textContent = '';
      main.className = 'main' + animClass(anim);
      buildMain(main);
    }
    renderSummary();
    renderFoot();
    if (focusDay) {
      const el = main.querySelector('[data-date="' + focusDay + '"]');
      if (el) { try { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {} }
      focusDay = null;
    }
  }

  function keyOf(el) {
    const day = el.closest('[data-date]');
    return el.dataset.id ? 'i' + el.dataset.id + '@' + (day ? day.dataset.date : '') + (el.classList.contains('m-item') ? 'm' : '') : 'k' + el.dataset.k;
  }
  function softSwap(main, withLeave) {
    const tmp = document.createElement('div');
    buildMain(tmp);
    const KEYED = '[data-id], [data-k]';
    const oldKeys = new Set(Array.prototype.map.call(main.querySelectorAll(KEYED), keyOf));
    const newKeys = new Set(Array.prototype.map.call(tmp.querySelectorAll(KEYED), keyOf));
    const leaving = Array.prototype.filter.call(main.querySelectorAll('.entry[data-id]'), function (el) { return !newKeys.has(keyOf(el)); });
    const swap = function () {
      const h0 = main.offsetHeight;
      main.className = 'main';
      main.replaceChildren.apply(main, Array.prototype.slice.call(tmp.childNodes));
      let k = 0;
      main.querySelectorAll(KEYED).forEach(function (el) {
        if (oldKeys.has(keyOf(el))) return;
        el.classList.add('appear');
        el.style.setProperty('--i', String(Math.min(k++, 8)));
      });
      const h1 = main.offsetHeight;
      if (Math.abs(h1 - h0) > 2 && !reduceMotion()) {
        main.style.height = h0 + 'px';
        main.style.overflow = 'hidden';
        void main.offsetHeight;
        main.style.transition = 'height .38s cubic-bezier(.3,.7,.2,1)';
        main.style.height = h1 + 'px';
        heightTimer = setTimeout(function () { main.style.height = ''; main.style.overflow = ''; main.style.transition = ''; }, 420);
      }
    };
    if (withLeave && leaving.length && !reduceMotion()) {
      leaving.forEach(function (el) { el.classList.add('leave'); });
      leaveTimer = setTimeout(swap, 230);
    } else swap();
  }

  function renderBar() {
    VIEWS.forEach(function (v) { $('#v-' + v).setAttribute('aria-selected', String(v === view && !searchQ)); });
    const nav = !searchQ && view !== 'upcoming';
    $('#prev').hidden = !nav;
    $('#next').hidden = !nav;
    $('#btn-today').hidden = !nav;
    let main, sub;
    if (searchQ) {
      const n = loaded ? searchHits().length : 0;
      main = 'Search';
      sub = n + (n === 1 ? ' match' : ' matches') + ' for “' + searchQ + '”';
    } else if (view === 'week') {
      const s = mondayOf(parse(anchor)), e = addDays(s, 6);
      main = 'Week ' + isoWeek(s);
      sub = fmtShort(s) + (s.getFullYear() !== e.getFullYear() ? ', ' + s.getFullYear() : '') + ' to ' + fmtShort(e) + ', ' + e.getFullYear();
    } else if (view === 'month') {
      const a = parse(anchor);
      main = MONTHS[a.getMonth()];
      sub = String(a.getFullYear());
    } else {
      main = 'Coming up';
      sub = 'From ' + fmtDay(parse(today));
    }
    $('#pl-main').textContent = main;
    $('#pl-sub').textContent = sub;
    $('#prev').setAttribute('aria-label', 'Previous ' + view);
    $('#next').setAttribute('aria-label', 'Next ' + view);
    const r = periodRange();
    $('#btn-today').classList.toggle('is-here', today >= r[0] && today <= r[1]);
  }

  function noteKey(p) { return p.id || (p.firstChild && p.firstChild.textContent) || ''; }
  function renderNotes() {
    const box = $('#notes');
    const before = new Set(Array.prototype.map.call(box.children, noteKey));
    box.textContent = '';
    fillNotes(box);
    Array.prototype.forEach.call(box.children, function (p) { if (!before.has(noteKey(p))) p.classList.add('pop-in'); });
  }
  function fillNotes(box) {
    if (loadError) {
      box.append(h('p', { class: 'pen-note' }, 'Couldn’t reach the agenda. Check your connection.',
        h('button', { type: 'button', class: 'tool', text: 'try again', onclick: function () { loadError = false; render(null); refresh(true); } })));
    } else if (!backend.live) {
      box.append(h('p', { class: 'pen-note' }, 'Preview: what you add stays on this device until the class database is switched on.'));
    }
    if (!loaded || searchQ) return;
    if (!me.picks && !me.nudged) {
      box.append(h('p', { class: 'pen-note soft' }, 'Tip: pick the subjects you take and the rest get hidden.',
        h('button', { type: 'button', class: 'tool', text: 'pick mine', onclick: function () { me.nudged = true; saveMe(); renderNotes(); openSubjects(); } }),
        h('button', { type: 'button', class: 'tool', text: 'not now', onclick: function () { me.nudged = true; saveMe(); renderNotes(); } })));
    }
    if (me.picks) {
      const n = periodItems().filter(function (t) { return !isMine(t); }).length;
      if (showAll) {
        box.append(h('p', { class: 'pen-note soft', id: 'filter-note' }, 'Showing every subject.', h('button', { type: 'button', class: 'tool', text: 'only mine', onclick: function () { showAll = false; render('soft'); } })));
      } else if (n) {
        box.append(h('p', { class: 'pen-note soft', id: 'filter-note' }, n + (n === 1 ? ' entry ' : ' entries ') + periodWord() + (n === 1 ? ' is' : ' are') + ' for subjects you don’t take.',
          h('button', { type: 'button', class: 'tool', text: 'show them', onclick: function () { showAll = true; render('soft'); } })));
      }
    }
  }

  function metaFor(it, opt) {
    const parts = [];
    if (it.level) parts.push(it.level + ' only');
    if (it.time) parts.push(fmtTime(it.time));
    if (it.place) parts.push(it.place);
    if (it.end) {
      if (opt.dayKey) parts.push('day ' + (diffDays(it.start, opt.dayKey) + 1) + ' of ' + (diffDays(it.start, it.end) + 1));
      else parts.push('until ' + fmtShort(parse(it.end)));
    }
    if (opt.showDate) parts.push((lastDay(it) < today ? 'was due ' : '') + fmtDay(parse(it.start)));
    return parts.join(' · ');
  }

  // "new" or "edited" if someone else changed it since this device last opened the agenda.
  function freshness(it) {
    if (!prevSeen) return '';
    const seen = Date.parse(prevSeen), c = Date.parse(it.created || ''), u = Date.parse(it.updated || '');
    const mine = me.editor ? me.editor.name : '';
    if (c > seen && !(mine && it.by === mine)) return 'new';
    if (u > seen && u - c > 60000 && !(mine && it.updatedBy === mine)) return 'edited';
    return '';
  }
  function entryRow(it, opt) {
    opt = opt || {};
    const s = subj(it.subject), meta = metaFor(it, opt), fresh = freshness(it);
    const byText = it.updatedBy ? 'edited by ' + it.updatedBy : it.by ? 'by ' + it.by : '';
    const row = h('article', { class: 'entry fam-' + s.fam + ' k-' + it.kind + (it.important ? ' important' : ''), 'data-id': it.id, style: '--i:' + Math.min(seq++, 16) });
    const open = h('button', { type: 'button', class: 'entry-open', 'aria-label': s.short + ', ' + KINDS[it.kind] + ': ' + it.title + (meta ? ', ' + meta : '') + '. Open details' },
      h('span', { class: 'entry-line' },
        h('span', { class: 'tab', title: s.name, text: s.code }),
        h('span', { class: 'entry-title' }, h('span', { class: 'ink', text: it.title })),
        it.kind !== 'hw' ? h('span', { class: 'pen', text: KINDS[it.kind].toLowerCase() }) : null,
        meta ? h('span', { class: 'entry-meta', text: meta }) : null,
        fresh ? h('span', { class: 'pen fresh', text: fresh }) : null,
        byText ? h('span', { class: 'entry-by', text: byText }) : null),
      it.notes ? h('span', { class: 'entry-notes', text: it.notes }) : null);
    open.addEventListener('click', function () { openDetail(it.id); });
    row.append(open);
    return row;
  }

  function dayBand(d) {
    const key = ymd(d), isToday = key === today, past = key < today, isTomorrow = key === ymd(addDays(parse(today), 1));
    const list = data.items.filter(function (it) { return onDay(it, key) && isShown(it); }).sort(sortDay);
    const band = h('section', { class: 'day' + (isToday ? ' is-today' : '') + (past ? ' is-past' : '') + (list.length ? '' : ' is-empty'), 'data-date': key, 'aria-label': fmtDay(d) });
    band.append(h('div', { class: 'margin' },
      h('span', { class: 'dow', text: DOW[d.getDay()] + (d.getDate() === 1 ? ' ' + MON[d.getMonth()] : '') }),
      h('span', { class: 'dnum', html: String(d.getDate()) + (isToday ? CIRCLE : '') }),
      isToday ? h('span', { class: 'rel', text: 'today' }) : isTomorrow ? h('span', { class: 'rel soft', text: 'tomorrow' }) : null));
    const lines = h('div', { class: 'lines' });
    list.forEach(function (it) { lines.append(entryRow(it, { dayKey: key })); });
    if (!list.length && !past) lines.append(h('p', { class: 'free', 'data-k': 'free-' + key, text: isToday ? 'nothing on today' : 'free' }));
    if (canEdit() && !past) lines.append(h('button', { type: 'button', class: 'add-line', 'data-k': 'add-' + key, text: '+ add', 'aria-label': 'Add to ' + fmtDay(d), onclick: function () { openComposer({ date: key }); } }));
    band.append(lines);
    return band;
  }

  function renderWeek(main) {
    const s = mondayOf(parse(anchor));
    const days = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return addDays(s, i); });
    const left = h('div', { class: 'page page-l' }), right = h('div', { class: 'page page-r' });
    days.slice(0, 3).forEach(function (d) { left.append(dayBand(d)); });
    days.slice(3, 5).forEach(function (d) { right.append(dayBand(d)); });
    right.append(h('div', { class: 'weekend' }, dayBand(days[5]), dayBand(days[6])));
    main.append(h('div', { class: 'spread' }, left, right));
  }

  function renderMonth(main) {
    const a = parse(anchor);
    const first = new Date(a.getFullYear(), a.getMonth(), 1), last = new Date(a.getFullYear(), a.getMonth() + 1, 0);
    const start = mondayOf(first), end = addDays(mondayOf(last), 6);
    const grid = h('div', { class: 'calendar' });
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(function (x) { grid.append(h('div', { class: 'm-dow', 'aria-hidden': 'true', text: x })); });
    for (let d = start; d <= end; d = addDays(d, 1)) {
      const key = ymd(d);
      const list = data.items.filter(function (t) { return onDay(t, key) && isShown(t); }).sort(sortDay);
      const cell = h('button', {
        type: 'button', 'data-date': key,
        class: 'm-cell' + (d.getMonth() !== a.getMonth() ? ' out' : '') + (key === today ? ' is-today' : '') + (key < today ? ' is-past' : ''),
        'aria-label': fmtDay(d) + ', ' + (list.length ? list.length + (list.length === 1 ? ' entry' : ' entries') : 'nothing on') + '. Open this week.'
      });
      cell.addEventListener('click', function () { focusDay = key; setView('week', key, key > anchor ? 'next' : 'prev'); });
      cell.append(h('span', { class: 'm-num', html: String(d.getDate()) + (key === today ? CIRCLE : '') }));
      const items = h('span', { class: 'm-items' }), dots = h('span', { class: 'm-dots', 'aria-hidden': 'true' });
      list.forEach(function (t, j) {
        const s = subj(t.subject), cls = 'fam-' + s.fam + (t.important ? ' imp' : '');
        if (j < 3) items.append(h('span', { class: 'm-item ' + cls, 'data-id': t.id }, h('i'), h('span', { text: t.title })));
        dots.append(h('i', { class: cls, 'data-id': t.id }));
      });
      if (list.length > 3) items.append(h('span', { class: 'm-more', text: '+' + (list.length - 3) + ' more' }));
      cell.append(items, dots);
      grid.append(cell);
    }
    main.append(grid);
  }

  function listBand(key, items, o) {
    const band = h('section', { class: 'day' + (key === today ? ' is-today' : '') + (key && key < today ? ' is-past' : '') + (o.search ? ' search-hit' : ''), 'data-date': key || '' });
    const margin = h('div', { class: 'margin' });
    if (key) {
      const d = parse(key);
      margin.append(h('span', { class: 'dow', text: DOW[d.getDay()] }), h('span', { class: 'dnum', html: String(d.getDate()) + (key === today ? CIRCLE : '') }));
    }
    const lines = h('div', { class: 'lines' }, h('p', { class: 'group-label' + (o.soft ? ' soft' : ''), text: o.label }));
    items.forEach(function (it) { lines.append(entryRow(it, { showDate: o.showDate })); });
    band.append(margin, lines);
    return band;
  }
  function groupByDay(list, keyOf) {
    const groups = [];
    list.forEach(function (it) {
      const k = keyOf(it);
      let g = groups.find(function (x) { return x.key === k; });
      if (!g) groups.push(g = { key: k, items: [] });
      g.items.push(it);
    });
    groups.sort(function (a, b) { return a.key < b.key ? -1 : 1; });
    groups.forEach(function (g) { g.items.sort(sortDay); });
    return groups;
  }
  function dateLabel(key) {
    const d = parse(key), y = d.getFullYear() !== parse(today).getFullYear() ? ', ' + d.getFullYear() : '';
    return relLabel(key) + ' · ' + fmtShort(d) + y;
  }

  function renderUpcoming(main) {
    const page = h('div', { class: 'page list-page' });
    const future = data.items.filter(function (it) { return lastDay(it) >= today && isShown(it); });
    groupByDay(future, function (it) { return it.start < today ? today : it.start; }).forEach(function (g) {
      page.append(listBand(g.key, g.items, { label: dateLabel(g.key) }));
    });
    if (!future.length) {
      page.append(h('div', { class: 'blank' }, h('p', { class: 'blank-title', text: 'Nothing coming up' }),
        h('p', { text: canEdit() ? 'When something gets set, add it here and the whole class will see it.' : 'When classmates add something, it will show up here.' })));
    }
    main.append(page);
  }

  function searchHits() {
    const q = searchQ.toLowerCase();
    return data.items.filter(function (it) {
      const s = subj(it.subject);
      return [it.title, it.notes, it.place, s.name, s.short, s.code, KINDS[it.kind]].join(' ').toLowerCase().indexOf(q) >= 0;
    });
  }
  function renderSearch(main) {
    const page = h('div', { class: 'page list-page' });
    const hits = searchHits();
    groupByDay(hits, function (it) { return it.start; }).forEach(function (g) {
      page.append(listBand(g.key, g.items, { label: dateLabel(g.key), soft: g.key < today, search: true }));
    });
    if (!hits.length) page.append(h('div', { class: 'blank' }, h('p', { class: 'blank-title', text: 'Nothing matches' }), h('p', { text: 'Try a subject, a word from the title, or a place.' })));
    main.append(page);
  }

  // ---------- up next: sticky notes ----------
  function renderUpNext() {
    const sec = $('#upnext');
    sec.textContent = '';
    if (!loaded || searchQ) { sec.hidden = true; if (dropped) prevStickies = new Set(); return; }
    const list = data.items.filter(function (it) { return (it.kind !== 'hw' || it.important) && lastDay(it) >= today && isShown(it); }).sort(byStart).slice(0, 4);
    if (!list.length) { sec.hidden = true; if (dropped) prevStickies = new Set(); return; }
    sec.hidden = false;
    const prev = prevStickies;
    prevStickies = new Set(list.map(function (it) { return it.id; }));
    sec.classList.toggle('drop', !dropped);
    dropped = true;
    sec.append(h('div', { class: 'upnext-label', 'aria-hidden': 'true', html: 'up next<svg viewBox="0 0 70 30"><path pathLength="100" d="M3 5c12 15 32 20 58 13M52 9c4 3 7 6 9 9-4 2-8 4-12 5"/></svg>' }));
    list.forEach(function (it, i) {
      const s = subj(it.subject), n = diffDays(today, it.start);
      let count = it.start < today ? 'on now' : n === 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + ' days';
      if (n <= 1 && n >= 0 && it.time) count += ', ' + fmtTime(it.time);
      sec.append(h('button', { type: 'button', class: 'sticky k-' + it.kind + (prev && !prev.has(it.id) ? ' pop' : ''), 'data-sticky': it.id, style: '--r:' + STICKY_TILT[i % 4] + 'deg;--i:' + i, 'aria-label': KINDS[it.kind] + ', ' + s.short + ', ' + it.title + ', ' + count, onclick: function () { openDetail(it.id); } },
        h('span', { class: 'tape', 'aria-hidden': 'true' }),
        h('span', { class: 'sticky-count', text: count }),
        h('span', { class: 'sticky-sub' }, h('span', { class: 'tab', text: s.code }), KINDS[it.kind].toLowerCase()),
        h('span', { class: 'sticky-title', text: it.title }),
        h('span', { class: 'sticky-when', text: whenText(it) + (it.place ? ' · ' + it.place : '') })));
    });
  }

  // ---------- summary: what's on in this period ----------
  function renderSummary() {
    const box = $('#summary');
    box.hidden = !!searchQ || !loaded;
    if (box.hidden) return;
    const items = periodItems().filter(isShown), n = items.length, parts = [];
    [['test', 'test', 'tests'], ['deadline', 'deadline', 'deadlines'], ['event', 'event', 'events']].forEach(function (k) {
      const c = items.filter(function (t) { return t.kind === k[0]; }).length;
      if (c) parts.push(c + ' ' + (c === 1 ? k[1] : k[2]));
    });
    $('#sum-count').textContent = (n ? n + (n === 1 ? ' thing ' : ' things ') : 'nothing on ') + periodWord();
    $('#sum-label').textContent = (parts.length ? parts.join(' · ') : n ? 'no tests or deadlines' : 'enjoy it') + (me.picks && !showAll ? ' · your subjects' : '');
  }

  function renderFoot() {
    const live = $('#live');
    live.classList.toggle('on', liveOn);
    live.textContent = !backend.live ? 'Preview' : liveOn ? 'Live' : 'Updates when you reopen the page';
    $('#foot-updated').textContent = lastChange ? 'Last change ' + ago(lastChange.at) + (lastChange.who ? ' by ' + lastChange.who : '') + '.' : '';
    const ed = $('#foot-editor');
    ed.textContent = '';
    if (canEdit()) ed.append('Writing as ' + me.editor.name + '. ', h('button', { type: 'button', class: 'tool', text: 'Lock', onclick: lock }));
  }

  // ---------- item detail ----------
  function linkify(text) {
    const frag = document.createDocumentFragment(), re = /https?:\/\/[^\s<>"']+/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      const url = m[0].replace(/[).,;:!?]+$/, '');
      if (m.index > last) frag.append(text.slice(last, m.index));
      let ok = null;
      try { ok = new URL(url); } catch (e) {}
      if (ok && (ok.protocol === 'https:' || ok.protocol === 'http:')) {
        let label = url.replace(/^https?:\/\//, '');
        if (label.length > 46) label = label.slice(0, 44) + '…';
        frag.append(h('a', { href: ok.href, target: '_blank', rel: 'noopener noreferrer', text: label }));
      } else frag.append(url);
      last = m.index + url.length;
      re.lastIndex = last;
    }
    if (last < text.length) frag.append(text.slice(last));
    return frag;
  }
  function openDetail(id) {
    const it = findItem(id);
    if (!it) return;
    if (detailId !== id) versionsOpen = false;
    detailId = id;
    renderDetail(it);
    openDialog($('#detail'));
  }
  function renderDetail(it) {
    const box = $('#d-body');
    box.textContent = '';
    if (!it) { closeDialog($('#detail')); return; }
    const s = subj(it.subject);
    box.append(h('div', { class: 'd-top fam-' + s.fam }, h('span', { class: 'tab', text: s.code }), h('span', { class: 'pen', text: KINDS[it.kind].toLowerCase() }), h('span', { class: 'grow' }),
      h('button', { type: 'button', class: 'x-btn', 'data-close': true, 'aria-label': 'Close', html: I.close })));
    box.append(h('h2', { class: 'd-title' + (it.important ? ' important' : ''), id: 'd-title' }, h('span', { class: 'ink', text: it.title })));
    const facts = h('div', { class: 'd-facts' });
    const fact = function (label, value) { facts.append(h('div', { class: 'd-fact' }, h('b', { text: label }), h('span', { text: value }))); };
    fact('Subject', s.name);
    fact('When', whenText(it) + (lastDay(it) >= today ? ' (' + (it.start < today ? 'on now' : relLabel(it.start)) + ')' : ''));
    if (it.place) fact('Where', it.place);
    if (it.level) fact('For', it.level + ' students only');
    if (it.important) fact('Marked', 'Important');
    box.append(facts);
    if (it.notes) box.append(h('div', { class: 'd-notes' }, linkify(it.notes)));
    const by = [];
    if (it.by || it.created) by.push('added' + (it.by ? ' by ' + it.by : '') + (it.created ? ', ' + ago(it.created) : ''));
    if (it.updatedBy || (it.updated && it.created && Date.parse(it.updated) - Date.parse(it.created) > 60000)) by.push('edited' + (it.updatedBy ? ' by ' + it.updatedBy : '') + (it.updated ? ', ' + ago(it.updated) : ''));
    if (by.length) box.append(h('p', { class: 'd-by', text: by.join(' · ') }));
    box.append(versionsBlock(it));
    const gcal = h('a', { class: 'tool', href: gcalUrl(it), target: '_blank', rel: 'noopener noreferrer', html: I.cal + '<span>Google Calendar</span>' });
    box.append(h('div', { class: 'd-actions' },
      gcal,
      h('button', { type: 'button', class: 'tool', html: I.download + '<span>Other calendars (.ics)</span>', onclick: function () { downloadIcs(it); } }),
      h('button', { type: 'button', class: 'tool', html: I.copy + '<span>Copy</span>', onclick: function () { copyText(itemText(it), 'Copied. Paste it anywhere.'); } }),
      h('button', { type: 'button', class: 'pen-btn', html: I.pencil + '<span>Edit</span>', onclick: function () { closeDialog($('#detail')); openComposer({ item: it }); } })));
  }

  // ---------- version history of one entry ----------
  const FIELDS = [['title', 'title'], ['notes', 'notes'], ['subject', 'subject'], ['kind', 'type'], ['start_date', 'date'], ['end_date', 'until'], ['at_time', 'time'], ['place', 'place'], ['level', 'who it’s for'], ['important', 'important']];
  function fv(x) { return x === null || x === undefined ? '' : String(x); }
  function describeEdit(before, after) {
    const parts = [];
    FIELDS.forEach(function (f) {
      const a = fv(before[f[0]]), b = fv(after[f[0]]);
      if (a === b) return;
      if (f[0] === 'title') parts.push('title “' + a + '” → “' + b + '”');
      else if (f[0] === 'start_date' && isDate(a) && isDate(b)) parts.push('date ' + fmtShort(parse(a)) + ' → ' + fmtShort(parse(b)));
      else if (f[0] === 'subject') parts.push('subject ' + subj(a).code + ' → ' + subj(b).code);
      else if (f[0] === 'important') parts.push(b === 'true' ? 'marked it important' : 'unmarked important');
      else parts.push(f[1]);
    });
    return parts.length ? 'changed ' + parts.join(', ') : 'saved it without changes';
  }
  function versionsBlock(it) {
    const det = h('details', { class: 'versions', id: 'd-versions' },
      h('summary', { html: CHEV + 'History of this entry <span class="v-count" id="v-count"></span>' }),
      h('ol', { class: 'vlist', id: 'v-list' }, h('li', { class: 'v-item', text: 'opening…' })));
    if (versionsOpen) det.open = true;
    det.addEventListener('toggle', function () { versionsOpen = det.open; });
    animateDetails(det);
    const token = ++versionsToken;
    backend.itemHistory(it.id).then(function (rows) {
      if (token === versionsToken) fillVersions(it, rows || []);
    }, function () {
      const l = $('#v-list');
      if (token !== versionsToken || !l) return;
      l.textContent = '';
      l.append(h('li', { class: 'v-item', text: 'Couldn’t load the history. Check your connection.' }));
    });
    return det;
  }
  function fillVersions(it, rows) {
    const list = $('#v-list'), count = $('#v-count');
    if (!list) return;
    list.textContent = '';
    const states = rows.filter(function (r) { return r.action !== 'subject'; });
    count.textContent = '(' + states.length + (states.length === 1 ? ' version)' : ' versions)');
    if (!states.length) {
      list.append(h('li', { class: 'v-item', text: 'Nothing recorded yet. This entry was here before the history started.' }));
      return;
    }
    const VERB = { add: 'added it', edit: 'edited it', delete: 'deleted it', restore: 'brought it back' };
    let currentShown = false;
    states.forEach(function (r, i) {
      const state = (r.action === 'edit' ? r.detail && r.detail.after : r.detail) || {};
      const isCurrent = !currentShown && r.action !== 'delete';
      if (isCurrent) currentShown = true;
      const li = h('li', { class: 'v-item' + (isCurrent ? ' current' : '') + (r.action === 'delete' ? ' gone' : ''), style: '--i:' + Math.min(i, 12) },
        h('div', { class: 'v-line' }, h('b', { text: r.who || 'Someone' }), ' ' + (VERB[r.action] || r.action), isCurrent ? h('span', { class: 'v-now', text: 'current' }) : null),
        h('div', { class: 'v-meta', text: ago(r.at) + (state.title && r.action !== 'edit' ? ' · “' + state.title + '”' : '') }));
      if (r.action === 'edit' && r.detail && r.detail.before) li.append(h('div', { class: 'v-diff', text: describeEdit(r.detail.before, state) }));
      if (!isCurrent && r.action !== 'delete' && state.title) {
        li.append(h('button', { type: 'button', class: 'tool', text: canEdit() ? 'bring back this version' : 'unlock to bring back this version', onclick: function () { restoreVersion(it, state); } }));
      }
      list.append(li);
    });
  }
  function restoreVersion(it, state) {
    if (!canEdit()) { closeDialog($('#detail')); openUnlock(function () { versionsOpen = true; openDetail(it.id); }); return; }
    const f = {
      subject: hasOwn(subjIndex, state.subject) ? state.subject : 'class',
      kind: hasOwn(KINDS, state.kind) ? state.kind : 'hw',
      title: String(state.title || it.title).slice(0, 120),
      notes: String(state.notes || '').slice(0, 1000),
      start: isDate(state.start_date) ? state.start_date : it.start,
      end: isDate(state.end_date) && state.end_date > state.start_date ? state.end_date : '',
      time: typeof state.at_time === 'string' && isTime(state.at_time.slice(0, 5)) ? state.at_time.slice(0, 5) : '',
      place: String(state.place || '').slice(0, 80),
      level: state.level === 'HL' || state.level === 'SL' ? state.level : '',
      important: state.important === true
    };
    change(function (code, by) { return backend.updateItem(code, it.id, f, by); }).then(function (res) {
      if (res) toast('That version is back, for everyone');
    });
  }

  // ---------- calendar export ----------
  function compact(key) { return key.split('-').join(''); }
  function plusHour(t) {
    const p = t.split(':');
    let m = +p[0] * 60 + +p[1] + 60;
    if (m > 23 * 60 + 59) m = 23 * 60 + 59;
    return pad(Math.floor(m / 60)) + pad(m % 60);
  }
  function siteUrl() { return /^https?:$/.test(location.protocol) ? location.href.split('#')[0] : ''; }
  function calDetails(it) {
    return [KINDS[it.kind] + (it.level ? ', ' + it.level + ' only' : ''), it.notes, siteUrl() ? 'From the ' + CLASS_NAME + ' agenda: ' + siteUrl() : ''].filter(Boolean).join('\n\n');
  }
  function calDates(it) {
    if (it.time) return [compact(it.start) + 'T' + it.time.replace(':', '') + '00', compact(lastDay(it)) + 'T' + plusHour(it.time) + '00'];
    return [compact(it.start), compact(ymd(addDays(parse(lastDay(it)), 1)))];
  }
  function gcalUrl(it) {
    const d = calDates(it);
    const p = new URLSearchParams({ action: 'TEMPLATE', text: subj(it.subject).short + ': ' + it.title, dates: d[0] + '/' + d[1], details: calDetails(it), location: it.place || '' });
    return 'https://calendar.google.com/calendar/render?' + p.toString();
  }
  function icsText(it) {
    const BS = String.fromCharCode(92);
    const esc = function (v) { return String(v).split(BS).join(BS + BS).split(';').join(BS + ';').split(',').join(BS + ',').split('\n').join(BS + 'n'); };
    const fold = function (line) { const out = []; while (line.length > 73) { out.push(line.slice(0, 73)); line = ' ' + line.slice(73); } out.push(line); return out.join('\r\n'); };
    const d = calDates(it), stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//' + esc(CLASS_NAME) + ' Agenda//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', 'UID:' + it.id + '@agenda', 'DTSTAMP:' + stamp];
    if (it.time) lines.push('DTSTART:' + d[0], 'DTEND:' + d[1]);
    else lines.push('DTSTART;VALUE=DATE:' + d[0], 'DTEND;VALUE=DATE:' + d[1]);
    lines.push('SUMMARY:' + esc(subj(it.subject).short + ': ' + it.title));
    const det = calDetails(it);
    if (det) lines.push('DESCRIPTION:' + esc(det));
    if (it.place) lines.push('LOCATION:' + esc(it.place));
    lines.push('END:VEVENT', 'END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }
  function downloadIcs(it) {
    const blob = new Blob([icsText(it)], { type: 'text/calendar' });
    const a = h('a', { href: URL.createObjectURL(blob), download: (it.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'agenda') + '.ics' });
    document.body.append(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('Saved. Open the file to add it to your calendar.');
  }

  // ---------- navigation ----------
  function setView(v, at, anim) {
    view = v;
    me.view = v;
    saveMe();
    if (at) anchor = at;
    try { history.replaceState(null, '', '#' + v); } catch (e) {}
    render(anim || 'load');
  }
  function shift(dir) {
    if (searchQ) return;
    if (view === 'week') anchor = ymd(addDays(parse(anchor), 7 * dir));
    else if (view === 'month') { const a = parse(anchor); anchor = ymd(new Date(a.getFullYear(), a.getMonth() + dir, 1)); }
    else return;
    render(dir > 0 ? 'next' : 'prev');
  }
  function goToday() {
    const r = periodRange(), was = anchor;
    anchor = today;
    if (view === 'upcoming' || (today >= r[0] && today <= r[1])) return;
    render(today > was ? 'next' : 'prev');
  }
  function showDate(day) {
    if (searchQ || view === 'upcoming') return;
    const r = periodRange();
    if (day < r[0] || day > r[1]) { anchor = day; render(day > r[1] ? 'next' : 'prev'); }
  }
  function setSearch(q) {
    const was = searchQ;
    searchQ = q.trim().slice(0, 60);
    if (searchQ !== was) render(!was || !searchQ ? 'load' : 'swap');
  }

  // ---------- copying ----------
  // The group-chat message: plain and scannable, the way a class rep would write it.
  // One line per entry ("Physics test: Quiz (2:30 PM, Lab 2)"), grouped under bold day headings.
  function clean(s) { return String(s).replace(/[*~`]/g, '').replace(/\s+/g, ' ').trim(); }
  function chatEntry(it, withNotes) {
    const s = subj(it.subject), kind = it.kind === 'hw' ? '' : KINDS[it.kind];
    const lead = it.subject === 'class' ? kind : clean(s.short) + (kind ? ' ' + kind.toLowerCase() : '');
    const extra = [];
    if (it.important) extra.push('important');
    if (it.time) extra.push(fmtTime(it.time));
    if (it.place) extra.push(clean(it.place));
    if (it.level) extra.push(it.level + ' only');
    if (it.end) extra.push('until ' + fmtShort(parse(it.end)));
    let line = '- ' + (lead ? lead + ': ' : '') + clean(it.title) + (extra.length ? ' (' + extra.join(', ') + ')' : '');
    if (withNotes && it.notes) {
      let n = clean(it.notes);
      if (n.length > 160) n = n.slice(0, 158) + '…';
      line += '\n  ' + n;
    }
    return line;
  }
  // Within a day: tests and deadlines first, then homework, then reminders and events.
  const CHAT_KIND_ORDER = { test: 0, deadline: 1, hw: 2, reminder: 3, event: 4 };
  function chatOrder(a, b) { return CHAT_KIND_ORDER[a.kind] - CHAT_KIND_ORDER[b.kind] || sortDay(a, b); }
  function dayHeading(key) {
    const d = parse(key), rel = diffDays(today, key);
    return '*' + DOW[d.getDay()] + ', ' + fmtShort(d) + '*' + (rel === 0 ? ' (today)' : rel === 1 ? ' (tomorrow)' : '');
  }
  function shareRange(range) {
    if (range === 'week') {
      const s = mondayOf(parse(view === 'week' ? anchor : today));
      return { r: [ymd(s), ymd(addDays(s, 6))], title: 'week ' + isoWeek(s), sub: fmtShort(s) + ' to ' + fmtShort(addDays(s, 6)) };
    }
    if (range === 'month') {
      const a = parse(view === 'month' ? anchor : today);
      return { r: [ymd(new Date(a.getFullYear(), a.getMonth(), 1)), ymd(new Date(a.getFullYear(), a.getMonth() + 1, 0))], title: MONTHS[a.getMonth()] + ' ' + a.getFullYear(), sub: '' };
    }
    const e = addDays(parse(today), 13);
    return { r: [today, ymd(e)], title: 'next two weeks', sub: fmtShort(parse(today)) + ' to ' + fmtShort(e) };
  }
  function chatMessage(range, withNotes) {
    const p = shareRange(range), r = p.r;
    const groups = groupByDay(data.items.filter(function (t) { return overlaps(t, r[0], r[1]); }), function (t) { return t.start < r[0] ? r[0] : t.start; });
    const out = ['*' + CLASS_NAME + ' agenda, ' + p.title + '*'];
    if (p.sub) out.push(p.sub);
    if (!groups.length) out.push('', 'Nothing on.');
    groups.forEach(function (g) {
      out.push('', dayHeading(g.key));
      g.items.slice().sort(chatOrder).forEach(function (it) { out.push(chatEntry(it, withNotes)); });
    });
    if (siteUrl()) out.push('', 'Full agenda: ' + siteUrl());
    return out.join('\n');
  }
  function itemText(it) { return dayHeading(it.start) + '\n' + chatEntry(it, true) + (siteUrl() ? '\n\nFull agenda: ' + siteUrl() : ''); }
  // Shows the message the way a chat app would: bold, italics and the link.
  function chatPreview(text, box) {
    box.textContent = '';
    text.split('\n').forEach(function (raw) {
      // "- " lines show as bullets and indented lines as notes under them, as chat apps do.
      let line = raw, cls = 'cl';
      if (raw.indexOf('- ') === 0) { cls += ' li'; line = raw.slice(2); }
      else if (raw.indexOf('  ') === 0 && raw.trim()) { cls += ' sub'; line = raw.trim(); }
      const row = h('div', { class: cls });
      line.split(/(\*[^*\n]+\*|_[^_\n]+_)/g).forEach(function (part) {
        if (!part) return;
        if (/^\*[^*]+\*$/.test(part)) row.append(h('b', { text: part.slice(1, -1) }));
        else if (/^_[^_]+_$/.test(part)) row.append(h('i', { text: part.slice(1, -1) }));
        else if (/^https?:\/\/\S+$/.test(part)) row.append(h('a', { href: part, target: '_blank', rel: 'noopener noreferrer', text: part }));
        else row.append(part);
      });
      box.append(row);
    });
  }
  function openShare() {
    const def = searchQ || view === 'upcoming' ? 'next' : view === 'month' ? 'month' : 'week';
    const wk = mondayOf(parse(view === 'week' ? anchor : today)), thisWk = ymd(mondayOf(parse(today))) === ymd(wk);
    const mo = parse(view === 'month' ? anchor : today), thisMo = mo.getMonth() === parse(today).getMonth() && mo.getFullYear() === parse(today).getFullYear();
    $('label[for="sh-range-week"] span').firstChild.textContent = thisWk ? 'this week' : 'week ' + isoWeek(wk);
    $('label[for="sh-range-month"] span').firstChild.textContent = thisMo ? 'this month' : MONTHS[mo.getMonth()].toLowerCase();
    setRadio('sh-range', def);
    setRadio('sh-style', me.shareStyle === 'notes' ? 'notes' : 'short');
    $('#sh-native').hidden = !navigator.share;
    updateShare(false);
    openDialog($('#share'));
  }
  function updateShare(animate) {
    const style = radioVal('sh-style') === 'notes' ? 'notes' : 'short';
    if (me.shareStyle !== style) { me.shareStyle = style; saveMe(); }
    const text = chatMessage(radioVal('sh-range') || 'week', style === 'notes');
    $('#sh-text').value = text;
    chatPreview(text, $('#sh-preview'));
    if (animate) { const p = $('#sh-preview'); p.classList.remove('pop-in'); void p.offsetWidth; p.classList.add('pop-in'); }
    const b = $('#sh-copy');
    b.classList.remove('copied');
    b.querySelector('span').textContent = 'Copy message';
    $('#sh-meta').innerHTML = 'now <b>✓</b>';
    $('#sh-meta').classList.remove('sent');
    $('#sh-text').hidden = true;
    $('#sh-hint').hidden = true;
  }
  function onShareCopy() {
    const text = $('#sh-text').value;
    const done = function () {
      const b = $('#sh-copy'), bub = $('#sh-bubble'), meta = $('#sh-meta');
      b.classList.add('copied');
      b.querySelector('span').textContent = 'Copied!';
      bub.classList.remove('sent');
      void bub.offsetWidth;
      bub.classList.add('sent');
      meta.innerHTML = 'copied <b>✓✓</b>';
      meta.classList.add('sent');
      toast('Copied. Paste it in the group chat.');
    };
    const fail = function () {
      const ta = $('#sh-text');
      ta.hidden = false;
      $('#sh-hint').hidden = false;
      ta.focus();
      ta.select();
    };
    try { navigator.clipboard.writeText(text).then(done, fail); } catch (e) { fail(); }
  }
  function copyText(text, okMsg) {
    const fallback = function () {
      const ta = $('#cp-text');
      ta.value = text;
      openDialog($('#copy-dlg'));
      ta.focus();
      ta.select();
    };
    try {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, fallback);
    } catch (e) { fallback(); }
  }

  // ---------- toast ----------
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 4200);
  }

  // ---------- loading and live updates ----------
  async function refresh(first) {
    lastRefresh = Date.now();
    try {
      const d = await backend.load();
      applyData(d);
      const wasLoaded = loaded;
      loaded = true;
      loadError = false;
      if (!seenSaved) { seenSaved = true; me.seenAt = new Date().toISOString(); saveMe(); }
      render(first || !wasLoaded ? 'load' : 'soft');
      if (detailId && $('#detail').open) renderDetail(findItem(detailId));
      backend.history(1).then(function (rows) { lastChange = rows && rows[0] ? rows[0] : null; renderFoot(); }, function () {});
      return true;
    } catch (e) {
      if (!loaded) { loadError = true; render(null); }
      return false;
    }
  }
  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () { refresh(false); }, 350);
  }

  // ---------- sheets open and close with motion ----------
  function openDialog(d) {
    if (d.classList.contains('closing')) { d.classList.remove('closing'); clearTimeout(d._closeT); }
    if (!d.open) d.showModal();
  }
  function closeDialog(d) {
    if (!d || !d.open || d.classList.contains('closing')) return;
    if (reduceMotion()) { d.close(); return; }
    d.classList.add('closing');
    d._closeT = setTimeout(function () { d.classList.remove('closing'); d.close(); }, 220);
  }
  // An error message that gives a small shake, so it gets noticed.
  function say(el, msg) {
    el.textContent = msg;
    el.classList.remove('shake');
    if (msg) { void el.offsetWidth; el.classList.add('shake'); }
  }
  // <details> that slides open and shut.
  function animateDetails(det) {
    const summary = det.querySelector('summary'), body = summary.nextElementSibling;
    summary.addEventListener('click', function (e) {
      if (reduceMotion() || !body.animate) return;
      e.preventDefault();
      body.style.overflow = 'hidden';
      const end = function () { body.style.overflow = ''; };
      if (det.open) {
        const a = body.animate([{ height: body.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 260, easing: 'cubic-bezier(.5,0,.7,.4)' });
        a.onfinish = function () { det.open = false; end(); };
      } else {
        det.open = true;
        const a = body.animate([{ height: '0px', opacity: 0, transform: 'translateY(-6px)' }, { height: body.offsetHeight + 'px', opacity: 1, transform: 'none' }], { duration: 400, easing: 'cubic-bezier(.2,.8,.2,1)' });
        a.onfinish = end;
      }
    });
  }

  // ---------- unlocking ----------
  function openUnlock(then) {
    unlockThen = then || null;
    $('#u-lead').textContent = backend.live
      ? 'Write your name and the class code from the group chat. Your name shows on everything you add, so people know who wrote it.'
      : 'Preview mode, so no code is needed. Your name shows on everything you add.';
    $('#u-code-wrap').hidden = !backend.live;
    $('#u-name').value = (me.editor && me.editor.name) || me.lastName || '';
    $('#u-code').value = '';
    $('#u-error').textContent = '';
    openDialog($('#unlock'));
    ($('#u-name').value && backend.live ? $('#u-code') : $('#u-name')).focus();
  }
  async function onUnlockSubmit(e) {
    e.preventDefault();
    const name = $('#u-name').value.trim().replace(/\s+/g, ' ').slice(0, 40), code = $('#u-code').value.trim();
    const err = $('#u-error'), btn = $('#u-save');
    if (!name) { say(err, 'Write your name, so people know who added what.'); $('#u-name').focus(); return; }
    if (backend.live && !code) { say(err, 'Write the class code.'); $('#u-code').focus(); return; }
    btn.disabled = true;
    btn.textContent = 'Checking…';
    try {
      const ok = await backend.checkCode(code);
      if (!ok) { say(err, 'That code isn’t right. Check the group chat.'); $('#u-code').select(); return; }
      me.editor = { name: name, code: code };
      me.lastName = name;
      saveMe();
      closeDialog($('#unlock'));
      render('soft');
      toast('You can write in the agenda now, ' + name + '.');
      const next = unlockThen;
      unlockThen = null;
      if (next) next();
    } catch (ex) {
      say(err, ex.code === 'offline' ? 'You’re offline. Try again when you’re connected.' : 'Couldn’t check the code. Try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Unlock';
    }
  }
  function lock() {
    me.editor = null;
    saveMe();
    render('soft');
    toast('Locked. Your name and code were removed from this device.');
  }

  // ---------- saving changes ----------
  function setSaving(on) {
    saving = on;
    $('#app').classList.toggle('is-saving', on);
    ['#c-save', '#c-delete', '#s-save'].forEach(function (s) { $(s).disabled = on; });
    $('#c-save').textContent = on ? 'Saving…' : compItem ? 'Save changes' : 'Add to agenda';
  }
  // Runs one change through the backend; returns its result, or null after saying what went wrong.
  async function change(fn) {
    if (saving || !canEdit()) return null;
    setSaving(true);
    try {
      const res = await fn(me.editor.code, me.editor.name);
      await refresh(false);
      return res === undefined || res === null ? true : res;
    } catch (e) {
      const c = e && e.code;
      if (c === 'wrong_code') {
        me.editor = null;
        saveMe();
        document.querySelectorAll('dialog[open]').forEach(closeDialog);
        render('soft');
        toast('The class code has changed. Ask the group chat for the new one.');
      } else if (c === 'not_found') { toast('Someone else already deleted that.'); refresh(false); }
      else if (c === 'already_restored') toast('That one is already back.');
      else if (c === 'subject_exists') toast('That subject is already on the list.');
      else if (c === 'offline') toast('You’re offline. Check your connection and try again.');
      else { toast('Couldn’t save. Try again in a moment.'); refresh(false); }
      return null;
    } finally {
      setSaving(false);
    }
  }
  function flash(id) {
    requestAnimationFrame(function () {
      const el = document.querySelector('.entry[data-id="' + CSS.escape(String(id)) + '"]');
      if (el) { el.classList.add('landed'); try { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {} }
    });
  }

  // ---------- add / edit ----------
  function setRadio(name, val) {
    const el = document.getElementById(name + '-' + (val || 'all'));
    if (el) el.checked = true;
  }
  function radioVal(name) {
    const el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }
  function buildSubjectPicker(selected) {
    const box = $('#c-subjects');
    box.textContent = '';
    data.subjects.forEach(function (s) {
      const id = 'c-s-' + s.id.replace(/[^a-z0-9_-]/gi, '_');
      const input = h('input', { type: 'radio', name: 'c-subject', id: id, value: s.id });
      if (s.id === selected) input.checked = true;
      box.append(h('label', { class: 'tabp fam-' + s.fam, for: id, title: s.name }, input, h('span', { text: s.short })));
    });
  }
  function buildDayChoices() {
    const box = $('#c-days'), cur = $('#c-date').value;
    box.textContent = '';
    for (let i = 0; i < 8; i++) {
      const d = addDays(parse(today), i), key = ymd(d), id = 'c-day-' + key;
      const input = h('input', { type: 'radio', name: 'c-day', id: id, value: key });
      if (key === cur) input.checked = true;
      box.append(h('label', { class: 'choice', for: id }, input, h('span', { html: (i === 0 ? 'today' : i === 1 ? 'tomorrow' : DOW[d.getDay()] + ' ' + d.getDate()) + RING })));
    }
  }
  function syncDayChoices() {
    const cur = $('#c-date').value;
    document.querySelectorAll('input[name="c-day"]').forEach(function (r) { r.checked = r.value === cur; });
  }
  function checkedSubject() {
    const v = radioVal('c-subject');
    return v ? subj(v) : null;
  }
  function syncForm() {
    const s = checkedSubject(), wrap = $('#c-level-wrap'), show = !!(s && FAMS[s.fam].levels);
    if (show && wrap.hidden) { wrap.hidden = false; wrap.classList.remove('pop-in'); void wrap.offsetWidth; wrap.classList.add('pop-in'); }
    else if (!show) wrap.hidden = true;
    $('#c-title').placeholder = KIND_HINT[radioVal('c-kind') || 'hw'];
  }
  function fillForm(src) {
    setRadio('c-kind', src.kind || 'hw');
    buildSubjectPicker(src.subject || null);
    $('#c-title').value = src.title || '';
    $('#c-date').value = src.start || ymd(addDays(parse(today), 1));
    $('#c-end').value = src.end || '';
    $('#c-time').value = src.time || '';
    $('#c-place').value = src.place || '';
    setRadio('c-level', src.level || '');
    $('#c-important').checked = !!src.important;
    $('#c-notes').value = src.notes || '';
    buildDayChoices();
    syncForm();
  }
  function openComposer(o) {
    o = o || {};
    if (!canEdit()) { openUnlock(function () { openComposer(o); }); return; }
    const it = o.item || null;
    compItem = it;
    $('#c-heading').textContent = it ? 'Edit entry' : 'New entry';
    fillForm(it || { kind: 'hw', start: o.date || ymd(addDays(parse(today), 1)) });
    $('#c-delete').hidden = !it;
    resetDelete();
    $('#c-error').textContent = '';
    setSaving(false);
    openDialog($('#composer'));
    if (!matchMedia('(hover: none)').matches) (it ? $('#c-title') : document.querySelector('input[name="c-kind"]:checked')).focus();
  }
  async function onComposerSubmit(e) {
    e.preventDefault();
    if (saving) return;
    const err = $('#c-error');
    const s = checkedSubject(), title = $('#c-title').value.trim().replace(/\s+/g, ' '), start = $('#c-date').value;
    let end = $('#c-end').value;
    const time = $('#c-time').value;
    if (!s) { say(err, 'Pick a subject.'); return; }
    if (!title) { say(err, 'Give it a title.'); $('#c-title').focus(); return; }
    if (!isDate(start)) { say(err, 'Pick a date.'); return; }
    if (end && !isDate(end)) end = '';
    if (end && end < start) { say(err, 'The end date is before the start date.'); $('#c-end').focus(); return; }
    if (end === start) end = '';
    err.textContent = '';
    const f = {
      subject: s.id, kind: hasOwn(KINDS, radioVal('c-kind')) ? radioVal('c-kind') : 'hw', title: title.slice(0, 120),
      notes: $('#c-notes').value.trim().slice(0, 1000), start: start, end: end, time: isTime(time) ? time : '',
      place: $('#c-place').value.trim().slice(0, 80), level: FAMS[s.fam].levels ? radioVal('c-level') : '', important: $('#c-important').checked
    };
    const it = compItem;
    const res = await change(function (code, by) { return it ? backend.updateItem(code, it.id, f, by) : backend.addItem(code, f, by); });
    if (!res) return;
    closeDialog($('#composer'));
    showDate(f.start);
    toast(it ? 'Saved for everyone' : 'Added for everyone, ' + relLabel(f.start));
    if (res && res.id) flash(String(res.id));
  }
  function resetDelete() {
    clearTimeout(delTimer);
    const b = $('#c-delete');
    b.classList.remove('confirm');
    b.textContent = 'Delete';
  }
  async function onDelete() {
    const b = $('#c-delete'), it = compItem;
    if (!it || saving) return;
    if (!b.classList.contains('confirm')) {
      b.classList.add('confirm');
      b.textContent = 'Tap again to delete';
      clearTimeout(delTimer);
      delTimer = setTimeout(resetDelete, 4000);
      return;
    }
    resetDelete();
    closeDialog($('#composer'));
    document.querySelectorAll('.entry[data-id="' + CSS.escape(it.id) + '"]').forEach(function (el) { el.classList.add('scrap'); });
    await new Promise(function (r) { setTimeout(r, 380); });
    const res = await change(function (code, by) { return backend.deleteItem(code, it.id, by); });
    if (res) toast('Deleted. Bring it back from History of changes.');
  }

  // ---------- my subjects ----------
  function renderSubjectList() {
    const box = $('#s-list');
    const focusId = document.activeElement && box.contains(document.activeElement) ? document.activeElement.id : null;
    box.textContent = '';
    FAM_ORDER.forEach(function (f) {
      const list = data.subjects.filter(function (s) { return s.fam === f; });
      if (!list.length) return;
      const g = h('div', { class: 's-group' }, h('h3', { class: 's-fam', text: FAMS[f].label }));
      list.forEach(function (s) {
        const always = s.id === 'class', picked = always || hasOwn(me.picks, s.id);
        const id = 's-pick-' + s.id.replace(/[^a-z0-9_-]/gi, '_');
        const cb = h('input', { type: 'checkbox', id: id });
        cb.checked = picked;
        cb.disabled = always;
        cb.addEventListener('change', function () { setPick(s.id, cb.checked ? ((me.picks && me.picks[s.id]) || '') : null); });
        const row = h('div', { class: 's-row fam-' + f + (picked ? ' picked' : ''), 'data-sid': s.id }, h('label', { for: id }, cb, h('span', { class: 'tick-ui', html: TICK }), h('span', { class: 'tab', text: s.code }), h('span', { class: 's-name', text: s.name })));
        if (always) row.append(h('span', { class: 's-note', text: 'always shown' }));
        else if (FAMS[f].levels) {
          // Always there, slid away until the subject is ticked, so ticking animates instead of jumping.
          const lv = picked ? me.picks[s.id] || '' : '';
          const seg = h('div', { class: 'lv' + (picked ? '' : ' off'), role: 'group', 'aria-label': s.name + ' level', 'aria-hidden': picked ? null : 'true' });
          ['HL', 'SL'].forEach(function (L) {
            seg.append(h('button', { type: 'button', class: 'circ-btn', id: 'lv-' + id + '-' + L, 'data-l': L, 'aria-pressed': String(lv === L), tabindex: picked ? null : '-1', html: L + RING, onclick: function () { pickLevel(s.id, L); } }));
          });
          row.append(seg);
        }
        g.append(row);
      });
      box.append(g);
    });
    if (focusId) { const el = document.getElementById(focusId); if (el) el.focus(); }
  }
  function setPick(id, val) {
    const picks = me.picks ? Object.assign({}, me.picks) : {};
    if (val === null) delete picks[id];
    else picks[id] = val;
    me.picks = Object.keys(picks).length ? picks : null;
    me.nudged = true;
    saveMe();
    syncSubjectRow(id);
    render('soft');
  }
  function pickLevel(id, L) {
    const cur = (me.picks && me.picks[id]) || '';
    setPick(id, cur === L ? '' : L);
  }
  // Updates one row in place, so the tick draws and the HL/SL circles animate.
  function syncSubjectRow(id) {
    const row = document.querySelector('#s-list [data-sid="' + CSS.escape(id) + '"]');
    if (!row) return;
    const picked = id === 'class' || hasOwn(me.picks, id), lv = picked && me.picks ? me.picks[id] || '' : '';
    row.classList.toggle('picked', picked);
    const cb = row.querySelector('input[type="checkbox"]');
    if (cb) cb.checked = picked;
    const seg = row.querySelector('.lv');
    if (!seg) return;
    seg.classList.toggle('off', !picked);
    if (picked) seg.removeAttribute('aria-hidden'); else seg.setAttribute('aria-hidden', 'true');
    seg.querySelectorAll('button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(lv === b.dataset.l));
      b.tabIndex = picked ? 0 : -1;
    });
  }
  function openSubjects() {
    renderSubjectList();
    $('#s-add-wrap').hidden = !canEdit();
    $('#s-error').textContent = '';
    openDialog($('#subjects'));
  }
  async function onAddSubject(e) {
    e.preventDefault();
    const err = $('#s-error');
    const name = $('#s-name').value.trim().replace(/\s+/g, ' ').slice(0, 60), fam = $('#s-fam').value;
    let code = $('#s-code').value.trim();
    if (!name) { say(err, 'Write the subject name.'); return; }
    if (data.subjects.some(function (s) { return s.name.toLowerCase() === name.toLowerCase(); })) { say(err, 'That subject is already on the list.'); return; }
    code = (code || name).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, code ? 6 : 4) || 'SUBJ';
    err.textContent = '';
    const s = { name: name, short: name.length > 18 ? code : name, code: code, fam: hasOwn(FAMS, fam) ? fam : 'school' };
    const res = await change(function (c, by) { return backend.addSubject(c, s, by); });
    if (!res) return;
    $('#s-name').value = '';
    $('#s-code').value = '';
    renderSubjectList();
    toast(name + ' added for everyone');
  }

  // ---------- history ----------
  async function openHistory() {
    const body = $('#h-body');
    body.textContent = '';
    body.append(h('p', { class: 'hint-line', text: 'opening the history…' }));
    openDialog($('#history'));
    try {
      renderHistory(await backend.history(60));
    } catch (e) {
      body.textContent = '';
      body.append(h('p', { class: 'dlg-lead', text: 'Couldn’t load the history. Check your connection and try again.' }));
    }
  }
  function renderHistory(rows) {
    const body = $('#h-body');
    body.textContent = '';
    body.append(h('p', { class: 'dlg-lead', text: 'Every change anyone makes is written here with their name. Anyone who can write in the agenda can bring a deleted entry back.' }));
    if (!rows.length) { body.append(h('p', { class: 'hint-line', text: 'no changes yet' })); return; }
    const VERB = { add: 'added', edit: 'edited', delete: 'deleted', restore: 'brought back', subject: 'added the subject' };
    const list = h('ol', { class: 'hist' });
    rows.forEach(function (r, idx) {
      const d = (r.action === 'edit' ? r.detail && r.detail.after : r.detail) || {};
      const line = h('div', { class: 'hist-line' }, h('b', { text: r.who || 'Someone' }), ' ' + (VERB[r.action] || r.action) + ' ');
      if (r.action === 'subject') line.append(h('span', { text: d.name || '' }));
      else {
        const s = subj(d.subject);
        line.append(h('span', { class: 'tab fam-' + s.fam, text: s.code }), h('span', { class: 'hist-text', text: String(d.title || '') }));
      }
      const meta = h('div', { class: 'hist-meta' }, h('span', { text: ago(r.at) + (r.action !== 'subject' && isDate(d.start_date) ? ' · for ' + fmtDay(parse(d.start_date)) : '') }),
        r.action === 'edit' && r.detail && r.detail.before ? h('span', { text: describeEdit(r.detail.before, d) }) : null);
      const gone = !data.items.some(function (t) { return t.id === String(r.item_id); });
      if (r.action === 'delete' && gone) {
        meta.append(h('button', {
          type: 'button', class: 'tool', text: canEdit() ? 'bring it back' : 'unlock to bring it back',
          onclick: function () {
            if (!canEdit()) { closeDialog($('#history')); openUnlock(openHistory); return; }
            change(function (code, by) { return backend.restoreItem(code, r.id, by); }).then(function (res) {
              if (!res) return;
              toast('It’s back in the agenda');
              backend.history(60).then(renderHistory, function () {});
            });
          }
        }));
      }
      list.append(h('li', { class: 'act-' + r.action, style: '--i:' + Math.min(idx, 14) }, line, meta));
    });
    body.append(list);
  }

  // ---------- themes (saved on this device) ----------
  let themeTimer = null;
  function currentTheme() {
    const t = document.documentElement.getAttribute('data-theme');
    return t === 'white' || t === 'blue' ? t : 'classic';
  }
  function applyTheme(t, animate) {
    const root = document.documentElement;
    if (animate) {
      root.classList.add('theme-fade');
      clearTimeout(themeTimer);
      themeTimer = setTimeout(function () { root.classList.remove('theme-fade'); }, 650);
    }
    if (t === 'classic') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', t);
    try { if (t === 'classic') localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, t); } catch (e) {}
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
      if (!m.dataset.orig) m.dataset.orig = m.content;
      m.content = THEME_DESK[t] || m.dataset.orig;
    });
    document.querySelectorAll('[data-theme-pick]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.themePick === t)); });
  }

  // ---------- wiring ----------
  function wire() {
    applyTheme(currentTheme(), false);
    document.addEventListener('click', function (e) {
      const b = e.target.closest('[data-theme-pick]');
      if (b && b.dataset.themePick !== currentTheme()) applyTheme(b.dataset.themePick, true);
    });
    $('#wm-class').textContent = CLASS_NAME;
    document.title = CLASS_NAME + ' Agenda';
    $('#btn-copy').addEventListener('click', openShare);
    $('#sh-range').addEventListener('change', function () { updateShare(true); });
    $('#sh-style').addEventListener('change', function () { updateShare(true); });
    $('#sh-copy').addEventListener('click', onShareCopy);
    $('#sh-native').addEventListener('click', function () { if (navigator.share) navigator.share({ text: $('#sh-text').value }).catch(function () {}); });
    animateDetails($('#s-add-wrap'));
    $('#btn-subjects').addEventListener('click', openSubjects);
    $('#btn-add').addEventListener('click', function () { openComposer({}); });
    $('#fab').addEventListener('click', function () { openComposer({}); });
    $('#btn-history').addEventListener('click', openHistory);
    VIEWS.forEach(function (v) {
      $('#v-' + v).addEventListener('click', function () {
        const searching = !!searchQ;
        if (searching) { searchQ = ''; $('#search').value = ''; }
        if (v !== view || searching) setView(v);
      });
    });
    $('#prev').addEventListener('click', function () { shift(-1); });
    $('#next').addEventListener('click', function () { shift(1); });
    $('#btn-today').addEventListener('click', goToday);
    $('#search').addEventListener('input', function (e) { setSearch(e.target.value); });
    $('#search').addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.target.value = ''; setSearch(''); e.target.blur(); } });
    document.addEventListener('click', function (e) {
      const c = e.target.closest('[data-close]');
      if (c) closeDialog(c.closest('dialog'));
    });
    document.querySelectorAll('dialog').forEach(function (d) {
      d.addEventListener('click', function (e) { if (e.target === d) closeDialog(d); });
      d.addEventListener('cancel', function (e) { e.preventDefault(); closeDialog(d); });
    });
    $('#detail').addEventListener('close', function () { detailId = null; });
    $('#c-form').addEventListener('submit', onComposerSubmit);
    $('#u-form').addEventListener('submit', onUnlockSubmit);
    $('#c-subjects').addEventListener('change', syncForm);
    $('#c-kinds').addEventListener('change', syncForm);
    $('#c-days').addEventListener('change', function (e) { if (e.target.name === 'c-day') $('#c-date').value = e.target.value; });
    $('#c-date').addEventListener('input', syncDayChoices);
    $('#c-delete').addEventListener('click', onDelete);
    $('#composer').addEventListener('close', function () { resetDelete(); compItem = null; });
    $('#s-all').addEventListener('click', function () {
      const ids = me.picks ? Object.keys(me.picks) : [];
      me.picks = null;
      showAll = false;
      saveMe();
      ids.forEach(syncSubjectRow);
      render('soft');
    });
    $('#s-add').addEventListener('submit', onAddSubject);

    document.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const tg = e.target;
      if (tg && (/^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName) || tg.isContentEditable)) return;
      if (document.querySelector('dialog[open]')) return;
      if (e.key === 'ArrowLeft') shift(-1);
      else if (e.key === 'ArrowRight') shift(1);
      else if (e.key === 't') goToday();
      else if (e.key === 'n') { e.preventDefault(); openComposer({}); }
      else if (e.key === '/') { e.preventDefault(); $('#search').focus(); }
    });
    const main = $('#main');
    // Only a quick, clearly sideways swipe turns the page, so scrolling never turns it by accident.
    let sx = null, sy = 0, st = 0;
    main.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { sx = null; return; }
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now();
    }, { passive: true });
    main.addEventListener('touchend', function (e) {
      if (sx === null) return;
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      sx = null;
      if (Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(dy) * 2.5 && Date.now() - st < 600) shift(dx < 0 ? 1 : -1);
    }, { passive: true });
    window.addEventListener('hashchange', function () {
      const v = (location.hash || '').slice(1);
      if (VIEWS.indexOf(v) >= 0 && v !== view) setView(v);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      const t = ymd(new Date());
      if (t !== today) { today = t; render(null); }
      if (Date.now() - lastRefresh > 30000) refresh(false);
    });
  }

  // ---------- boot ----------
  document.getElementById('app').innerHTML = SHELL;
  wire();
  render(null);
  refresh(true);
  backend.subscribe(scheduleRefresh, function (on) { liveOn = on; renderFoot(); });
})();
