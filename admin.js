/* ============================================================
   WorkPulse HRMS — Admin Panel JS
   ============================================================ */

// ── AUTH GUARD ───────────────────────────────────────────────
var CURRENT_ADMIN = requireAdmin();
if (!CURRENT_ADMIN) { throw new Error('redirecting'); }

// ── POPULATE ADMIN PROFILE ────────────────────────────────────
document.getElementById('adminSidebarAvatar').textContent = CURRENT_ADMIN.initials;
document.getElementById('adminSidebarName').textContent   = CURRENT_ADMIN.name;

// ── LOGOUT ───────────────────────────────────────────────────
document.getElementById('adminLogoutBtn').addEventListener('click', function(e) {
  e.preventDefault();
  logout();
});

// ── NAVIGATION ───────────────────────────────────────────────
document.querySelectorAll('.nav-item[data-screen]').forEach(function(item) {
  item.addEventListener('click', function(e) {
    e.preventDefault();
    showScreen(this.getAttribute('data-screen'));
    document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
    this.classList.add('active');
    document.getElementById('sidebar').classList.remove('open');
  });
});

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
  var el = document.getElementById('screen-' + name);
  if (el) el.classList.add('active');
}

document.getElementById('menuToggle').addEventListener('click', function() {
  document.getElementById('sidebar').classList.toggle('open');
});

// ── LIVE CLOCK ────────────────────────────────────────────────
function updateClock() {
  var now = new Date();
  var el = document.getElementById('liveClock');
  if (el) el.textContent = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
}
updateClock(); setInterval(updateClock, 1000);

// ── EMPLOYEE DATA (localStorage-backed) ──────────────────────
var SAMPLE_EMPLOYEES = [
  { id:'WP-1001', name:'Arjun Kumar',  dept:'Engineering', role:'Software Engineer',   join:'Apr 1, 2022',  status:'active',   initials:'AK', isSample:true },
  { id:'WP-1002', name:'Priya Sharma', dept:'HR',          role:'HR Executive',         join:'Jan 15, 2021', status:'active',   initials:'PS', isSample:true },
  { id:'WP-1003', name:'Ravi Shankar', dept:'Engineering', role:'Engineering Head',     join:'Mar 10, 2019', status:'active',   initials:'RS', isSample:true },
  { id:'WP-1004', name:'Sneha Patel',  dept:'Finance',     role:'Finance Analyst',      join:'Jul 20, 2022', status:'active',   initials:'SP', isSample:true },
  { id:'WP-1005', name:'Karan Singh',  dept:'Sales',       role:'Sales Executive',      join:'Sep 5, 2023',  status:'active',   initials:'KS', isSample:true },
  { id:'WP-1006', name:'Ananya Roy',   dept:'Marketing',   role:'Marketing Specialist', join:'Feb 28, 2023', status:'on-leave', initials:'AR', isSample:true },
  { id:'WP-1007', name:'Vijay Menon',  dept:'Engineering', role:'Backend Developer',    join:'Nov 1, 2022',  status:'active',   initials:'VM', isSample:true },
  { id:'WP-1008', name:'Deepa Nair',   dept:'HR',          role:'HR Manager',           join:'Jun 15, 2018', status:'active',   initials:'DN', isSample:true },
];

function getEmployees() {
  try {
    var raw = localStorage.getItem('wp_employees');
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(SAMPLE_EMPLOYEES));
  } catch(e) { return JSON.parse(JSON.stringify(SAMPLE_EMPLOYEES)); }
}
function saveEmployees(list) { localStorage.setItem('wp_employees', JSON.stringify(list)); }

var employees = getEmployees();


// ── OVERVIEW: LIVE EMPLOYEE STATUS (real-time) ────────────────
function getEmployeeLiveStatus(emp) {
  // Returns: { status, label, checkIn, checkOut, workedSecs, breakSecs, activeBreak, color }
  var today = (function() {
    var d=new Date(); var pad=function(n){return String(n).padStart(2,'0');};
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  })();

  // Read live session
  try {
    var raw = localStorage.getItem('wp_session_'+emp.id);
    if (raw) {
      var ses = JSON.parse(raw);
      if (ses && ses.date === today) {
        var workedSecs = 0, breakSecs = 0, activeBreak = null;
        (ses.segments||[]).forEach(function(seg) {
          var s = new Date(seg.start).getTime();
          var e = seg.end ? new Date(seg.end).getTime() : Date.now();
          var dur = Math.floor((e - s) / 1000);
          if (seg.type === 'work') workedSecs += dur;
          else { breakSecs += dur; if (!seg.end) activeBreak = seg.label; }
        });
        var checkInTime = ses.checkIn ? new Date(ses.checkIn) : null;
        var checkOutTime = ses.checkOut ? new Date(ses.checkOut) : null;
        var pad = function(n){return String(n).padStart(2,'0');};
        var ft  = function(d){return d ? pad(d.getHours())+':'+pad(d.getMinutes()) : '--:--';};

        if (ses.checkOut) {
          return { status:'checked-out', label:'Checked Out', checkIn:ft(checkInTime), checkOut:ft(checkOutTime), workedSecs:workedSecs, breakSecs:breakSecs, activeBreak:null, color:'#6b7280' };
        } else if (activeBreak) {
          return { status:'break', label:activeBreak, checkIn:ft(checkInTime), checkOut:null, workedSecs:workedSecs, breakSecs:breakSecs, activeBreak:activeBreak, color:'#f59e0b' };
        } else if (ses.checkIn) {
          return { status:'present', label:'Working', checkIn:ft(checkInTime), checkOut:null, workedSecs:workedSecs, breakSecs:breakSecs, activeBreak:null, color:'#22c55e' };
        }
      }
    }
  } catch(e) {}

  // Check attendance records for today
  try {
    var attRecs = JSON.parse(localStorage.getItem('wp_attendance')||'[]');
    var rec = attRecs.find(function(r){ return r.empId===emp.id && r.date===today; });
    if (rec) {
      if (rec.status === 'leave')   return { status:'leave',   label:'On Leave',  checkIn:'--:--', checkOut:'--:--', workedSecs:0, breakSecs:0, activeBreak:null, color:'#6366f1' };
      if (rec.status === 'absent')  return { status:'absent',  label:'Absent',    checkIn:'--:--', checkOut:'--:--', workedSecs:0, breakSecs:0, activeBreak:null, color:'#ef4444' };
      if (rec.status === 'present') return { status:'present', label:'Present',   checkIn:rec.checkIn||'--:--', checkOut:rec.checkOut||'--:--', workedSecs:0, breakSecs:0, activeBreak:null, color:'#22c55e' };
    }
  } catch(e) {}

  return { status:'absent', label:'Not Checked In', checkIn:'--:--', checkOut:'--:--', workedSecs:0, breakSecs:0, activeBreak:null, color:'#ef4444' };
}

function pad2(n) { return String(n).padStart(2,'0'); }
function fhm2(s) { return Math.floor(s/3600)+'h '+Math.floor((s%3600)/60)+'m'; }

function buildLiveStatus() {
  var container = document.getElementById('liveEmployeeStatus');
  if (!container) return;
  container.innerHTML = '';

  var presentCount = 0, breakCount = 0, absentCount = 0, leaveCount = 0;

  var list = document.createElement('div');
  list.style.cssText = 'display:flex;flex-direction:column;gap:0;';

  employees.forEach(function(emp) {
    var ls = getEmployeeLiveStatus(emp);

    // Count for KPI
    if (ls.status==='present') presentCount++;
    else if (ls.status==='break') { presentCount++; breakCount++; }
    else if (ls.status==='leave') leaveCount++;
    else absentCount++;

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:11px 14px;border-bottom:1px solid var(--border);border-left:4px solid '+ls.color+';cursor:pointer;transition:background .15s;';
    row.onmouseenter = function(){ this.style.background='var(--surface-2)'; };
    row.onmouseleave = function(){ this.style.background=''; };
    row.addEventListener('click', function(){ openEmployeeDetail(emp); });

    // Avatar with colour
    var av = document.createElement('div');
    av.style.cssText = 'width:34px;height:34px;border-radius:50%;background:'+ls.color+';color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
    av.textContent = emp.initials;

    // Name + dept
    var info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:0;';
    info.innerHTML = '<div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+emp.name+'</div>' +
                     '<div style="font-size:11px;color:var(--text-muted);">'+emp.dept+'</div>';

    // Status badge
    var badgeColors = { present:'#dcfce7', break:'#fef9c3', 'checked-out':'#f3f4f6', leave:'#ede9fe', absent:'#fee2e2' };
    var badgeText   = { present:'#166534', break:'#92400e', 'checked-out':'#374151', leave:'#4338ca', absent:'#991b1b' };
    var badge = document.createElement('span');
    badge.style.cssText = 'padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:'+(badgeColors[ls.status]||'#f3f4f6')+';color:'+(badgeText[ls.status]||'#374151')+';white-space:nowrap;';
    badge.textContent = ls.status==='break' ? '☕ '+ls.label : ls.status==='present' ? '🟢 Working' : ls.status==='leave' ? '📅 On Leave' : ls.status==='checked-out' ? '✓ Done' : '🔴 Absent';

    // Times column
    var times = document.createElement('div');
    times.style.cssText = 'text-align:right;flex-shrink:0;';
    times.innerHTML = '<div style="font-size:12px;font-weight:600;">In: '+ls.checkIn+(ls.checkOut ? '  Out: '+ls.checkOut : '')+'</div>' +
                      '<div style="font-size:11px;color:var(--text-muted);">' +
                        (ls.workedSecs ? '💼 '+fhm2(ls.workedSecs) : '') +
                        (ls.breakSecs  ? '  ☕ '+fhm2(ls.breakSecs)  : '') +
                      '</div>';

    row.appendChild(av); row.appendChild(info); row.appendChild(badge); row.appendChild(times);
    list.appendChild(row);
  });

  container.appendChild(list);

  // Update KPI cards
  var kpiPresent = document.getElementById('kpiPresentCount');
  var kpiLeave   = document.getElementById('kpiLeaveCount');
  var kpiAbsent  = document.getElementById('kpiAbsentCount');
  var kpiTotal   = document.getElementById('kpiTotalCount');
  if (kpiPresent) kpiPresent.textContent = presentCount;
  if (kpiLeave)   kpiLeave.textContent   = leaveCount;
  if (kpiAbsent)  kpiAbsent.textContent  = absentCount;
  if (kpiTotal)   kpiTotal.textContent   = employees.length;
}

buildLiveStatus();
// Auto-refresh every 5 seconds
setInterval(buildLiveStatus, 5000);

