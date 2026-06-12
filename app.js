/* ============================================================
   WorkPulse HRMS — Employee Dashboard v2
   ============================================================ */

var CURRENT_USER = (function() {
  try {
    var raw = sessionStorage.getItem('wp_user');
    if (!raw) { window.location.replace('login.html'); return null; }
    var u = JSON.parse(raw);
    if (!u || u.role === 'admin') { window.location.replace('login.html'); return null; }
    return u;
  } catch(e) { window.location.replace('login.html'); return null; }
})();
if (!CURRENT_USER) { throw 0; }

// ── USER INFO ─────────────────────────────────────────────────
document.getElementById('sidebarAvatar').textContent   = CURRENT_USER.initials;
document.getElementById('sidebarName').textContent     = CURRENT_USER.name;
document.getElementById('sidebarRole').textContent     = CURRENT_USER.designation;
document.getElementById('topbarAvatar').textContent    = CURRENT_USER.initials;
document.getElementById('profileAvatarLg').textContent = CURRENT_USER.initials;
document.getElementById('profileName').textContent     = CURRENT_USER.name;
document.getElementById('profileRole').textContent     = CURRENT_USER.designation + ' — ' + CURRENT_USER.dept;

// ── LOGOUT ────────────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', function(e) {
  e.preventDefault();
  sessionStorage.removeItem('wp_user');
  window.location.href = 'login.html';
});

// ── NAVIGATION ────────────────────────────────────────────────
document.querySelectorAll('.nav-item[data-screen]').forEach(function(item) {
  item.addEventListener('click', function(e) {
    e.preventDefault();
    var screen = this.getAttribute('data-screen');
    document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
    var el = document.getElementById('screen-' + screen);
    if (el) el.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
    this.classList.add('active');
    document.getElementById('sidebar').classList.remove('open');
  });
});
document.getElementById('menuToggle').addEventListener('click', function() {
  document.getElementById('sidebar').classList.toggle('open');
});

// ── LIVE CLOCK ────────────────────────────────────────────────
setInterval(function() {
  var now = new Date();
  var el = document.getElementById('liveClock');
  if (el) el.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes());
}, 1000);

// ── GREETING ─────────────────────────────────────────────────
(function() {
  var h = new Date().getHours();
  var g = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
  document.getElementById('greetingText').textContent = g + ', ' + CURRENT_USER.name.split(' ')[0] + ' 👋';
  var dl = document.getElementById('todayDateLabel');
  if (dl) dl.textContent = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
})();

// ── HELPERS ───────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2,'0'); }
function ftime(d) { return d ? pad(d.getHours())+':'+pad(d.getMinutes()) : '--:--'; }
function fhms(s)  { return pad(Math.floor(s/3600))+':'+pad(Math.floor((s%3600)/60))+':'+pad(s%60); }
function fhm(s)   { return Math.floor(s/3600)+'h '+Math.floor((s%3600)/60)+'m'; }
function todayKey() {
  var d = new Date();
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
}
function fdate(s) {
  try { return new Date(s+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }
  catch(e) { return s; }
}
function daysBetween(a,b) {
  return Math.max(1,Math.round((new Date(b)-new Date(a))/(1000*60*60*24))+1);
}

// ── SESSION STORE ─────────────────────────────────────────────
// Structure per day: { date, checkIn, checkOut, totalWorkSecs, segments:[], breaks:[], permissions:[] }
// segment: { type:'work'|'break', label, start (ISO), end (ISO)|null }

var SESSION_KEY = 'wp_session_' + CURRENT_USER.id;

function getSession() {
  try {
    var raw = localStorage.getItem(SESSION_KEY);
    var s = raw ? JSON.parse(raw) : null;
    if (s && s.date === todayKey()) return s;
    return null;
  } catch(e) { return null; }
}

function saveSession(s) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

function newSession() {
  return {
    date: todayKey(),
    checkIn: null,
    checkOut: null,
    totalWorkSecs: 0,
    segments: [],
    breaks: [],
    permissions: []
  };
}

// Calculate total worked seconds from segments (only 'work' type)
function calcWorkedSecs(segments) {
  var total = 0;
  segments.forEach(function(seg) {
    if (seg.type !== 'work') return;
    var start = new Date(seg.start).getTime();
    var end   = seg.end ? new Date(seg.end).getTime() : Date.now();
    total += Math.floor((end - start) / 1000);
  });
  return total;
}

function calcBreakSecs(segments) {
  var total = 0;
  segments.forEach(function(seg) {
    if (seg.type !== 'break') return;
    var start = new Date(seg.start).getTime();
    var end   = seg.end ? new Date(seg.end).getTime() : Date.now();
    total += Math.floor((end - start) / 1000);
  });
  return total;
}

// ── TIMER STATE ───────────────────────────────────────────────
var timerInterval = null;
var currentSession = getSession() || null;
var isWorking = false;  // currently in a work segment

if (currentSession) {
  // Restore state: check if last segment is open work segment
  var segs = currentSession.segments;
  if (segs.length > 0) {
    var last = segs[segs.length - 1];
    if (last.type === 'work' && !last.end) {
      isWorking = true;
    }
  }
  if (isWorking) startTick();
}

function startTick() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(refreshCheckin, 1000);
}

