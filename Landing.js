// ====== KONFIGURASI (ubah sesuai kebutuhan) ======
const WA_NUMBER = '6281234567890'; // nomor WhatsApp admin, format 62..., tanpa + atau spasi
const WA_TEXT = function (plan) {
  return plan === 'Tanya admin'
    ? 'Halo kak, saya mau tanya soal GAS-Bootcamp Pro.'
    : 'Halo kak, saya mau join GAS-Bootcamp Pro paket ' + plan + '.';
};

// Tautan WhatsApp
document.querySelectorAll('[data-wa]').forEach(function (a) {
  a.href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(WA_TEXT(a.getAttribute('data-wa')));
  a.target = '_blank'; a.rel = 'noopener';
});

// Menu mobile
const burger = document.getElementById('burger'), menu = document.getElementById('menu');
burger.addEventListener('click', function () {
  const open = menu.classList.toggle('open');
  burger.setAttribute('aria-expanded', open ? 'true' : 'false');
});
menu.querySelectorAll('a').forEach(function (a) {
  a.addEventListener('click', function () { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); });
});

// Filter galeri
document.querySelectorAll('.filters button').forEach(function (b) {
  b.addEventListener('click', function () {
    document.querySelectorAll('.filters button').forEach(function (x) { x.classList.remove('on'); });
    b.classList.add('on');
    const f = b.getAttribute('data-f');
    document.querySelectorAll('#gallery .shot').forEach(function (s) {
      s.hidden = !(f === 'all' || s.getAttribute('data-c') === f);
    });
  });
});

// Carousel
const car = document.getElementById('car');
document.getElementById('next').addEventListener('click', function () { car.scrollBy({ left: 360, behavior: 'smooth' }); });
document.getElementById('prev').addEventListener('click', function () { car.scrollBy({ left: -360, behavior: 'smooth' }); });

// Animasi muncul saat scroll
(function () {
  const els = document.querySelectorAll('.rv');
  if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.12 });
  els.forEach(function (e) { io.observe(e); });
})();
