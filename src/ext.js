/* Hidromek ek modülleri: Kapasite ve IFS, Planlı ve kestirimci bakım, Kontrol planı ve 8D, Şasi izlenebilirliği.
   Ürünün yan menüsüne bağlantı ekler; ekranlar ürünün içerik alanında açılır. Veriler örnektir. */
(function () {
  'use strict';
  var css2;
  var NOW = new Date(); NOW.setMinutes(0, 0, 0);
  var DAY = 864e5;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var d2 = function (n) { return (n < 10 ? '0' : '') + n; };
  var fD = function (t) { var d = new Date(t); return d2(d.getDate()) + '.' + d2(d.getMonth() + 1) + '.' + d.getFullYear(); };
  var fDT = function (t) { var d = new Date(t); return fD(t) + ' ' + d2(d.getHours()) + ':' + d2(d.getMinutes()); };
  var nf = function (n) { return Number(n).toLocaleString('tr-TR'); };
  var seed = 7; var rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  var pick = function (a) { return a[Math.floor(rnd() * a.length)]; };
  var DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

  /* ---------- ürün verisinden fabrika ve makine grupları ---------- */
  var M = window.__MOCK || {};
  var procs = []; try { procs = JSON.parse(M['GET /api/processes'].r); } catch (e) {}
  var lines = []; try { lines = JSON.parse(M['GET /api/lines'].r).lines; } catch (e) {}
  var LN = {}; lines.forEach(function (l) { LN[l.code] = l.name; });
  var groupsOf = function (fc) { var p = procs.find(function (x) { return x.code === fc; }); return p ? p.lines.map(function (c) { var n = LN[c] || c; var m = n.match(/· (\d+) tezgâh · (IoT|beyan)/); return { code: c, name: n.split(' · ')[0], count: m ? +m[1] : 1, iot: m ? m[2] === 'IoT' : false }; }) : []; };
  var FACTS = procs.map(function (p) { return { code: p.code, name: p.name }; });

  var FAM = [
    { fam: 'Kazıcı yükleyici', models: ['HMK 102B', 'HMK 102S'], parts: ['Ön yükleyici bom kolu', 'Arka kazıcı kolu', 'Ana şasi', 'Kabin şasesi'] },
    { fam: 'Lastikli ekskavatör', models: ['HMK 145W', 'HMK 220W'], parts: ['Üst şasi', 'Alt şasi', 'Bom', 'Arm'] },
    { fam: 'Paletli ekskavatör', models: ['HMK 220LC', 'HMK 310LC', 'HMK 370LC'], parts: ['Bom', 'Arm', 'Palet şasesi', 'Kova'] },
    { fam: 'Özel uygulama ekskavatörü', models: ['HMK 220W MH'], parts: ['Malzeme elleçleme bomu', 'Yükseltilmiş kabin şasesi'] },
    { fam: 'Motor greyder', models: ['HMK 600MG', 'HMK 640MG'], parts: ['Ön aks gövdesi', 'Bıçak dairesi', 'Arka tandem gövdesi'] },
    { fam: 'Lastikli yükleyici', models: ['HMK 640WL'], parts: ['Ön şasi', 'Arka şasi', 'Yükleyici kolu'] },
    { fam: 'Toprak silindiri', models: ['HMK 130CS'], parts: ['Silindir tamburu', 'Ön şasi'] }];

  /* ---------- örnek veri ---------- */
  var OPS = [['0010', 'Plazma kesim', 'PLZ'], ['0020', 'Abkant büküm', 'ABK'], ['0030', 'Robot kaynak', 'ROB'], ['0040', 'Manuel kaynak', 'MKY'], ['0050', 'Talaşlı işleme', 'CNC'], ['0060', 'Boya', 'BOY'], ['0070', 'Montaj', 'MON']];
  var IFS = [];
  for (var i = 0; i < 26; i++) {
    var f = FAM[i % FAM.length], model = pick(f.models), part = pick(f.parts), q = pick([4, 6, 8, 10, 12, 16, 20, 24]);
    var st = pick(['IFS’te serbest', 'MES’e aktarıldı', 'MES’e aktarıldı', 'Üretimde', 'Üretimde', 'Üretimde', 'Teyit edildi']);
    var op = OPS[Math.min(OPS.length - 1, Math.floor(rnd() * OPS.length))];
    var start = NOW.getTime() + Math.round((rnd() * 4 - 1) * DAY);
    IFS.push({ no: '100' + (482310 + i * 7), mat: '7' + (1000000 + Math.floor(rnd() * 899999)), fam: f.fam, model: model, part: model + ' ' + part.toLowerCase(), qty: q, done: st === 'Teyit edildi' ? q : st === 'Üretimde' ? Math.floor(q * rnd()) : 0, op: op, start: start, end: start + Math.round((0.5 + rnd() * 2) * DAY), st: st, fac: i % 3 === 2 ? 'KMP' : 'F6' });
  }
  var stPill = function (s) { var c = s === 'Üretimde' ? 'ok' : s === 'Teyit edildi' ? 'idle' : s === 'IFS’te serbest' ? 'warn' : 'info'; return '<span class="hx-pill ' + c + '">' + s + '</span>'; };

  var PM = [];
  ['F6-CNC', 'F6-ROB', 'F6-ABK', 'F6-BRB', 'F6-PRS', 'KMP-CNC', 'KMP-ISL', 'F2-ROB', 'F2-PLZ'].forEach(function (g, gi) {
    var tasks = { CNC: ['Spindle yağlama kontrolü', 'Soğutma sıvısı konsantrasyonu', 'Eksen boşluk ölçümü'], ROB: ['Kaynak torcu temizliği', 'Robot TCP kalibrasyonu', 'Tel sürme makarası kontrolü'], ABK: ['Hidrolik yağ seviyesi kontrolü', 'Kalıp aşınma kontrolü'], BRB: ['Tabanca nozul temizliği', 'Filtre değişimi'], PRS: ['Hidrolik hortum kontrolü', 'Basınç sensörü kalibrasyonu'], ISL: ['Termokupl kalibrasyonu', 'Brülör kontrolü'], PLZ: ['Torç sarf malzemesi kontrolü', 'Su tablası temizliği'] }[g.split('-')[1]] || ['Genel kontrol'];
    tasks.forEach(function (t, ti) { PM.push({ g: g, m: g + '-' + d2(1 + ((gi * 3 + ti) % 9)), task: t, due: NOW.getTime() + Math.round((rnd() * 9 - 2) * DAY), period: pick([7, 14, 30, 90]) }); });
  });
  var PRED = [
    { m: 'F6-CNC-07', g: 'CNC-NC', sig: 'Spindle titreşimi', unit: 'mm/s', lim: 4.5, v: [2.1, 2.2, 2.2, 2.4, 2.6, 2.7, 3.0, 3.3, 3.6, 3.9], msg: 'Titreşim 10 günde %86 arttı; rulman aşınması olası. Tahmini 5 gün içinde eşiği aşar.' },
    { m: 'F6-ROB-23', g: 'Robot kaynak', sig: 'Kaynak akımı sapması', unit: '%', lim: 8, v: [2, 2.5, 3, 2.8, 3.6, 4.4, 5.1, 5.6, 6.2, 6.9], msg: 'Akım reçeteden giderek sapıyor; temas memesi ve tel sürme kontrol edilmeli.' },
    { m: 'F6-ABK-04', g: 'Abkant büküm', sig: 'Hidrolik basınç düşüşü', unit: 'bar', lim: 12, v: [3, 3, 4, 3, 4, 5, 4, 5, 5, 6], msg: 'Basınç kaybı sınırın altında; izlemeye devam.' },
    { m: 'KMP-CNC-31', g: 'CNC-NC', sig: 'Spindle sıcaklığı', unit: '°C', lim: 70, v: [51, 52, 54, 55, 57, 58, 61, 63, 64, 66], msg: 'Sıcaklık yükseliyor; soğutma devresi ve fan kontrolü önerilir.' },
    { m: 'F2-PLZ-05', g: 'Plazma kesim', sig: 'Ark gerilimi dalgalanması', unit: 'V', lim: 15, v: [6, 7, 6, 7, 8, 7, 8, 8, 9, 8], msg: 'Normal aralıkta.' },
    { m: 'KMP-ISL-02', g: 'Isıl işlem fırını', sig: 'Bölge sıcaklık farkı', unit: '°C', lim: 25, v: [8, 9, 11, 12, 14, 15, 17, 19, 20, 22], msg: 'Bölgeler arası fark artıyor; ısıtıcı rezistans kontrolü önerilir.' }];
  var PARTS = [['7210044', 'Spindle rulmanı 7014 C', 14, 6, 'CNC-NC'], ['7210188', 'Kaynak torcu temas memesi M8', 120, 300, 'Robot kaynak'], ['7210190', 'Tel sürme makarası 1,2 mm', 18, 20, 'Robot kaynak'], ['7212004', 'Hidrolik hortum 1/2" 1,5 m', 9, 6, 'Abkant / pres'], ['7212019', 'Basınç sensörü 0–400 bar', 2, 3, 'Hidrolik pres'], ['7215101', 'Plazma elektrot 260 A', 46, 40, 'Plazma'], ['7215102', 'Plazma nozul 260 A', 31, 40, 'Plazma'], ['7218330', 'Boya tabancası nozul seti', 7, 5, 'Boyahane robotu'], ['7219005', 'Termokupl K tipi', 4, 4, 'Isıl işlem fırını']];

  var CP = {
    'HMK 220LC bom': [['Bom pimi yuvası çapı', 'Ø80 H7', '+0,030 / 0', 'İç çap mikrometresi', 'Her parça', 'Talaşlı işleme operatörü', 'Durdur, kaliteye bildir'], ['Yuva eksen paralelliği', '0,05 mm', '≤ 0,05', 'CMM', 'İlk parça + 1/10', 'Kalite', 'Parti blokajı'], ['Kaynak dikiş ölçüsü (a)', 'a6', '6–7 mm', 'Kaynak mastarı', 'Her parça', 'Kaynak operatörü', 'Tamir kaynağı, kayıt'], ['Kaynak iç hatası', '—', 'UT kabul sınıfı 2', 'Ultrasonik', '1/5 parça', 'NDT uzmanı', '8D aç'], ['Boya kalınlığı', '120 µm', '100–160 µm', 'Kalınlık ölçer', '5 nokta / parça', 'Boya operatörü', 'Rötuş']],
    'HMK 102B ön yükleyici bom kolu': [['Pim yuvası çapı', 'Ø60 H7', '+0,030 / 0', 'İç çap mikrometresi', 'Her parça', 'Talaşlı işleme operatörü', 'Durdur, kaliteye bildir'], ['Kol simetrisi', '1,0 mm', '≤ 1,0', 'Lazer tracker', 'İlk parça + 1/20', 'Kalite', 'Fikstür kontrolü'], ['Kaynak dikiş ölçüsü (a)', 'a5', '5–6 mm', 'Kaynak mastarı', 'Her parça', 'Kaynak operatörü', 'Tamir kaynağı'], ['Boya kalınlığı', '120 µm', '100–160 µm', 'Kalınlık ölçer', '5 nokta / parça', 'Boya operatörü', 'Rötuş']],
    'HMK 600MG ön aks gövdesi': [['Mil yatağı çapı', 'Ø110 H7', '+0,035 / 0', 'İç çap mikrometresi', 'Her parça', 'Talaşlı işleme operatörü', 'Durdur, kaliteye bildir'], ['Yatak eksen açıklığı', '1240 mm', '±0,2', 'CMM', 'İlk parça', 'Kalite', 'Parti blokajı'], ['Kaynak iç hatası', '—', 'UT kabul sınıfı 2', 'Ultrasonik', '1/5 parça', 'NDT uzmanı', '8D aç']]};
  var FAI = [];
  for (i = 0; i < 9; i++) { var o = IFS[i]; FAI.push({ id: 'IP-' + (2401 + i), sap: o.no, part: o.part, g: o.op[1], m: (o.fac) + '-' + o.op[2] + '-' + d2(1 + i), at: NOW.getTime() - Math.round(rnd() * 5 * 36e5), st: i < 4 ? 'Bekliyor' : i === 6 ? 'Reddedildi' : 'Onaylandı', by: i < 4 ? '' : 'Kalite Uzmanı 1' }); }
  var D8 = [
    { id: '8D-2026-041', t: 'HMK 220LC bom pim yuvasında ölçü dışı', src: 'Uygunsuzluk UY-118 · F6 CNC-NC', step: 5, owner: 'Kalite Uzmanı 1', due: NOW.getTime() + 4 * DAY, prio: 'Yüksek' },
    { id: '8D-2026-040', t: 'Robot kaynakta yetersiz nüfuziyet (arka kazıcı kolu)', src: 'Final kontrol · F6 Robot kaynak', step: 3, owner: 'Kaynak Mühendisi', due: NOW.getTime() + 2 * DAY, prio: 'Kritik' },
    { id: '8D-2026-039', t: 'Greyder ön aks gövdesinde boya kabarması', src: 'Müşteri şikâyeti · saha', step: 7, owner: 'Kalite Uzmanı 2', due: NOW.getTime() - 1 * DAY, prio: 'Yüksek' },
    { id: '8D-2026-037', t: 'Silindir gövdesi honlama yüzeyinde çizik', src: 'Komponent · Silindirhane', step: 8, owner: 'Kalite Uzmanı 1', due: NOW.getTime() - 6 * DAY, prio: 'Orta' }];
  var D8N = ['Ekip', 'Problem tanımı', 'Geçici önlem', 'Kök neden', 'Kalıcı önlem', 'Doğrulama', 'Tekrarı önleme', 'Kapanış'];
  var SPC = []; for (i = 0; i < 25; i++) SPC.push(80.012 + (rnd() - 0.5) * 0.012 + (i > 18 ? (i - 18) * 0.0018 : 0));

  var STATIONS = [['ST10', 'Ana şasi yerleştirme'], ['ST20', 'Ön ve arka aks montajı'], ['ST30', 'Şanzıman ve motor'], ['ST40', 'Hidrolik tesisat'], ['ST50', 'Kabin montajı'], ['ST60', 'Yükleyici ve kazıcı kolu'], ['ST70', 'Elektrik ve yazılım'], ['ST80', 'Fonksiyon testi']];
  var CHASSIS = []; for (i = 0; i < 12; i++) CHASSIS.push({ no: 'HMK102B' + (25410 + i), model: i % 4 === 3 ? 'HMK 102S' : 'HMK 102B', st: i < 8 ? STATIONS[7 - i][0] : 'Bitti', elapsed: Math.round(10 + rnd() * 40), op: pick(['Hasan T.', 'Mehmet Y.', 'Ali K.', 'Can T.', 'Zeynep A.', 'Ayşe K.']), missing: i === 2 ? 'Ön cam' : i === 5 ? 'Klima kompresörü' : '' });
  var TAKT = 42;

  /* ---------- stiller ---------- */
  var css = '.hx-root{padding:24px 28px 48px;max-width:var(--content-max,1440px);font-family:var(--f-body);color:var(--fg)}' +
    '.hx-crumb{font-size:var(--fs-small,13px);color:var(--muted)}.hx-h1{font-size:var(--fs-h1,28px);font-weight:700;margin:2px 0 4px}.hx-sub{color:var(--muted);margin:0 0 16px;max-width:900px}' +
    '.hx-bar{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px}.hx-sp{flex:1}' +
    '.hx-tabs{display:flex;gap:4px;border-bottom:1px solid var(--line);margin-bottom:16px;flex-wrap:wrap}.hx-tabs button{border:0;background:none;padding:10px 14px;font:inherit;font-weight:600;color:var(--muted);border-bottom:2px solid transparent;margin-bottom:-1px;cursor:pointer}.hx-tabs button.on{color:var(--fg);border-color:var(--brand)}' +
    '.hx-card{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:16px;box-shadow:var(--light-shadow)}.hx-card h3{margin:0 0 4px;font-size:16px}.hx-card .s{color:var(--muted);font-size:13px;margin-bottom:10px}' +
    '.hx-grid{display:grid;gap:14px}.g2{grid-template-columns:repeat(auto-fill,minmax(420px,1fr))}.g3{grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}.g4{grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}' +
    '.hx-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px}.hx-kpi{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px 14px}.hx-kpi small{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:600}.hx-kpi b{font-size:26px;display:block;margin-top:2px}' +
    '.hx-tw{border:1px solid var(--line);border-radius:12px;overflow:auto;background:var(--surface)}table.hx-t{width:100%;border-collapse:collapse;font-size:14px}.hx-t th{text-align:left;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:600;padding:10px;background:var(--surface-2);border-bottom:1px solid var(--line);white-space:nowrap}.hx-t td{padding:10px;border-bottom:1px solid var(--line);vertical-align:middle}.hx-t tr:last-child td{border-bottom:0}.hx-t .r{text-align:right}.hx-mono{font-family:var(--f-mono);font-size:.92em}' +
    '.hx-pill{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;padding:3px 9px;border-radius:20px;white-space:nowrap;background:var(--idle-bg);color:var(--idle)}.hx-pill.ok{background:var(--ok-bg);color:var(--ok)}.hx-pill.bad{background:var(--bad-bg);color:var(--bad)}.hx-pill.warn{background:var(--warn-bg);color:var(--warn)}.hx-pill.info{background:var(--info-bg);color:var(--info)}.hx-pill.brand{background:var(--brand-soft);color:var(--brand-deep)}' +
    '.hx-btn{border:1px solid var(--line-2);background:var(--surface);color:var(--fg);border-radius:20px;padding:7px 14px;font:inherit;font-weight:600;font-size:13px;cursor:pointer}.hx-btn.pri{background:var(--brand);border-color:var(--brand);color:var(--brand-ink)}.hx-btn.ok{background:var(--ok);border-color:var(--ok);color:#fff}' +
    '.hx-sel{border:1px solid var(--line-2);border-radius:10px;padding:8px 10px;background:var(--surface);color:var(--fg);font:inherit}.hx-fld{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted);font-weight:600}' +
    '.hx-load{height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--fg)}.l-ok{background:var(--ok-bg)}.l-warn{background:var(--warn-bg)}.l-bad{background:var(--bad-bg);color:var(--bad)}.l-none{background:var(--surface-2);color:var(--faint)}' +
    '.hx-gantt{position:relative}.hx-grow{display:grid;grid-template-columns:200px 1fr;border-bottom:1px solid var(--line);min-height:40px}.hx-grow .lab{padding:10px;font-size:13px;font-weight:600;border-right:1px solid var(--line)}.hx-grow .lane{position:relative;background:repeating-linear-gradient(90deg,transparent 0,transparent calc(100%/3 - 1px),var(--line) calc(100%/3 - 1px),var(--line) calc(100%/3))}.hx-job{position:absolute;top:7px;height:26px;border-radius:6px;background:var(--brand);color:var(--brand-ink);font-size:11px;font-weight:600;padding:5px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hx-job.done{background:var(--idle);color:#fff}.hx-job.free{background:var(--info);color:#fff}.hx-now{position:absolute;top:0;bottom:0;width:2px;background:var(--bad)}' +
    '.hx-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}.hx-day{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:10px;min-height:160px}.hx-day.today{border-color:var(--brand)}.hx-day h4{margin:0 0 8px;font-size:13px}.hx-ev{font-size:12px;border-left:3px solid var(--info);background:var(--surface-2);border-radius:4px;padding:5px 7px;margin-bottom:6px}.hx-ev.late{border-color:var(--bad);background:var(--bad-bg)}' +
    '.hx-steps{display:flex;gap:4px;margin:10px 0}.hx-steps span{flex:1;height:8px;border-radius:4px;background:var(--surface-2)}.hx-steps span.d{background:var(--ok)}.hx-steps span.c{background:var(--brand)}' +
    '.hx-st{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px;border-top:4px solid var(--ok)}.hx-st.slow{border-top-color:var(--warn)}.hx-st.over{border-top-color:var(--bad)}.hx-st .code{font-size:12px;color:var(--muted);font-weight:700}.hx-tk{height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden;margin:8px 0 4px}.hx-tk i{display:block;height:100%;background:var(--ok)}.hx-st.slow .hx-tk i{background:var(--warn)}.hx-st.over .hx-tk i{background:var(--bad)}' +
    '.hx-tl{display:flex;gap:0;margin:8px 0 4px}.hx-tl div{flex:1;text-align:center;font-size:11px;color:var(--muted);position:relative;padding-top:18px}.hx-tl div:before{content:"";position:absolute;top:5px;left:50%;width:10px;height:10px;border-radius:50%;background:var(--ok);transform:translateX(-50%)}.hx-tl div:after{content:"";position:absolute;top:9px;left:0;right:0;height:2px;background:var(--ok);z-index:-1}.hx-tl div.todo:before{background:var(--line-2)}.hx-tl div.todo:after{background:var(--line)}' +
    '.hx-toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--fg);color:var(--bg);padding:10px 16px;border-radius:10px;font-size:14px;z-index:9999;opacity:0;transition:.25s;pointer-events:none}.hx-toast.on{opacity:1}' +
    '.hx-note{font-size:12px;color:var(--muted);margin-top:8px}.hx-legend{display:flex;gap:12px;font-size:12px;color:var(--muted);flex-wrap:wrap}.hx-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:4px;vertical-align:-1px}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var toast = function (m) { var t = document.querySelector('.hx-toast'); if (!t) { t = document.createElement('div'); t.className = 'hx-toast'; document.body.appendChild(t); } t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('on'); }, 2400); };

  /* ---------- ekranlar ---------- */
  var S = { fac: 'F6', tab: {}, part: 'HMK 220LC bom', chassis: 'HMK102B25414', hat: 'F6 kazıcı yükleyici montaj hattı' };
  var tabs = function (key, list, def) { var cur = S.tab[key] || def; return '<div class="hx-tabs">' + list.map(function (t) { return '<button data-hx="tab" data-k="' + key + '" data-x="' + t[0] + '" class="' + (cur === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>'; };
  var cur = function (k, d) { return S.tab[k] || d; };
  var facSel = function () { return '<label class="hx-fld">Fabrika<select class="hx-sel" data-hx-f="fac">' + FACTS.map(function (f) { return '<option value="' + f.code + '"' + (S.fac === f.code ? ' selected' : '') + '>' + esc(f.name) + '</option>'; }).join('') + '</select></label>'; };
  var head = function (crumb, title, sub, right) { return '<div class="hx-crumb">' + crumb + '</div><div class="hx-bar"><div><div class="hx-h1">' + title + '</div><p class="hx-sub">' + sub + '</p></div><span class="hx-sp"></span>' + (right || '') + '</div>'; };
  var spark = function (v, lim) { var W = 300, H = 70, mx = Math.max(lim * 1.1, Math.max.apply(null, v)), mn = Math.min.apply(null, v) * 0.9; var X = function (i) { return i * W / (v.length - 1); }, Y = function (x) { return H - (x - mn) / (mx - mn) * H; }; return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" role="img" aria-label="Son 10 gün"><line x1="0" x2="' + W + '" y1="' + Y(lim) + '" y2="' + Y(lim) + '" stroke="var(--bad)" stroke-dasharray="5 5"/><polyline points="' + v.map(function (x, i) { return X(i).toFixed(1) + ',' + Y(x).toFixed(1); }).join(' ') + '" fill="none" stroke="var(--fg)" stroke-width="2.2"/><circle cx="' + X(v.length - 1) + '" cy="' + Y(v[v.length - 1]) + '" r="4" fill="var(--brand)"/></svg>'; };

  function vKapasite() {
    var gs = groupsOf(S.fac), t = cur('kap', 'cap');
    var body = '';
    if (t === 'cap') {
      seed = S.fac.length * 13 + 5;
      var days = []; for (var d = 0; d < 6; d++) { var dt = new Date(NOW.getTime() + d * DAY); days.push(dt); }
      body = '<div class="hx-bar"><div class="hx-legend"><span><i style="background:var(--ok-bg)"></i>%80 altı</span><span><i style="background:var(--warn-bg)"></i>%80–100</span><span><i style="background:var(--bad-bg)"></i>Kapasite aşımı</span></div></div><div class="hx-tw"><table class="hx-t"><tr><th>Makine grubu</th><th class="r">Tezgâh</th><th class="r">Günlük kapasite</th>' + days.map(function (x) { return '<th>' + DAYS[x.getDay()] + ' ' + d2(x.getDate()) + '.' + d2(x.getMonth() + 1) + '</th>'; }).join('') + '</tr>' +
        gs.map(function (g) { var cap = g.count * 9; return '<tr><td><b>' + esc(g.name) + '</b> <span class="hx-pill ' + (g.iot ? 'info' : 'idle') + '">' + (g.iot ? 'IoT' : 'beyan') + '</span></td><td class="r">' + g.count + '</td><td class="r">' + nf(cap) + ' sa</td>' + days.map(function (x) { var w = x.getDay() === 0; var p = w ? 0 : Math.round(45 + rnd() * 70); return '<td><div class="hx-load ' + (w ? 'l-none' : p > 100 ? 'l-bad' : p >= 80 ? 'l-warn' : 'l-ok') + '">' + (w ? 'Tatil' : '%' + p) + '</div></td>'; }).join('') + '</tr>'; }).join('') + '</table></div><div class="hx-note">Kapasite = tezgâh × tek vardiya × 9 saat (08:00–18:00, 1 saat mola). Yük, IFS iş emirlerinin rota sürelerinden hesaplanır.</div>';
    } else if (t === 'sap') {
      var L = IFS.filter(function (o) { return o.fac === S.fac || S.fac === 'ALL'; }); if (!L.length) L = IFS.slice(0, 8);
      body = '<div class="hx-kpis"><div class="hx-kpi"><small>IFS’te serbest</small><b>' + L.filter(function (o) { return o.st === 'IFS’te serbest'; }).length + '</b></div><div class="hx-kpi"><small>MES’e aktarıldı</small><b>' + L.filter(function (o) { return o.st === 'MES’e aktarıldı'; }).length + '</b></div><div class="hx-kpi"><small>Üretimde</small><b>' + L.filter(function (o) { return o.st === 'Üretimde'; }).length + '</b></div><div class="hx-kpi"><small>Teyit edildi</small><b>' + L.filter(function (o) { return o.st === 'Teyit edildi'; }).length + '</b></div></div>' +
        '<div class="hx-tw"><table class="hx-t"><tr><th>IFS iş emri</th><th>Malzeme</th><th>Ürün ailesi</th><th>Operasyon (rota)</th><th class="r">Miktar</th><th>Başlangıç → bitiş</th><th>Durum</th><th>IFS teyidi</th><th></th></tr>' +
        L.map(function (o) { return '<tr><td class="hx-mono"><b>' + o.no + '</b></td><td>' + esc(o.part) + '<div class="hx-mono" style="color:var(--muted)">' + o.mat + '</div></td><td>' + esc(o.fam) + '</td><td><span class="hx-mono">' + o.op[0] + '</span> ' + o.op[1] + '</td><td class="r">' + o.done + ' / ' + o.qty + '</td><td>' + fD(o.start) + ' → ' + fD(o.end) + '</td><td>' + stPill(o.st) + '</td><td>' + (o.done ? '<span class="hx-pill ok">' + o.done + ' adet yazıldı</span>' : '—') + '</td><td>' + (o.st === 'IFS’te serbest' ? '<button class="hx-btn pri" data-hx="sapIn" data-x="' + o.no + '">MES’e al</button>' : '') + '</td></tr>'; }).join('') + '</table></div><div class="hx-note">İş emirleri IFS’ten (REST / OData API) alınır; üretim teyidi ve fiili tüketim operasyon bitince IFS’e geri yazılır.</div>';
    } else {
      var gs2 = gs.slice(0, 10); seed = 31;
      var t0 = new Date(NOW); t0.setHours(0, 0, 0, 0); var span = 3 * DAY;
      body = '<div class="hx-bar"><div class="hx-legend"><span><i style="background:var(--brand)"></i>Planlı</span><span><i style="background:var(--info)"></i>IFS’ten yeni</span><span><i style="background:var(--idle)"></i>Bitti</span><span><i style="background:var(--bad)"></i>Şimdi</span></div></div><div class="hx-card" style="padding:0"><div class="hx-grow" style="min-height:30px"><div class="lab">Makine grubu</div><div style="display:grid;grid-template-columns:repeat(3,1fr);font-size:12px;font-weight:700;color:var(--muted)">' + [0, 1, 2].map(function (k) { var x = new Date(t0.getTime() + k * DAY); return '<div style="padding:8px">' + DAYS[x.getDay()] + ' ' + fD(x) + '</div>'; }).join('') + '</div></div>' +
        gs2.map(function (g) { var jobs = '', x = rnd() * 0.15; while (x < 0.95) { var w = 0.08 + rnd() * 0.2; var o = pick(IFS); var cls = x + w < (NOW - t0) / span ? 'done' : rnd() < 0.2 ? 'free' : ''; jobs += '<div class="hx-job ' + cls + '" style="left:' + (x * 100).toFixed(1) + '%;width:' + (Math.min(w, 0.99 - x) * 100).toFixed(1) + '%" title="' + esc(o.no + ' · ' + o.part) + '">' + o.no + ' · ' + esc(o.part) + '</div>'; x += w + 0.02 + rnd() * 0.08; } return '<div class="hx-grow"><div class="lab">' + esc(g.name) + '<div style="font-weight:400;color:var(--muted);font-size:12px">' + g.count + ' tezgâh</div></div><div class="lane">' + jobs + '<div class="hx-now" style="left:' + ((NOW - t0) / span * 100).toFixed(2) + '%"></div></div></div>'; }).join('') + '</div><div class="hx-note">Çubuklar IFS rota sürelerinden ve makine grubunun kapasitesinden yerleşir; sürükleyerek yeniden planlama bir sonraki sürümde.</div>';
    }
    return head('Planlama', 'Kapasite ve IFS iş emirleri', 'IFS’ten gelen iş emirleri, makine grubu bazında kapasite yükü ve üç günlük çizelge.', facSel()) + tabs('kap', [['cap', 'Kapasite yükü'], ['sap', 'IFS iş emirleri'], ['gantt', 'Çizelge']], 'cap') + body;
  }

  function vBakim() {
    var t = cur('bak', 'cal'), body = '';
    if (t === 'cal') {
      var start = new Date(NOW); start.setHours(0, 0, 0, 0); start = new Date(start.getTime() - ((start.getDay() + 6) % 7) * DAY);
      body = '<div class="hx-cal">' + [0, 1, 2, 3, 4, 5, 6].map(function (k) { var d = new Date(start.getTime() + k * DAY); var ev = PM.filter(function (p) { var x = new Date(p.due); x.setHours(0, 0, 0, 0); return x.getTime() === d.getTime(); }); var today = d.toDateString() === NOW.toDateString(); return '<div class="hx-day' + (today ? ' today' : '') + '"><h4>' + DAYS[d.getDay()] + ' ' + d2(d.getDate()) + '.' + d2(d.getMonth() + 1) + (today ? ' · bugün' : '') + '</h4>' + (ev.map(function (p) { return '<div class="hx-ev' + (p.due < NOW.getTime() ? ' late' : '') + '"><b>' + esc(p.m) + '</b><br>' + esc(p.task) + '<br><span style="color:var(--muted)">her ' + p.period + ' gün</span></div>'; }).join('') || '<div class="hx-note">Bakım yok</div>') + '</div>'; }).join('') + '</div>' +
        '<div class="hx-tw" style="margin-top:14px"><table class="hx-t"><tr><th>Tezgâh</th><th>Görev</th><th>Periyot</th><th>Plan tarihi</th><th>Durum</th><th></th></tr>' + PM.slice().sort(function (a, b) { return a.due - b.due; }).slice(0, 12).map(function (p) { var late = p.due < NOW.getTime(); return '<tr><td class="hx-mono"><b>' + p.m + '</b></td><td>' + esc(p.task) + '</td><td>' + p.period + ' gün</td><td>' + fD(p.due) + '</td><td>' + (late ? '<span class="hx-pill bad">Gecikti</span>' : '<span class="hx-pill info">Planlı</span>') + '</td><td><button class="hx-btn" data-hx="pmDone" data-x="' + esc(p.m + p.task) + '">Yapıldı</button></td></tr>'; }).join('') + '</table></div>';
    } else if (t === 'pred') {
      body = '<p class="hx-sub">IoT bağlı tezgâhların sinyalleri (StepBox/PLC) eğilimine göre izlenir; sınıra yaklaşan tezgâh için bakım talebi önerilir.</p><div class="hx-grid g3">' + PRED.map(function (p) { var last = p.v[p.v.length - 1], risk = last >= p.lim * 0.85, mid = last >= p.lim * 0.6; return '<div class="hx-card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h3 class="hx-mono">' + p.m + '</h3>' + (risk ? '<span class="hx-pill bad">Yüksek risk</span>' : mid ? '<span class="hx-pill warn">İzle</span>' : '<span class="hx-pill ok">Normal</span>') + '</div><div class="s">' + esc(p.g) + ' · ' + esc(p.sig) + ' · son ' + last + ' ' + p.unit + ' · sınır ' + p.lim + ' ' + p.unit + '</div>' + spark(p.v, p.lim) + '<p style="font-size:13px;margin:8px 0">' + esc(p.msg) + '</p>' + (risk || mid ? '<button class="hx-btn pri" data-hx="predOpen" data-x="' + p.m + '">Bakım talebi aç</button>' : '') + '</div>'; }).join('') + '</div>';
    } else if (t === 'part') {
      body = '<div class="hx-tw"><table class="hx-t"><tr><th>IFS malzeme</th><th>Yedek parça</th><th>Kullanıldığı grup</th><th class="r">Stok</th><th class="r">Minimum</th><th>Durum</th><th></th></tr>' + PARTS.map(function (p) { var low = p[2] < p[3]; return '<tr><td class="hx-mono">' + p[0] + '</td><td><b>' + esc(p[1]) + '</b></td><td>' + esc(p[4]) + '</td><td class="r">' + p[2] + '</td><td class="r">' + p[3] + '</td><td>' + (low ? '<span class="hx-pill bad">Minimumun altında</span>' : '<span class="hx-pill ok">Yeterli</span>') + '</td><td>' + (low ? '<button class="hx-btn" data-hx="req" data-x="' + esc(p[1]) + '">IFS’te talep aç</button>' : '') + '</td></tr>'; }).join('') + '</table></div><div class="hx-note">Stok ve satınalma talebi IFS bakım ve stok ile entegre; tamamlanan arıza talebinde kullanılan parça stoktan düşer.</div>';
    } else {
      var G = [['CNC-NC', 212, 2.4], ['Robot kaynak', 146, 1.6], ['Abkant büküm', 310, 3.1], ['Hidrolik pres', 280, 2.0], ['Boyahane robotu', 190, 1.2], ['Isıl işlem fırını', 420, 4.5]];
      var mx = 450;
      body = '<div class="hx-kpis"><div class="hx-kpi"><small>Açık arıza talebi</small><b>4</b></div><div class="hx-kpi"><small>Geciken periyodik</small><b>' + PM.filter(function (p) { return p.due < NOW.getTime(); }).length + '</b></div><div class="hx-kpi"><small>Ortalama MTBF</small><b>226 sa</b></div><div class="hx-kpi"><small>Ortalama MTTR</small><b>2,5 sa</b></div><div class="hx-kpi"><small>Kestirimci risk</small><b>' + PRED.filter(function (p) { return p.v[9] >= p.lim * 0.85; }).length + '</b></div></div><div class="hx-grid g2"><div class="hx-card"><h3>Arızalar arası ortalama süre (MTBF)</h3><div class="s">Makine grubu bazında, son 90 gün</div>' + G.map(function (g) { return '<div style="display:grid;grid-template-columns:150px 1fr 70px;gap:10px;align-items:center;margin:8px 0;font-size:13px"><span>' + g[0] + '</span><span style="height:12px;background:var(--surface-2);border-radius:6px;overflow:hidden"><i style="display:block;height:100%;width:' + (g[1] / mx * 100) + '%;background:var(--fg)"></i></span><b style="text-align:right">' + g[1] + ' sa</b></div>'; }).join('') + '</div><div class="hx-card"><h3>Ortalama onarım süresi (MTTR)</h3><div class="s">Makine grubu bazında, son 90 gün</div>' + G.map(function (g) { return '<div style="display:grid;grid-template-columns:150px 1fr 70px;gap:10px;align-items:center;margin:8px 0;font-size:13px"><span>' + g[0] + '</span><span style="height:12px;background:var(--surface-2);border-radius:6px;overflow:hidden"><i style="display:block;height:100%;width:' + (g[2] / 5 * 100) + '%;background:var(--brand)"></i></span><b style="text-align:right">' + String(g[2]).replace('.', ',') + ' sa</b></div>'; }).join('') + '</div></div>';
    }
    return head('Bakım', 'Planlı ve kestirimci bakım', 'Periyodik bakım takvimi, IoT sinyallerinden kestirimci uyarılar, yedek parça ve bakım göstergeleri.', '') + tabs('bak', [['cal', 'Bakım takvimi'], ['pred', 'Kestirimci bakım'], ['part', 'Yedek parça'], ['kpi', 'Göstergeler']], 'cal') + body;
  }

  function vKalite() {
    var t = cur('kal', 'cp'), body = '';
    if (t === 'cp') {
      var rows = CP[S.part];
      body = '<div class="hx-bar"><label class="hx-fld">Parça<select class="hx-sel" data-hx-f="part">' + Object.keys(CP).map(function (k) { return '<option' + (k === S.part ? ' selected' : '') + '>' + esc(k) + '</option>'; }).join('') + '</select></label><span class="hx-sp"></span><span class="hx-pill brand">Revizyon C · onaylı</span></div><div class="hx-tw"><table class="hx-t"><tr><th>Karakteristik</th><th>Nominal</th><th>Tolerans</th><th>Ölçüm aleti</th><th>Sıklık</th><th>Sorumlu</th><th>Reaksiyon planı</th></tr>' + rows.map(function (r) { return '<tr><td><b>' + esc(r[0]) + '</b></td><td class="hx-mono">' + esc(r[1]) + '</td><td class="hx-mono">' + esc(r[2]) + '</td><td>' + esc(r[3]) + '</td><td>' + esc(r[4]) + '</td><td>' + esc(r[5]) + '</td><td>' + esc(r[6]) + '</td></tr>'; }).join('') + '</table></div><div class="hx-note">Kontrol planı istasyonda tablette açılır; ölçümler tolerans dışına çıkınca uygunsuzluk açılır ve parti blokajı uygulanır.</div>';
    } else if (t === 'fai') {
      body = '<div class="hx-tw"><table class="hx-t"><tr><th>No</th><th>IFS iş emri</th><th>Parça</th><th>Tezgâh</th><th>İstendi</th><th>Durum</th><th></th></tr>' + FAI.map(function (f) { return '<tr><td class="hx-mono"><b>' + f.id + '</b></td><td class="hx-mono">' + f.sap + '</td><td>' + esc(f.part) + '<div style="color:var(--muted);font-size:12px">' + esc(f.g) + '</div></td><td class="hx-mono">' + f.m + '</td><td>' + fDT(f.at) + '</td><td>' + (f.st === 'Bekliyor' ? '<span class="hx-pill warn">Bekliyor</span>' : f.st === 'Onaylandı' ? '<span class="hx-pill ok">Onaylandı</span>' : '<span class="hx-pill bad">Reddedildi</span>') + (f.by ? '<div style="color:var(--muted);font-size:12px">' + esc(f.by) + '</div>' : '') + '</td><td>' + (f.st === 'Bekliyor' ? '<button class="hx-btn" data-hx="faiNo" data-x="' + f.id + '">Reddet</button> <button class="hx-btn ok" data-hx="faiOk" data-x="' + f.id + '">Onayla</button>' : '') + '</td></tr>'; }).join('') + '</table></div><div class="hx-note">İlk parça onayı verilene kadar tezgâhta seri üretim adedi girilemez.</div>';
    } else if (t === 'd8') {
      body = '<div class="hx-grid g2">' + D8.map(function (d) { var late = d.due < NOW.getTime() && d.step < 8; return '<div class="hx-card"><div style="display:flex;gap:8px;align-items:center"><b class="hx-mono">' + d.id + '</b><span class="hx-sp"></span>' + (d.step >= 8 ? '<span class="hx-pill idle">Kapandı</span>' : late ? '<span class="hx-pill bad">Gecikti</span>' : '<span class="hx-pill ' + (d.prio === 'Kritik' ? 'bad' : 'warn') + '">' + d.prio + '</span>') + '</div><h3 style="margin-top:6px">' + esc(d.t) + '</h3><div class="s">' + esc(d.src) + '</div><div class="hx-steps">' + D8N.map(function (n, i) { return '<span class="' + (i < d.step - 1 ? 'd' : i === d.step - 1 ? 'c' : '') + '" title="D' + (i + 1) + ' ' + n + '"></span>'; }).join('') + '</div><div style="font-size:13px">Şu an: <b>D' + Math.min(d.step, 8) + ' · ' + D8N[Math.min(d.step, 8) - 1] + '</b> · sorumlu ' + esc(d.owner) + ' · hedef ' + fD(d.due) + '</div></div>'; }).join('') + '</div>';
    } else {
      var W = 760, H = 240, mean = 80.012, ucl = 80.018, lcl = 80.006, mn = 80.0, mx = 80.026;
      var X = function (i) { return 40 + i * (W - 60) / (SPC.length - 1); }, Y = function (v) { return 20 + (mx - v) / (mx - mn) * (H - 40); };
      body = '<div class="hx-kpis"><div class="hx-kpi"><small>Karakteristik</small><b style="font-size:18px">Bom pim yuvası Ø80 H7</b></div><div class="hx-kpi"><small>Cpk</small><b>1,42</b></div><div class="hx-kpi"><small>Son 25 ölçüm</small><b>25</b></div><div class="hx-kpi"><small>Eğilim uyarısı</small><b style="color:var(--warn)">Var</b></div></div><div class="hx-card"><h3>X kontrol grafiği · HMK 220LC bom · F6 CNC-NC</h3><div class="s">Son 6 ölçüm üst kontrol sınırına doğru kayıyor; takım aşınması kontrol edilmeli.</div><svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Kontrol grafiği"><line x1="40" x2="' + (W - 20) + '" y1="' + Y(ucl) + '" y2="' + Y(ucl) + '" stroke="var(--bad)" stroke-dasharray="6 5"/><line x1="40" x2="' + (W - 20) + '" y1="' + Y(lcl) + '" y2="' + Y(lcl) + '" stroke="var(--bad)" stroke-dasharray="6 5"/><line x1="40" x2="' + (W - 20) + '" y1="' + Y(mean) + '" y2="' + Y(mean) + '" stroke="var(--muted)"/><text x="' + (W - 18) + '" y="' + (Y(ucl) + 4) + '" font-size="11" fill="var(--bad)">ÜKS</text><text x="' + (W - 18) + '" y="' + (Y(lcl) + 4) + '" font-size="11" fill="var(--bad)">AKS</text><polyline points="' + SPC.map(function (v, i) { return X(i).toFixed(1) + ',' + Y(v).toFixed(1); }).join(' ') + '" fill="none" stroke="var(--fg)" stroke-width="2"/>' + SPC.map(function (v, i) { return '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="3.5" fill="' + (i > 18 ? 'var(--brand)' : 'var(--fg)') + '"/>'; }).join('') + '</svg></div>';
    }
    return head('Kalite', 'Kontrol planı ve 8D', 'Parça bazında kontrol planı, ilk parça onayları, 8D / DÖF takibi ve proses ölçümlerinin kontrol grafiği.', '') + tabs('kal', [['cp', 'Kontrol planı'], ['fai', 'İlk parça onayları'], ['d8', '8D / DÖF'], ['spc', 'Proses ölçümleri (SPC)']], 'cp') + body;
  }

  function vMontaj() {
    var t = cur('mon', 'board'), body = '';
    if (t === 'board') {
      var onLine = CHASSIS.filter(function (c) { return c.st !== 'Bitti'; });
      body = '<div class="hx-bar"><label class="hx-fld">Montaj hattı<select class="hx-sel"><option>F6 kazıcı yükleyici montaj hattı</option><option>F2 motor greyder montaj hattı</option><option>F6 paletli ekskavatör montaj hattı</option></select></label><span class="hx-sp"></span><div class="hx-legend"><span><i style="background:var(--ok)"></i>Takt içinde</span><span><i style="background:var(--warn)"></i>Takta yakın</span><span><i style="background:var(--bad)"></i>Takt aşımı</span></div></div>' +
        '<div class="hx-kpis"><div class="hx-kpi"><small>Takt süresi</small><b>' + TAKT + ' dk</b></div><div class="hx-kpi"><small>Bugün hattan çıkan</small><b>' + (CHASSIS.length - onLine.length) + '</b></div><div class="hx-kpi"><small>Hatta</small><b>' + onLine.length + '</b></div><div class="hx-kpi"><small>Eksikli makine</small><b style="color:var(--bad)">' + CHASSIS.filter(function (c) { return c.missing; }).length + '</b></div></div>' +
        '<div class="hx-grid g4">' + STATIONS.map(function (s) { var c = onLine.find(function (x) { return x.st === s[0]; }); if (!c) return '<div class="hx-st" style="border-top-color:var(--line-2)"><div class="code">' + s[0] + '</div><b>' + s[1] + '</b><p class="hx-note">İstasyon boş</p></div>'; var p = c.elapsed / TAKT, cls = p > 1 ? 'over' : p > 0.85 ? 'slow' : ''; return '<div class="hx-st ' + cls + '"><div class="code">' + s[0] + '</div><b>' + s[1] + '</b><div style="margin-top:8px" class="hx-mono"><a href="#" data-hx="chassis" data-x="' + c.no + '">' + c.no + '</a></div><div style="font-size:13px;color:var(--muted)">' + c.model + ' · ' + esc(c.op) + '</div><div class="hx-tk"><i style="width:' + Math.min(100, p * 100) + '%"></i></div><div style="font-size:12px">' + c.elapsed + ' / ' + TAKT + ' dk' + (c.missing ? ' · <span style="color:var(--bad);font-weight:600">eksik: ' + esc(c.missing) + '</span>' : '') + '</div></div>'; }).join('') + '</div>';
    } else {
      var c = CHASSIS.find(function (x) { return x.no === S.chassis; }) || CHASSIS[4];
      var idx = STATIONS.findIndex(function (s) { return s[0] === c.st; }); if (c.st === 'Bitti') idx = 8;
      seed = c.no.length + 3;
      var PRT = [['Motor', 'Perkins 1104D-44TA', 'U' + (7000000 + Math.floor(rnd() * 99999))], ['Şanzıman', 'ZF powershift 4F/4R', 'ZF' + (3000000 + Math.floor(rnd() * 99999))], ['Ön aks', 'Hidromek ön aks 4WD', 'HA' + (51000 + Math.floor(rnd() * 999))], ['Arka aks', 'Hidromek arka aks', 'HA' + (62000 + Math.floor(rnd() * 999))], ['Hidrolik pompa', 'Değişken debili pistonlu', 'HP' + (8800 + Math.floor(rnd() * 99))], ['Kabin', 'ROPS/FOPS kabin', 'KB' + (4100 + Math.floor(rnd() * 99))]];
      var TQ = [['Motor bağlantı cıvataları M16', 210, 214], ['Aks bağlantı cıvataları M20', 410, 406], ['Kabin bağlantıları M12', 85, 86], ['Bom pimi kilit cıvatası', 120, 118]];
      body = '<div class="hx-bar"><label class="hx-fld">Şasi no<select class="hx-sel" data-hx-f="chassis">' + CHASSIS.map(function (x) { return '<option' + (x.no === c.no ? ' selected' : '') + '>' + x.no + '</option>'; }).join('') + '</select></label><span class="hx-sp"></span><span class="hx-pill brand">' + c.model + '</span>' + (c.missing ? '<span class="hx-pill bad">Eksik: ' + esc(c.missing) + '</span>' : '') + '</div>' +
        '<div class="hx-card" style="margin-bottom:14px"><h3>İstasyon geçişleri</h3><div class="s">Şasi no her istasyonda okutulur; giriş, çıkış ve istasyon süresi kaydedilir.</div><div class="hx-tl">' + STATIONS.map(function (s, i) { return '<div class="' + (i <= idx ? '' : 'todo') + '"><b style="color:var(--fg)">' + s[0] + '</b><br>' + esc(s[1]) + '</div>'; }).join('') + '</div></div>' +
        '<div class="hx-grid g2"><div class="hx-card"><h3>Parça–şasi eşleme</h3><div class="s">Kritik parçaların seri numaraları şasiye bağlanır.</div><table class="hx-t"><tr><th>Parça</th><th>Tanım</th><th>Seri no</th></tr>' + PRT.slice(0, Math.max(2, Math.min(6, idx + 1))).map(function (p) { return '<tr><td><b>' + p[0] + '</b></td><td>' + esc(p[1]) + '</td><td class="hx-mono">' + p[2] + '</td></tr>'; }).join('') + '</table></div>' +
        '<div class="hx-card"><h3>Tork kayıtları</h3><div class="s">Akıllı tork aletinden otomatik gelir.</div><table class="hx-t"><tr><th>Bağlantı</th><th class="r">Hedef</th><th class="r">Ölçülen</th><th>Sonuç</th></tr>' + TQ.map(function (q) { var ok = Math.abs(q[2] - q[1]) / q[1] <= 0.03; return '<tr><td>' + esc(q[0]) + '</td><td class="r">' + q[1] + ' Nm</td><td class="r">' + q[2] + ' Nm</td><td>' + (ok ? '<span class="hx-pill ok">Uygun</span>' : '<span class="hx-pill bad">Sınır dışı</span>') + '</td></tr>'; }).join('') + '</table></div>' +
        '<div class="hx-card"><h3>Fonksiyon testi</h3><div class="s">ST80 test standı</div>' + (idx >= 7 ? '<table class="hx-t"><tr><td>Hidrolik sistem basıncı</td><td class="r">245 bar</td><td><span class="hx-pill ok">Uygun</span></td></tr><tr><td>Fren testi</td><td class="r">—</td><td><span class="hx-pill ok">Uygun</span></td></tr><tr><td>Elektrik ve yazılım</td><td class="r">v4.2.1</td><td><span class="hx-pill ok">Uygun</span></td></tr></table>' : '<p class="hx-note">Makine henüz test istasyonuna gelmedi.</p>') + '</div>' +
        '<div class="hx-card"><h3>Makine karnesi özeti</h3><div class="s">Şasi geçmişi tek kayıtta</div><table class="hx-t"><tr><td>Model</td><td><b>' + c.model + '</b></td></tr><tr><td>Bulunduğu yer</td><td>' + (c.st === 'Bitti' ? 'Hattan çıktı' : c.st) + '</td></tr><tr><td>Uygunsuzluk</td><td>' + (c.missing ? '1 açık (eksik parça)' : 'Yok') + '</td></tr><tr><td>IFS üretim teyidi</td><td>' + (c.st === 'Bitti' ? '<span class="hx-pill ok">Yazıldı</span>' : 'Hat sonunda yazılır') + '</td></tr></table></div></div>';
    }
    return head('Üretim', 'Şasi izlenebilirliği', 'Montaj hattında şasi no ile istasyon takibi, takt, parça–şasi eşleme ve makine karnesi.', '') + tabs('mon', [['board', 'Hat panosu'], ['card', 'Makine karnesi']], 'board') + body;
  }


  /* ---------- akıllı otomasyonlar ve ajan ---------- */
  var AUTOS = [
    { id: 'A1', name: 'Uzun duruş', type: 'Duruş', metric: 'Plansız duruş süresi', cond: '≥ 20 dk', act: 'Bildirim + bakım talebi', to: 'Vardiya şefi, Bakım', ch: 'SMS + uygulama', on: true },
    { id: 'A2', name: 'Takt aşımı', type: 'Montaj', metric: 'İstasyon süresi / takt', cond: '> %110', act: 'Bildirim', to: 'Hat şefi', ch: 'Hat ekranı + uygulama', on: true },
    { id: 'A3', name: 'Kaynak akımı reçete dışı', type: 'Proses', metric: 'Robot kaynak akımı sapması', cond: '> %8', act: 'Uygunsuzluk aç + parçayı beklet', to: 'Kaynak mühendisi, Kalite', ch: 'Uygulama', on: true },
    { id: 'A4', name: 'İlk parça onayı gecikti', type: 'Kalite', metric: 'Bekleyen ilk parça onayı', cond: '≥ 15 dk', act: 'Bildirim', to: 'Kalite', ch: 'Uygulama', on: true },
    { id: 'A5', name: 'Kestirimci risk', type: 'Bakım', metric: 'Sinyal / eşik oranı', cond: '≥ %85', act: 'Bakım talebi aç', to: 'Bakım', ch: 'Uygulama', on: true },
    { id: 'A6', name: 'IFS teyidi yazılamadı', type: 'Entegrasyon', metric: 'Başarısız IFS teyidi', cond: '≥ 1', act: 'Bildirim', to: 'Planlama, BT', ch: 'E-posta + uygulama', on: true },
    { id: 'A7', name: 'Kapasite aşımı', type: 'Planlama', metric: 'Makine grubu günlük yükü', cond: '> %100', act: 'Bildirim', to: 'Planlama', ch: 'Uygulama', on: true },
    { id: 'A8', name: 'Yedek parça minimumun altında', type: 'Bakım', metric: 'Kritik yedek parça stoğu', cond: '< minimum', act: 'IFS satınalma talebi', to: 'Bakım, Satınalma', ch: 'Uygulama', on: false }];
  var RUNS = [
    { t: NOW.getTime() - 25 * 6e4, a: 'Takt aşımı', m: 'ST10 · F6 kazıcı yükleyici hattı', msg: 'HMK102B25417 istasyonda 49 dk (takt 42 dk).', to: 'Hat şefi', link: '' },
    { t: NOW.getTime() - 50 * 6e4, a: 'Kestirimci risk', m: 'F6-CNC-07', msg: 'Spindle titreşimi 3,9 mm/s; eşiğin %87’si.', to: 'Bakım', link: 'BT-0007' },
    { t: NOW.getTime() - 2 * 36e5, a: 'Kaynak akımı reçete dışı', m: 'F6-ROB-23', msg: 'Akım sapması %8,4; parça hücrede bekletildi.', to: 'Kaynak mühendisi, Kalite', link: 'UY-121' },
    { t: NOW.getTime() - 3 * 36e5, a: 'Uzun duruş', m: 'F6-MON', msg: 'Montaj grubunda arıza duruşu 34 dk sürüyor.', to: 'Vardiya şefi, Bakım', link: 'BT-0001' },
    { t: NOW.getTime() - 5 * 36e5, a: 'İlk parça onayı gecikti', m: 'KMP-CNC-12', msg: 'IP-2403 21 dk bekliyor; tezgâh seri üretime geçemiyor.', to: 'Kalite', link: '' },
    { t: NOW.getTime() - 7 * 36e5, a: 'Kapasite aşımı', m: 'F6 · Robot kaynak', msg: 'Yarınki yük %112; 3 iş emri kayma riskinde.', to: 'Planlama', link: '' },
    { t: NOW.getTime() - 20 * 36e5, a: 'IFS teyidi yazılamadı', m: 'IFS', msg: '100482331 teyidi zaman aşımı; ikinci denemede yazıldı.', to: 'Planlama, BT', link: '' }];
  var AGENT = [
    { id: 'G1', st: 'new', prio: 'Yüksek', area: 'Bakım', title: 'F6-CNC-07’de tekrarlayan spindle titreşimi', body: 'Son 14 günde 3 kez “takım kırılması” duruşu ve titreşim artışı birlikte görüldü. Duruşlar tek tek kısa olduğu için otomasyon eşiğine takılmadı. Spindle rulmanı için planlı müdahale öneriyorum.', ev: ['12.11 · 18 dk · takım kırılması', '19.11 · 26 dk · takım kırılması', '25.11 · titreşim 3,9 mm/s'], sug: 'Bakım talebi · sorumlu Bakım Teknisyeni 1 · 2 gün · yedek parça 7210044 stokta' },
    { id: 'G2', st: 'new', prio: 'Kritik', area: 'Kalite', title: 'Arka kazıcı kolunda kaynak hatası örüntüsü', body: 'Yetersiz nüfuziyet uygunsuzlukları son 5 vardiyada yalnızca F6-ROB-23 ve F6-ROB-24’te, aynı tel partisinde (L-7731) görüldü. Tel partisinin bloke edilmesini ve 8D açılmasını öneriyorum.', ev: ['UY-114 · F6-ROB-23 · tel L-7731', 'UY-117 · F6-ROB-24 · tel L-7731', 'UY-121 · F6-ROB-23 · tel L-7731'], sug: '8D · sorumlu Kaynak Mühendisi · 1 gün · tel partisi L-7731 blokaj' },
    { id: 'G3', st: 'new', prio: 'Orta', area: 'Planlama', title: 'Robot kaynakta kapasite darboğazı', body: 'Fabrika 6 robot kaynak grubu önümüzdeki 3 günün ikisinde %100’ü aşıyor; aynı günlerde Komponent robot kaynak %62 dolu. 4 iş emrinin Komponent’e kaydırılmasını öneriyorum.', ev: ['Per · %112', 'Cum · %104', 'Komponent · %62'], sug: 'Planlama aksiyonu · sorumlu Planlama Uzmanı · bugün' },
    { id: 'G4', st: 'new', prio: 'Orta', area: 'Montaj', title: 'ST10 istasyonunda takt aşımı tekrarı', body: 'ST10 ana şasi yerleştirme son 8 makinenin 5’inde takti aştı; aşımlar vinç bekleme notlarıyla birlikte. İstasyona ikinci yük kaldırma imkânı ya da iş içeriğinin ST20 ile dengelenmesini öneriyorum.', ev: ['HMK102B25409 · 47 dk', 'HMK102B25413 · 46 dk', 'HMK102B25417 · 49 dk'], sug: 'Hat dengeleme aksiyonu · sorumlu Hat şefi · 3 gün' }];
  var ACTS = [];
  function vOto() {
    var t = cur('oto', 'agent'), body = '';
    if (t === 'agent') {
      body = '<div class="hx-card" style="margin-bottom:14px;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span class="hx-pill ok">● Ajan sistemi dinliyor</span><span style="font-size:13px;color:var(--muted)">Tekrarlayan duruşlar · kaynak ve proses sapmaları · kalite örüntüleri · kapasite darboğazı · takt aşımı · ilerlemeyen aksiyonlar · mod: önerir, insan onaylar</span></div>' +
        '<div class="hx-card" style="margin-bottom:14px"><h3>Saha notu / bulgu</h3><div class="s">Notu serbest yazın; ajan başlık, sorumlu, öncelik ve hedef tarih önersin.</div><div style="display:flex;gap:10px;flex-wrap:wrap"><input id="hx-note" class="hx-sel" style="flex:1;min-width:280px" placeholder="Örn: F6-ROB-12 torç kablosu ısınıyor, vardiya sonu kontrol edilmeli"><button class="hx-btn pri" data-hx="agNote">Ajana gönder</button></div></div>' +
        '<div class="hx-grid g2">' + AGENT.map(function (a) { return '<div class="hx-card" style="border-left:4px solid var(--brand);' + (a.st !== 'new' ? 'opacity:.6' : '') + '"><div style="display:flex;gap:8px;align-items:center"><b style="flex:1">' + esc(a.title) + '</b><span class="hx-pill ' + (a.prio === 'Kritik' ? 'bad' : a.prio === 'Yüksek' ? 'warn' : 'info') + '">' + a.prio + '</span></div><div class="s">' + esc(a.area) + '</div><p style="font-size:14px;margin:6px 0">' + esc(a.body) + '</p><ul style="font-size:12px;color:var(--muted);margin:6px 0 10px 16px;padding:0">' + a.ev.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul><div style="font-size:13px;margin-bottom:10px"><b>Öneri:</b> ' + esc(a.sug) + '</div>' + (a.st === 'new' ? '<button class="hx-btn" data-hx="agRej" data-x="' + a.id + '">Reddet</button> <button class="hx-btn pri" data-hx="agAcc" data-x="' + a.id + '">Aksiyona çevir</button>' : '<span class="hx-pill ' + (a.st === 'acc' ? 'ok' : 'idle') + '">' + (a.st === 'acc' ? 'Aksiyona çevrildi' : 'Reddedildi') + '</span>') + '</div>'; }).join('') + '</div><div class="hx-note">Reddedilen öneriler ve gerekçeleri ajanın benzer önerileri ayırt etmesi için saklanır.</div>';
    } else if (t === 'rules') {
      body = '<div class="hx-bar"><span class="hx-sp"></span><button class="hx-btn pri" data-hx="newRule">＋ Yeni otomasyon</button></div><div class="hx-tw"><table class="hx-t"><tr><th>Otomasyon</th><th>Tür</th><th>Ölçüt</th><th>Koşul</th><th>Sonuç</th><th>Alıcılar</th><th>Kanal</th><th>Durum</th></tr>' + AUTOS.map(function (a) { return '<tr><td><b>' + esc(a.name) + '</b></td><td>' + a.type + '</td><td>' + esc(a.metric) + '</td><td class="hx-mono">' + esc(a.cond) + '</td><td>' + esc(a.act) + '</td><td style="font-size:13px">' + esc(a.to) + '</td><td style="font-size:13px">' + esc(a.ch) + '</td><td><button class="hx-btn ' + (a.on ? 'ok' : '') + '" data-hx="autoTog" data-x="' + a.id + '">' + (a.on ? 'Açık' : 'Kapalı') + '</button></td></tr>'; }).join('') + '</table></div><div class="hx-note">Otomasyon “ölçüt, koşul, eşik” olarak kurulur; koşul gerçekleşince bildirim gönderir, kayıt açar ya da IFS’e yazar. Kapalı otomasyon çalışmaz.</div>';
    } else if (t === 'runs') {
      body = '<div class="hx-kpis"><div class="hx-kpi"><small>Son 24 saat</small><b>' + RUNS.length + '</b></div><div class="hx-kpi"><small>Kayıt açan</small><b>' + RUNS.filter(function (r) { return r.link; }).length + '</b></div><div class="hx-kpi"><small>Aksiyona bağlı</small><b>' + ACTS.length + '</b></div></div><div class="hx-tw"><table class="hx-t"><tr><th>Zaman</th><th>Otomasyon</th><th>Nerede</th><th>Olay</th><th>Alıcı</th><th>Bağlı kayıt</th></tr>' + RUNS.map(function (r) { return '<tr><td>' + fDT(r.t) + '</td><td><b>' + esc(r.a) + '</b></td><td class="hx-mono">' + esc(r.m) + '</td><td>' + esc(r.msg) + '</td><td style="font-size:13px">' + esc(r.to) + '</td><td>' + (r.link ? '<span class="hx-pill info">' + r.link + '</span>' : '<button class="hx-btn" data-hx="linkAct" data-x="' + esc(r.msg) + '">Aksiyona bağla</button>') + '</td></tr>'; }).join('') + '</table></div>';
    } else {
      body = ACTS.length ? '<div class="hx-tw"><table class="hx-t"><tr><th>No</th><th>Başlık</th><th>Kaynak</th><th>Sorumlu</th><th>Hedef</th><th>Durum</th><th></th></tr>' + ACTS.map(function (a) { return '<tr><td class="hx-mono"><b>' + a.id + '</b></td><td>' + esc(a.t) + '</td><td>' + esc(a.src) + '</td><td>' + esc(a.own) + '</td><td>' + fD(a.due) + '</td><td>' + (a.done ? '<span class="hx-pill ok">Tamamlandı</span>' : '<span class="hx-pill info">Açık</span>') + '</td><td>' + (a.done ? '' : '<button class="hx-btn" data-hx="actDone" data-x="' + a.id + '">Tamamla</button>') + '</td></tr>'; }).join('') + '</table></div>' : '<div class="hx-card"><h3>Henüz aksiyon yok</h3><div class="s">Ajan önerisini “Aksiyona çevir” ile ya da Gerçekleşenler’de “Aksiyona bağla” ile açılan aksiyonlar burada izlenir.</div></div>';
    }
    return head('Takip', 'Akıllı otomasyonlar ve ajan', 'Otomasyon kurduğunuz koşul gerçekleşince haber verir ya da kayıt açar; ajan kural kurulmadan sistemi dinler ve tekrar eden örüntüler için kanıtlı öneri getirir.', '') + tabs('oto', [['agent', 'Ajan (' + AGENT.filter(function (a) { return a.st === 'new'; }).length + ')'], ['rules', 'Otomasyonlar'], ['runs', 'Gerçekleşenler'], ['acts', 'Aksiyonlar (' + ACTS.length + ')']], 'agent') + body;
  }

  var VIEWS = { kapasite: ['Kapasite ve IFS', vKapasite, 'production', 'planning'], montaj: ['Şasi izlenebilirliği', vMontaj, 'production', 'planning'], kalite: ['Kontrol planı ve 8D', vKalite, 'quality', null], bakim: ['Planlı ve kestirimci bakım', vBakim, 'maintenance', null], oto: ['Akıllı otomasyonlar', vOto, 'tracking', null] };
  var ICON = { kapasite: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', montaj: '<path d="M3 17h18M5 17V9l4-3h6l4 3v8"/><circle cx="7.5" cy="18.5" r="1.8"/><circle cx="16.5" cy="18.5" r="1.8"/>', kalite: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>', oto: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', bakim: '<path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>' };
  var active = null, host = null;

  function render() { if (!host || !active) return; host.innerHTML = '<div class="hx-root">' + VIEWS[active][1]() + '</div>'; }
  function open(key) {
    var main = document.querySelector('main'); if (!main) return;
    active = key; main.style.display = 'none';
    if (!host) { host = document.createElement('div'); host.className = 'hx-host'; }
    if (host.previousSibling !== main) main.parentNode.insertBefore(host, main.nextSibling);
    host.style.display = '';
    document.querySelectorAll('.grp a').forEach(function (a) { a.classList.remove('on'); });
    var me = document.querySelector('a[data-hx-nav="' + key + '"]'); if (me) me.classList.add('on');
    render(); window.scrollTo(0, 0);
  }
  function close() { if (!active) return; active = null; var main = document.querySelector('main'); if (main) main.style.display = ''; if (host) host.style.display = 'none'; document.querySelectorAll('a[data-hx-nav]').forEach(function (a) { a.classList.remove('on'); }); }

  function inject() {
    Object.keys(VIEWS).forEach(function (key) {
      if (document.querySelector('a[data-hx-nav="' + key + '"]')) return;
      var v = VIEWS[key], grp = document.querySelector('.grp[data-group="' + v[2] + '"]') || document.querySelector('.grp[data-group*="' + v[2].slice(0, 4) + '"]');
      if (!grp) return;
      var tpl = grp.querySelector('a[data-screen]'); if (!tpl) return;
      var a = tpl.cloneNode(true); a.removeAttribute('routerlinkactive'); a.setAttribute('href', '#' + key); a.setAttribute('data-hx-nav', key); a.removeAttribute('data-screen'); a.classList.remove('on');
      var sv = a.querySelector('svg'); if (sv) { var attrs = [].slice.call(sv.attributes).filter(function (x) { return /^_ngcontent/.test(x.name); }).map(function (x) { return ' ' + x.name + '=""'; }).join(''); sv.innerHTML = ICON[key].replace(/<(path|circle)/g, '<$1' + attrs); }
      var nm = a.querySelector('[data-name]') || a.querySelector('span'); if (nm) nm.textContent = v[0];
      [].slice.call(a.children).forEach(function (ch) { if (ch !== sv && ch !== nm) ch.remove(); });
      var after = v[3] && grp.querySelector('a[data-screen="' + v[3] + '"]');
      var last = grp.querySelectorAll('a'); var ref = after ? after.nextSibling : last[last.length - 1].nextSibling;
      if (key === 'montaj') { var k = grp.querySelector('a[data-hx-nav="kapasite"]'); if (k) ref = k.nextSibling; }
      grp.insertBefore(a, ref);
      if (active === key) a.classList.add('on');
    });
  }

  /* ---------- makine kartlarında OEE göstergeleri ---------- */
  css2 = 'article.line-card.hx-has-oee{grid-template-rows:28px 82px 24px 76px 44px 66px 30px!important}@media (max-width:900px){article.line-card.hx-has-oee{grid-template-rows:none!important}}.hx-oee{display:grid;grid-template-columns:repeat(4,1fr);gap:4px 10px;margin:0;padding:6px 0 0;border-top:1px solid var(--line)}.hx-oee div{min-width:0}.hx-oee small{display:block;font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);font-weight:700;white-space:nowrap}.hx-oee b{font-size:16px;display:block;line-height:1.25}.hx-oee .ok{color:var(--ok)}.hx-oee .warn{color:var(--warn)}.hx-oee .bad{color:var(--bad)}.hx-oee i{display:block;height:4px;border-radius:2px;background:var(--surface-2);overflow:hidden;margin-top:3px}.hx-oee i span{display:block;height:100%;background:currentColor}.hx-oee em{grid-column:1/-1;font-style:normal;font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}';
  var st2 = document.createElement('style'); st2.textContent = css2; document.head.appendChild(st2);
  function hsh(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000; return h; }
  function oeeFor(code, status) {
    var h = hsh(code), iot = /· IoT/.test(LN[code] || '');
    var A = status === 'stopped' ? 52 + h % 18 : status === 'idle' ? 61 + h % 14 : 82 + h % 15;
    var P = 74 + (h >> 3) % 22, Q = 95 + (h >> 5) % 5; var O = Math.round(A * P * Q / 1e4);
    var g = groupsOf((procs.find(function (p) { return p.lines.indexOf(code) >= 0; }) || {}).code || '').find(function (x) { return x.code === code; });
    var rate = Math.max(1, Math.round((g ? g.count : 1) * (iot ? 1.6 : 0.9) * P / 100)), target = Math.max(1, Math.round((g ? g.count : 1) * (iot ? 1.6 : 0.9)));
    return { A: A, P: P, Q: Q, O: O, rate: rate, target: target, iot: iot };
  }
  var tone = function (v, a, b) { return v >= a ? 'ok' : v >= b ? 'warn' : 'bad'; };
  function oeeCards() {
    document.querySelectorAll('article.line-card').forEach(function (card) {
      if (card.querySelector('.hx-oee')) return;
      var code = (card.id || '').replace(/^line-/, ''); if (!code) return;
      var o = oeeFor(code, card.getAttribute('data-status'));
      var cell = function (lab, v, tn) { return '<div><small>' + lab + '</small><b class="' + tn + '">%' + v + '</b><i class="' + tn + '"><span style="width:' + v + '%"></span></i></div>'; };
      var el = document.createElement('div'); el.className = 'hx-oee';
      el.innerHTML = cell('OEE', o.O, tone(o.O, 75, 60)) + cell('Kullanılabilirlik', o.A, tone(o.A, 85, 70)) + cell('Performans', o.P, tone(o.P, 85, 70)) + cell('Kalite', o.Q, tone(o.Q, 98, 95)) +
        '<em>Hız ' + o.rate + ' adet/sa · hedef ' + o.target + ' adet/sa · vardiya başından · ' + (o.iot ? 'makineden (IoT)' : 'operatör beyanından') + '</em>';
      el.classList.add('slot'); var ref = card.querySelector('.stopband') || card.querySelector('.crew'); if (ref) card.insertBefore(el, ref); else card.appendChild(el); card.classList.add('hx-has-oee');
    });
  }
  new MutationObserver(function () { inject(); oeeCards(); }).observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('click', function (ev) {
    var nav = ev.target.closest && ev.target.closest('a[data-hx-nav]');
    if (nav) { ev.preventDefault(); ev.stopPropagation(); open(nav.getAttribute('data-hx-nav')); return; }
    var a = ev.target.closest && ev.target.closest('a[href], button');
    var b = ev.target.closest && ev.target.closest('[data-hx]');
    if (b && host && host.contains(b)) {
      ev.preventDefault(); var x = b.getAttribute('data-x'), k = b.getAttribute('data-hx');
      if (k === 'tab') { S.tab[b.getAttribute('data-k')] = x; }
      else if (k === 'sapIn') { var o = IFS.find(function (s) { return s.no === x; }); o.st = 'MES’e aktarıldı'; toast(x + ' MES’e alındı; Planlama havuzunda.'); }
      else if (k === 'pmDone') { toast('Periyodik bakım kaydedildi.'); PM = PM.filter(function (p) { return p.m + p.task !== x; }); }
      else if (k === 'predOpen') { toast(x + ' için bakım talebi açıldı; Bakım Yönetimi’nde.'); }
      else if (k === 'req') { toast(x + ' için IFS’te satınalma talebi açıldı.'); }
      else if (k === 'faiOk' || k === 'faiNo') { var f = FAI.find(function (y) { return y.id === x; }); f.st = k === 'faiOk' ? 'Onaylandı' : 'Reddedildi'; f.by = 'Özge (Kuika)'; toast(x + (k === 'faiOk' ? ' onaylandı; seri üretim açıldı.' : ' reddedildi; uygunsuzluk açıldı.')); }
      else if (k === 'agAcc' || k === 'agRej') { var g = AGENT.find(function (y) { return y.id === x; }); g.st = k === 'agAcc' ? 'acc' : 'rej'; if (k === 'agAcc') { var mm = g.sug.match(/sorumlu ([^·]+)·\s*(\d+|bugün)/); ACTS.unshift({ id: 'AKS-' + (1101 + ACTS.length), t: g.title, src: 'Ajan önerisi', own: mm ? mm[1].trim() : '-', due: NOW.getTime() + (mm && mm[2] !== 'bugün' ? +mm[2] : 0) * DAY, done: false }); toast('Öneri aksiyona çevrildi.'); } else toast('Öneri reddedildi; gerekçe ajanın öğrenmesi için saklandı.'); }
      else if (k === 'agNote') { var inp = document.getElementById('hx-note'); var v = (inp && inp.value || '').trim(); if (!v) { toast('Önce notu yazın.'); return; } var mc = v.match(/(F6|KMP|F2|ESB|F1|SLN)-[A-Z]{3}(-\d+)?/); AGENT.unshift({ id: 'G' + (AGENT.length + 1), st: 'new', prio: /acil|kritik|yangın|kaza/i.test(v) ? 'Kritik' : 'Orta', area: /bakım|arıza|ısın|titreş|yağ/i.test(v) ? 'Bakım' : /kalite|ölçü|kaynak hata/i.test(v) ? 'Kalite' : 'Üretim', title: v.length > 70 ? v.slice(0, 70) + '…' : v, body: 'Saha notundan oluşturuldu' + (mc ? '; ' + mc[0] + ' tezgâhı kendiliğinden bağlandı.' : '.'), ev: ['Saha notu · ' + fDT(Date.now())], sug: 'Aksiyon · sorumlu ' + (/bakım|arıza|ısın|titreş|yağ/i.test(v) ? 'Bakım Teknisyeni 1' : 'Vardiya şefi') + ' · 1 gün' }); toast('Ajan öneriyi hazırladı.'); }
      else if (k === 'autoTog') { var au = AUTOS.find(function (y) { return y.id === x; }); au.on = !au.on; toast(au.name + (au.on ? ' açıldı.' : ' kapatıldı.')); }
      else if (k === 'newRule') { toast('Yeni otomasyon formu bir sonraki sürümde; şimdilik örnek kurallar düzenlenebilir.'); }
      else if (k === 'linkAct') { ACTS.unshift({ id: 'AKS-' + (1101 + ACTS.length), t: x, src: 'Akıllı otomasyon', own: 'Vardiya şefi', due: NOW.getTime() + DAY, done: false }); var rr = RUNS.find(function (y) { return y.msg === x; }); if (rr) rr.link = ACTS[0].id; toast('Aksiyon açıldı ve olaya bağlandı.'); }
      else if (k === 'actDone') { var ac = ACTS.find(function (y) { return y.id === x; }); ac.done = true; toast(x + ' tamamlandı.'); }
      else if (k === 'chassis') { S.chassis = x; S.tab.mon = 'card'; }
      render(); return;
    }
    if (active && a && !host.contains(a) && a.closest('.grp, header, nav')) close();
  }, true);
  document.addEventListener('change', function (ev) { var e = ev.target; if (host && host.contains(e) && e.getAttribute('data-hx-f')) { S[e.getAttribute('data-hx-f')] = e.value; render(); } });
  window.__hx = { open: open, close: close };
})();