function stopTick() {
  clearInterval(timerInterval);
  timerInterval = null;
}

// ── CHECKIN UI ────────────────────────────────────────────────
function refreshCheckin() {
  var s = currentSession;
  var workedSecs = s ? calcWorkedSecs(s.segments) : 0;
  var breakSecs  = s ? calcBreakSecs(s.segments)  : 0;

  var dot   = document.getElementById('checkinDot');
  var ttl   = document.getElementById('checkinTitle');
  var sub   = document.getElementById('checkinSub');
  var btn   = document.getElementById('checkInBtn');
  var icon  = document.getElementById('checkInBtnIcon');
  var txt   = document.getElementById('checkInBtnText');
  var brkEl = document.getElementById('breakInfo');

  if (!dot) return;

  if (!s) {
    dot.className = 'checkin-status-dot';
    ttl.textContent = 'Not Checked In';
    sub.textContent = 'Tap Check In to start your session';
    btn.className = 'btn btn-checkin'; btn.disabled = false;
    btn.style.opacity = '1'; btn.style.cursor = 'pointer';
    icon.textContent = '▶'; txt.textContent = 'Check In';
    if (brkEl) brkEl.style.display = 'none';
  } else if (s.checkOut) {
    dot.className = 'checkin-status-dot done';
    ttl.textContent = 'Session Complete';
    sub.textContent = 'Total worked: ' + fhm(workedSecs) + '  |  Break: ' + fhm(breakSecs);
    btn.className = 'btn btn-checkin'; btn.disabled = true;
    btn.style.opacity = '.5'; btn.style.cursor = 'not-allowed';
    icon.textContent = '✓'; txt.textContent = 'Checked Out';
    if (brkEl) brkEl.style.display = 'none';
    stopTick();
  } else if (isWorking) {
    dot.className = 'checkin-status-dot active';
    ttl.textContent = 'Currently Working';
    sub.textContent = 'Since ' + ftime(new Date(s.checkIn));
    btn.className = 'btn btn-checkin checked-in'; btn.disabled = true;
    btn.style.opacity = '.7'; btn.style.cursor = 'default';
    icon.textContent = '●'; txt.textContent = 'Working';
    if (brkEl) brkEl.style.display = 'none';
  } else {
    dot.className = 'checkin-status-dot break';
    var lastBreak = s.segments.filter(function(sg){return sg.type==='break'&&!sg.end;}).pop();
    ttl.textContent = 'On Break' + (lastBreak ? ' — ' + lastBreak.label : '');
    sub.textContent = 'Break started at ' + (lastBreak ? ftime(new Date(lastBreak.start)) : '--:--');
    btn.className = 'btn btn-checkin'; btn.disabled = true;
    btn.style.opacity = '.7'; btn.style.cursor = 'default';
    icon.textContent = '⏸'; txt.textContent = 'On Break';
    if (brkEl) brkEl.style.display = 'none';
  }

  // Refresh break button states
  if (typeof refreshBreakButtons === 'function') refreshBreakButtons();

  // Timer display
  document.getElementById('checkinTimer').textContent    = fhms(workedSecs);
  document.getElementById('displayCheckIn').textContent  = s ? ftime(new Date(s.checkIn)) : '--:--';
  document.getElementById('displayCheckOut').textContent = (s && s.checkOut) ? ftime(new Date(s.checkOut)) : '--:--';
  document.getElementById('statCheckIn').textContent     = s ? ftime(new Date(s.checkIn)) : '--:--';
  document.getElementById('statHours').textContent       = fhm(workedSecs);

  var ai = document.getElementById('attCheckIn'), ao = document.getElementById('attCheckOut');
  var at = document.getElementById('attTotalHours'), as2 = document.getElementById('attStatus');
  if (ai) ai.textContent = s ? ftime(new Date(s.checkIn)) : '--:--';
  if (ao) ao.textContent = (s && s.checkOut) ? ftime(new Date(s.checkOut)) : '--:--';
  if (at) at.textContent = fhm(workedSecs);
  if (as2) {
    if (!s)           as2.innerHTML = '<span class="badge badge-yellow">Not Started</span>';
    else if (s.checkOut) as2.innerHTML = '<span class="badge badge-blue">Complete</span>';
    else if (isWorking)  as2.innerHTML = '<span class="badge badge-green">Working</span>';
    else                 as2.innerHTML = '<span class="badge badge-yellow">On Break</span>';
  }
}

