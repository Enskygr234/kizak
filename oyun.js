/*! Kızak — sonsuz yokuş aşağı kızak oyunu. MIT © Winterdeveloper */
(function () {
  'use strict';

  var tuval = document.getElementById('oyun');
  var c = tuval.getContext('2d');
  var EN = 0, BOY = 0;
  var OYUNCU_Y = 0;            // oyuncunun ekrandaki dikey yeri
  var OYUNCU_R = 10;

  var durum = 'baslangic';     // baslangic | oyun | durak | bitti
  var oyuncu, yol, hiz, engeller, sonUretim, izler, korSayisi, rekor, yeniRekor, sarsinti, zaman;
  var tus = { sol: false, sag: false };
  var hedefX = null;           // dokunmatik / fare ile yönlendirme
  var kar = [];

  function rekorOku() {
    try { return +localStorage.getItem('kizak-rekor') || 0; } catch (e) { return 0; }
  }
  function rekorYaz(deger) {
    try { localStorage.setItem('kizak-rekor', String(deger)); } catch (e) { /* gizli sekmede olabilir */ }
  }

  function boyutla() {
    var oran = Math.min(window.devicePixelRatio || 1, 2);
    var eskiEn = EN;
    EN = Math.min(window.innerWidth, 560);
    BOY = window.innerHeight;
    OYUNCU_Y = Math.round(BOY * 0.28);
    tuval.style.width = EN + 'px';
    tuval.style.height = BOY + 'px';
    tuval.width = Math.round(EN * oran);
    tuval.height = Math.round(BOY * oran);
    c.setTransform(oran, 0, 0, oran, 0, 0);
    if (!oyuncu || EN === eskiEn) return;
    if (durum === 'baslangic' || eskiEn === 0) { sifirla(); return; }   // oyun başlamadıysa yeni boyuta göre ortala
    // pencere daralıp genişlerse her şeyi yeni genişliğe oranla
    var kat = EN / eskiEn, i;
    oyuncu.x *= kat;
    for (i = 0; i < engeller.length; i++) engeller[i].x *= kat;
    for (i = 0; i < izler.length; i++) izler[i].x *= kat;
    for (i = 0; i < kar.length; i++) kar[i].x *= kat;
  }

  function sifirla() {
    oyuncu = { x: EN / 2, vx: 0 };
    yol = 0;
    hiz = 220;
    engeller = [];
    izler = [];
    korSayisi = 0;
    yeniRekor = false;
    sarsinti = 0;
    sonUretim = BOY * 0.9;     // ilk engeller ekranın altından gelsin
  }

  function puan() { return Math.floor(yol / 10) + korSayisi * 50; }

  function uret() {
    // yol ilerledikçe sıralar sıklaşır
    while (sonUretim < yol + BOY + 80) {
      var adet = Math.random() < Math.min(0.2 + yol / 30000, 0.6) ? 2 : 1;
      for (var i = 0; i < adet; i++) {
        var zar = Math.random();
        var tur = zar < 0.14 ? 'kor' : zar < 0.62 ? 'cam' : zar < 0.84 ? 'kaya' : 'kardanadam';
        engeller.push({
          tur: tur,
          x: 22 + Math.random() * (EN - 44),
          y: sonUretim + Math.random() * 30,
          r: tur === 'cam' ? 13 : tur === 'kaya' ? 12 : tur === 'kardanadam' ? 12 : 11,
          alindi: false
        });
      }
      sonUretim += Math.max(62, 150 - yol * 0.004) * (0.75 + Math.random() * 0.5);
    }
  }

  function guncelle(dt) {
    zaman += dt;

    // kar taneleri her durumda yağar
    for (var k = 0; k < kar.length; k++) {
      var t = kar[k];
      t.y += t.v * dt;
      t.x += Math.sin(zaman * 0.8 + t.f) * 12 * dt;
      if (t.y > BOY + 4) { t.y = -4; t.x = Math.random() * EN; }
    }
    if (sarsinti > 0) sarsinti = Math.max(0, sarsinti - dt * 3);
    if (durum !== 'oyun') return;

    // yönlendirme
    var yon = (tus.sag ? 1 : 0) - (tus.sol ? 1 : 0);
    if (hedefX !== null) {
      var fark = hedefX - oyuncu.x;
      yon = Math.abs(fark) < 6 ? 0 : fark > 0 ? 1 : -1;
    }
    oyuncu.vx += yon * (yon * oyuncu.vx < 0 ? 3000 : 1500) * dt;   // ters yöne dönerken daha çabuk toparla
    if (yon === 0) oyuncu.vx *= Math.pow(0.02, dt);          // bırakınca yavaşça düzel
    oyuncu.vx = Math.max(-380, Math.min(380, oyuncu.vx));
    oyuncu.x += oyuncu.vx * dt;
    if (oyuncu.x < 14) { oyuncu.x = 14; oyuncu.vx = 0; }
    if (oyuncu.x > EN - 14) { oyuncu.x = EN - 14; oyuncu.vx = 0; }

    hiz = Math.min(640, 220 + yol * 0.012);
    yol += hiz * dt;

    izler.push({ x: oyuncu.x, y: yol });
    if (izler.length > 70) izler.shift();

    uret();

    for (var i = engeller.length - 1; i >= 0; i--) {
      var e = engeller[i];
      if (e.y < yol - OYUNCU_Y - 80) { engeller.splice(i, 1); continue; }
      if (e.alindi) continue;
      var dx = e.x - oyuncu.x, dy = e.y - yol;
      var esik = e.r + OYUNCU_R;
      if (dx * dx + dy * dy < esik * esik) {
        if (e.tur === 'kor') { e.alindi = true; korSayisi++; }
        else { carp(); return; }
      }
    }
  }

  function carp() {
    durum = 'bitti';
    sarsinti = 1;
    hedefX = null;
    if (puan() > rekor) { rekor = puan(); yeniRekor = true; rekorYaz(rekor); }
  }

  // ---------- çizim ----------

  function cam(x, y) {
    c.fillStyle = 'rgba(40,70,100,.16)';
    c.beginPath(); c.ellipse(x + 5, y + 6, 15, 6, 0, 0, 6.2832); c.fill();
    c.fillStyle = '#5b3a24'; c.fillRect(x - 3, y - 4, 6, 10);
    for (var i = 0; i < 3; i++) {
      var g = 17 - i * 4, ty = y - 6 - i * 11;
      c.fillStyle = i % 2 ? '#2a7a5e' : '#1f5f4a';
      c.beginPath(); c.moveTo(x - g, ty); c.lineTo(x, ty - 18); c.lineTo(x + g, ty); c.closePath(); c.fill();
      c.fillStyle = '#fff';
      c.beginPath(); c.moveTo(x - g * 0.45, ty - 10); c.lineTo(x, ty - 18); c.lineTo(x + g * 0.45, ty - 10);
      c.lineTo(x + g * 0.2, ty - 12); c.lineTo(x, ty - 9); c.lineTo(x - g * 0.2, ty - 12); c.closePath(); c.fill();
    }
  }

  function kaya(x, y) {
    c.fillStyle = 'rgba(40,70,100,.16)';
    c.beginPath(); c.ellipse(x + 4, y + 7, 15, 5, 0, 0, 6.2832); c.fill();
    c.fillStyle = '#6f7f8c';
    c.beginPath(); c.moveTo(x - 14, y + 7); c.lineTo(x - 10, y - 6); c.lineTo(x - 1, y - 11);
    c.lineTo(x + 10, y - 5); c.lineTo(x + 14, y + 7); c.closePath(); c.fill();
    c.fillStyle = '#93a3af';
    c.beginPath(); c.moveTo(x - 10, y - 6); c.lineTo(x - 1, y - 11); c.lineTo(x + 3, y - 2); c.lineTo(x - 6, y + 1); c.closePath(); c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.moveTo(x - 8, y - 7); c.lineTo(x - 1, y - 11); c.lineTo(x + 7, y - 7); c.lineTo(x, y - 8); c.closePath(); c.fill();
  }

  function kardanadam(x, y) {
    c.fillStyle = 'rgba(40,70,100,.16)';
    c.beginPath(); c.ellipse(x + 4, y + 9, 14, 5, 0, 0, 6.2832); c.fill();
    c.fillStyle = '#fff'; c.strokeStyle = '#9fb6c6'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(x, y, 11, 0, 6.2832); c.fill(); c.stroke();
    c.beginPath(); c.arc(x, y - 15, 8, 0, 6.2832); c.fill(); c.stroke();
    c.fillStyle = '#22313d';
    c.fillRect(x - 4, y - 18, 2, 2); c.fillRect(x + 2, y - 18, 2, 2);
    c.fillRect(x - 1, y - 4, 2, 2); c.fillRect(x - 1, y + 2, 2, 2);
    c.fillStyle = '#f08a24';
    c.beginPath(); c.moveTo(x, y - 15); c.lineTo(x + 8, y - 13); c.lineTo(x, y - 12); c.closePath(); c.fill();
    c.fillStyle = '#e63946'; c.fillRect(x - 7, y - 9, 14, 3);
  }

  function kor(x, y) {
    var titre = 1 + Math.sin(zaman * 9 + x) * 0.12;
    var isik = c.createRadialGradient(x, y, 1, x, y, 22);
    isik.addColorStop(0, 'rgba(255,170,60,.55)');
    isik.addColorStop(1, 'rgba(255,170,60,0)');
    c.fillStyle = isik; c.beginPath(); c.arc(x, y, 22, 0, 6.2832); c.fill();
    c.fillStyle = '#f3722c';
    c.beginPath(); c.moveTo(x, y - 12 * titre); c.quadraticCurveTo(x + 9, y - 1, x, y + 8);
    c.quadraticCurveTo(x - 9, y - 1, x, y - 12 * titre); c.fill();
    c.fillStyle = '#ffd166';
    c.beginPath(); c.moveTo(x, y - 5 * titre); c.quadraticCurveTo(x + 4, y + 1, x, y + 6);
    c.quadraticCurveTo(x - 4, y + 1, x, y - 5 * titre); c.fill();
  }

  function kizakCiz(x, y, egim, devrik) {
    c.save();
    c.translate(x, y);
    c.rotate(devrik ? 1.3 : egim);
    c.fillStyle = 'rgba(40,70,100,.18)';
    c.beginPath(); c.ellipse(3, 6, 12, 5, 0, 0, 6.2832); c.fill();
    c.fillStyle = '#7a4a2a'; c.fillRect(-8, -10, 16, 22);            // kızak tahtası
    c.fillStyle = '#4a2c18'; c.fillRect(-10, -12, 3, 26); c.fillRect(7, -12, 3, 26);   // kızak ayakları
    c.fillStyle = '#c1121f'; c.fillRect(-6, -6, 12, 13);             // mont
    c.fillStyle = '#f2c9a0'; c.beginPath(); c.arc(0, -8, 5, 0, 6.2832); c.fill();      // yüz
    c.fillStyle = '#1d3557'; c.beginPath(); c.arc(0, -9.5, 5, Math.PI, 0); c.fill();   // bere
    c.fillStyle = '#ffd166'; c.fillRect(-1, -16, 2, 2);              // ponpon
    c.restore();
  }

  function yazi(metin, x, y, boyut, renk, kalin, hiza) {
    c.font = (kalin ? '700 ' : '400 ') + boyut + 'px "Segoe UI", system-ui, sans-serif';
    c.textAlign = hiza || 'center';
    c.fillStyle = renk;
    c.fillText(metin, x, y);
  }

  function panel(yukseklik) {
    var ust = BOY * 0.5 - yukseklik / 2;
    c.fillStyle = 'rgba(11,22,38,.82)';
    c.beginPath();
    if (c.roundRect) c.roundRect(24, ust, EN - 48, yukseklik, 18); else c.rect(24, ust, EN - 48, yukseklik);
    c.fill();
    return ust;
  }

  function ciz() {
    var sx = 0, sy = 0, i, e;
    if (sarsinti > 0) { sx = (Math.random() - 0.5) * 12 * sarsinti; sy = (Math.random() - 0.5) * 12 * sarsinti; }
    c.save();
    c.translate(sx, sy);

    var zemin = c.createLinearGradient(0, 0, 0, BOY);
    zemin.addColorStop(0, '#f4f9fd'); zemin.addColorStop(1, '#dcebf6');
    c.fillStyle = zemin; c.fillRect(-10, -10, EN + 20, BOY + 20);

    // kızak izleri
    c.strokeStyle = 'rgba(120,160,195,.55)'; c.lineWidth = 2;
    for (var yan = -1; yan <= 1; yan += 2) {
      c.beginPath();
      for (i = 0; i < izler.length; i++) {
        var ix = izler[i].x + yan * 8, iy = izler[i].y - yol + OYUNCU_Y;
        if (i === 0) c.moveTo(ix, iy); else c.lineTo(ix, iy);
      }
      c.stroke();
    }

    // yukarıdakiler önce çizilsin diye sırala
    engeller.sort(function (a, b) { return a.y - b.y; });
    var oyuncuCizildi = false;
    for (i = 0; i < engeller.length; i++) {
      e = engeller[i];
      if (!oyuncuCizildi && e.y > yol) { kizakCiz(oyuncu.x, OYUNCU_Y, oyuncu.vx / 900, durum === 'bitti'); oyuncuCizildi = true; }
      if (e.alindi) continue;
      var ey = e.y - yol + OYUNCU_Y;
      if (ey < -50 || ey > BOY + 50) continue;
      if (e.tur === 'cam') cam(e.x, ey);
      else if (e.tur === 'kaya') kaya(e.x, ey);
      else if (e.tur === 'kardanadam') kardanadam(e.x, ey);
      else kor(e.x, ey);
    }
    if (!oyuncuCizildi) kizakCiz(oyuncu.x, OYUNCU_Y, oyuncu.vx / 900, durum === 'bitti');

    c.fillStyle = 'rgba(255,255,255,.9)';
    for (i = 0; i < kar.length; i++) { c.beginPath(); c.arc(kar[i].x, kar[i].y, kar[i].r, 0, 6.2832); c.fill(); }
    c.restore();

    // gösterge
    if (durum !== 'baslangic') {
      yazi(puan() + ' m', 16, 34, 26, '#12263a', true, 'left');
      yazi('🔥 ' + korSayisi, 16, 58, 16, '#b3541e', true, 'left');
      yazi('rekor ' + rekor + ' m', EN - 16, 30, 15, '#4f6b82', false, 'right');
    }

    var ust;
    if (durum === 'baslangic') {
      ust = panel(250);
      yazi('KIZAK', EN / 2, ust + 68, 56, '#fff', true);
      yazi('Ağaçlara çarpma, korları topla.', EN / 2, ust + 106, 17, '#b9cfe0');
      yazi('← →  ya da  A D  ile yönlen', EN / 2, ust + 146, 16, '#8ecae6');
      yazi('Telefonda: parmağını sürükle', EN / 2, ust + 170, 16, '#8ecae6');
      yazi('Başlamak için boşluk tuşu ya da dokun', EN / 2, ust + 216, 16, '#fff', true);
    } else if (durum === 'durak') {
      ust = panel(120);
      yazi('Duraklatıldı', EN / 2, ust + 56, 30, '#fff', true);
      yazi('Devam için P ya da dokun', EN / 2, ust + 90, 16, '#8ecae6');
    } else if (durum === 'bitti') {
      ust = panel(230);
      yazi('Devrildin!', EN / 2, ust + 58, 36, '#fff', true);
      yazi(puan() + ' m', EN / 2, ust + 112, 46, '#ffd166', true);
      yazi(yeniRekor ? '★ Yeni rekor! ★' : 'Rekor: ' + rekor + ' m', EN / 2, ust + 146, 17, yeniRekor ? '#ffd166' : '#b9cfe0', yeniRekor);
      yazi('Yeniden için boşluk tuşu ya da dokun', EN / 2, ust + 196, 16, '#fff', true);
    }
  }

  // ---------- girdi ----------

  var bitisZamani = 0;
  function eylem() {
    if (durum === 'baslangic') { durum = 'oyun'; }
    else if (durum === 'durak') { durum = 'oyun'; }
    else if (durum === 'bitti' && performance.now() - bitisZamani > 500) { sifirla(); durum = 'oyun'; }
  }

  window.addEventListener('keydown', function (o) {
    if (o.key === 'ArrowLeft' || o.key === 'a' || o.key === 'A') { tus.sol = true; o.preventDefault(); }
    else if (o.key === 'ArrowRight' || o.key === 'd' || o.key === 'D') { tus.sag = true; o.preventDefault(); }
    else if (o.key === ' ' || o.key === 'Enter') { if (!o.repeat) eylem(); o.preventDefault(); }
    else if (o.key === 'p' || o.key === 'P' || o.key === 'Escape') {
      if (durum === 'oyun') durum = 'durak'; else if (durum === 'durak') durum = 'oyun';
    }
  });
  window.addEventListener('keyup', function (o) {
    if (o.key === 'ArrowLeft' || o.key === 'a' || o.key === 'A') tus.sol = false;
    else if (o.key === 'ArrowRight' || o.key === 'd' || o.key === 'D') tus.sag = false;
  });

  function isaretX(o) { return o.clientX - tuval.getBoundingClientRect().left; }
  tuval.addEventListener('pointerdown', function (o) {
    o.preventDefault();
    if (durum !== 'oyun') { eylem(); if (durum !== 'oyun') return; }
    hedefX = isaretX(o);
  });
  tuval.addEventListener('pointermove', function (o) { if (hedefX !== null) hedefX = isaretX(o); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ad) {
    tuval.addEventListener(ad, function () { hedefX = null; });
  });
  window.addEventListener('blur', function () {
    tus.sol = tus.sag = false; hedefX = null;
    if (durum === 'oyun') durum = 'durak';
  });
  window.addEventListener('resize', boyutla);

  // ---------- döngü ----------

  var onceki = null, oncekiDurum = durum;
  function kare(simdi) {
    var dt = onceki === null ? 0.016 : Math.min((simdi - onceki) / 1000, 0.05);
    onceki = simdi;
    guncelle(dt);
    if (durum === 'bitti' && oncekiDurum !== 'bitti') bitisZamani = simdi;
    oncekiDurum = durum;
    ciz();
    requestAnimationFrame(kare);
  }

  boyutla();
  zaman = 0;
  rekor = rekorOku();
  sifirla();
  for (var i = 0; i < 40; i++) {
    kar.push({ x: Math.random() * EN, y: Math.random() * BOY, r: 1 + Math.random() * 1.6, v: 30 + Math.random() * 50, f: Math.random() * 6.28 });
  }
  requestAnimationFrame(kare);

  // Hata ayıklama ve testler için dışarıya küçük bir pencere
  window.Kizak = {
    durum: function () { return { durum: durum, puan: puan(), kor: korSayisi, rekor: rekor, hiz: Math.round(hiz), x: Math.round(oyuncu.x), engel: engeller.length }; },
    // oyunu verilen süre kadar sabit adımlarla ileri sarar
    ilerlet: function (saniye) { for (var t = 0; t < saniye && durum === 'oyun'; t += 1 / 60) guncelle(1 / 60); return this.durum(); }
  };
})();