// ── OVERVIEW: DEPT CHART ──────────────────────────────────────
(function() {
  var container = document.getElementById('deptChart');
  if (!container) return;
  var depts = [
    { label:'Engineering', count:45 },
    { label:'Sales',       count:32 },
    { label:'Finance',     count:18 },
    { label:'HR',          count:12 },
    { label:'Marketing',   count:21 },
  ];
  var max = 45;
  depts.forEach(function(d) {
    var row = document.createElement('div'); row.className = 'bar-row';
    var lbl = document.createElement('div'); lbl.className = 'bar-label'; lbl.textContent = d.label;
    var track = document.createElement('div'); track.className = 'bar-track';
    var fill = document.createElement('div'); fill.className = 'bar-fill'; fill.style.width = Math.round((d.count/max)*100)+'%';
    track.appendChild(fill);
    var count = document.createElement('div'); count.className = 'bar-count'; count.textContent = d.count;
    row.appendChild(lbl); row.appendChild(track); row.appendChild(count); container.appendChild(row);
  });
})();

// ── OVERVIEW: WEEK CHART ──────────────────────────────────────
(function() {
  var container = document.getElementById('weekChart');
  if (!container) return;
  // June 2-8: Mon-Sun. June 8 is today (Sunday) — no data yet
  var days = [
    { day:'Mon', val:118 }, { day:'Tue', val:122 }, { day:'Wed', val:120 },
    { day:'Thu', val:114 }, { day:'Fri', val:116 }, { day:'Sat', val:0, future:true },
    { day:'Sun', val:0, future:true },
  ];
  var max = 128;
  days.forEach(function(d) {
    var wrap = document.createElement('div'); wrap.className = 'week-bar-wrap';
    var valEl = document.createElement('div'); valEl.className = 'week-bar-val'; valEl.textContent = d.val || '—';
    var bar = document.createElement('div'); bar.className = 'week-bar';
    bar.style.height = d.val ? Math.round((d.val/max)*90)+'px' : '4px';
    bar.style.background = d.future ? '#e5e3f5' : '#6366f1';
    var dayEl = document.createElement('div'); dayEl.className = 'week-bar-day'; dayEl.textContent = d.day;
    wrap.appendChild(valEl); wrap.appendChild(bar); wrap.appendChild(dayEl); container.appendChild(wrap);
  });
})();