// ── CHECKIN BUTTON ────────────────────────────────────────────
document.getElementById('checkInBtn').addEventListener('click', function() {
  var now = new Date().toISOString();

  if (!currentSession) {
    // First check-in of the day
    currentSession = newSession();
    currentSession.checkIn = now;
    currentSession.segments.push({ type:'work', label:'Work', start:now, end:null });
    isWorking = true;
    saveSession(currentSession);
    startTick();

  } else if (isWorking) {
    // Currently working → start break: show break picker
    showBreakPicker();
    return;

  } else {
    // On break → resume work
    // Close open break segment
    var segs = currentSession.segments;
    for (var i = segs.length-1; i >= 0; i--) {
      if (segs[i].type === 'break' && !segs[i].end) {
        segs[i].end = now;
        currentSession.breaks.push({
          label: segs[i].label,
          start: segs[i].start,
          end:   now,
          durationMins: Math.round((new Date(now) - new Date(segs[i].start)) / 60000)
        });
        break;
      }
    }
    // Open new work segment
    currentSession.segments.push({ type:'work', label:'Work', start:now, end:null });
    isWorking = true;
    saveSession(currentSession);
    startTick();
  }
  refreshCheckin();
});

// ── CHECKOUT BUTTON ───────────────────────────────────────────
var checkOutBtn = document.getElementById('checkOutBtn');
if (checkOutBtn) {
  checkOutBtn.addEventListener('click', function() {
    if (!currentSession) return;
    var now = new Date().toISOString();
    // Close any open segment
    currentSession.segments.forEach(function(seg) {
      if (!seg.end) seg.end = now;
    });
    currentSession.checkOut = now;
    isWorking = false;
    saveSession(currentSession);
    stopTick();
    refreshCheckin();
    buildSessionTimeline();
    showToast('✅ Checked out successfully!');
  });
}

// ── DEDICATED BREAK BUTTONS ───────────────────────────────────
var BREAK_BTNS = [
  { id: 'breakMorningBtn', label: 'Morning Break' },
  { id: 'breakLunchBtn',   label: 'Lunch Break'   },
  { id: 'breakEveningBtn', label: 'Evening Break' },
];

function refreshBreakButtons() {
  var s = currentSession;

  // Find which break (if any) is currently open
  var activeBreakLabel = null;
  if (s && !s.checkOut) {
    var segs = s.segments || [];
    for (var i = segs.length - 1; i >= 0; i--) {
      if (segs[i].type === 'break' && !segs[i].end) {
        activeBreakLabel = segs[i].label;
        break;
      }
    }
  }

  BREAK_BTNS.forEach(function(bb) {
    var btn = document.getElementById(bb.id);
    if (!btn) return;

    var isThisActive = (activeBreakLabel === bb.label);
    var sessionStarted = s && !s.checkOut;

    if (!sessionStarted) {
      // No session — all disabled
      btn.disabled = true;
      btn.style.opacity = '0.4';
      btn.style.cursor  = 'not-allowed';
      btn.textContent   = bb.label === 'Morning Break' ? '☕ Morning Break' :
                          bb.label === 'Lunch Break'   ? '🍽 Lunch' : '🌇 Evening Break';
      btn.className = 'btn btn-break-named';
    } else if (isThisActive) {
      // This break is running → show Resume
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor  = 'pointer';
      btn.textContent   = '▶ Resume';
      btn.className = 'btn btn-break-resume';
    } else if (activeBreakLabel && !isThisActive) {
      // Another break is running → disable others
      btn.disabled = true;
      btn.style.opacity = '0.4';
      btn.style.cursor  = 'not-allowed';
      btn.textContent   = bb.label === 'Morning Break' ? '☕ Morning Break' :
                          bb.label === 'Lunch Break'   ? '🍽 Lunch' : '🌇 Evening Break';
      btn.className = 'btn btn-break-named';
    } else if (!isWorking) {
      // Working hasn't started yet (just resumed or not started)
      btn.disabled = true;
      btn.style.opacity = '0.4';
      btn.style.cursor  = 'not-allowed';
      btn.className = 'btn btn-break-named';
    } else {
      // Working — break available
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor  = 'pointer';
      btn.textContent   = bb.label === 'Morning Break' ? '☕ Morning Break' :
                          bb.label === 'Lunch Break'   ? '🍽 Lunch' : '🌇 Evening Break';
      btn.className = 'btn btn-break-named';
    }
  });

  // Check Out button — only show when session started and not checked out
  var coBtn = document.getElementById('checkOutBtn');
  if (coBtn) {
    var canCheckOut = s && !s.checkOut && s.checkIn;
    coBtn.disabled      = !canCheckOut;
    coBtn.style.opacity = canCheckOut ? '1' : '0.4';
    coBtn.style.cursor  = canCheckOut ? 'pointer' : 'not-allowed';
  }

  // Permission button — only when session active
  var permBtn2 = document.getElementById('permissionBtn');
  if (permBtn2) {
    var canPerm = s && !s.checkOut;
    permBtn2.disabled      = !canPerm;
    permBtn2.style.opacity = canPerm ? '1' : '0.4';
    permBtn2.style.cursor  = canPerm ? 'pointer' : 'not-allowed';
  }
}

