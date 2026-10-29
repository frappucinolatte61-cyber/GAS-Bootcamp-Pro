const State = { token: null, user: null, page: 'dashboard', dashboard: null, activeCourse: null, activeLesson: null, adminUsers: [], adminCourses: [], adminLessons: [], enrollments: [], search: '', sidebarOpen: false };
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials = name => String(name || 'U').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
const fmtDate = value => { if(!value) return '—'; const d=new Date(value); return isNaN(d) ? '—' : d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}); };
// Konfigurasi API. '/api' = proxy Vercel Function (lihat api/index.js).
const API_URL = '/api';

async function callServer(method, ...args) {
  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      // text/plain sengaja dipakai agar tidak memicu preflight CORS (Apps Script tidak menangani OPTIONS)
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ method: method, args: args })
    });
  } catch (e) {
    throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internetmu.');
  }
  let json;
  try { json = await res.json(); }
  catch (e) { throw new Error('Respons server tidak valid (' + res.status + ').'); }
  if (!json.ok) throw new Error(json.error || 'Terjadi kesalahan di server.');
  return json.data;
}
function toast(message, type='') {
  const el=document.createElement('div'); el.className='toast '+type; el.textContent=message;
  $('#toast-region').appendChild(el); setTimeout(()=>el.remove(),4200);
}
function setLoading(message='Memuat data…') {
  $('#app').innerHTML=`<section class="loading-screen"><div class="brand-mark">G</div><div class="spinner"></div><p>${esc(message)}</p></section>`;
}
function saveSession(token,user) { State.token=token; State.user=user; try{sessionStorage.setItem('gbp_token',token)}catch(e){} }
function clearSession() { State.token=null;State.user=null;try{sessionStorage.removeItem('gbp_token')}catch(e){} }
async function init() {
  try {
    const token=sessionStorage.getItem('gbp_token');
    if(token) {
      State.token=token;
      try { State.dashboard=await callServer('getDashboard',token); State.user=State.dashboard.user; renderShell(); renderPage(); return; }
      catch(e){ clearSession(); }
    }
    renderLogin();
  } catch(e) { console.error('Gagal menginisialisasi aplikasi:', e); renderLogin(); }
}
function renderLogin() {
  $('#app').innerHTML=`
  <section class="stitch-auth-layout">
    <div class="stitch-auth-card">
      <div class="stitch-auth-brand"><div class="stitch-logo">G<span>.</span></div><div><strong>GAS-Bootcamp Pro</strong><small>LEARNING MANAGEMENT SYSTEM</small></div></div>
      <div class="stitch-auth-intro"><span class="stitch-kicker">SELAMAT DATANG KEMBALI</span><h1>Masuk ke ruang belajarmu</h1><p>Akses materi, lanjutkan progres, dan capai target belajarmu hari ini.</p></div>
      <form id="login-form" class="stitch-login-form">
        <div class="field"><label for="login-email">Alamat Email</label><input id="login-email" name="email" type="email" placeholder="nama@email.com" autocomplete="username" required maxlength="254"></div>
        <div class="field"><div class="stitch-label-row"><label for="login-password">Kata Sandi</label><span class="stitch-muted-label">Akun terdaftar</span></div><div class="password-wrap"><input id="login-password" name="password" type="password" placeholder="Masukkan kata sandi" autocomplete="current-password" required><button type="button" class="show-password" data-action="toggle-password">Lihat</button></div></div>
        <button class="btn btn-primary btn-block stitch-login-button" id="login-submit" type="submit">Masuk ke Portal Belajar <span>→</span></button>
      </form>
      <div class="stitch-security-note"><span class="stitch-security-icon">✓</span><span><strong>Akses aman dan terlindungi</strong><small>Gunakan akun yang diberikan oleh pengelola bootcamp. Belum punya akun? Hubungi admin.</small></span></div>
      <div class="stitch-auth-footer"><span>© ${new Date().getFullYear()} GAS-Bootcamp Pro</span><span>Belajar · Bertumbuh · Berkarya</span></div>
    </div>
    <div class="stitch-auth-background-mark" aria-hidden="true">G</div>
  </section>`;
  $('#login-form').addEventListener('submit', handleLogin);
}
async function handleLogin(e) {
  e.preventDefault();
  const btn = $('#login-submit');
  if (!btn) return;
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = 'Memeriksa akun…';
  try {
    const result = await callServer('login', $('#login-email').value.trim(), $('#login-password').value);
    saveSession(result.token, result.user);
    State.dashboard = await callServer('getDashboard', State.token);
    State.user = State.dashboard.user;
    State.page = 'dashboard';
    renderShell();
    await renderPage();
    toast('Berhasil masuk. Selamat belajar!', 'success');
  } catch (err) {
    toast(err && err.message ? err.message : 'Gagal masuk. Silakan coba lagi.', 'error');
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

function navItem(page,icon,label) { return `<button class="nav-item ${State.page===page?'active':''}" data-page="${page}"><span class="nav-icon">${icon}</span><span>${label}</span></button>`; }
function renderShell() {
  const admin=State.user.role==='admin';
  $('#app').innerHTML=`
    <div class="mobile-overlay ${State.sidebarOpen?'show':''}" data-action="close-sidebar"></div>
    <div class="workspace">
      <aside class="sidebar ${State.sidebarOpen?'open':''}" id="sidebar">
        <div class="brand"><div class="brand-mark">G</div><span>GAS-Bootcamp <span style="color:#a8a9ff">Pro</span></span></div>
        <div><div class="nav-label">Workspace</div><nav class="nav-list">
          ${navItem('dashboard','⌂','Dashboard')}
          ${admin ? navItem('courses','▤','Manajemen Kelas') : navItem('catalog','◈','Jelajahi Kelas')}
          ${admin ? navItem('users','♙','Manajemen Pengguna') : navItem('mycourses','▣','Kelas Saya')}
          ${admin ? navItem('enrollments','⇄','Akses Kelas') : ''}
        </nav></div>
        <div><div class="nav-label">Personal</div><nav class="nav-list">${navItem('profile','⚙','Profil Saya')}</nav></div>
        <div class="sidebar-bottom"><div class="profile-mini"><div class="avatar">${esc(initials(State.user.name))}</div><div style="min-width:0"><strong>${esc(State.user.name)}</strong><small>${admin?'Administrator':'Member'}</small></div></div><button class="nav-item" data-action="logout"><span class="nav-icon">↪</span><span>Keluar</span></button></div>
      </aside>
      <section class="main-area">
        <header class="topbar"><div class="topbar-left"><button class="mobile-menu" data-action="toggle-sidebar" aria-label="Buka menu">☰</button><div><h2 id="topbar-title">Dashboard</h2><p id="topbar-subtitle">Ringkasan aktivitas belajarmu</p></div></div><div class="topbar-right"><span class="topbar-user-name" style="font-size:12px;color:var(--muted)">${esc(State.user.name)}</span><div class="avatar">${esc(initials(State.user.name))}</div></div></header>
        <div class="content" id="page-content"></div>
      </section>
    </div>`;
  $('#app').addEventListener('click',handleGlobalClick);
}
function handleGlobalClick(e) {
  const page=e.target.closest('[data-page]'); if(page){navigate(page.dataset.page);return;}
  const act=e.target.closest('[data-action]'); if(!act)return;
  const action=act.dataset.action;
  if(action==='logout') doLogout();
  if(action==='toggle-sidebar'){State.sidebarOpen=!State.sidebarOpen;$('#sidebar').classList.toggle('open',State.sidebarOpen);$('.mobile-overlay').classList.toggle('show',State.sidebarOpen);}
  if(action==='close-sidebar'){State.sidebarOpen=false;$('#sidebar').classList.remove('open');$('.mobile-overlay').classList.remove('show');}
  if(action==='toggle-password'){const input=$('#login-password');if(input){input.type=input.type==='password'?'text':'password';act.textContent=input.type==='password'?'Lihat':'Sembunyi';}}
  if(action==='refresh') refreshDashboard();
  if(action==='open-course') openCourse(act.dataset.id);
  if(action==='open-lesson') openLesson(act.dataset.id);
  if(action==='complete-lesson') toggleComplete(act.dataset.id,act.dataset.completed==='true');
  if(action==='back-course') renderCourse(State.activeCourse);
  if(action==='edit-user') openUserModal(act.dataset.id);
  if(action==='delete-user') deleteUser(act.dataset.id);
  if(action==='edit-course') openCourseModal(act.dataset.id);
  if(action==='delete-course') deleteCourse(act.dataset.id);
  if(action==='manage-lessons') manageLessons(act.dataset.id);
  if(action==='new-user') openUserModal();
  if(action==='new-course') openCourseModal();
  if(action==='new-lesson') openLessonModal(act.dataset.course);
  if(action==='edit-lesson') openLessonModal(act.dataset.id);
  if(action==='delete-lesson') deleteLesson(act.dataset.id,act.dataset.course);
  if(action==='enroll-course') enrollCourse(act.dataset.id);
  if(action==='save-profile') saveProfile();
  if(action==='change-password') openPasswordModal();
  if(action==='open-password-modal') openPasswordModal();
  if(action==='close-modal') closeModal();
}
async function doLogout(){try{await callServer('logout',State.token)}catch(e){}clearSession();State.dashboard=null;renderLogin();}
async function navigate(page) {
  State.page=page;State.sidebarOpen=false;
  if($('#sidebar')){$('#sidebar').classList.remove('open');$('.mobile-overlay')?.classList.remove('show');}
  renderShell(); await renderPage();
}
async function refreshDashboard(){try{State.dashboard=await callServer('getDashboard',State.token);State.user=State.dashboard.user;renderPage();}catch(e){handleSessionError(e)}}
async function renderPage() {
  const titles={dashboard:['Dashboard','Ringkasan aktivitas dan progres'],catalog:['Jelajahi Kelas','Temukan kelas untuk meningkatkan skill'],mycourses:['Kelas Saya','Lanjutkan materi yang sedang kamu pelajari'],courses:['Manajemen Kelas','Kelola katalog dan materi bootcamp'],users:['Manajemen Pengguna','Kelola akun dan akses pengguna'],enrollments:['Akses Kelas','Atur member yang dapat mengikuti kelas'],profile:['Profil Saya','Kelola informasi akunmu'],course:['Detail Kelas','Pelajari materi secara terstruktur'],lesson:['Materi Pembelajaran','Fokus pada satu langkah dalam satu waktu']};
  const title=titles[State.page]||titles.dashboard;$('#topbar-title').textContent=title[0];$('#topbar-subtitle').textContent=title[1];
  try {
    if(!State.dashboard) State.dashboard=await callServer('getDashboard',State.token);
    const c=$('#page-content');
    if(State.page==='dashboard') c.innerHTML=State.user.role==='admin'?adminDashboard():memberDashboard();
    else if(State.page==='catalog') c.innerHTML=catalogPage();
    else if(State.page==='mycourses') c.innerHTML=memberCoursesPage();
    else if(State.page==='courses'){State.adminCourses=await callServer('adminListCourses',State.token);c.innerHTML=adminCoursesPage();}
    else if(State.page==='users'){State.adminUsers=await callServer('adminListUsers',State.token);c.innerHTML=adminUsersPage();}
    else if(State.page==='enrollments'){State.enrollments=await callServer('adminListEnrollments',State.token);State.adminUsers=await callServer('adminListUsers',State.token);State.adminCourses=await callServer('adminListCourses',State.token);c.innerHTML=enrollmentsPage();}
    else if(State.page==='profile') c.innerHTML=profilePage();
    else if(State.page==='course') await renderCourse(State.activeCourse);
    else if(State.page==='lesson') await renderLesson(State.activeLesson);
    bindPageEvents();
  } catch(e){handleSessionError(e);}
}
function statCard(icon,label,value,foot='') {return `<article class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon">${icon}</span></div><div class="stat-number">${value}</div><div class="stat-foot">${foot}</div></article>`;}
function pageHead(title,sub,button=''){return `<div class="page-head"><div><h1>${title}</h1><p>${sub}</p></div>${button}</div>`;}
function cover(course,i=0){const colors=['','green','orange','blue'];const emojis=['✦','⌘','◉','▧'];return `<div class="course-cover ${colors[i%colors.length]}">${course.thumbnail?`<img src="${esc(course.thumbnail)}" alt="" loading="lazy">`:`<span class="cover-emoji">${emojis[i%emojis.length]}</span>`}</div>`;}
function courseCard(c,i=0,showEnroll=false){return `<article class="course-card">${cover(c,i)}<div class="course-body"><div class="course-meta"><span class="pill pill-purple">${esc(c.category||'Umum')}</span><span>${esc(c.level||'Pemula')}</span></div><h3>${esc(c.title)}</h3><p>${esc(c.description||'Materi pembelajaran yang disusun untuk membantumu berkembang.')}</p>${showEnroll?`<div class="course-foot"><span>${c.lessonCount||0} materi</span><button class="btn btn-primary btn-sm" data-action="enroll-course" data-id="${esc(c.id)}">Minta akses</button></div>`:`<div class="progress-line"><span>${c.completedCount||0} dari ${c.lessonCount||0} materi selesai</span><strong>${c.progress||0}%</strong></div><div class="progress-track"><div class="progress-fill" style="width:${Math.max(0,Math.min(100,c.progress||0))}%"></div></div><div class="course-foot"><span>${c.lessonCount||0} materi</span><button class="btn btn-light btn-sm" data-action="open-course" data-id="${esc(c.id)}">Lanjut belajar →</button></div>`}</div></article>`;}
function memberDashboard(){
  const d=State.dashboard,s=d.stats,courses=d.courses||[];
  const completed=Number(s.completed||0), enrolled=Number(s.enrolled||0), overall=enrolled?Math.round(completed/Math.max(1,courses.reduce((n,c)=>n+(Number(c.lessonCount)||0),0))*100):0;
  return `<div class="stitch-dashboard-wrap">
    <section class="stitch-welcome"><div><span class="stitch-kicker">RUANG BELAJAR PERSONAL</span><h1>Selamat datang kembali, ${esc((State.user.name||'').split(' ')[0])} <span>✦</span></h1><p>Setiap langkah kecil membawamu lebih dekat ke tujuan. Yuk, lanjutkan kelas yang sedang kamu pelajari.</p><div class="stitch-welcome-actions"><button class="btn btn-primary btn-sm" data-page="mycourses">Lanjutkan belajar <span>→</span></button><span class="stitch-welcome-caption"><span class="stitch-live-dot"></span> Perjalanan belajarmu terus berjalan</span></div></div><div class="stitch-welcome-art"><div class="stitch-art-orbit"></div><div class="stitch-art-card"><span>✦</span><strong>Keep</strong><strong>Growing</strong><small>ONE LESSON AT A TIME</small></div></div></section>
    <div class="stitch-stat-grid">${statCard('▣','Kelas Diikuti',s.enrolled,'Kelas aktif untukmu')}${statCard('✓','Materi Selesai',s.completed,'Materi yang sudah dituntaskan')}${statCard('◈','Kelas Tersedia',s.available,'Temukan skill berikutnya')}</div>
    <div class="stitch-member-columns"><div class="stitch-main-column">
      <div class="section-heading"><div><h2>Lanjutkan Belajar</h2><p>Teruskan progres dari kelas pilihanmu.</p></div><button class="btn btn-light btn-sm" data-page="mycourses">Semua kelas <span>→</span></button></div>
      ${courses.length?`<div class="course-grid stitch-course-grid">${courses.slice(0,4).map(courseCard).join('')}</div>`:`<div class="empty-state"><div class="empty-icon">📚</div><h3>Perjalananmu dimulai di sini</h3><p>Kamu belum memiliki kelas aktif. Jelajahi katalog dan minta akses kelas dari pengelola bootcamp.</p><br><button class="btn btn-primary" data-page="catalog">Jelajahi kelas</button></div>`}
    </div><aside class="stitch-member-rail"><article class="panel stitch-progress-panel"><div class="stitch-rail-heading"><span class="stitch-rail-icon">◔</span><span><strong>Ringkasan Belajar</strong><small>Progres keseluruhan</small></span></div><div class="stitch-progress-ring" style="--progress:${Math.min(100,Math.max(0,overall))}%"><div><strong>${Math.min(100,Math.max(0,overall))}%</strong><small>PROGRES</small></div></div><p class="stitch-rail-copy">Kamu sudah menyelesaikan <strong>${completed}</strong> materi. Terus konsisten dan rayakan setiap kemajuan.</p><button class="btn btn-outline btn-block btn-sm" data-page="mycourses">Lihat progres kelas</button></article><article class="panel stitch-tip-panel"><span class="stitch-tip-symbol">✧</span><span class="stitch-kicker">TIP BELAJAR</span><h3>Sedikit demi sedikit, lama-lama menjadi mahir.</h3><p>Tetapkan waktu belajar yang konsisten dan tandai setiap materi yang sudah selesai.</p></article></aside></div>
  </div>`;
}
function adminDashboard(){
  const d=State.dashboard,s=d.stats;
  return `<div class="stitch-dashboard-wrap"><section class="stitch-admin-heading"><div><span class="stitch-kicker">ADMIN WORKSPACE</span><h1>Overview Platform</h1><p>Pantau aktivitas dan kelola pengalaman belajar seluruh member.</p></div><button class="btn btn-primary btn-sm" data-page="courses">＋ Buat / Kelola Kelas</button></section>
  <div class="stitch-stat-grid stitch-admin-stats">${statCard('♙','Member Aktif',s.users,'Pengguna selain admin')}${statCard('▤','Kelas Terbit',s.courses,'Kelas yang dapat diakses')}${statCard('▣','Materi Terbit',s.lessons,'Konten pembelajaran')}${statCard('⇄','Akses Kelas',s.enrollments,'Pendaftaran aktif')}</div>
  <div class="stitch-admin-columns"><div class="stitch-main-column"><div class="section-heading"><div><h2>Aktivitas Pengguna</h2><p>Member yang baru bergabung di platform.</p></div><button class="btn btn-light btn-sm" data-page="users">Semua pengguna →</button></div>
  <div class="panel stitch-table-panel">${(d.recentUsers||[]).length?`<div class="table-wrap"><table><thead><tr><th>Pengguna</th><th>Status</th><th>Bergabung</th></tr></thead><tbody>${d.recentUsers.map(u=>`<tr><td><div class="user-cell"><div class="avatar">${esc(initials(u.name))}</div><div><strong>${esc(u.name)}</strong><small>${esc(u.email)}</small></div></div></td><td><span class="pill ${u.status==='active'?'pill-green':'pill-orange'}">${esc(u.status)}</span></td><td>${fmtDate(u.createdAt)}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty-state"><p>Belum ada member.</p></div>`}</div>
  <div class="section-heading"><div><h2>Akses Cepat</h2><p>Area utama pengelolaan bootcamp.</p></div></div><div class="stitch-admin-quick-grid"><article class="panel stitch-quick-card"><span class="stitch-quick-icon">♙</span><h3>Manajemen Pengguna</h3><p>Kelola akun, status, dan peran pengguna.</p><button class="btn btn-outline btn-sm" data-page="users">Kelola pengguna →</button></article><article class="panel stitch-quick-card"><span class="stitch-quick-icon">▤</span><h3>Kelas & Materi</h3><p>Susun kurikulum dan perbarui konten.</p><button class="btn btn-outline btn-sm" data-page="courses">Kelola kelas →</button></article><article class="panel stitch-quick-card"><span class="stitch-quick-icon">⇄</span><h3>Akses Kelas</h3><p>Atur kelas yang dapat diikuti member.</p><button class="btn btn-outline btn-sm" data-page="enrollments">Atur akses →</button></article></div>
  </div><aside class="stitch-member-rail"><article class="panel stitch-admin-rail"><span class="stitch-kicker">PLATFORM HEALTH</span><h3>Ringkasan Platform</h3><div class="stitch-health-row"><span>Total kelas</span><strong>${esc(s.courses)}</strong></div><div class="stitch-health-row"><span>Total materi</span><strong>${esc(s.lessons)}</strong></div><div class="stitch-health-row"><span>Member aktif</span><strong>${esc(s.users)}</strong></div><div class="stitch-health-row"><span>Akses kelas</span><strong>${esc(s.enrollments)}</strong></div><div class="stitch-health-note"><span class="stitch-live-dot"></span> Data diperbarui saat dashboard dimuat</div></article><article class="panel stitch-tip-panel"><span class="stitch-tip-symbol">✧</span><span class="stitch-kicker">ADMIN NOTE</span><h3>Jaga materi tetap terstruktur.</h3><p>Pastikan setiap kelas memiliki materi yang jelas dan akses member yang sesuai.</p></article></aside></div></div>`;
}
function catalogPage(){const courses=State.dashboard.catalog||[];return `${pageHead('Jelajahi Kelas','Pilih kelas untuk memulai perjalanan belajarmu.')}${courses.length?`<div class="course-grid">${courses.map((c,i)=>courseCard(c,i,true)).join('')}</div>`:`<div class="empty-state"><div class="empty-icon">✨</div><h3>Kamu sudah menjelajahi semuanya</h3><p>Saat ini tidak ada kelas lain yang tersedia di katalog. Hubungi admin untuk informasi kelas baru.</p></div>`}`;}
function memberCoursesPage(){const courses=State.dashboard.courses||[];return `${pageHead('Kelas Saya','Semua kelas yang saat ini dapat kamu akses.')}${courses.length?`<div class="course-grid">${courses.map((c,i)=>courseCard(c,i)).join('')}</div>`:`<div class="empty-state"><div class="empty-icon">📚</div><h3>Belum ada kelas aktif</h3><p>Jelajahi katalog untuk menemukan kelas yang cocok dengan tujuan belajarmu.</p><br><button class="btn btn-primary" data-page="catalog">Jelajahi kelas</button></div>`}`;}
function adminCoursesPage(){return `${pageHead('Manajemen Kelas','Buat kelas, perbarui detail, dan susun materi.','<button class="btn btn-primary" data-action="new-course">＋ Buat kelas</button>')}<div class="toolbar"><input class="input" id="course-search" placeholder="Cari kelas…" value="${esc(State.search)}"><button class="btn btn-outline" data-action="refresh">↻ Segarkan</button></div><div class="panel"><div class="table-wrap"><table><thead><tr><th>Kelas</th><th>Kategori</th><th>Materi</th><th>Status</th><th>Aksi</th></tr></thead><tbody id="courses-table-body">${State.adminCourses.map(c=>`<tr data-search="${esc((c.title+' '+c.category).toLowerCase())}"><td><div class="user-cell"><div class="avatar">▤</div><div><strong>${esc(c.title)}</strong><small>${esc(c.level)} · ${esc(c.slug)}</small></div></div></td><td>${esc(c.category)}</td><td>—</td><td><span class="pill ${c.status==='published'?'pill-green':'pill-orange'}">${esc(c.status)}</span></td><td><div class="table-actions"><button class="btn btn-light btn-sm" data-action="manage-lessons" data-id="${esc(c.id)}">Materi</button><button class="btn btn-outline btn-sm" data-action="edit-course" data-id="${esc(c.id)}">Edit</button><button class="btn btn-danger btn-sm" data-action="delete-course" data-id="${esc(c.id)}">Arsip</button></div></td></tr>`).join('')||'<tr><td colspan="5">Belum ada kelas.</td></tr>'}</tbody></table></div></div>`;}
function adminUsersPage(){return `${pageHead('Manajemen Pengguna','Kelola akun member dan hak akses.','<button class="btn btn-primary" data-action="new-user">＋ Tambah pengguna</button>')}<div class="toolbar"><input class="input" id="user-search" placeholder="Cari nama atau email…" value="${esc(State.search)}"><button class="btn btn-outline" data-action="refresh">↻ Segarkan</button></div><div class="panel"><div class="table-wrap"><table><thead><tr><th>Pengguna</th><th>Role</th><th>Status</th><th>Bergabung</th><th>Aksi</th></tr></thead><tbody>${State.adminUsers.map(u=>`<tr data-search="${esc((u.name+' '+u.email).toLowerCase())}"><td><div class="user-cell"><div class="avatar">${esc(initials(u.name))}</div><div><strong>${esc(u.name)}</strong><small>${esc(u.email)}</small></div></div></td><td><span class="pill ${u.role==='admin'?'pill-purple':''}">${esc(u.role)}</span></td><td><span class="pill ${u.status==='active'?'pill-green':'pill-orange'}">${esc(u.status)}</span></td><td>${fmtDate(u.createdAt)}</td><td><div class="table-actions"><button class="btn btn-outline btn-sm" data-action="edit-user" data-id="${esc(u.id)}">Edit</button>${u.id!==State.user.id?`<button class="btn btn-danger btn-sm" data-action="delete-user" data-id="${esc(u.id)}">${u.status==='active'?'Nonaktifkan':'Nonaktif'}</button>`:''}</div></td></tr>`).join('')||'<tr><td colspan="5">Belum ada pengguna.</td></tr>'}</tbody></table></div></div>`;}
function enrollmentsPage(){const members=State.adminUsers.filter(u=>u.role==='member');return `${pageHead('Akses Kelas','Daftarkan member ke kelas atau cabut aksesnya.')}<div class="panel"><div class="panel-title"><div><h2>Atur pendaftaran</h2><p>Pilih member dan kelas untuk memberi akses.</p></div></div><form id="enrollment-form"><div class="form-grid"><div class="field"><label>Member</label><select name="userId" required><option value="">Pilih member</option>${members.map(u=>`<option value="${esc(u.id)}">${esc(u.name)} — ${esc(u.email)}</option>`).join('')}</select></div><div class="field"><label>Kelas</label><select name="courseId" required><option value="">Pilih kelas</option>${State.adminCourses.filter(c=>c.status!=='archived').map(c=>`<option value="${esc(c.id)}">${esc(c.title)}</option>`).join('')}</select></div></div><div class="toolbar"><button class="btn btn-primary" type="submit">Berikan akses</button></div></form></div><div class="section-heading"><div><h2>Riwayat akses</h2><p>Daftar akses kelas yang tersimpan.</p></div></div><div class="panel"><div class="table-wrap"><table><thead><tr><th>Member</th><th>Kelas</th><th>Status</th><th>Tanggal</th><th>Aksi</th></tr></thead><tbody>${State.enrollments.map(e=>`<tr><td><strong>${esc(e.userName)}</strong><br><small class="muted">${esc(e.userEmail)}</small></td><td>${esc(e.courseTitle)}</td><td><span class="pill ${e.status==='active'?'pill-green':'pill-orange'}">${esc(e.status)}</span></td><td>${fmtDate(e.enrolledAt)}</td><td><button class="btn ${e.status==='active'?'btn-danger':'btn-light'} btn-sm" data-action="toggle-enrollment" data-user="${esc(e.userId)}" data-course="${esc(e.courseId)}" data-active="${e.status==='active'?'true':'false'}">${e.status==='active'?'Cabut akses':'Aktifkan'}</button></td></tr>`).join('')||'<tr><td colspan="5">Belum ada pendaftaran.</td></tr>'}</tbody></table></div></div>`;}
function profilePage(){return `${pageHead('Profil Saya','Pastikan informasi akunmu selalu terbaru.')}<div class="profile-layout"><div class="panel profile-card"><div class="avatar">${esc(initials(State.user.name))}</div><div class="profile-details"><h3>${esc(State.user.name)}</h3><p>${esc(State.user.email)}</p><span class="pill pill-purple">${esc(State.user.role)}</span></div></div><div class="panel"><div class="panel-title"><div><h2>Informasi akun</h2><p>Nama tampilan akunmu.</p></div></div><div class="field"><label>Nama lengkap</label><input id="profile-name" value="${esc(State.user.name)}" maxlength="80"></div><div class="field"><label>Email</label><input value="${esc(State.user.email)}" disabled></div><div class="field"><label>Bergabung sejak</label><input value="${esc(fmtDate(State.user.createdAt))}" disabled></div><button class="btn btn-primary" data-action="save-profile">Simpan perubahan</button><div class="divider"></div><div class="panel-title"><div><h2>Keamanan</h2><p>Perbarui password secara berkala.</p></div></div><button class="btn btn-outline" data-action="change-password">Ubah password</button></div></div>`;}
async function openCourse(id){State.activeCourse=id;State.page='course';renderShell();await renderPage();}
async function renderCourse(id){if(!id)return;const data=await callServer('getCourse',State.token,id);State.courseData=data;$('#page-content').innerHTML=`<div class="page-head"><div><button class="btn btn-light btn-sm" data-page="${State.user.role==='admin'?'courses':'mycourses'}">← Kembali</button><div style="height:12px"></div><h1>${esc(data.course.title)}</h1><p>${esc(data.course.description)}</p></div></div><div class="course-layout"><div><div class="panel" style="margin-bottom:16px">${cover(data.course,1)}<div style="padding:5px 4px"><div class="course-meta" style="margin-top:14px"><span class="pill pill-purple">${esc(data.course.category)}</span><span>${esc(data.course.level)}</span></div><div class="progress-line"><span>${data.completedCount} dari ${data.totalLessons} materi selesai</span><strong>${data.totalLessons?Math.round(data.completedCount/data.totalLessons*100):0}%</strong></div><div class="progress-track"><div class="progress-fill" style="width:${data.totalLessons?data.completedCount/data.totalLessons*100:0}%"></div></div></div></div><div class="section-heading"><div><h2>Kurikulum kelas</h2><p>Ikuti materi sesuai urutan yang disusun.</p></div></div><div class="lesson-list">${data.lessons.map((l,i)=>`<button class="lesson-row" data-action="open-lesson" data-id="${esc(l.id)}"><span class="lesson-number ${l.completed?'done':''}">${l.completed?'✓':String(i+1).padStart(2,'0')}</span><span class="lesson-info"><strong>${esc(l.title)}</strong><small>${esc(l.description||'Materi pembelajaran')} · ${l.durationMinutes} menit</small></span><span>${l.completed?'✓':'→'}</span></button>`).join('')||'<div class="empty-state"><h3>Belum ada materi</h3><p>Admin belum menambahkan materi untuk kelas ini.</p></div>'}</div></div><aside class="panel side-summary"><h3>Ringkasan kelas</h3><div class="summary-line"><span class="muted">Total materi</span><strong>${data.totalLessons}</strong></div><div class="summary-line"><span class="muted">Selesai</span><strong>${data.completedCount}</strong></div><div class="summary-line"><span class="muted">Durasi total</span><strong>${data.lessons.reduce((n,l)=>n+l.durationMinutes,0)} menit</strong></div></aside></div>`;}
async function openLesson(id){State.activeLesson=id;State.page='lesson';renderShell();await renderPage();}
async function renderLesson(id){const course=State.courseData;if(!course) {State.page='mycourses';return renderPage();}const lesson=course.lessons.find(l=>l.id===id);if(!lesson)throw new Error('Materi tidak ditemukan.');const index=course.lessons.findIndex(l=>l.id===id);let content='';
  if(lesson.type==='video'&&lesson.contentUrl){const url=esc(lesson.contentUrl);content=`<p>Video pembelajaran tersedia melalui tautan berikut.</p><p><a href="${url}" target="_blank" rel="noopener noreferrer">▶ Buka video pembelajaran</a></p>`;}
  else if((lesson.type==='link'||lesson.type==='file')&&lesson.contentUrl){content=`<p>${lesson.type==='file'?'Materi file dapat dibuka melalui Google Drive.':'Buka sumber pembelajaran eksternal.'}</p><a class="btn btn-primary" href="${esc(lesson.contentUrl)}" target="_blank" rel="noopener noreferrer">${lesson.type==='file'?'Buka file ↗':'Buka tautan ↗'}</a>`;}
  content+=lesson.contentHtml||'<p>Belum ada konten tambahan untuk materi ini.</p>';
  $('#page-content').innerHTML=`<div class="page-head"><div><button class="btn btn-light btn-sm" data-action="back-course">← Kembali ke kelas</button><div style="height:14px"></div><p>${esc(course.course.title)} · Materi ${index+1} dari ${course.lessons.length}</p></div></div><article class="panel lesson-detail"><div class="course-meta"><span class="pill pill-purple">${esc(lesson.type)}</span><span>${lesson.durationMinutes} menit</span></div><h1>${esc(lesson.title)}</h1><p class="muted" style="font-size:13px;line-height:1.7">${esc(lesson.description)}</p><div class="divider"></div><div class="lesson-content">${content}</div><div class="lesson-actions"><button class="btn btn-outline" ${index===0?'disabled':''} data-action="open-lesson" data-id="${esc(course.lessons[index-1]?.id||'')}">← Materi sebelumnya</button><button class="btn ${lesson.completed?'btn-light':'btn-primary'}" data-action="complete-lesson" data-id="${esc(lesson.id)}" data-completed="${lesson.completed?'true':'false'}">${lesson.completed?'✓ Sudah selesai · Batalkan':'Tandai selesai ✓'}</button><button class="btn btn-outline" ${index===course.lessons.length-1?'disabled':''} data-action="open-lesson" data-id="${esc(course.lessons[index+1]?.id||'')}">Materi berikutnya →</button></div></article>`;
}
async function toggleComplete(id,wasCompleted){try{await callServer('completeLesson',State.token,id,!wasCompleted);State.courseData=await callServer('getCourse',State.token,State.activeCourse);State.dashboard=await callServer('getDashboard',State.token);await renderLesson(id);toast(wasCompleted?'Status materi diperbarui.':'Materi ditandai selesai.','success');}catch(e){handleSessionError(e);}}
function bindPageEvents(){
  const us=$('#user-search');if(us)us.addEventListener('input',()=>filterRows(us.value));
  const cs=$('#course-search');if(cs)cs.addEventListener('input',()=>filterRows(cs.value));
  const ef=$('#enrollment-form');if(ef)ef.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(ef);try{await callServer('adminSetEnrollment',State.token,fd.get('userId'),fd.get('courseId'),true);toast('Akses kelas berhasil diberikan.','success');State.enrollments=await callServer('adminListEnrollments',State.token);State.adminUsers=await callServer('adminListUsers',State.token);State.adminCourses=await callServer('adminListCourses',State.token);$('#page-content').innerHTML=enrollmentsPage();bindPageEvents();}catch(err){toast(err.message,'error');}});
}
function filterRows(value){const q=String(value||'').toLowerCase();$$('tbody tr[data-search]').forEach(r=>r.classList.toggle('hidden',!r.dataset.search.includes(q)));State.search=value;}
function handleSessionError(e){if(/sesi|session|login kembali|akun tidak aktif/i.test(e.message||'')){clearSession();renderLogin();toast('Sesi berakhir. Silakan login kembali.','error');}else toast(e.message||'Terjadi kesalahan.','error');}
function openModal(title,body,foot=''){closeModal();const wrap=document.createElement('div');wrap.id='active-modal';wrap.className='modal-backdrop';wrap.innerHTML=`<section class="modal" role="dialog" aria-modal="true"><header class="modal-head"><h2>${title}</h2><button class="icon-btn" data-action="close-modal" aria-label="Tutup">✕</button></header><div class="modal-body">${body}</div>${foot?`<footer class="modal-foot">${foot}</footer>`:''}</section>`;$('#app').appendChild(wrap);wrap.addEventListener('click',e=>{if(e.target===wrap)closeModal();});}
function closeModal(){$('#active-modal')?.remove();}
function openUserModal(id){const u=State.adminUsers.find(x=>x.id===id)||{};openModal(id?'Edit pengguna':'Tambah pengguna',`<form id="user-form"><input type="hidden" name="id" value="${esc(u.id||'')}"><div class="field"><label>Nama lengkap</label><input name="name" value="${esc(u.name||'')}" required minlength="2" maxlength="80"></div><div class="field"><label>Email</label><input name="email" type="email" value="${esc(u.email||'')}" required></div><div class="form-grid"><div class="field"><label>Role</label><select name="role"><option value="member" ${u.role!=='admin'?'selected':''}>Member</option><option value="admin" ${u.role==='admin'?'selected':''}>Admin</option></select></div><div class="field"><label>Status</label><select name="status"><option value="active" ${u.status!=='inactive'?'selected':''}>Aktif</option><option value="inactive" ${u.status==='inactive'?'selected':''}>Nonaktif</option></select></div></div><div class="field"><label>${id?'Password baru (opsional)':'Password awal'}</label><input name="password" type="password" ${id?'':'required'} minlength="12" autocomplete="new-password" placeholder="Minimal 12 karakter"><small>${id?'Kosongkan jika tidak ingin mengubah password.':'Gunakan password unik minimal 12 karakter.'}</small></div></form>`,`<button class="btn btn-outline" data-action="close-modal">Batal</button><button class="btn btn-primary" id="save-user">Simpan pengguna</button>`);$('#save-user').onclick=async()=>{const form=$('#user-form');if(!form.reportValidity())return;const payload=Object.fromEntries(new FormData(form).entries());try{await callServer('adminSaveUser',State.token,payload);closeModal();State.adminUsers=await callServer('adminListUsers',State.token);$('#page-content').innerHTML=adminUsersPage();bindPageEvents();toast('Data pengguna berhasil disimpan.','success');}catch(e){toast(e.message,'error');}};}
async function deleteUser(id){const u=State.adminUsers.find(x=>x.id===id);if(!u)return;if(!confirm(`Nonaktifkan akun ${u.name}? Akun tidak dihapus permanen.`))return;try{await callServer('adminDeleteUser',State.token,id);State.adminUsers=await callServer('adminListUsers',State.token);$('#page-content').innerHTML=adminUsersPage();bindPageEvents();toast('Akun dinonaktifkan.','success');}catch(e){toast(e.message,'error');}}
function openCourseModal(id){const c=State.adminCourses.find(x=>x.id===id)||{};openModal(id?'Edit kelas':'Buat kelas',`<form id="course-form"><input type="hidden" name="id" value="${esc(c.id||'')}"><div class="field"><label>Judul kelas</label><input name="title" value="${esc(c.title||'')}" required minlength="3" maxlength="120"></div><div class="field"><label>Deskripsi</label><textarea name="description" rows="3" maxlength="2000">${esc(c.description||'')}</textarea></div><div class="form-grid"><div class="field"><label>Kategori</label><input name="category" value="${esc(c.category||'Web Development')}" maxlength="60"></div><div class="field"><label>Level</label><select name="level"><option ${c.level==='Pemula'||!c.level?'selected':''}>Pemula</option><option ${c.level==='Menengah'?'selected':''}>Menengah</option><option ${c.level==='Lanjutan'?'selected':''}>Lanjutan</option></select></div><div class="field full"><label>URL gambar sampul (opsional, HTTPS)</label><input name="thumbnail" type="url" value="${esc(c.thumbnail||'')}" placeholder="https://…"></div><div class="field"><label>Status</label><select name="status"><option value="published" ${c.status!=='draft'?'selected':''}>Terbit</option><option value="draft" ${c.status==='draft'?'selected':''}>Draft</option></select></div></div></form>`,`<button class="btn btn-outline" data-action="close-modal">Batal</button><button class="btn btn-primary" id="save-course">Simpan kelas</button>`);$('#save-course').onclick=async()=>{const f=$('#course-form');if(!f.reportValidity())return;try{await callServer('adminSaveCourse',State.token,Object.fromEntries(new FormData(f).entries()));closeModal();State.adminCourses=await callServer('adminListCourses',State.token);$('#page-content').innerHTML=adminCoursesPage();bindPageEvents();toast('Kelas berhasil disimpan.','success');}catch(e){toast(e.message,'error');}};}
async function deleteCourse(id){const c=State.adminCourses.find(x=>x.id===id);if(!c||!confirm(`Arsipkan kelas "${c.title}"?`))return;try{await callServer('adminDeleteCourse',State.token,id);State.adminCourses=await callServer('adminListCourses',State.token);$('#page-content').innerHTML=adminCoursesPage();bindPageEvents();toast('Kelas diarsipkan.','success');}catch(e){toast(e.message,'error');}}
async function manageLessons(courseId){State.activeCourse=courseId;const c=State.adminCourses.find(x=>x.id===courseId);try{State.adminLessons=await callServer('adminListLessons',State.token,courseId);openModal(`Materi: ${esc(c?.title||'Kelas')}`,`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:15px"><p class="muted" style="font-size:12px;margin:0">Urutan materi mengikuti nomor urut.</p><button class="btn btn-primary btn-sm" data-action="new-lesson" data-course="${esc(courseId)}">＋ Materi</button></div><div class="lesson-list">${State.adminLessons.map(l=>`<div class="lesson-row"><span class="lesson-number">${esc(l.sortOrder)}</span><span class="lesson-info"><strong>${esc(l.title)}</strong><small>${esc(l.type)} · ${esc(l.status)}</small></span><button class="btn btn-outline btn-sm" data-action="edit-lesson" data-id="${esc(l.id)}">Edit</button><button class="btn btn-danger btn-sm" data-action="delete-lesson" data-id="${esc(l.id)}" data-course="${esc(courseId)}">Arsip</button></div>`).join('')||'<div class="empty-state"><p>Belum ada materi. Tambahkan materi pertama.</p></div>'}</div>`,`<button class="btn btn-outline" data-action="close-modal">Selesai</button>`);}catch(e){toast(e.message,'error');}}
function openLessonModal(id, courseId) {
  const l = State.adminLessons.find(x => x.id === id) || {};
  const cid = courseId || l.courseId || State.activeCourse;

  openModal(
    id ? 'Edit materi' : 'Tambah materi',
    `<form id="lesson-form">
      <input type="hidden" name="id" value="${esc(l.id || '')}">
      <input type="hidden" name="courseId" value="${esc(cid)}">

      <div class="field">
        <label>Judul materi</label>
        <input name="title" value="${esc(l.title || '')}" required minlength="2" maxlength="160">
      </div>

      <div class="field">
        <label>Deskripsi singkat</label>
        <input name="description" value="${esc(l.description || '')}" maxlength="500">
      </div>

      <div class="form-grid">
        <div class="field">
          <label>Jenis materi</label>
          <select name="type">
            <option value="text" ${l.type === 'text' || !l.type ? 'selected' : ''}>Teks</option>
            <option value="video" ${l.type === 'video' ? 'selected' : ''}>Video</option>
            <option value="link" ${l.type === 'link' ? 'selected' : ''}>Tautan</option>
            <option value="file" ${l.type === 'file' ? 'selected' : ''}>File / Google Drive</option>
          </select>
        </div>

        <div class="field">
          <label>Durasi (menit)</label>
          <input name="durationMinutes" type="number" min="0" value="${esc(l.durationMinutes || 0)}">
        </div>

        <div class="field">
          <label>Urutan</label>
          <input name="sortOrder" type="number" min="1" value="${esc(l.sortOrder || State.adminLessons.length + 1)}">
        </div>

        <div class="field">
          <label>Status</label>
          <select name="status">
            <option value="published" ${l.status !== 'draft' ? 'selected' : ''}>Terbit</option>
            <option value="draft" ${l.status === 'draft' ? 'selected' : ''}>Draft</option>
          </select>
        </div>

        <div class="field full">
          <label>URL materi (opsional, HTTPS)</label>
          <input name="contentUrl" type="url" value="${esc(l.contentUrl || '')}" placeholder="https://drive.google.com/…">
        </div>

        <div class="field full">
          <label>Konten teks / HTML sederhana</label>
          <textarea name="contentHtml" rows="7" placeholder="&lt;h2&gt;Judul materi&lt;/h2&gt;&lt;p&gt;Isi materi…&lt;/p&gt;">${esc(l.contentHtml || '')}</textarea>
          <small>Konten HTML disimpan sebagai HTML. Hanya masukkan konten yang dipercaya admin; jangan menempelkan script.</small>
        </div>
      </div>
    </form>`,
    `<button class="btn btn-outline" data-action="close-modal">Batal</button>
     <button class="btn btn-primary" id="save-lesson">Simpan materi</button>`
  );

  $('#save-lesson').onclick = async () => {
    const form = $('#lesson-form');
    if (!form.reportValidity()) return;

    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      await callServer('adminSaveLesson', State.token, payload);
      closeModal();
      await manageLessons(cid);
      toast('Materi berhasil disimpan.', 'success');
    } catch (e) {
      toast(e.message || 'Gagal menyimpan materi.', 'error');
    }
  };
}
async function deleteLesson(id,courseId){const l=State.adminLessons.find(x=>x.id===id);if(!confirm(`Arsipkan materi "${l?.title||''}"?`))return;try{await callServer('adminDeleteLesson',State.token,id);State.adminLessons=await callServer('adminListLessons',State.token,courseId);closeModal();await manageLessons(courseId);toast('Materi diarsipkan.','success');}catch(e){toast(e.message,'error');}}
async function enrollCourse(id){toast('Untuk mendapatkan akses kelas, hubungi admin bootcamp.');}
async function saveProfile(){const name=$('#profile-name')?.value;try{const res=await callServer('updateProfile',State.token,name);State.user=res.user;State.dashboard=await callServer('getDashboard',State.token);renderShell();await renderPage();toast('Profil berhasil diperbarui.','success');}catch(e){toast(e.message,'error');}}
function openPasswordModal(){openModal('Ubah password',`<form id="password-form"><div class="field"><label>Password saat ini</label><input type="password" name="currentPassword" required autocomplete="current-password"></div><div class="field"><label>Password baru</label><input type="password" name="newPassword" required minlength="12" autocomplete="new-password"><small>Gunakan minimal 12 karakter.</small></div><div class="field"><label>Ulangi password baru</label><input type="password" name="confirmPassword" required minlength="12" autocomplete="new-password"></div></form>`,`<button class="btn btn-outline" data-action="close-modal">Batal</button><button class="btn btn-primary" id="save-password">Perbarui password</button>`);$('#save-password').onclick=async()=>{const f=$('#password-form');if(!f.reportValidity())return;const d=Object.fromEntries(new FormData(f).entries());if(d.newPassword!==d.confirmPassword){toast('Konfirmasi password tidak sama.','error');return;}try{await callServer('changePassword',State.token,d.currentPassword,d.newPassword);closeModal();toast('Password berhasil diubah.','success');}catch(e){toast(e.message,'error');}};}
document.addEventListener('click',async e=>{const a=e.target.closest('[data-action="toggle-enrollment"]');if(a){try{await callServer('adminSetEnrollment',State.token,a.dataset.user,a.dataset.course,a.dataset.active!=='true');State.enrollments=await callServer('adminListEnrollments',State.token);$('#page-content').innerHTML=enrollmentsPage();bindPageEvents();toast('Akses kelas diperbarui.','success');}catch(err){toast(err.message,'error');}}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
init();