// ── EMPLOYEE TABLE ────────────────────────────────────────────
function buildEmployeeTable(data) {
  var tbody = document.getElementById('employeeTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  // Show banner if any sample data still present
  var hasSample = data.some(function(e) { return e.isSample; });
  var banner = document.getElementById('sampleDataBanner');
  if (banner) banner.style.display = hasSample ? 'flex' : 'none';

  if (!data.length) {
    var empty = document.createElement('tr');
    var etd = document.createElement('td'); etd.colSpan = 6;
    etd.style.cssText = 'text-align:center;padding:40px;color:var(--text-muted);font-size:13px;';
    etd.innerHTML = '👥 No employees yet. Click <strong>+ Add Employee</strong> to get started.';
    empty.appendChild(etd); tbody.appendChild(empty); return;
  }

  var sm = { active:'badge-green', 'on-leave':'badge-yellow', inactive:'badge-red' };
  var sl = { active:'Active', 'on-leave':'On Leave', inactive:'Inactive' };

  data.forEach(function(emp) {
    var tr = document.createElement('tr');
    if (emp.isSample) tr.style.opacity = '0.75';

    // Employee cell — name is clickable link
    var empTd = document.createElement('td');
    var wrap = document.createElement('div'); wrap.style.cssText='display:flex;align-items:center;gap:10px;';
    var av = document.createElement('div'); av.className='avatar'; av.style.cssText='width:32px;height:32px;font-size:11px;flex-shrink:0;'; av.textContent=emp.initials;
    var nameWrap = document.createElement('div');
    var nm = document.createElement('div');
    nm.style.cssText = 'font-weight:600;font-size:13px;color:var(--brand);cursor:pointer;text-decoration:underline;';
    nm.textContent = emp.name;
    // Clickable name → employee detail modal
    (function(e){ nm.addEventListener('click', function(){ openEmployeeDetail(e); }); })(emp);
    var idEl = document.createElement('div'); idEl.style.cssText='font-size:11px;color:var(--text-muted);'; idEl.textContent=emp.id + (emp.isSample ? ' · Sample' : '');
    nameWrap.appendChild(nm); nameWrap.appendChild(idEl); wrap.appendChild(av); wrap.appendChild(nameWrap); empTd.appendChild(wrap);
    tr.appendChild(empTd);

    function td(t) { var c=document.createElement('td'); c.textContent=t; return c; }
    tr.appendChild(td(emp.dept)); tr.appendChild(td(emp.role)); tr.appendChild(td(emp.join));

    var stTd=document.createElement('td'); var b=document.createElement('span');
    b.className='badge '+(sm[emp.status]||'badge-blue'); b.textContent=sl[emp.status]||emp.status;
    stTd.appendChild(b); tr.appendChild(stTd);

    var acTd=document.createElement('td'); acTd.className='table-actions-cell';
    var editBtn=document.createElement('button'); editBtn.className='btn btn-sm btn-outline'; editBtn.textContent='✏️ Edit';
    (function(e){ editBtn.addEventListener('click', function() { openEditEmp(e); }); })(emp);
    var delBtn=document.createElement('button'); delBtn.className='btn btn-sm btn-danger'; delBtn.textContent='🗑 Delete';
    (function(e){
      delBtn.addEventListener('click', function() {
        if (!confirm('Delete ' + e.name + '? This cannot be undone.')) return;
        employees = employees.filter(function(x) { return x.id !== e.id; });
        saveEmployees(employees);
        buildEmployeeTable(employees);
      });
    })(emp);
    acTd.appendChild(editBtn); acTd.appendChild(delBtn); tr.appendChild(acTd);
    tbody.appendChild(tr);
  });
}
buildEmployeeTable(employees);

// ── APPROVALS (reads live from localStorage + defaults) ───────
function buildApprovals() {
  var container = document.getElementById('approvalCards');
  if (!container) return;
  container.innerHTML = '';

  // Merge default pending + any submitted by employees via localStorage
  var defaultPending = [
    { id:'d1', name:'Karan Singh',  dept:'Sales',       type:'Earned Leave', from:'2026-06-15', to:'2026-06-20', days:6, reason:'Annual family vacation planned in advance.', initials:'KS', empId:'WP-1005' },
    { id:'d2', name:'Vijay Menon',  dept:'Engineering', type:'Casual Leave', from:'2026-06-13', to:'2026-06-13', days:1, reason:'Personal work.', initials:'VM', empId:'WP-1007' },
  ];

  var submitted = [];
  try { submitted = JSON.parse(localStorage.getItem('wp_approvals') || '[]'); } catch(e) {}

  // Combine — employee submitted ones first
  var all = submitted.concat(defaultPending);

  // Filter only pending
  var pending = all.filter(function(a) { return a.status === 'pending' || !a.status; });

  // Update both KPI card and sidebar nav badge
  var kpiEl = document.getElementById('kpiPendingCount');
  if (kpiEl) kpiEl.textContent = pending.length;
  var navBadge = document.querySelector('.nav-item[data-screen="admin-approvals"] .nav-badge');
  if (navBadge) navBadge.textContent = pending.length;

  if (pending.length === 0) {
    var msg = document.createElement('div');
    msg.style.cssText = 'text-align:center;padding:48px;color:var(--text-muted);font-size:14px;';
    msg.textContent = '✅ No pending approvals right now.';
    container.appendChild(msg); return;
  }

  pending.forEach(function(item) {
    var card = document.createElement('div'); card.className = 'approval-card';
    var header = document.createElement('div'); header.className = 'approval-card-header';
    var av = document.createElement('div'); av.className = 'approval-avatar'; av.textContent = item.initials || '??';
    var nameWrap = document.createElement('div');
    var nm = document.createElement('div'); nm.className = 'approval-name'; nm.textContent = item.name || item.submittedBy || 'Employee';
    var meta = document.createElement('div'); meta.className = 'approval-meta'; meta.textContent = (item.dept||'') + ' — ' + item.type;
    nameWrap.appendChild(nm); nameWrap.appendChild(meta);
    var badge = document.createElement('span'); badge.className = 'badge badge-yellow'; badge.style.marginLeft='auto'; badge.textContent = 'Pending';
    header.appendChild(av); header.appendChild(nameWrap); header.appendChild(badge);

    var details = document.createElement('div'); details.className = 'approval-details';
    var fromFmt = formatHolidayDate ? formatHolidayDate(item.from) : item.from;
    var toFmt   = formatHolidayDate ? formatHolidayDate(item.to)   : item.to;
    [{ label:'From', val:fromFmt },{ label:'To', val:toFmt },{ label:'Days', val:item.days+(item.days>1?' days':' day') }].forEach(function(d) {
      var di=document.createElement('div'); di.className='approval-detail-item';
      var lbl=document.createElement('div'); lbl.className='approval-detail-label'; lbl.textContent=d.label;
      var val=document.createElement('div'); val.className='approval-detail-val'; val.textContent=d.val;
      di.appendChild(lbl); di.appendChild(val); details.appendChild(di);
    });

    var reason = document.createElement('div'); reason.className = 'approval-reason'; reason.textContent = '📝 ' + item.reason;
    var actions = document.createElement('div'); actions.className = 'approval-actions';

    var rejectBtn  = document.createElement('button'); rejectBtn.className='btn btn-sm btn-danger';  rejectBtn.textContent='✕ Reject';
    var approveBtn = document.createElement('button'); approveBtn.className='btn btn-sm btn-success'; approveBtn.textContent='✓ Approve';

    function updateLeaveStatus(newStatus) {
      // Update in employee's localStorage store
      if (item.empId) {
        var key = 'wp_leaves_' + item.empId;
        try {
          var leaves = JSON.parse(localStorage.getItem(key) || '[]');
          leaves = leaves.map(function(l) { return l.id === item.id ? Object.assign({}, l, {status: newStatus}) : l; });
          localStorage.setItem(key, JSON.stringify(leaves));
        } catch(e) {}
      }
      // Update in approvals store
      try {
        var approvals = JSON.parse(localStorage.getItem('wp_approvals') || '[]');
        approvals = approvals.map(function(a) { return a.id === item.id ? Object.assign({}, a, {status: newStatus}) : a; });
        localStorage.setItem('wp_approvals', JSON.stringify(approvals));
      } catch(e) {}
    }

    rejectBtn.addEventListener('click', function() {
      updateLeaveStatus('rejected');
      card.style.opacity='.45'; badge.className='badge badge-red'; badge.textContent='Rejected';
      rejectBtn.disabled=true; approveBtn.disabled=true;
    });
    approveBtn.addEventListener('click', function() {
      updateLeaveStatus('approved');
      card.style.opacity='.45'; badge.className='badge badge-green'; badge.textContent='Approved';
      rejectBtn.disabled=true; approveBtn.disabled=true;
    });

    actions.appendChild(rejectBtn); actions.appendChild(approveBtn);
    card.appendChild(header); card.appendChild(details); card.appendChild(reason); card.appendChild(actions);
    container.appendChild(card);
  });
}
buildApprovals();

// ── AUTO-REFRESH approvals every 10s when on that screen ─────
setInterval(function() {
  var screen = document.getElementById('screen-admin-approvals');
  if (screen && screen.classList.contains('active')) {
    buildApprovals();
  }
}, 10000);

// ── HOLIDAY TABLE (fully editable) ───────────────────────────
function buildHolidayTable() {
  var tbody = document.getElementById('holidayTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  var holidays = getHolidays();
  if (holidays.length === 0) {
    var tr = document.createElement('tr');
    var td = document.createElement('td'); td.colSpan = 5;
    td.style.cssText = 'text-align:center;color:var(--text-muted);padding:24px;';
    td.textContent = 'No holidays added yet. Click "+ Add Holiday" to get started.';
    tr.appendChild(td); tbody.appendChild(tr); return;
  }
  holidays.forEach(function(h) {
    var tr = document.createElement('tr');
    function td(t){var c=document.createElement('td');c.textContent=t;return c;}
    tr.appendChild(td(h.name));
    tr.appendChild(td(formatHolidayDate(h.date)));
    tr.appendChild(td(getDayName(h.date)));
    var typeTd=document.createElement('td');
    var b=document.createElement('span');
    b.className = h.type==='National' ? 'badge badge-purple' : h.type==='Regional' ? 'badge badge-blue' : 'badge badge-green';
    b.textContent=h.type; typeTd.appendChild(b); tr.appendChild(typeTd);

    var acTd=document.createElement('td'); acTd.className='table-actions-cell';
    var editBtn=document.createElement('button'); editBtn.className='btn btn-sm btn-outline'; editBtn.textContent='✏️ Edit';
    var delBtn=document.createElement('button'); delBtn.className='btn btn-sm btn-danger'; delBtn.textContent='🗑 Delete';

    editBtn.addEventListener('click', function() { openHolidayModal(h); });
    delBtn.addEventListener('click', function() { openDeleteConfirm(h); });

    acTd.appendChild(editBtn); acTd.appendChild(delBtn); tr.appendChild(acTd);
    tbody.appendChild(tr);
  });
}
buildHolidayTable();

// ── HOLIDAY MODAL (Add / Edit) ────────────────────────────────
var holidayModal      = document.getElementById('holidayModal');
var holidayModalTitle = document.getElementById('holidayModalTitle');
var holidayEditId     = document.getElementById('holidayEditId');
var holidayNameInput  = document.getElementById('holidayNameInput');
var holidayDateInput  = document.getElementById('holidayDateInput');
var holidayTypeInput  = document.getElementById('holidayTypeInput');
var holidayFormError  = document.getElementById('holidayFormError');

function openHolidayModal(h) {
  holidayFormError.style.display = 'none';
  if (h) {
    // Edit mode
    holidayModalTitle.textContent = 'Edit Holiday';
    holidayEditId.value           = h.id;
    holidayNameInput.value        = h.name;
    holidayDateInput.value        = h.date;
    holidayTypeInput.value        = h.type;
  } else {
    // Add mode
    holidayModalTitle.textContent = 'Add Holiday';
    holidayEditId.value           = '';
    holidayNameInput.value        = '';
    holidayDateInput.value        = '';
    holidayTypeInput.value        = 'National';
  }
  holidayModal.classList.add('open');
  holidayNameInput.focus();
}

function closeHolidayModalFn() { holidayModal.classList.remove('open'); }

document.getElementById('addHolidayBtn').addEventListener('click', function() { openHolidayModal(null); });
document.getElementById('closeHolidayModal').addEventListener('click', closeHolidayModalFn);
document.getElementById('cancelHolidayModal').addEventListener('click', closeHolidayModalFn);
holidayModal.addEventListener('click', function(e) { if (e.target === holidayModal) closeHolidayModalFn(); });

document.getElementById('saveHolidayBtn').addEventListener('click', function() {
  var name = holidayNameInput.value.trim();
  var date = holidayDateInput.value;
  var type = holidayTypeInput.value;

  holidayFormError.style.display = 'none';

  if (!name) { holidayFormError.textContent = 'Please enter a holiday name.'; holidayFormError.style.display='block'; return; }
  if (!date) { holidayFormError.textContent = 'Please select a date.'; holidayFormError.style.display='block'; return; }

  var holidays = getHolidays();
  var editId   = parseInt(holidayEditId.value, 10);

  if (editId) {
    // Update existing
    holidays = holidays.map(function(h) {
      if (h.id === editId) { return { id:h.id, name:name, date:date, day:getDayName(date), type:type }; }
      return h;
    });
  } else {
    // Add new — generate unique id
    var newId = holidays.reduce(function(max, h) { return h.id > max ? h.id : max; }, 0) + 1;
    // Insert sorted by date
    holidays.push({ id:newId, name:name, date:date, day:getDayName(date), type:type });
    holidays.sort(function(a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  }

  saveHolidays(holidays);
  buildHolidayTable();
  closeHolidayModalFn();
});

// ── DELETE CONFIRM MODAL ──────────────────────────────────────
var deleteConfirmModal = document.getElementById('deleteConfirmModal');
var deleteHolidayName  = document.getElementById('deleteHolidayName');
var pendingDeleteId    = null;

function openDeleteConfirm(h) {
  pendingDeleteId = h.id;
  deleteHolidayName.textContent = h.name;
  deleteConfirmModal.classList.add('open');
}

document.getElementById('closeDeleteModal').addEventListener('click', function() { deleteConfirmModal.classList.remove('open'); });
document.getElementById('cancelDeleteModal').addEventListener('click', function() { deleteConfirmModal.classList.remove('open'); });
deleteConfirmModal.addEventListener('click', function(e) { if (e.target===deleteConfirmModal) deleteConfirmModal.classList.remove('open'); });

document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
  if (!pendingDeleteId) return;
  var holidays = getHolidays().filter(function(h) { return h.id !== pendingDeleteId; });
  saveHolidays(holidays);
  pendingDeleteId = null;
  deleteConfirmModal.classList.remove('open');
  buildHolidayTable();
});

// ── ADD EMPLOYEE MODAL ────────────────────────────────────────
var addEmpModal  = document.getElementById('addEmpModal');
var addEmpBtn    = document.getElementById('addEmpBtn');
var closeEmpModal = document.getElementById('closeEmpModal');
var cancelEmp    = document.getElementById('cancelEmp');
if (addEmpBtn)    addEmpBtn.addEventListener('click',    function() { addEmpModal.classList.add('open'); });
if (closeEmpModal) closeEmpModal.addEventListener('click', function() { addEmpModal.classList.remove('open'); });
if (cancelEmp)    cancelEmp.addEventListener('click',    function() { addEmpModal.classList.remove('open'); });
if (addEmpModal)  addEmpModal.addEventListener('click',  function(e) { if (e.target===addEmpModal) addEmpModal.classList.remove('open'); });

// Save new employee
var saveEmpBtn = addEmpModal ? addEmpModal.querySelector('.btn-primary') : null;
if (saveEmpBtn) {
  saveEmpBtn.addEventListener('click', function() {
    var inputs = addEmpModal.querySelectorAll('input, select');
    var firstName = inputs[0].value.trim();
    var lastName  = inputs[1].value.trim();
    var email     = inputs[2].value.trim();
    var dept      = inputs[4].value;
    var role      = inputs[5].value.trim();
    var joinRaw   = inputs[6].value;
    var empId     = inputs[7].value.trim();
    if (!firstName || !lastName || !role || !joinRaw || !empId) {
      alert('Please fill in all required fields (Name, Role, Join Date, Employee ID).');
      return;
    }
    var initials = (firstName[0] + lastName[0]).toUpperCase();
    var joinDate = new Date(joinRaw + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
    var newEmp = { id:empId, name:firstName+' '+lastName, dept:dept, role:role, join:joinDate, status:'active', initials:initials, isSample:false };
    employees.push(newEmp);
    saveEmployees(employees);
    buildEmployeeTable(employees);
    addEmpModal.classList.remove('open');
    // clear inputs
    inputs.forEach(function(i) { if (i.tagName !== 'SELECT') i.value = ''; });
  });
}

// Clear sample data
var clearSampleBtn = document.getElementById('clearSampleBtn');
if (clearSampleBtn) {
  clearSampleBtn.addEventListener('click', function() {
    if (!confirm('This will delete all ' + employees.filter(function(e){return e.isSample;}).length + ' sample employees. Continue?')) return;
    employees = employees.filter(function(e) { return !e.isSample; });
    saveEmployees(employees);
    buildEmployeeTable(employees);
  });
}

// ── EDIT EMPLOYEE MODAL ───────────────────────────────────────
var editEmpModal = document.getElementById('editEmpModal');

function openEditEmp(emp) {
  var nameParts = emp.name.split(' ');
  document.getElementById('editEmpId').value       = emp.id;
  document.getElementById('editFirstName').value   = nameParts[0] || '';
  document.getElementById('editLastName').value    = nameParts.slice(1).join(' ') || '';
  document.getElementById('editEmpIdField').value  = emp.id;
  document.getElementById('editRole').value        = emp.role;
  document.getElementById('editDept').value        = emp.dept;
  document.getElementById('editStatus').value      = emp.status;
  // Convert join date string back to YYYY-MM-DD for date input
  try {
    var d = new Date(emp.join);
    if (!isNaN(d)) document.getElementById('editJoinDate').value = d.toISOString().split('T')[0];
  } catch(e) {}
  document.getElementById('editEmpError').style.display = 'none';
  editEmpModal.classList.add('open');
}

document.getElementById('closeEditEmpModal').addEventListener('click', function() { editEmpModal.classList.remove('open'); });
document.getElementById('cancelEditEmp').addEventListener('click', function() { editEmpModal.classList.remove('open'); });
editEmpModal.addEventListener('click', function(e) { if (e.target === editEmpModal) editEmpModal.classList.remove('open'); });

document.getElementById('saveEditEmpBtn').addEventListener('click', function() {
  var id        = document.getElementById('editEmpId').value;
  var firstName = document.getElementById('editFirstName').value.trim();
  var lastName  = document.getElementById('editLastName').value.trim();
  var role      = document.getElementById('editRole').value.trim();
  var dept      = document.getElementById('editDept').value;
  var status    = document.getElementById('editStatus').value;
  var joinRaw   = document.getElementById('editJoinDate').value;
  var errEl     = document.getElementById('editEmpError');

  if (!firstName || !lastName || !role) {
    errEl.textContent = 'Name and Designation are required.';
    errEl.style.display = 'block'; return;
  }
  var joinDate = joinRaw ? new Date(joinRaw + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '';
  var initials = (firstName[0] + (lastName[0]||'')).toUpperCase();

  employees = employees.map(function(e) {
    if (e.id !== id) return e;
    return Object.assign({}, e, { name:firstName+' '+lastName, role:role, dept:dept, status:status, join:joinDate, initials:initials, isSample:false });
  });
  saveEmployees(employees);
  buildEmployeeTable(employees);
  editEmpModal.classList.remove('open');
});

// ── ATTENDANCE STORE ──────────────────────────────────────────
function getAttendanceRecords() {
  try { return JSON.parse(localStorage.getItem('wp_attendance') || '[]'); } catch(e) { return []; }
}
function saveAttendanceRecords(list) { localStorage.setItem('wp_attendance', JSON.stringify(list)); }

function calcHours(inTime, outTime) {
  if (!inTime || !outTime || inTime === '—' || outTime === '—') return '—';
  var parts1 = inTime.split(':'), parts2 = outTime.split(':');
  var mins = (parseInt(parts2[0])*60 + parseInt(parts2[1])) - (parseInt(parts1[0])*60 + parseInt(parts1[1]));
  if (mins <= 0) return '—';
  return Math.floor(mins/60) + 'h ' + (mins%60) + 'm';
}

function buildAttendanceTable() {
  var tbody = document.getElementById('adminAttendanceBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  var records = getAttendanceRecords();
  var countEl = document.getElementById('attRecordCount');

  // Sort by date desc then employee name
  records.sort(function(a,b) { return b.date.localeCompare(a.date) || a.empName.localeCompare(b.empName); });

  if (countEl) countEl.textContent = records.length + ' records';

  if (!records.length) {
    var tr = document.createElement('tr');
    var td = document.createElement('td'); td.colSpan = 7;
    td.style.cssText = 'text-align:center;padding:32px;color:var(--text-muted);font-size:13px;';
    td.textContent = 'No attendance records yet. Click "+ Mark Attendance" to add.';
    tr.appendChild(td); tbody.appendChild(tr); return;
  }

  var bm = { present:'badge-green', late:'badge-yellow', leave:'badge-blue', absent:'badge-red', weekend:'badge-blue' };
  var lm = { present:'Present', late:'Late', leave:'On Leave', absent:'Absent', weekend:'Weekend' };

  records.forEach(function(r) {
    var tr = document.createElement('tr');
    function td(t,style) { var c=document.createElement('td'); c.textContent=t; if(style) c.style.cssText=style; return c; }
    // Format date nicely
    var dateLabel = '';
    try { dateLabel = new Date(r.date+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',weekday:'short'}); } catch(e){ dateLabel=r.date; }
    tr.appendChild(td(dateLabel));
    tr.appendChild(td(r.empName));
    tr.appendChild(td(r.dept || '—'));
    tr.appendChild(td(r.checkIn || '—'));
    tr.appendChild(td(r.checkOut || '—'));
    tr.appendChild(td(calcHours(r.checkIn, r.checkOut)));
    var stTd = document.createElement('td');
    var badge = document.createElement('span'); badge.className='badge '+(bm[r.status]||'badge-blue'); badge.textContent=lm[r.status]||r.status;
    stTd.appendChild(badge); tr.appendChild(stTd);
    tbody.appendChild(tr);
  });
}
buildAttendanceTable();

// ── ATTENDANCE MODAL ──────────────────────────────────────────
var attModal = document.getElementById('attendanceModal');
var markAttBtn = document.getElementById('markAttBtn');

function populateAttEmpSelect() {
  var sel = document.getElementById('attEmpSelect');
  if (!sel) return;
  sel.innerHTML = '';
  employees.forEach(function(e) {
    var opt = document.createElement('option');
    opt.value = e.id; opt.textContent = e.name + ' (' + e.dept + ')';
    sel.appendChild(opt);
  });
}

// Set default date to today, min = June 1 of current year
function initAttModal() {
  populateAttEmpSelect();
  var today = new Date();
  var todayStr = today.toISOString().split('T')[0];
  var minDate = today.getFullYear() + '-06-01';
  var attDateInput = document.getElementById('attDate');
  attDateInput.value = todayStr;
  attDateInput.max   = todayStr;
  attDateInput.min   = minDate;
  document.getElementById('attCheckInTime').value  = '09:00';
  document.getElementById('attCheckOutTime').value = '18:00';
  document.getElementById('attStatusSelect').value = 'present';
  document.getElementById('attFormError').style.display = 'none';
}

if (markAttBtn) markAttBtn.addEventListener('click', function() { initAttModal(); attModal.classList.add('open'); });
document.getElementById('closeAttModal').addEventListener('click', function() { attModal.classList.remove('open'); });
document.getElementById('cancelAttModal').addEventListener('click', function() { attModal.classList.remove('open'); });
attModal.addEventListener('click', function(e) { if (e.target === attModal) attModal.classList.remove('open'); });

// Auto-clear times when status is absent/weekend
document.getElementById('attStatusSelect').addEventListener('change', function() {
  var s = this.value;
  if (s === 'absent' || s === 'weekend') {
    document.getElementById('attCheckInTime').value  = '';
    document.getElementById('attCheckOutTime').value = '';
  }
});

document.getElementById('saveAttBtn').addEventListener('click', function() {
  var empId   = document.getElementById('attEmpSelect').value;
  var date    = document.getElementById('attDate').value;
  var checkIn = document.getElementById('attCheckInTime').value;
  var checkOut= document.getElementById('attCheckOutTime').value;
  var status  = document.getElementById('attStatusSelect').value;
  var errEl   = document.getElementById('attFormError');

  if (!empId || !date) {
    errEl.textContent = 'Please select an employee and date.';
    errEl.style.display = 'block'; return;
  }
  if (new Date(date) > new Date()) {
    errEl.textContent = 'Cannot mark attendance for a future date.';
    errEl.style.display = 'block'; return;
  }

  var emp = employees.find(function(e) { return e.id === empId; });
  if (!emp) return;

  var records = getAttendanceRecords();
  // Remove existing record for same employee + date (overwrite)
  records = records.filter(function(r) { return !(r.empId === empId && r.date === date); });

  records.push({
    empId:    empId,
    empName:  emp.name,
    dept:     emp.dept,
    date:     date,
    checkIn:  (status==='absent'||status==='weekend') ? '—' : (checkIn || '—'),
    checkOut: (status==='absent'||status==='weekend') ? '—' : (checkOut || '—'),
    status:   status
  });
  saveAttendanceRecords(records);
  buildAttendanceTable();
  attModal.classList.remove('open');
});

// ── LIVE DATE LABEL ───────────────────────────────────────────
(function() {
  var el = document.getElementById('liveDate');
  if (el) el.textContent = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
})();

// ── LIVE PUNCH GRID — real data ───────────────────────────────
(function() {
  var container = document.getElementById('livePunchGrid');
  if (!container) return;
  employees.forEach(function(emp) {
    var ls = getEmployeeLiveStatus(emp);
    var card=document.createElement('div'); card.className='punch-card';
    card.style.borderLeft='3px solid '+ls.color;
    var header=document.createElement('div'); header.className='punch-card-header';
    var av=document.createElement('div'); av.className='punch-card-avatar'; av.style.background=ls.color; av.textContent=emp.initials;
    var info=document.createElement('div');
    var nm=document.createElement('div'); nm.className='punch-card-name'; nm.textContent=emp.name;
    var dp=document.createElement('div'); dp.className='punch-card-dept'; dp.textContent=emp.dept;
    info.appendChild(nm); info.appendChild(dp); header.appendChild(av); header.appendChild(info);

    var stMap={present:'badge-green',break:'badge-yellow','checked-out':'badge-blue',leave:'badge-purple',absent:'badge-red'};
    var lbMap={present:'🟢 Working',break:'☕ '+ls.label,'checked-out':'✓ Done',leave:'📅 Leave',absent:'🔴 Absent'};
    var badge=document.createElement('span'); badge.className='badge '+(stMap[ls.status]||'badge-red'); badge.textContent=lbMap[ls.status]||'Absent'; badge.style.fontSize='11px';

    var times=document.createElement('div'); times.className='punch-card-times';
    var inItem=document.createElement('div'); inItem.className='punch-time-item';
    var inLbl=document.createElement('div'); inLbl.className='punch-time-label'; inLbl.textContent='IN';
    var inVal=document.createElement('div'); inVal.className='punch-time-val'; inVal.textContent=ls.checkIn||'—';
    inItem.appendChild(inLbl); inItem.appendChild(inVal);
    var outItem=document.createElement('div'); outItem.className='punch-time-item';
    var outLbl=document.createElement('div'); outLbl.className='punch-time-label'; outLbl.textContent='OUT';
    var outVal=document.createElement('div'); outVal.className='punch-time-val'; outVal.textContent=ls.checkOut||'—';
    outItem.appendChild(outLbl); outItem.appendChild(outVal);
    times.appendChild(inItem); times.appendChild(outItem);

    var hoursRow=document.createElement('div'); hoursRow.className='punch-hours';
    var hLbl=document.createElement('span'); hLbl.style.cssText='font-size:11px;color:var(--text-muted);'; hLbl.textContent='Worked';
    var hVal=document.createElement('span'); hVal.className='punch-hours-val';
    hVal.textContent = ls.workedSecs ? fhm2(ls.workedSecs) : '—';
    if (!ls.workedSecs) hVal.style.color='var(--text-muted)';
    hoursRow.appendChild(hLbl); hoursRow.appendChild(hVal);

    card.appendChild(header); card.appendChild(badge); card.appendChild(times); card.appendChild(hoursRow);
    container.appendChild(card);
  });
})();

// ── REPORTS BARS — real leave data ───────────────────────────
(function() {
  var container = document.getElementById('reportBars');
  if (!container) return;

  // Count approved leaves per department
  var deptLeaves = {};
  employees.forEach(function(emp) {
    var leaves = [];
    try { leaves = JSON.parse(localStorage.getItem('wp_leaves_'+emp.id)||'[]'); } catch(e){}
    var approved = leaves.filter(function(l){ return l.status==='approved'; }).reduce(function(sum,l){ return sum+(l.days||0); },0);
    deptLeaves[emp.dept] = (deptLeaves[emp.dept]||0) + approved;
  });

  var depts = Object.keys(deptLeaves);
  if (!depts.length) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:20px;">No approved leave data yet.</p>';
    return;
  }
  var max = Math.max.apply(null, depts.map(function(d){ return deptLeaves[d]; })) || 1;
  depts.sort(function(a,b){ return deptLeaves[b]-deptLeaves[a]; }).forEach(function(dept) {
    var used = deptLeaves[dept];
    var item=document.createElement('div'); item.className='report-bar-item';
    var lbl=document.createElement('div'); lbl.className='report-bar-label';
    var l=document.createElement('span'); l.textContent=dept;
    var r=document.createElement('span'); r.textContent=used+' leave day'+(used!==1?'s':'');
    lbl.appendChild(l); lbl.appendChild(r);
    var track=document.createElement('div'); track.className='report-bar-track';
    var fill=document.createElement('div'); fill.className='report-bar-fill'; fill.style.width=Math.round((used/max)*100)+'%';
    track.appendChild(fill); item.appendChild(lbl); item.appendChild(track); container.appendChild(item);
  });
})();

// ── SALARY SLIP UPLOAD (Admin → Employee) ─────────────────────
(function() {
  // Add Salary Upload screen to admin if the section exists
  var screen = document.getElementById('screen-admin-salary');
  if (!screen) return;

  var empSelect  = document.getElementById('salaryEmpSelect');
  var monthInput = document.getElementById('salaryMonth');
  var grossInput = document.getElementById('salaryGross');
  var dedInput   = document.getElementById('salaryDed');
  var netInput   = document.getElementById('salaryNet');
  var fileInput  = document.getElementById('salaryFile');
  var uploadBtn  = document.getElementById('uploadSlipBtn');
  var slipMsg    = document.getElementById('slipUploadMsg');

  if (!empSelect) return;

  // Populate employee dropdown
  employees.forEach(function(emp) {
    var opt=document.createElement('option');
    opt.value=emp.id; opt.textContent=emp.name+' ('+emp.id+')';
    empSelect.appendChild(opt);
  });

  // Auto-calc net pay
  function calcNet() {
    var g=parseFloat((grossInput.value||'0').replace(/[^0-9.]/g,''));
    var d=parseFloat((dedInput.value||'0').replace(/[^0-9.]/g,''));
    if(!isNaN(g)&&!isNaN(d)) netInput.value='₹'+(g-d).toLocaleString('en-IN');
  }
  grossInput.addEventListener('input', calcNet);
  dedInput.addEventListener('input', calcNet);

  uploadBtn.addEventListener('click', function() {
    var empId  = empSelect.value;
    var month  = monthInput.value;
    var gross  = grossInput.value.trim();
    var ded    = dedInput.value.trim();
    var net    = netInput.value.trim();
    var file   = fileInput.files[0];

    slipMsg.style.display='none';
    if (!empId||!month||!gross||!ded) {
      slipMsg.textContent='⚠️ Please fill all fields.';
      slipMsg.style.cssText='display:block;color:var(--red);font-size:13px;margin-top:8px;';
      return;
    }

    var key = 'wp_slips_' + empId;
    var slips=[];
    try { slips=JSON.parse(localStorage.getItem(key)||'[]'); } catch(e){}

    // Format month label e.g. "2026-05" → "May 2026"
    var d=new Date(month+'-01');
    var label=d.toLocaleDateString('en-IN',{month:'long',year:'numeric'});

    // Remove existing entry for same month
    slips=slips.filter(function(s){return s.month!==label;});

    var entry={month:label, gross:'₹'+gross, deductions:'₹'+ded, net:net, file:null};

    if (file) {
      // Read file as base64 data URL
      var reader=new FileReader();
      reader.onload=function(ev) {
        entry.file=ev.target.result;
        slips.unshift(entry);
        try { localStorage.setItem(key,JSON.stringify(slips)); } catch(e){
          slipMsg.textContent='⚠️ File too large for browser storage. Save without file.';
          slipMsg.style.cssText='display:block;color:var(--red);font-size:13px;margin-top:8px;';
          return;
        }
        showAdminToast('✅ Payslip uploaded for '+empSelect.options[empSelect.selectedIndex].text.split(' (')[0]);
        resetSlipForm();
        buildSlipHistory();
      };
      reader.readAsDataURL(file);
    } else {
      slips.unshift(entry);
      try { localStorage.setItem(key,JSON.stringify(slips)); } catch(e){}
      showAdminToast('✅ Salary details saved (no file attached).');
      resetSlipForm();
      buildSlipHistory();
    }
  });

  function resetSlipForm() {
    monthInput.value=''; grossInput.value=''; dedInput.value=''; netInput.value=''; fileInput.value='';
  }

  function buildSlipHistory() {
    var tbody=document.getElementById('slipHistoryBody');
    if (!tbody) return;
    tbody.innerHTML='';
    employees.forEach(function(emp) {
      var key='wp_slips_'+emp.id;
      var slips=[];
      try { slips=JSON.parse(localStorage.getItem(key)||'[]'); } catch(e){}
      slips.slice(0,3).forEach(function(s) {
        var tr=document.createElement('tr');
        function td(t){var c=document.createElement('td');c.textContent=t;return c;}
        tr.appendChild(td(emp.name)); tr.appendChild(td(s.month));
        tr.appendChild(td(s.gross)); tr.appendChild(td(s.deductions)); tr.appendChild(td(s.net));
        var fileTd=document.createElement('td');
        var fb=document.createElement('span');
        fb.className=s.file?'badge badge-green':'badge badge-yellow';
        fb.textContent=s.file?'PDF Attached':'No File';
        fileTd.appendChild(fb); tr.appendChild(fileTd);
        tbody.appendChild(tr);
      });
    });
  }
  buildSlipHistory();
})();

function showAdminToast(msg) {
  var old=document.getElementById('adminToast'); if(old) old.remove();
  var t=document.createElement('div'); t.id='adminToast'; t.textContent=msg;
  t.style.cssText='position:fixed;bottom:28px;right:28px;background:#1e1b4b;color:#fff;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.2);';
  document.body.appendChild(t);
  setTimeout(function(){if(t.parentNode)t.remove();},3000);
}

// ═══════════════════════════════════════════════════════════════
//  EMPLOYEE DETAIL MODAL — shows work/break/permission/leave
// ═══════════════════════════════════════════════════════════════
function openEmployeeDetail(emp) {
  var existing = document.getElementById('empDetailModal');
  if (existing) existing.remove();

  // Gather data for this employee
  var attRecs = [];
  try { attRecs = JSON.parse(localStorage.getItem('wp_attendance')||'[]'); } catch(e){}
  var empAtt = attRecs.filter(function(r){ return r.empId === emp.id; });

  var leaves = [];
  try { leaves = JSON.parse(localStorage.getItem('wp_leaves_'+emp.id)||'[]'); } catch(e){}

  var perms = [];
  try { perms = JSON.parse(localStorage.getItem('wp_permissions_'+emp.id)||'[]'); } catch(e){}

  var sessions = [];
  // Try to read today's session
  try {
    var sesRaw = localStorage.getItem('wp_session_'+emp.id);
    if (sesRaw) { var ses = JSON.parse(sesRaw); if(ses) sessions.push(ses); }
  } catch(e){}

  var leaveBalance = [];
  try { leaveBalance = JSON.parse(localStorage.getItem('wp_leave_balance_'+emp.id)||'[]'); } catch(e){}
  if (!leaveBalance.length) leaveBalance = [{label:'Casual Leave',used:3,total:12},{label:'Sick Leave',used:2,total:8},{label:'Earned Leave',used:5,total:15},{label:'Comp Off',used:1,total:4}];

  // Build modal HTML
  var overlay = document.createElement('div');
  overlay.id = 'empDetailModal';
  overlay.className = 'modal-overlay open';
  overlay.style.zIndex = '9999';

  // Summary stats
  var presentDays = empAtt.filter(function(r){return r.status==='present'||r.status==='late';}).length;
  var absentDays  = empAtt.filter(function(r){return r.status==='absent';}).length;
  var leaveDays   = empAtt.filter(function(r){return r.status==='leave';}).length;
  var pendingLeaves = leaves.filter(function(l){return l.status==='pending';}).length;
  var pendingPerms  = perms.filter(function(p){return p.status==='pending';}).length;

  overlay.innerHTML =
    '<div class="modal" style="max-width:700px;max-height:88vh;overflow-y:auto;">' +
      '<div class="modal-header">' +
        '<div style="display:flex;align-items:center;gap:12px;">' +
          '<div class="avatar" style="width:40px;height:40px;font-size:14px;flex-shrink:0;">'+emp.initials+'</div>' +
          '<div><div style="font-weight:700;font-size:16px;">'+emp.name+'</div><div style="font-size:12px;color:var(--text-muted);">'+emp.role+' · '+emp.dept+' · '+emp.id+'</div></div>' +
        '</div>' +
        '<button class="modal-close" id="closeEmpDetail">✕</button>' +
      '</div>' +
      '<div class="modal-body">' +
        // Stats row
        '<div class="stat-grid" style="margin-bottom:16px;">' +
          '<div class="stat-card"><div class="stat-icon" style="background:#dcfce7">✅</div><div class="stat-info"><div class="stat-value">'+presentDays+'</div><div class="stat-label">Present</div></div></div>' +
          '<div class="stat-card"><div class="stat-icon" style="background:#fee2e2">❌</div><div class="stat-info"><div class="stat-value">'+absentDays+'</div><div class="stat-label">Absent</div></div></div>' +
          '<div class="stat-card"><div class="stat-icon" style="background:#fef9c3">📅</div><div class="stat-info"><div class="stat-value">'+leaveDays+'</div><div class="stat-label">On Leave</div></div></div>' +
          '<div class="stat-card"><div class="stat-icon" style="background:#ede9fe">🚶</div><div class="stat-info"><div class="stat-value">'+pendingPerms+'</div><div class="stat-label">Permissions</div></div></div>' +
        '</div>' +

        // Tabs
        '<div class="detail-tabs">' +
          '<div class="detail-tab active" data-tab="att">Attendance</div>' +
          '<div class="detail-tab" data-tab="sessions">Today\'s Sessions</div>' +
          '<div class="detail-tab" data-tab="leaves">Leaves</div>' +
          '<div class="detail-tab" data-tab="permissions">Permissions</div>' +
          '<div class="detail-tab" data-tab="balance">Leave Balance</div>' +
        '</div>' +

        // Attendance Tab
        '<div class="detail-tab-pane active" id="tab-att">' +
          '<table class="data-table"><thead><tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Status</th></tr></thead>' +
          '<tbody>' + (empAtt.length ? empAtt.sort(function(a,b){return b.date.localeCompare(a.date);}).map(function(r) {
            var dl=''; try{dl=new Date(r.date+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'});}catch(e){dl=r.date;}
            var bm={present:'badge-green',absent:'badge-red',leave:'badge-yellow',late:'badge-yellow',weekend:'badge-blue'};
            var lm={present:'Present',absent:'Absent',leave:'On Leave',late:'Late',weekend:'Weekend'};
            var hrs = r.workedSecs ? Math.floor(r.workedSecs/3600)+'h '+Math.floor((r.workedSecs%3600)/60)+'m' : (r.checkIn&&r.checkIn!=='—'&&r.checkOut&&r.checkOut!=='—'?calcHoursForDetail(r.checkIn,r.checkOut):'—');
            return '<tr><td>'+dl+'</td><td>'+(r.checkIn||'—')+'</td><td>'+(r.checkOut||'—')+'</td><td>'+hrs+'</td><td><span class="badge '+(bm[r.status]||'badge-blue')+'">'+(lm[r.status]||r.status)+'</span></td></tr>';
          }).join('') : '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted);">No attendance records</td></tr>') +
          '</tbody></table>' +
        '</div>' +

        // Sessions Tab (work/break breakdown)
        '<div class="detail-tab-pane" id="tab-sessions">' +
          (sessions.length ? sessions.map(function(ses) {
            var segs = ses.segments || [];
            var totalWork = 0, totalBreak = 0;
            segs.forEach(function(seg) {
              var s=new Date(seg.start).getTime(), e=seg.end?new Date(seg.end).getTime():Date.now();
              var dur=Math.floor((e-s)/1000);
              if(seg.type==='work') totalWork+=dur; else totalBreak+=dur;
            });
            return '<div style="margin-bottom:16px;">' +
              '<div style="font-weight:600;font-size:13px;margin-bottom:8px;">📅 '+ses.date+' &nbsp;|&nbsp; Worked: <span style="color:var(--brand);">'+(Math.floor(totalWork/3600)+'h '+Math.floor((totalWork%3600)/60)+'m')+'</span> &nbsp;|&nbsp; Break: <span style="color:#f59e0b;">'+(Math.floor(totalBreak/3600)+'h '+Math.floor((totalBreak%3600)/60)+'m')+'</span></div>' +
              segs.map(function(seg) {
                var colors={work:'#6366f1',break:'#f59e0b'};
                var icons={work:'💼',break:'☕'};
                var s=new Date(seg.start), e2=seg.end?new Date(seg.end):new Date();
                var dur=Math.floor((e2-s)/1000);
                var pad2=function(n){return String(n).padStart(2,'0');};
                var ft=function(d){return pad2(d.getHours())+':'+pad2(d.getMinutes());};
                var fh=function(s){return Math.floor(s/3600)+'h '+Math.floor((s%3600)/60)+'m';};
                return '<div class="timeline-row"><div class="timeline-dot" style="background:'+colors[seg.type]+'"></div><div class="timeline-content"><div class="timeline-label">'+(icons[seg.type]||'')+' '+seg.label+'</div><div class="timeline-time">'+ft(s)+' → '+(seg.end?ft(e2):'Ongoing')+' | '+fh(dur)+'</div></div></div>';
              }).join('') +
            '</div>';
          }).join('') : '<p style="text-align:center;color:var(--text-muted);padding:20px;">No session data recorded yet.</p>') +
        '</div>' +

        // Leaves Tab
        '<div class="detail-tab-pane" id="tab-leaves">' +
          '<table class="data-table"><thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th></tr></thead>' +
          '<tbody>' + (leaves.length ? leaves.slice().reverse().map(function(l) {
            var bm={pending:'badge-yellow',approved:'badge-green',rejected:'badge-red'};
            var fd=function(s){try{return new Date(s+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'});}catch(e){return s;}};
            return '<tr><td>'+l.type+'</td><td>'+fd(l.from)+'</td><td>'+fd(l.to)+'</td><td>'+l.days+'</td><td>'+l.reason+'</td><td><span class="badge '+(bm[l.status]||'badge-blue')+'">'+l.status+'</span></td></tr>';
          }).join('') : '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted);">No leave requests</td></tr>') +
          '</tbody></table>' +
        '</div>' +

        // Permissions Tab
        '<div class="detail-tab-pane" id="tab-permissions">' +
          '<table class="data-table"><thead><tr><th>Date</th><th>Type</th><th>From</th><th>To</th><th>Reason</th><th>Status</th></tr></thead>' +
          '<tbody>' + (perms.length ? perms.slice().reverse().map(function(p) {
            var bm={pending:'badge-yellow',approved:'badge-green',rejected:'badge-red'};
            return '<tr><td>'+p.date+'</td><td>'+p.type+'</td><td>'+p.from+'</td><td>'+p.to+'</td><td>'+p.reason+'</td><td><span class="badge '+(bm[p.status]||'badge-yellow')+'">'+p.status+'</span></td></tr>';
          }).join('') : '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted);">No permissions</td></tr>') +
          '</tbody></table>' +
        '</div>' +

        // Leave Balance Tab (admin can edit)
        '<div class="detail-tab-pane" id="tab-balance">' +
          '<p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Edit leave allocations for this employee. Click Save to apply.</p>' +
          leaveBalance.map(function(lb, idx) {
            return '<div class="leave-edit-row">' +
              '<div><div style="font-weight:600;font-size:14px;">'+lb.label+'</div><div style="font-size:12px;color:var(--text-muted);">Used: '+lb.used+' days</div></div>' +
              '<div style="display:flex;align-items:center;gap:10px;">' +
                '<label style="font-size:12px;color:var(--text-muted);">Total Allowed:</label>' +
                '<input type="number" class="leave-edit-input" id="lbInput_'+idx+'" value="'+lb.total+'" min="0" max="365"/>' +
              '</div>' +
            '</div>';
          }).join('') +
          '<button class="btn btn-primary" id="saveLeaveBalanceBtn" style="margin-top:16px;">💾 Save Leave Balances</button>' +
          '<div id="leaveBalanceSavedMsg" style="color:var(--green);font-size:12px;margin-top:8px;display:none;">✅ Saved successfully</div>' +
        '</div>' +

      '</div>' +
    '</div>';

  document.body.appendChild(overlay);

  // Close
  document.getElementById('closeEmpDetail').addEventListener('click', function() { overlay.remove(); });
  overlay.addEventListener('click', function(e) { if(e.target===overlay) overlay.remove(); });

  // Tabs
  overlay.querySelectorAll('.detail-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      overlay.querySelectorAll('.detail-tab').forEach(function(t){t.classList.remove('active');});
      overlay.querySelectorAll('.detail-tab-pane').forEach(function(p){p.classList.remove('active');});
      tab.classList.add('active');
      var pane = overlay.querySelector('#tab-'+tab.getAttribute('data-tab'));
      if (pane) pane.classList.add('active');
    });
  });

  // Save leave balance
  var saveBalBtn = document.getElementById('saveLeaveBalanceBtn');
  if (saveBalBtn) {
    saveBalBtn.addEventListener('click', function() {
      var newBalance = leaveBalance.map(function(lb, idx) {
        var input = document.getElementById('lbInput_'+idx);
        var newTotal = input ? parseInt(input.value)||lb.total : lb.total;
        return { label:lb.label, used:lb.used, total:newTotal, color:lb.color };
      });
      localStorage.setItem('wp_leave_balance_'+emp.id, JSON.stringify(newBalance));
      var msg = document.getElementById('leaveBalanceSavedMsg');
      if (msg) { msg.style.display='block'; setTimeout(function(){msg.style.display='none';},2000); }
    });
  }
}

function calcHoursForDetail(ci, co) {
  try {
    var p1=ci.split(':'), p2=co.split(':');
    var mins=(parseInt(p2[0])*60+parseInt(p2[1]))-(parseInt(p1[0])*60+parseInt(p1[1]));
    if(mins<=0) return '—';
    return Math.floor(mins/60)+'h '+(mins%60)+'m';
  } catch(e){ return '—'; }
}

// Wire employee name links → open detail modal
// ═══════════════════════════════════════════════════════════════
//  EXCEL EXPORT — clean, no bugs
// ═══════════════════════════════════════════════════════════════
function escapeCSV(val) {
  var s = String(val === null || val === undefined ? '' : val);
  if (s.indexOf(',') > -1 || s.indexOf('"') > -1 || s.indexOf('\n') > -1) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function downloadCSV(rows, filename) {
  var csv = rows.map(function(row) {
    return row.map(escapeCSV).join(',');
  }).join('\r\n');
  var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
}

function exportAttendanceReport() {
  var attRecs = [];
  try { attRecs = JSON.parse(localStorage.getItem('wp_attendance')||'[]'); } catch(e){}

  var rows = [['Employee ID','Employee Name','Department','Date','Check In','Check Out','Hours Worked','Break Time','Status']];

  employees.forEach(function(emp) {
    var empAtt = attRecs.filter(function(r){ return r.empId === emp.id; });
    // Also check today's live session
    try {
      var sesRaw = localStorage.getItem('wp_session_'+emp.id);
      if (sesRaw) {
        var ses = JSON.parse(sesRaw);
        if (ses && ses.date) {
          var exists = empAtt.find(function(r){return r.date===ses.date;});
          if (!exists) {
            var ws = 0, bs = 0;
            (ses.segments||[]).forEach(function(seg){
              var s=new Date(seg.start).getTime(), e2=seg.end?new Date(seg.end).getTime():Date.now();
              var dur=Math.floor((e2-s)/1000);
              if(seg.type==='work') ws+=dur; else bs+=dur;
            });
            empAtt.push({ empId:emp.id, date:ses.date, checkIn: ses.checkIn?new Date(ses.checkIn).toTimeString().slice(0,5):'—', checkOut: ses.checkOut?new Date(ses.checkOut).toTimeString().slice(0,5):'—', status:'present', workedSecs:ws, breakSecs:bs });
          }
        }
      }
    } catch(ee){}

    if (!empAtt.length) {
      rows.push([emp.id, emp.name, emp.dept, 'No records', '', '', '', '', '']);
    } else {
      empAtt.sort(function(a,b){return a.date.localeCompare(b.date);}).forEach(function(r) {
        var wh = r.workedSecs ? (Math.floor(r.workedSecs/3600)+'h '+Math.floor((r.workedSecs%3600)/60)+'m') : (r.checkIn&&r.checkIn!=='—'&&r.checkOut&&r.checkOut!=='—' ? calcHoursForDetail(r.checkIn, r.checkOut) : '—');
        var bh = r.breakSecs  ? (Math.floor(r.breakSecs/3600)+'h '+Math.floor((r.breakSecs%3600)/60)+'m')  : '—';
        rows.push([emp.id, emp.name, emp.dept, r.date, r.checkIn||'—', r.checkOut||'—', wh, bh, r.status||'—']);
      });
    }
  });

  downloadCSV(rows, 'WorkPulse_Attendance_' + new Date().toISOString().split('T')[0] + '.csv');
  showAdminToast('✅ Attendance report exported!');
}

function exportLeaveReport() {
  var rows = [['Employee ID','Employee Name','Department','Leave Type','From','To','Days','Reason','Status','Submitted On']];
  employees.forEach(function(emp) {
    var leaves = [];
    try { leaves = JSON.parse(localStorage.getItem('wp_leaves_'+emp.id)||'[]'); } catch(e){}
    if (!leaves.length) {
      rows.push([emp.id, emp.name, emp.dept, 'No leaves', '', '', '', '', '', '']);
    } else {
      leaves.forEach(function(l) {
        rows.push([emp.id, emp.name, emp.dept, l.type, l.from, l.to, l.days, l.reason, l.status, l.submittedAt ? l.submittedAt.split('T')[0] : '']);
      });
    }
  });
  downloadCSV(rows, 'WorkPulse_Leaves_' + new Date().toISOString().split('T')[0] + '.csv');
  showAdminToast('✅ Leave report exported!');
}

function exportPermissionReport() {
  var rows = [['Employee ID','Employee Name','Department','Date','Type','From Time','To Time','Reason','Status']];
  employees.forEach(function(emp) {
    var perms = [];
    try { perms = JSON.parse(localStorage.getItem('wp_permissions_'+emp.id)||'[]'); } catch(e){}
    if (!perms.length) {
      rows.push([emp.id, emp.name, emp.dept, 'No records', '', '', '', '', '']);
    } else {
      perms.forEach(function(p) {
        rows.push([emp.id, emp.name, emp.dept, p.date, p.type, p.from, p.to, p.reason, p.status]);
      });
    }
  });
  downloadCSV(rows, 'WorkPulse_Permissions_' + new Date().toISOString().split('T')[0] + '.csv');
  showAdminToast('✅ Permission report exported!');
}

function exportFullReport() {
  var rows = [['Employee ID','Employee Name','Department','Designation','Join Date','Present Days','Absent Days','Leave Days','Total Perms','Pending Leaves','Leave Balance']];
  var attRecs = [];
  try { attRecs = JSON.parse(localStorage.getItem('wp_attendance')||'[]'); } catch(e){}

  employees.forEach(function(emp) {
    var empAtt    = attRecs.filter(function(r){return r.empId===emp.id;});
    var leaves    = []; try{leaves=JSON.parse(localStorage.getItem('wp_leaves_'+emp.id)||'[]');}catch(e){}
    var perms     = []; try{perms=JSON.parse(localStorage.getItem('wp_permissions_'+emp.id)||'[]');}catch(e){}
    var balance   = []; try{balance=JSON.parse(localStorage.getItem('wp_leave_balance_'+emp.id)||'[]');}catch(e){}
    if (!balance.length) balance=[{label:'Casual Leave',used:3,total:12},{label:'Sick Leave',used:2,total:8},{label:'Earned Leave',used:5,total:15},{label:'Comp Off',used:1,total:4}];

    var present  = empAtt.filter(function(r){return r.status==='present'||r.status==='late';}).length;
    var absent   = empAtt.filter(function(r){return r.status==='absent';}).length;
    var onLeave  = empAtt.filter(function(r){return r.status==='leave';}).length;
    var pendingL = leaves.filter(function(l){return l.status==='pending';}).length;
    var balStr   = balance.map(function(b){return b.label+': '+(b.total-b.used)+' left';}).join(' | ');

    rows.push([emp.id, emp.name, emp.dept, emp.role, emp.join, present, absent, onLeave, perms.length, pendingL, balStr]);
  });
  downloadCSV(rows, 'WorkPulse_FullReport_' + new Date().toISOString().split('T')[0] + '.csv');
  showAdminToast('✅ Full report exported!');
}

// Wire export buttons in Reports screen + Attendance screen
(function() {
  var btnMap = {
    'exportAttendanceBtn'    : exportAttendanceReport,
    'exportAttendanceBtnAtt' : exportAttendanceReport,
    'exportLeaveBtn'         : exportLeaveReport,
    'exportPermissionBtn'    : exportPermissionReport,
    'exportFullBtn'          : exportFullReport
  };
  Object.keys(btnMap).forEach(function(id) {
    var btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', btnMap[id]);
  });
})();

// ── WORK HOURS TABLE — real data from sessions + attendance ───
function buildWorkHoursTableReal() {
  var tbody = document.getElementById('workHoursTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  var attRecs = [];
  try { attRecs = JSON.parse(localStorage.getItem('wp_attendance')||'[]'); } catch(e){}

  var TARGET_DAYS = 5, TARGET_HOURS = 40;

  employees.forEach(function(emp) {
    var empAtt = attRecs.filter(function(r){ return r.empId===emp.id && (r.status==='present'||r.status==='late'); });
    var workDays = empAtt.length;

    // Calculate total worked hours from sessions + attendance
    var totalMins = 0;
    empAtt.forEach(function(r) {
      if (r.workedSecs) { totalMins += Math.floor(r.workedSecs/60); }
      else if (r.checkIn && r.checkOut && r.checkIn!=='—' && r.checkOut!=='—') {
        var p1=r.checkIn.split(':'), p2=r.checkOut.split(':');
        totalMins += (parseInt(p2[0])*60+parseInt(p2[1])) - (parseInt(p1[0])*60+parseInt(p1[1]));
      }
    });

    // Today's live session
    var todayIn='—', todayOut='—', todayMins=0;
    try {
      var sesRaw = localStorage.getItem('wp_session_'+emp.id);
      if (sesRaw) {
        var ses = JSON.parse(sesRaw);
        var todayKey = (function(){ var d=new Date(),p=function(n){return String(n).padStart(2,'0');}; return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); })();
        if (ses && ses.date===todayKey) {
          var ws=0;
          (ses.segments||[]).forEach(function(seg){ if(seg.type==='work'){ var s=new Date(seg.start).getTime(),e2=seg.end?new Date(seg.end).getTime():Date.now(); ws+=Math.floor((e2-s)/1000); } });
          todayMins = Math.floor(ws/60);
          if (ses.checkIn) { var ci=new Date(ses.checkIn); todayIn=String(ci.getHours()).padStart(2,'0')+':'+String(ci.getMinutes()).padStart(2,'0'); }
          if (ses.checkOut) { var co=new Date(ses.checkOut); todayOut=String(co.getHours()).padStart(2,'0')+':'+String(co.getMinutes()).padStart(2,'0'); }
          totalMins += todayMins;
          if (todayIn!=='—') workDays = Math.max(workDays, 1);
        }
      }
    } catch(e){}

    var totalHours = (totalMins/60).toFixed(1)*1;

    var tr = document.createElement('tr');
    var empTd = document.createElement('td');
    var wrap = document.createElement('div'); wrap.style.cssText='display:flex;align-items:center;gap:8px;';
    var av = document.createElement('div'); av.className='avatar'; av.style.cssText='width:28px;height:28px;font-size:10px;flex-shrink:0;'; av.textContent=emp.initials;
    var nameDiv = document.createElement('div');
    var nm=document.createElement('div'); nm.style.cssText='font-weight:600;font-size:13px;color:var(--brand);cursor:pointer;'; nm.textContent=emp.name;
    (function(e){ nm.addEventListener('click', function(){ openEmployeeDetail(e); }); })(emp);
    var idEl=document.createElement('div'); idEl.style.cssText='font-size:10px;color:var(--text-muted);'; idEl.textContent=emp.id;
    nameDiv.appendChild(nm); nameDiv.appendChild(idEl); wrap.appendChild(av); wrap.appendChild(nameDiv); empTd.appendChild(wrap);
    tr.appendChild(empTd);

    function td(t){var c=document.createElement('td');c.textContent=t;return c;}
    tr.appendChild(td(emp.dept));

    var daysTd=document.createElement('td');
    var dw=document.createElement('div'); dw.className='wh-progress';
    var dt=document.createElement('div'); dt.className='wh-bar-track';
    var df=document.createElement('div'); df.className='wh-bar-fill '+(workDays>=TARGET_DAYS?'good':workDays>=TARGET_DAYS-1?'warn':'low'); df.style.width=Math.min(100,Math.round((workDays/TARGET_DAYS)*100))+'%';
    dt.appendChild(df); var dl2=document.createElement('span'); dl2.className='wh-hours-label'; dl2.textContent=workDays+' / '+TARGET_DAYS;
    dw.appendChild(dt); dw.appendChild(dl2); daysTd.appendChild(dw); tr.appendChild(daysTd);

    var hrsTd=document.createElement('td');
    var hw=document.createElement('div'); hw.className='wh-progress';
    var ht=document.createElement('div'); ht.className='wh-bar-track';
    var hf=document.createElement('div'); hf.className='wh-bar-fill '+(totalHours>=TARGET_HOURS?'good':totalHours>=TARGET_HOURS-5?'warn':'low'); hf.style.width=Math.min(100,Math.round((totalHours/TARGET_HOURS)*100))+'%';
    ht.appendChild(hf); var hl2=document.createElement('span'); hl2.className='wh-hours-label'; hl2.textContent=totalHours+'h / '+TARGET_HOURS+'h';
    hw.appendChild(ht); hw.appendChild(hl2); hrsTd.appendChild(hw); tr.appendChild(hrsTd);

    tr.appendChild(td(workDays>0?(totalHours/workDays).toFixed(1)+'h':'0.0h'));

    var ot=Math.max(0,totalHours-TARGET_HOURS);
    var otTd=document.createElement('td'); otTd.textContent=ot>0?'+'+ot.toFixed(1)+'h':'—';
    if(ot>0) otTd.style.cssText='color:var(--green);font-weight:600;';
    tr.appendChild(otTd);

    tr.appendChild(td(todayIn)); tr.appendChild(td(todayOut));

    var todayTd=document.createElement('td');
    todayTd.textContent=todayMins>0?Math.floor(todayMins/60)+'h '+(todayMins%60)+'m':'—';
    if(todayMins>0) todayTd.style.cssText='font-weight:600;color:var(--brand);';
    tr.appendChild(todayTd);

    var stTd=document.createElement('td'); var b=document.createElement('span');
    var ls = getEmployeeLiveStatus(emp);
    var stMap = { present:'badge-green', break:'badge-yellow', 'checked-out':'badge-blue', leave:'badge-purple', absent:'badge-red' };
    var lbMap = { present:'Working', break:'On Break', 'checked-out':'Done', leave:'On Leave', absent:'Absent' };
    b.className='badge '+(stMap[ls.status]||'badge-red'); b.textContent=lbMap[ls.status]||'Absent';
    stTd.appendChild(b); tr.appendChild(stTd);

    tbody.appendChild(tr);
  });
}
buildWorkHoursTableReal();
// Refresh every 10s when on work hours screen
setInterval(function() {
  var s = document.getElementById('screen-admin-workhours');
  if (s && s.classList.contains('active')) buildWorkHoursTableReal();
}, 10000);

// ═══════════════════════════════════════════════════════════════
//  PERMISSIONS QUEUE for Admin
// ═══════════════════════════════════════════════════════════════
function buildPermissionsQueue() {
  var container = document.getElementById('permissionsContainer');
  if (!container) return;
  container.innerHTML = '';

  var allPerms = [];
  try { allPerms = JSON.parse(localStorage.getItem('wp_all_permissions')||'[]'); } catch(e){}
  var pending = allPerms.filter(function(p){ return p.status === 'pending'; });

  if (!pending.length) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">✅ No pending permissions</div>';
    return;
  }

  pending.forEach(function(perm, idx) {
    var card = document.createElement('div');
    card.className = 'approval-card';
    card.innerHTML =
      '<div class="approval-card-header">' +
        '<div class="approval-avatar">'+perm.empName.split(' ').map(function(w){return w[0];}).join('').toUpperCase().slice(0,2)+'</div>' +
        '<div><div class="approval-name">'+perm.empName+'</div><div class="approval-meta">'+perm.dept+' · '+perm.date+'</div></div>' +
      '</div>' +
      '<div class="approval-details">' +
        '<div class="approval-detail-item"><div class="approval-detail-label">Type</div><div class="approval-detail-val">'+perm.type+'</div></div>' +
        '<div class="approval-detail-item"><div class="approval-detail-label">From</div><div class="approval-detail-val">'+perm.from+'</div></div>' +
        '<div class="approval-detail-item"><div class="approval-detail-label">To</div><div class="approval-detail-val">'+perm.to+'</div></div>' +
      '</div>' +
      '<div class="approval-reason">'+perm.reason+'</div>' +
      '<div class="approval-actions">' +
        '<button class="btn btn-sm btn-danger perm-reject-btn" data-idx="'+idx+'">✕ Reject</button>' +
        '<button class="btn btn-sm btn-primary perm-approve-btn" data-idx="'+idx+'">✓ Approve</button>' +
      '</div>';
    container.appendChild(card);
  });

  container.querySelectorAll('.perm-approve-btn, .perm-reject-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var decision = this.classList.contains('perm-approve-btn') ? 'approved' : 'rejected';
      var idx = parseInt(this.getAttribute('data-idx'));
      var allPerms2 = [];
      try { allPerms2 = JSON.parse(localStorage.getItem('wp_all_permissions')||'[]'); } catch(e){}
      var pendingAgain = allPerms2.filter(function(p){return p.status==='pending';});
      if (pendingAgain[idx]) {
        pendingAgain[idx].status = decision;
        // Update in main array
        var pKey = pendingAgain[idx].empId;
        allPerms2 = allPerms2.map(function(p) {
          if (p === pendingAgain[idx] || (p.empId===pKey && p.date===pendingAgain[idx].date && p.from===pendingAgain[idx].from)) {
            return Object.assign({}, p, { status: decision });
          }
          return p;
        });
        localStorage.setItem('wp_all_permissions', JSON.stringify(allPerms2));
        // Also update employee's own permissions store
        var empPerms = [];
        try { empPerms = JSON.parse(localStorage.getItem('wp_permissions_'+pKey)||'[]'); } catch(e){}
        empPerms = empPerms.map(function(p) {
          if (p.date===pendingAgain[idx].date && p.from===pendingAgain[idx].from) return Object.assign({}, p, {status:decision});
          return p;
        });
        localStorage.setItem('wp_permissions_'+pKey, JSON.stringify(empPerms));
      }
      buildPermissionsQueue();
      showAdminToast('Permission ' + decision + '!');
    });
  });
}
buildPermissionsQueue();
setInterval(function() {
  var screen = document.getElementById('screen-admin-permissions');
  if (screen && screen.classList.contains('active')) buildPermissionsQueue();
}, 10000);

// ═══════════════════════════════════════════════════════════════
//  DETAILED ATTENDANCE LOG — live per-employee with breaks
// ═══════════════════════════════════════════════════════════════
function buildDetailedAttendance() {
  var tbody = document.getElementById('attDetailBody');
  var todayLabel = document.getElementById('attTodayLabel');
  var summaryStrip = document.getElementById('attLiveSummary');
  if (!tbody) return;

  var today = (function(){
    var d=new Date(); var p=function(n){return String(n).padStart(2,'0');};
    return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
  })();
  if (todayLabel) todayLabel.textContent = new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  tbody.innerHTML = '';

  var totalPresent=0, totalBreak=0, totalAbsent=0, totalLeave=0;

  employees.forEach(function(emp) {
    var ls = getEmployeeLiveStatus(emp);

    // Count summary
    if (ls.status==='present')      totalPresent++;
    else if (ls.status==='break')   { totalPresent++; totalBreak++; }
    else if (ls.status==='leave')   totalLeave++;
    else                            totalAbsent++;

    var tr = document.createElement('tr');

    // Row highlight based on status
    var rowBg = { present:'', break:'#fffbeb', 'checked-out':'#f9fafb', absent:'#fff5f5', leave:'#f5f3ff' };
    tr.style.background = rowBg[ls.status] || '';

    // Employee cell
    var empTd = document.createElement('td');
    empTd.innerHTML = '<div style="display:flex;align-items:center;gap:8px;">' +
      '<div style="width:28px;height:28px;border-radius:50%;background:'+ls.color+';color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">'+emp.initials+'</div>' +
      '<div><div style="font-weight:600;font-size:13px;color:var(--brand);cursor:pointer;" class="emp-detail-link" data-id="'+emp.id+'">'+emp.name+'</div>' +
      '<div style="font-size:11px;color:var(--text-muted);">'+emp.id+'</div></div></div>';
    tr.appendChild(empTd);

    function td(t, style) { var c=document.createElement('td'); c.innerHTML=t; if(style) c.style.cssText=style; return c; }

    tr.appendChild(td(emp.dept));

    // Status badge with colour
    var stColors = { present:'background:#dcfce7;color:#166534', break:'background:#fef9c3;color:#92400e', 'checked-out':'background:#f3f4f6;color:#374151', absent:'background:#fee2e2;color:#991b1b', leave:'background:#ede9fe;color:#4338ca' };
    var stLabels = { present:'🟢 Working', break:'☕ '+ls.label, 'checked-out':'✓ Checked Out', absent:'🔴 Absent', leave:'📅 On Leave' };
    tr.appendChild(td('<span style="padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;'+(stColors[ls.status]||'')+'">'+( stLabels[ls.status]||ls.status)+'</span>'));

    tr.appendChild(td(ls.checkIn  || '--:--'));
    tr.appendChild(td(ls.checkOut || '--:--'));

    // Work time
    tr.appendChild(td(ls.workedSecs ? '<strong>'+fhm2(ls.workedSecs)+'</strong>' : '—'));

    // Break time
    tr.appendChild(td(ls.breakSecs ? '<span style="color:#d97706;font-weight:600;">'+fhm2(ls.breakSecs)+'</span>' : '—'));

    // Breaks taken list
    var breaksTd = document.createElement('td');
    breaksTd.style.fontSize = '11px';
    try {
      var sesRaw = localStorage.getItem('wp_session_'+emp.id);
      if (sesRaw) {
        var ses = JSON.parse(sesRaw);
        if (ses && ses.date === today && ses.breaks && ses.breaks.length) {
          breaksTd.innerHTML = ses.breaks.map(function(b) {
            return '<div style="white-space:nowrap;">'+b.label+' ('+b.durationMins+'m)</div>';
          }).join('');
        } else { breaksTd.textContent = '—'; }
      } else { breaksTd.textContent = '—'; }
    } catch(e) { breaksTd.textContent = '—'; }
    tr.appendChild(breaksTd);

    // Details button
    var detTd = document.createElement('td');
    var detBtn = document.createElement('button');
    detBtn.className = 'btn btn-sm btn-outline';
    detBtn.textContent = '👁 View';
    detBtn.setAttribute('data-id', emp.id);
    detBtn.addEventListener('click', function() {
      var e2 = employees.find(function(e){return e.id===this.getAttribute('data-id');}.bind(this));
      if (e2) openEmployeeDetail(e2);
    });
    detTd.appendChild(detBtn);
    tr.appendChild(detTd);

    tbody.appendChild(tr);
  });

  // Wire name links
  tbody.querySelectorAll('.emp-detail-link').forEach(function(el) {
    el.addEventListener('click', function() {
      var id = this.getAttribute('data-id');
      var emp = employees.find(function(e){return e.id===id;});
      if (emp) openEmployeeDetail(emp);
    });
  });

  // Build summary strip
  if (summaryStrip) {
    summaryStrip.innerHTML =
      '<div class="stat-card"><div class="stat-icon" style="background:#dcfce7">🟢</div><div class="stat-info"><div class="stat-value">'+totalPresent+'</div><div class="stat-label">Working Now</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon" style="background:#fef9c3">☕</div><div class="stat-info"><div class="stat-value">'+totalBreak+'</div><div class="stat-label">On Break</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon" style="background:#ede9fe">📅</div><div class="stat-info"><div class="stat-value">'+totalLeave+'</div><div class="stat-label">On Leave</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon" style="background:#fee2e2">🔴</div><div class="stat-info"><div class="stat-value">'+totalAbsent+'</div><div class="stat-label">Absent</div></div></div>';
  }
}

buildDetailedAttendance();
// Refresh every 5 seconds
setInterval(function() {
  var attScreen = document.getElementById('screen-admin-attendance');
  if (attScreen && attScreen.classList.contains('active')) buildDetailedAttendance();
}, 5000);

// showAdminToast defined at line ~1049 — no duplicate needed