// Wire break buttons
BREAK_BTNS.forEach(function(bb) {
  var btn = document.getElementById(bb.id);
  if (!btn) return;
  btn.addEventListener('click', function() {
    if (!currentSession || currentSession.checkOut) return;
    var now = new Date().toISOString();

    // Check if this break is currently active → Resume
    var segs = currentSession.segments;
    var openBreak = null;
    for (var i = segs.length - 1; i >= 0; i--) {
      if (segs[i].type === 'break' && !segs[i].end) { openBreak = segs[i]; break; }
    }

    if (openBreak && openBreak.label === bb.label) {
      // Resume: close this break, open work segment
      openBreak.end = now;
      currentSession.breaks.push({
        label: openBreak.label, start: openBreak.start, end: now,
        durationMins: Math.round((new Date(now) - new Date(openBreak.start)) / 60000)
      });
      currentSession.segments.push({ type:'work', label:'Work', start:now, end:null });
      isWorking = true;
      saveSession(currentSession);
      startTick();
      showToast('▶ Resumed after ' + openBreak.label);
    } else {
      // Start this break
      startBreak(bb.label);
    }
    refreshBreakButtons();
    buildSessionTimeline();
  });
});

// Initial button state
refreshBreakButtons();

function startBreak(label) {
  var now = new Date().toISOString();
  // Close current work segment
  currentSession.segments.forEach(function(seg) {
    if (seg.type === 'work' && !seg.end) seg.end = now;
  });
  // Open break segment
  currentSession.segments.push({ type:'break', label:label, start:now, end:null });
  isWorking = false;
  saveSession(currentSession);
  refreshCheckin();
  showToast('☕ ' + label + ' started');
}

// ── PERMISSION REQUEST ────────────────────────────────────────
var permBtn = document.getElementById('permissionBtn');
if (permBtn) {
  permBtn.addEventListener('click', function() { showPermissionModal(); });
}

function showPermissionModal() {
  var existing = document.getElementById('permModalEl');
  if (existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.id = 'permModalEl';
  overlay.className = 'modal-overlay open';
  overlay.innerHTML =
    '<div class="modal" style="max-width:420px;">' +
      '<div class="modal-header"><h3>🚶 Request Permission</h3><button class="modal-close" id="closePermModal">✕</button></div>' +
      '<div class="modal-body">' +
        '<div class="form-group"><label>Leave Type</label>' +
          '<select class="form-control" id="permType">' +
            '<option>Early Leave</option><option>Late Arrival</option><option>Outdoor Work</option><option>Personal Emergency</option><option>Other</option>' +
          '</select></div>' +
        '<div class="form-row">' +
          '<div class="form-group"><label>From Time</label><input type="time" class="form-control" id="permFrom"/></div>' +
          '<div class="form-group"><label>To Time</label><input type="time" class="form-control" id="permTo"/></div>' +
        '</div>' +
        '<div class="form-group"><label>Reason</label><textarea class="form-control" rows="3" id="permReason" placeholder="Reason for permission..."></textarea></div>' +
        '<div id="permError" style="color:var(--red);font-size:12px;display:none;"></div>' +
      '</div>' +
      '<div class="modal-footer">' +
        '<button class="btn btn-outline" id="cancelPermModal">Cancel</button>' +
        '<button class="btn btn-primary" id="submitPermBtn">Submit Request</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  document.getElementById('closePermModal').addEventListener('click',  function() { overlay.remove(); });
  document.getElementById('cancelPermModal').addEventListener('click', function() { overlay.remove(); });
  document.getElementById('submitPermBtn').addEventListener('click', function() {
    var type   = document.getElementById('permType').value;
    var from   = document.getElementById('permFrom').value;
    var to     = document.getElementById('permTo').value;
    var reason = document.getElementById('permReason').value.trim();
    var err    = document.getElementById('permError');
    if (!from || !to || !reason) { err.textContent='All fields required.'; err.style.display='block'; return; }

    var perm = { type:type, from:from, to:to, reason:reason, status:'pending', submittedAt:new Date().toISOString(), empId:CURRENT_USER.id, empName:CURRENT_USER.name, dept:CURRENT_USER.dept, date:todayKey() };
    var perms = [];
    try { perms = JSON.parse(localStorage.getItem('wp_permissions_'+CURRENT_USER.id)||'[]'); } catch(e){}
    perms.push(perm);
    localStorage.setItem('wp_permissions_'+CURRENT_USER.id, JSON.stringify(perms));

    // Also push to admin queue
    var adminPerms = [];
    try { adminPerms = JSON.parse(localStorage.getItem('wp_all_permissions')||'[]'); } catch(e){}
    adminPerms.push(perm);
    localStorage.setItem('wp_all_permissions', JSON.stringify(adminPerms));

    overlay.remove();
    showToast('✅ Permission request submitted!');
    buildSessionTimeline();
  });
}

// ── SESSION TIMELINE ─────────────────────────────────────────
function buildSessionTimeline() {
  var container = document.getElementById('sessionTimeline');
  if (!container) return;
  container.innerHTML = '';
  var s = currentSession;
  if (!s || !s.segments.length) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px;">No session data yet for today.</p>';
    return;
  }

  // Build timeline from segments
  var colors = { work:'#6366f1', break:'#f59e0b', permission:'#3b82f6' };
  var icons  = { work:'💼', break:'☕', permission:'🚶' };

  s.segments.forEach(function(seg) {
    var startT = new Date(seg.start);
    var endT   = seg.end ? new Date(seg.end) : new Date();
    var durSecs = Math.floor((endT - startT) / 1000);
    var isOpen  = !seg.end;

    var row = document.createElement('div');
    row.className = 'timeline-row';
    row.innerHTML =
      '<div class="timeline-dot" style="background:' + (colors[seg.type]||'#6366f1') + '"></div>' +
      '<div class="timeline-content">' +
        '<div class="timeline-label">' + (icons[seg.type]||'') + ' ' + seg.label + (isOpen ? ' <span class="badge badge-green" style="font-size:9px;">Live</span>' : '') + '</div>' +
        '<div class="timeline-time">' + ftime(startT) + ' → ' + (seg.end ? ftime(endT) : 'Ongoing') + ' &nbsp;|&nbsp; <strong>' + fhm(durSecs) + '</strong></div>' +
      '</div>';
    container.appendChild(row);
  });

  // Permissions for today
  var perms = [];
  try { perms = JSON.parse(localStorage.getItem('wp_permissions_'+CURRENT_USER.id)||'[]'); } catch(e){}
  var todayPerms = perms.filter(function(p){ return p.date === todayKey(); });
  todayPerms.forEach(function(p) {
    var row = document.createElement('div');
    row.className = 'timeline-row';
    row.innerHTML =
      '<div class="timeline-dot" style="background:#3b82f6"></div>' +
      '<div class="timeline-content">' +
        '<div class="timeline-label">🚶 ' + p.type + ' <span class="badge ' + (p.status==='approved'?'badge-green':p.status==='rejected'?'badge-red':'badge-yellow') + '" style="font-size:9px;">' + p.status + '</span></div>' +
        '<div class="timeline-time">' + p.from + ' → ' + p.to + ' | ' + p.reason + '</div>' +
      '</div>';
    container.appendChild(row);
  });
}
buildSessionTimeline();

// ── CALENDAR ─────────────────────────────────────────────────
(function() {
  var grid = document.getElementById('calendarGrid');
  if (!grid) return;
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(function(d) {
    var h = document.createElement('div'); h.className='cal-day-head'; h.textContent=d; grid.appendChild(h);
  });
  var startDay = 1, today = new Date().getDate();
  for (var e=0; e<startDay; e++) {
    var em=document.createElement('div'); em.className='cal-day empty'; grid.appendChild(em);
  }
  for (var d=1; d<=30; d++) {
    var cell=document.createElement('div');
    var dow=(startDay+d-1)%7;
    var cls='cal-day';
    if (d===today) cls+=' today';
    else if (dow===0||dow===6) cls+=' weekend';
    else if (d<today) {
      var attRecs = [];
      try { attRecs = JSON.parse(localStorage.getItem('wp_attendance')||'[]'); } catch(ee){}
      var dateStr = new Date().getFullYear()+'-06-'+pad(d);
      var rec = attRecs.find(function(r){return r.empId===CURRENT_USER.id && r.date===dateStr;});
      cls += rec ? (rec.status==='absent'?' absent':rec.status==='leave'?' leave':' present') : ' present';
    }
    cell.className=cls; cell.textContent=d; grid.appendChild(cell);
  }
})();

// ── LEAVE BALANCE ─────────────────────────────────────────────
function getLeaveBalance() {
  var key = 'wp_leave_balance_'+CURRENT_USER.id;
  try {
    var raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch(e){}
  return [
    {label:'Casual Leave', used:3, total:12, color:'#6366f1'},
    {label:'Sick Leave',   used:2, total:8,  color:'#22c55e'},
    {label:'Earned Leave', used:5, total:15, color:'#f59e0b'},
    {label:'Comp Off',     used:1, total:4,  color:'#3b82f6'}
  ];
}

(function() {
  var c = document.getElementById('leaveBars');
  if (!c) return;
  c.innerHTML = '';
  getLeaveBalance().forEach(function(t) {
    var pct = Math.min(100, Math.round(t.used/t.total*100));
    var wrap=document.createElement('div'); wrap.className='leave-bar-item';
    var lbl=document.createElement('div'); lbl.className='leave-bar-label';
    lbl.innerHTML='<span>'+t.label+'</span><span>'+t.used+' / '+t.total+' days</span>';
    var track=document.createElement('div'); track.className='leave-bar-track';
    var fill=document.createElement('div'); fill.className='leave-bar-fill';
    fill.style.width=pct+'%'; fill.style.background=t.color;
    track.appendChild(fill); wrap.appendChild(lbl); wrap.appendChild(track); c.appendChild(wrap);
  });
})();

// ── RECENT REQUESTS ───────────────────────────────────────────
function getLeaves() {
  try { return JSON.parse(localStorage.getItem('wp_leaves_'+CURRENT_USER.id)||'[]'); } catch(e){ return []; }
}
function saveLeaves(list) { localStorage.setItem('wp_leaves_'+CURRENT_USER.id, JSON.stringify(list)); }

function buildRecentRequests() {
  var c = document.getElementById('recentRequests');
  if (!c) return;
  c.innerHTML = '';
  var bm={pending:'badge-yellow',approved:'badge-green',rejected:'badge-red'};
  getLeaves().slice(-4).reverse().forEach(function(r) {
    var item=document.createElement('div'); item.className='request-item';
    var info=document.createElement('div'); info.className='request-info';
    var tp=document.createElement('div'); tp.className='request-type'; tp.textContent=r.type;
    var dt=document.createElement('div'); dt.className='request-date'; dt.textContent=fdate(r.from)+' – '+fdate(r.to);
    info.appendChild(tp); info.appendChild(dt);
    var b=document.createElement('span'); b.className='badge '+(bm[r.status]||'badge-blue');
    b.textContent=r.status.charAt(0).toUpperCase()+r.status.slice(1);
    item.appendChild(info); item.appendChild(b); c.appendChild(item);
  });
}
buildRecentRequests();

// ── HOLIDAYS ─────────────────────────────────────────────────
(function() {
  var c = document.getElementById('holidayList');
  if (!c) return;
  var upcoming = getHolidays().filter(function(h) {
    return new Date(h.date+'T00:00:00') >= new Date(new Date().toDateString());
  }).slice(0,5);
  upcoming.forEach(function(h) {
    var item=document.createElement('div'); item.className='holiday-item';
    var info=document.createElement('div');
    var nm=document.createElement('div'); nm.className='holiday-name'; nm.textContent=h.name;
    var dt=document.createElement('div'); dt.className='holiday-date'; dt.textContent=formatHolidayDate(h.date)+' — '+h.day;
    info.appendChild(nm); info.appendChild(dt);
    var b=document.createElement('span'); b.className='badge '+(h.type==='National'?'badge-blue':'badge-green'); b.textContent=h.type;
    item.appendChild(info); item.appendChild(b); c.appendChild(item);
  });
})();

// ── LEAVE MANAGEMENT ─────────────────────────────────────────
function buildLeaveHistory() {
  var tbody = document.getElementById('leaveHistoryBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  var bm={pending:'badge-yellow',approved:'badge-green',rejected:'badge-red'};
  var leaves = getLeaves();
  if (!leaves.length) {
    var tr=document.createElement('tr'); var td=document.createElement('td'); td.colSpan=6;
    td.style.cssText='text-align:center;padding:24px;color:var(--text-muted);'; td.textContent='No leave requests yet.';
    tr.appendChild(td); tbody.appendChild(tr); return;
  }
  leaves.slice().reverse().forEach(function(r) {
    var tr=document.createElement('tr');
    function td(t){var c=document.createElement('td');c.textContent=t;return c;}
    tr.appendChild(td(r.type)); tr.appendChild(td(fdate(r.from))); tr.appendChild(td(fdate(r.to))); tr.appendChild(td(r.days+' day'+(r.days>1?'s':'')));
    tr.appendChild(td(r.reason));
    var st=document.createElement('td'); var b=document.createElement('span');
    b.className='badge '+(bm[r.status]||'badge-blue'); b.textContent=r.status.charAt(0).toUpperCase()+r.status.slice(1);
    st.appendChild(b); tr.appendChild(st); tbody.appendChild(tr);
  });
}
buildLeaveHistory();

// Refresh every 10s for admin decisions
setInterval(function() { buildLeaveHistory(); buildRecentRequests(); }, 10000);

// ── LEAVE MODAL ───────────────────────────────────────────────
var leaveModal = document.getElementById('leaveModal');
document.getElementById('openLeaveModal').addEventListener('click', function() {
  document.getElementById('leaveType').value   = 'Casual Leave';
  document.getElementById('leaveFrom').value   = '';
  document.getElementById('leaveTo').value     = '';
  document.getElementById('leaveReason').value = '';
  document.getElementById('leaveFormError').style.display = 'none';
  leaveModal.classList.add('open');
});
function closeLeaveModal() { leaveModal.classList.remove('open'); }
document.getElementById('closeLeaveModal').addEventListener('click', closeLeaveModal);
document.getElementById('cancelLeave').addEventListener('click', closeLeaveModal);
leaveModal.addEventListener('click', function(e) { if (e.target===leaveModal) closeLeaveModal(); });

document.getElementById('submitLeaveBtn').addEventListener('click', function() {
  var type   = document.getElementById('leaveType').value;
  var from   = document.getElementById('leaveFrom').value;
  var to     = document.getElementById('leaveTo').value;
  var reason = document.getElementById('leaveReason').value.trim();
  var err    = document.getElementById('leaveFormError');
  err.style.display = 'none';
  if (!from)     { err.textContent='Please select a From date.'; err.style.display='block'; return; }
  if (!to)       { err.textContent='Please select a To date.';   err.style.display='block'; return; }
  if (new Date(to) < new Date(from)) { err.textContent='To date cannot be before From date.'; err.style.display='block'; return; }
  if (!reason)   { err.textContent='Please enter a reason.';     err.style.display='block'; return; }

  var leaves = getLeaves();
  var newId  = leaves.reduce(function(m,l){return l.id>m?l.id:m;},0)+1;
  var entry  = { id:newId, type:type, from:from, to:to, days:daysBetween(from,to), reason:reason, status:'pending', empId:CURRENT_USER.id, submittedBy:CURRENT_USER.name, dept:CURRENT_USER.dept, initials:CURRENT_USER.initials, submittedAt:new Date().toISOString() };
  leaves.push(entry);
  saveLeaves(leaves);
  var q=[]; try{q=JSON.parse(localStorage.getItem('wp_approvals')||'[]');}catch(e){}
  q.push(entry); localStorage.setItem('wp_approvals',JSON.stringify(q));
  closeLeaveModal();
  buildLeaveHistory();
  showToast('✅ Leave request submitted!');
});

// ── ATTENDANCE LOG ────────────────────────────────────────────
(function() {
  var tbody = document.getElementById('attendanceLogBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  var recs = [];
  try { recs = JSON.parse(localStorage.getItem('wp_attendance')||'[]'); } catch(e){}
  var myRecs = recs.filter(function(r){ return r.empId === CURRENT_USER.id; });

  // Also add today from live session
  var todayRec = myRecs.find(function(r){ return r.date === todayKey(); });
  if (!todayRec && currentSession) {
    var ws = calcWorkedSecs(currentSession.segments);
    myRecs.push({ empId:CURRENT_USER.id, date:todayKey(), checkIn: currentSession.checkIn ? ftime(new Date(currentSession.checkIn)) : '—', checkOut: currentSession.checkOut ? ftime(new Date(currentSession.checkOut)) : '—', status: currentSession.checkOut ? 'present' : (currentSession.checkIn ? 'present' : 'absent'), isLive: true, workedSecs: ws });
  }

  myRecs.sort(function(a,b){ return b.date.localeCompare(a.date); });

  var bm={present:'badge-green',absent:'badge-red',leave:'badge-yellow',late:'badge-yellow',weekend:'badge-blue'};
  var lm={present:'Present',absent:'Absent',leave:'On Leave',late:'Late',weekend:'Weekend'};

  myRecs.forEach(function(r) {
    var tr=document.createElement('tr');
    if (r.date===todayKey()) tr.style.background='var(--brand-light)';
    function td(t){var c=document.createElement('td');c.textContent=t;return c;}
    var dateLabel=''; try{dateLabel=new Date(r.date+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'});}catch(e){dateLabel=r.date;}
    tr.appendChild(td(dateLabel+(r.date===todayKey()?' (Today)':'')));
    var workedDisplay = r.workedSecs ? fhm(r.workedSecs) : (r.checkIn && r.checkIn!=='—' && r.checkOut && r.checkOut!=='—' ? calcHoursFromTimes(r.checkIn,r.checkOut) : '—');
    tr.appendChild(td(r.checkIn||'—')); tr.appendChild(td(r.checkOut||'—')); tr.appendChild(td(workedDisplay));
    var st=document.createElement('td'); var b=document.createElement('span');
    b.className='badge '+(bm[r.status]||'badge-blue'); b.textContent=(lm[r.status]||r.status)+(r.isLive?' 🔴':'');
    st.appendChild(b); tr.appendChild(st); tbody.appendChild(tr);
  });
})();

function calcHoursFromTimes(ci, co) {
  try {
    var p1=ci.split(':'), p2=co.split(':');
    var mins=(parseInt(p2[0])*60+parseInt(p2[1]))-(parseInt(p1[0])*60+parseInt(p1[1]));
    if (mins<=0) return '—';
    return Math.floor(mins/60)+'h '+(mins%60)+'m';
  } catch(e){ return '—'; }
}

// ── PROFILE ───────────────────────────────────────────────────
(function() {
  var p=document.getElementById('personalDetails');
  var e=document.getElementById('employmentDetails');
  if(!p||!e) return;
  function row(cont,k,v){
    var r=document.createElement('div');r.className='detail-row';
    var dk=document.createElement('div');dk.className='detail-key';dk.textContent=k;
    var dv=document.createElement('div');dv.className='detail-val';dv.textContent=v;
    r.appendChild(dk);r.appendChild(dv);cont.appendChild(r);
  }
  row(p,'Full Name',CURRENT_USER.name);
  row(p,'Email',CURRENT_USER.email);
  row(p,'Employee ID',CURRENT_USER.id);
  row(e,'Department',CURRENT_USER.dept);
  row(e,'Designation',CURRENT_USER.designation);
  row(e,'Join Date',CURRENT_USER.joinDate);
})();

// ── PAYSLIP ───────────────────────────────────────────────────
(function() {
  var tbody = document.getElementById('payslipBody');
  if (!tbody) return;
  var slips=[]; try{slips=JSON.parse(localStorage.getItem('wp_slips_'+CURRENT_USER.id)||'[]');}catch(e){}
  if (!slips.length) slips=[{month:'May 2026',gross:'₹75,000',deductions:'₹8,250',net:'₹66,750',file:null},{month:'April 2026',gross:'₹75,000',deductions:'₹8,250',net:'₹66,750',file:null}];
  slips.forEach(function(r) {
    var tr=document.createElement('tr');
    function td(t){var c=document.createElement('td');c.textContent=t;return c;}
    tr.appendChild(td(r.month));tr.appendChild(td(r.gross));tr.appendChild(td(r.deductions));tr.appendChild(td(r.net));
    var st=document.createElement('td');var b=document.createElement('span'); b.className='badge badge-green';b.textContent='Paid';st.appendChild(b);tr.appendChild(st);
    var ac=document.createElement('td');
    var btn=document.createElement('button'); btn.className='btn btn-sm btn-outline'; btn.textContent=r.file?'📥 Download':'Not uploaded'; btn.disabled=!r.file; if(!r.file)btn.style.opacity='.5';
    ac.appendChild(btn); tr.appendChild(ac); tbody.appendChild(tr);
  });
})();

// ── TOAST ─────────────────────────────────────────────────────
function showToast(msg) {
  var old=document.getElementById('wpToast'); if(old) old.remove();
  var t=document.createElement('div'); t.id='wpToast';
  t.textContent=msg;
  t.style.cssText='position:fixed;bottom:28px;right:28px;background:#1e1b4b;color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:99999;box-shadow:0 4px 20px rgba(0,0,0,.2);';
  document.body.appendChild(t);
  setTimeout(function(){if(t.parentNode)t.remove();},3000);
}
