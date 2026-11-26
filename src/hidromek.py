"""MCC kayıt verisini Hidromek verisine dönüştürür: python3 src/hidromek.py
Girdi: data/mcc-kayit.json + Tezgah listesi (Excel). Çıktı: data/veri.json
"""
import json, os, re, openpyxl

S = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(S, 'data', 'mcc-kayit.json')))
XL = os.path.join(S, '..', '..', 'Tezgah Listesi (1) (1).xlsx')

# ---- 1. Fabrikalar ve makine grupları (Excel) ----
FACT = [('F6', 'Fabrika 6', 'Fabrika 6'), ('KMP', 'Komponent', 'Komponent'), ('F2', 'Fabrika 2', 'Fabrika 2'),
        ('ESB', 'İzmir ESB', 'ESB'), ('F1', 'Fabrika 1', 'Fabrika 1'), ('SLN', 'Silindirhane', 'Silindirhane')]
TYPES = {  # Excel başlığı → (kod, ad, IoT mu)
    'CNC-NC': ('CNC', 'CNC-NC', True), 'ÜNİVERSAL': ('UNV', 'Üniversal tezgâh', False),
    'BOYAHANE ROBOT': ('BRB', 'Boyahane robotu', True), 'MALZEME BESLEME ROBOT': ('MBR', 'Malzeme besleme robotu', True),
    'ROBOT': ('ROB', 'Robot kaynak', True), 'MANÜEL KAYNAK': ('MKY', 'Manuel kaynak', False),
    'EL İŞÇİLİĞİ TAŞLAMA': ('TSL', 'El işçiliği taşlama', False), 'Isıl İşlem & Fırın': ('ISL', 'Isıl işlem ve fırın', True),
    'BOYAHANE': ('BOY', 'Boyahane', False), 'KUMLAMA': ('KUM', 'Kumlama', False), 'MONTAJ': ('MON', 'Montaj', False),
    'HORTUMHANE': ('HRT', 'Hortumhane', False), 'PLAZMA -LAZER- OKSİJEN- PUNÇ': ('PLZ', 'Plazma · lazer · oksijen · punç', True),
    'Kaynak Ağzı Açma': ('KAG', 'Kaynak ağzı açma', False), 'SİLİNDİR ABKANT BÜKÜM': ('ABK', 'Silindir · abkant büküm', True),
    'MATKAP KILAVUZ': ('MTK', 'Matkap · kılavuz', False), 'TESTERE (ŞERİT VE DAİRE)': ('TST', 'Testere', False),
    'YIKAMA': ('YKM', 'Yıkama', False), 'SÜNGER KESİM': ('SNG', 'Sünger kesim', False), 'H.PRES': ('PRS', 'Hidrolik pres', True)}
ws = openpyxl.load_workbook(XL, data_only=True)['Tezgah Dağılımı']
rows = list(ws.iter_rows(values_only=True))
hdr = [str(h).strip().replace('\n', ' ') if h else '' for h in rows[3]]
xlrow = {str(r[3]).strip(): r for r in rows[4:10] if r[3]}
GROUPS = []  # (fabrika kodu, grup kodu, ad, adet, iot)
for fc, fname, xname in FACT:
    r = xlrow[xname]
    for i in range(4, 24):
        v = r[i]
        if isinstance(v, (int, float)) and v > 0:
            tc, tn, iot = TYPES[hdr[i]]
            GROUPS.append((fc, f'{fc}-{tc}', tn, int(v), iot))
gname = lambda g: f'{g[2]} · {g[3]} tezgâh'

# ---- 2. MCC hatlarının Fabrika 6 gruplarına eşlenmesi (çalışan işler bu gruplarda görünür) ----
MAP = {'B1': 'F6-CNC', 'B2': 'F6-ROB', 'B3': 'F6-MKY', 'B4': 'F6-MON', 'B5': 'F6-ABK'}
G = {g[1]: g for g in GROUPS}
MNAME = {k: gname(G[v]) for k, v in MAP.items()}
SHORT = {k: G[v][2] for k, v in MAP.items()}

TEXT = [  # (eski, yeni) metin değişiklikleri; uzundan kısaya
    ('Kamera konveyörü durdu, bakım çağrıldı', 'Hidrolik basınç düştü, bakım çağrıldı'),
    ('Konveyör bant kontrolü', 'Hidrolik yağ seviyesi kontrolü'), ('Koparma bıçağı kontrolü', 'Spindle yağlama kontrolü'),
    ('Kamera kalibrasyonu', 'Robot TCP kalibrasyonu'), ('Kamera lens temizliği', 'Kaynak torcu temizliği'),
    ('Pakon üretim takip formu', 'Üretim takip formu'), ('Koparma kontrol formu', 'İlk parça kontrol formu'),
    ('Kawahara ayarı', 'CNC programı bekleme'), ('Kamera hatası', 'Takım kırılması'),
    ('Koparma operatörü', 'Operatör'), ('Pakon operatörü', 'Kaynak operatörü'), ('Koparma makinesi', 'Tezgâh'),
    ('Pakon formu ve bitir', 'Form ve bitir'),
    ('Yoğurt kabı 1 kg yan etiket', 'HMK 102B ön yükleyici kolu'), ('Yoğurt kabı 500 g yan etiket', 'HMK 102B ön yükleyici bom kolu'),
    ('Ayran bardağı 250 ml etiketi', 'HMK 102B arka kazıcı kolu'), ('Krem kavanozu 200 ml etiketi', 'HMK 220LC kabin şasesi'),
    ('Dondurma kutusu 1 L kapak etiketi', 'HMK 220LC alt şasi'), ('Dondurma kutusu 500 ml yan etiket', 'HMK 310LC bom'),
    ('Boya kovası 2,5 L etiketi', 'HMK 600 greyder ön aks gövdesi'), ('Margarin kabı 500 g kapak etiketi', 'Hidrolik silindir gövdesi Ø110'),
    ('Deterjan şişesi 3 L etiketi', 'Kova bağlantı pimi'), ('Yoğurt kapağı 75 mm kalıp kesim', 'HMK 370LC kova'),
    ('Şekerleme kutusu 300 g etiketi', 'Şanzıman muhafaza kapağı'),
    ('Süt Ürünleri A.Ş.', 'Kazıcı yükleyici hattı'), ('Dondurma Gıda', 'Ekskavatör hattı'), ('Boya Kimya', 'Greyder hattı'),
    ('Kozmetik Ltd.', 'Komponent · silindirhane'), ('Ev Bakım A.Ş.', 'Yedek parça'), ('Margarin Gıda', 'İhracat yedek parça'),
    ('Injection Molding IML', 'Kaynaklı imalat'), ('Thermoforming IML', 'Talaşlı imalat'), ('Blow Molding IML', 'Boyalı parça'),
    ('SealPPeel IML', 'Sac işleme'), ('NextCycle IML', 'Montaj grubu'),
    ('UltraGloss', 'Kazıcı yükleyici'), ('Matte', 'Ekskavatör'), ('Metallic', 'Greyder'),
    ('LED UV mürekkep', 'Kritik kaynak'), ('UV lak', 'Boya kalınlığı kontrolü'), ('Tekrar iş', 'Revizyon C'),
    ('Renk farkı', 'Gözenek'), ('Leke', 'Çatlak'), ('Karışma', 'Yetersiz nüfuziyet'), ('Kırışıklık', 'Yanma oluğu'),
    ('Kurumama', 'Boya akması'), ('Yolma', 'Ölçü dışı'), ('Yırtık', 'Eğilme'), ('Tonlama', 'Sıçrantı'),
    ('Benek', 'Boya kabarması'), ('Lak bozuğu', 'Kaynak dikiş hatası'), ('Yaldız bozuğu', 'Diş hatası'),
    ('Arka verme / yapışma', 'Montaj eksik parça'), ('Hammadde bozuğu', 'Malzeme hatası'),
    ('Almanya', 'Fabrika 6 sevk alanı'),
    ('Dondurma kutusu 2 L kapak etiketi', 'HMK 145W üst şasi'), ('Boya kovası 15 L etiketi', 'HMK 640MG bıçak dairesi'),
    ('Yumuşatıcı şişesi 1,5 L etiketi', 'HMK 640WL yükleyici kolu'), ('Hazır yemek kabı 400 g etiketi', 'HMK 130CS silindir tamburu'),
    ('Hazır içecek şişesi 330 ml etiketi', 'HMK 220W MH yükseltilmiş kabin şasesi'),
    ('Sakallı desteler kırmızı kasaya ayrıldı.', 'Hatalı parçalar kırmızı kasaya ayrıldı.'), ('Hatalı desteler kırmızı kasaya.', 'Hatalı parçalar kırmızı kasaya.'),
    ('Bir Destede Etiket', 'Sevk Biriminde Adet'), ('Kolide Deste', 'Palette Sevk Birimi'), ('Bir destede etiket', 'Sevk biriminde adet'), ('Kolide deste', 'Palette sevk birimi'),
    ('Koli yeniden sayıldı', 'Parti yeniden sayıldı'), ('Koli hurdaya ayrıldı', 'Parça hurdaya ayrıldı'), ('Karışan etiketler ayıklandı', 'Hatalı parçalar ayıklandı'),
    ('C. Mixup', 'Ölçü dışı'), ('P. Mixup', 'Görsel hata'),
    ('mcc-demo', 'hmk-demo'), ('mcc-korsini', 'hidromek'), ('MCC', 'Hidromek'), ('Korsini', 'Hidromek'), ('KORSINI', 'HIDROMEK'),
    ('Pakon Operatörü', 'Kaynak Operatörü'), ('Pakon operatörü', 'Kaynak operatörü'), ('MCC Demo', 'Hidromek Demo'), ('paketleme', 'kaynak'),
    ('Bitirde:', 'Bitirirken:'), ('Bitirme kuralları', 'Bitirme kuralları'),
    ('Tezgâh 01 kontrol formu', 'İlk parça kontrol formu'),
    ('Tezgâh 01 operatörü işi başlatmadan önce doldurur. Başlatma kuralları: hat temizliğinin beş sorusu Evet, OÖK#3 onaylı, ürün hatası işaretlendiyse açıklama yazılmış.', 'Operatör işi başlatmadan önce doldurur. Başlatma kuralları: başlangıç kontrolünün beş sorusu Evet, ilk parça ölçümü onaylı, hata işaretlendiyse açıklama yazılmış.'),
    ('"title":"Tezgâh 01"', '"title":"Tezgâh ve program"'), ('Tezgâh 01 şekli', 'Program kaynağı'),
    ('"label":"Manuel"', '"label":"Tezgâhta yazıldı"'), ('"label":"Kawahara"', '"label":"CAM / DNC"'),
    ('Dosya kokteyl miktarı', 'Teknik resim revizyonu'), ('"unit":"tasarım"', '"unit":"rev."'),
    ('Hat temizlik kontrolü', 'İş başlangıç kontrolü'),
    ('Önceki işe ait tüm dokümanlar (iş emirleri, raporlar, ürün takip adetleri) kaldırıldı mı?', 'Teknik resim ve revizyon IFS iş emriyle aynı mı?'),
    ('Hammadde, film, yarı mamul, mamul ve yardımcı malzemeler kaldırıldı mı?', 'Malzeme, ürün ağacındaki (IFS) kodla uyumlu mu?'),
    ('Makine ve çevresi hurdalardan temizlendi mi?', 'Önceki işin parçaları ve hurdası tezgâhtan kaldırıldı mı?'),
    ('Ambalaj malzemeleri kaldırıldı mı?', 'Takım, aparat ve fikstür kontrol edildi mi?'),
    ('Malzeme sıkışabilecek yerler dahil makinenin temizliği kontrol edildi mi?', 'İş güvenliği ekipmanları ve koruyucular yerinde mi?'),
    ('OÖK#4 karışma kontrolü', 'Başlangıç kontrolü'), ('OÖK#4', 'İlk parça'), ('OÖK#3', 'İlk parça ölçümü'),
    ('Kontrol masası önceki işe ait tüm adet ve kağıtlardan temizlendi.', 'Tezgâh önceki işin parçalarından ve dokümanlarından temizlendi.'),
    ('Deste sayımı', 'Adet teyidi'), ('deste sayımı', 'adet teyidi'), ('"title":"Sevkiyat"', '"title":"Sevk"'),
    ('Koli sayısı', 'Sepet / palet sayısı'), ('"unit":"koli"', '"unit":"sepet"'),
    ('Siparişin %98 kuralı ve gövde ambalaj reçetesinin değerleri iş emrinden gelir, bu formda değildir.', 'Planlanan miktar ve rota IFS iş emrinden gelir, bu formda değildir.'),
    ('Ürün kontrolü', 'İlk parça kontrolü'), ('Görülen ürün hataları', 'İlk parçada görülen hatalar'),
]

def conv(txt):
    for k in sorted(MNAME, key=len, reverse=True):
        n = k[1]
        txt = txt.replace(f'Bitirme-{n} · Koparma tableti', f'{SHORT[k]} · Tezgâh 01 tableti')
        txt = txt.replace(f'Bitirme-{n} · Pakon tableti', f'{SHORT[k]} · Tezgâh 02 tableti')
        txt = txt.replace(f'Bitirme-{n} · Pakon kamerası', f'{SHORT[k]} · ölçüm')
        txt = txt.replace(f'Pakon (K-{n})', 'Tezgâh 02').replace(f'Pakon masa K-{n}', 'Fabrika 6')
        txt = txt.replace(f'Bitirme-{n}', MNAME[k])
    txt = txt.replace('"Koparma"', '"Tezgâh 01"').replace('Koparma', 'Tezgâh 01')
    for a, b in TEXT: txt = txt.replace(a, b)
    def code(m):
        b, suf = m.group(1), m.group(2) or ''
        base = MAP[b]
        if suf == '-KOP': return base + '-01'
        if suf == '-PAK': return base + '-02'
        return base + suf
    txt = re.sub(r'(?<![A-Za-z0-9])(B[1-5])(-KOP|-PAK|-CAM)?(?![0-9])', code, txt)
    txt = txt.replace('"etiket"', '"adet"').replace(' etiket', ' adet').replace('Paketleme · Pakon', 'Fabrika 6')
    txt = txt.replace('PAKON', 'F6')
    txt = re.sub(r'SOB26-00(\d{4})', lambda m: 'IFS-450001' + m.group(1), txt)
    txt = re.sub(r'(?<![A-Za-z0-9-])([BCDHIMP]|K)(\d{5,7})(?![0-9-])', lambda m: 'HMK-' + m.group(2), txt)
    txt = re.sub(r'(?<![A-Za-z0-9-])F(\d{5})(?![0-9-])', lambda m: 'HMK-' + m.group(1), txt)
    return txt

OUT = {}
for k, v in D.items():
    nk = conv(k)
    nv = dict(v); nv['r'] = conv(v['r']) if v['r'] else v['r']
    OUT[nk] = nv

def setr(key, obj):
    for k in [k for k in OUT if k == key or k.startswith(key + '?')]:
        OUT[k]['r'] = json.dumps(obj, ensure_ascii=False)
    if key not in OUT and not any(k.startswith(key + '?') for k in OUT):
        OUT[key] = {'s': 200, 'ct': 'application/json', 'r': json.dumps(obj, ensure_ascii=False)}

# ---- 3. Yapısal cevaplar ----
REASONS = [{'code': 'ARIZA', 'name': 'Arıza', 'planned': False}, {'code': 'AYAR', 'name': 'Ayar / takım değişimi', 'planned': False},
           {'code': 'KAMERA', 'name': 'Takım kırılması', 'planned': False}, {'code': 'KAWAHARA', 'name': 'CNC programı bekleme', 'planned': False},
           {'code': 'MALZEME', 'name': 'Malzeme bekleme', 'planned': False}, {'code': 'OPERATOR', 'name': 'Operatör yok', 'planned': False},
           {'code': 'KALITE', 'name': 'Kalite onayı bekleme', 'planned': False}, {'code': 'BAKIM', 'name': 'Planlı bakım', 'planned': True}]
cells = lambda g: [{'code': f'{g[1]}-{i:02d}', 'lineCode': g[1], 'name': f'{g[1]}-{i:02d}'} for i in range(1, g[3] + 1)]
lines_list = json.loads(OUT['GET /api/lines']['r'])
downs = {l['code']: l['downtime'] for l in lines_list['lines']}
setr('GET /api/processes', [{'code': fc, 'name': fname, 'state': 'active', 'lines': [g[1] for g in GROUPS if g[0] == fc],
                            'equipment': [g[1] for g in GROUPS if g[0] == fc] + [c['code'] for g in GROUPS if g[0] == fc for c in cells(g)]}
                           for fc, fname, _ in FACT])
setr('GET /api/lines', {'position': lines_list.get('position'), 'lines': [{'code': g[1], 'name': gname(g), 'downtime': downs.get(g[1])} for g in GROUPS],
                        'workCells': [c for g in GROUPS for c in cells(g)], 'reasons': REASONS})
places = [{'code': g[1], 'name': gname(g), 'state': 'active', 'workCells': [{'code': c['code'], 'name': c['name'], 'state': 'active',
           'stations': [{'code': c['code'] + '-T', 'name': f"{g[2]} · {c['name']} tableti", 'state': 'active'}]} for c in cells(g)]} for g in GROUPS]
setr('GET /api/definitions/places', places)
eq = {e['code']: e for e in json.loads(OUT['GET /api/planning/equipment']['r'])}
setr('GET /api/planning/equipment', [dict(eq.get(g[1], {'runningJobs': 0, 'firstInQueue': True, 'startForms': ['form-181', 'form-180'], 'crewPresent': True}),
                                          code=g[1], concurrencyLimit=g[3]) for g in GROUPS])
# hat detayları: kayıtlı beş grup dışındakiler için şablon
for g in GROUPS:
    key = f'GET /api/lines/{g[1]}'
    if key in OUT:
        o = json.loads(OUT[key]['r']); o['line']['name'] = gname(g); o['workCells'] = cells(g); o['reasons'] = REASONS
        OUT[key]['r'] = json.dumps(o, ensure_ascii=False)
for k in [k for k in OUT if k.startswith('GET /api/definitions/downtime-reasons')]:
    OUT[k]['r'] = json.dumps([dict(r, state='active', opensMaintenance=(r['code'] == 'ARIZA')) for r in REASONS], ensure_ascii=False)
# vardiya sayı raporu ve rapor makine listeleri
for k in [k for k in OUT if '/api/reports/plant/finishing' in k]:
    o = json.loads(OUT[k]['r']); o['codes'] = []
    OUT[k]['r'] = json.dumps(o, ensure_ascii=False)
# marka
OUT['GET /api/brand']['r'] = json.dumps({'name': 'Hidromek MES', 'site': 'Türkiye', 'logo': '/brand/logo.svg', 'logoDark': '/brand/logo-dark.svg'}, ensure_ascii=False)
# oturum: kamera ekranları kapalı
s = json.loads(OUT['GET /api/session']['r'])
s['screens'] = [x for x in s['screens'] if x != 'inspection']
s['commands'] = [c for c in s['commands'] if 'camera' not in c and 'review-box' not in c]
s['name'] = 'Özge (Kuika)'
for k in [k for k in OUT if k.endswith('/api/session')]: OUT[k]['r'] = json.dumps(s, ensure_ascii=False)
# kameralar boş
for k in [k for k in OUT if k.startswith('GET /api/cameras')]:
    OUT[k]['r'] = '[]' if k == 'GET /api/cameras' else OUT[k]['r']


# ---- 4. Miktarlar parça ölçeğine (etiket adedi → parça adedi) ----
QKEYS = {'quantity', 'doneQuantity', 'labels', 'prod', 'target', 'slotTarget', 'packed', 'ordered', 'balance', 'remaining'}
def scale(o):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in QKEYS and isinstance(v, (int, float)) and v >= 1000: o[k] = max(1, round(v / 1000))
            elif k == 'unreviewed' and isinstance(v, (int, float)): o[k] = 0
            else: scale(v)
    elif isinstance(o, list):
        for v in o: scale(v)
for k, v in OUT.items():
    if v['r'] and v['r'][:1] in '[{':
        try: o = json.loads(v['r'])
        except Exception: continue
        scale(o); v['r'] = json.dumps(o, ensure_ascii=False)
# ---- 5. Atama listesi: bütün gruplar ----
for k in [k for k in OUT if k.startswith('GET /api/planning/dispatch')]:
    d = json.loads(OUT[k]['r']); have = {l['code']: l for l in d['lists']}
    tpl = have.get('F6-ROB')
    new = []
    for g in GROUPS:
        l = dict(have[g[1]]) if g[1] in have else dict(tpl, code=g[1], running=[], queue=[], runningJobs=0)
        l['concurrencyLimit'] = g[3]; l['workstation'] = dict(l.get('workstation') or {}, place=dict((f[0], f[1]) for f in FACT)[g[0]], slotTarget=g[3] * 6)
        new.append(l)
    d['lists'] = new; OUT[k]['r'] = json.dumps(d, ensure_ascii=False)

# ---- 6. Ürün ailesi model kodundan ----
def family(name):
    n = name or ''
    for pat, fam in [('220W MH', 'Özel uygulama ekskavatörü'), ('102B', 'Kazıcı yükleyici'), ('102S', 'Kazıcı yükleyici'), ('145W', 'Lastikli ekskavatör'), ('220W', 'Lastikli ekskavatör'),
                     ('LC', 'Paletli ekskavatör'), ('MG', 'Motor greyder'), ('600 greyder', 'Motor greyder'), ('640WL', 'Lastikli yükleyici'), ('130CS', 'Toprak silindiri')]:
        if pat in n: return fam
    return 'Komponent'
def fam_walk(o):
    if isinstance(o, dict):
        nm = o.get('productName') or (o.get('name') if 'enhancement' in o else None)
        if 'enhancement' in o and nm: o['enhancement'] = family(nm)
        for v in o.values(): fam_walk(v)
    elif isinstance(o, list):
        for v in o: fam_walk(v)
for k, v in OUT.items():
    if v['r'] and v['r'][:1] in '[{':
        try: o = json.loads(v['r'])
        except Exception: continue
        fam_walk(o)
        if isinstance(o, dict) and 'enhancements' in o: o['enhancements'] = ['Kazıcı yükleyici', 'Lastikli ekskavatör', 'Paletli ekskavatör', 'Özel uygulama ekskavatörü', 'Motor greyder', 'Lastikli yükleyici', 'Toprak silindiri', 'Komponent']
        v['r'] = json.dumps(o, ensure_ascii=False)

# ---- 7. Bütün makine gruplarını iş emirleriyle doldurma ----
import random, datetime
random.seed(26)
today = datetime.date(2026, 11, 26)
PARTS_BY = {
 'CNC': ['HMK 220LC bom pim yuvası işleme', 'HMK 102B ön aks mil yatağı', 'HMK 600MG ön aks gövdesi işleme', 'Hidrolik silindir kapağı Ø110', 'HMK 310LC arm burç yuvası'],
 'UNV': ['Kova bağlantı pimi', 'Burç Ø80', 'Pim kilit plakası'], 'ROB': ['HMK 102B arka kazıcı kolu kaynağı', 'HMK 220LC bom kaynağı', 'HMK 145W üst şasi kaynağı', 'HMK 640WL yükleyici kolu kaynağı', 'HMK 370LC arm kaynağı'],
 'MKY': ['HMK 220LC alt şasi kaynağı', 'HMK 640MG bıçak dairesi kaynağı', 'HMK 130CS ön şasi kaynağı', 'Kabin şasesi tamir kaynağı'],
 'BRB': ['HMK 102B ana şasi boyası', 'HMK 220LC bom boyası', 'HMK 600MG şasi boyası'], 'BOY': ['Kabin boyası', 'Rötuş boyası'], 'MBR': ['Sac parça besleme · HMK 145W'],
 'TSL': ['Kaynak dikişi taşlama · HMK 220LC bom', 'Çapak alma · alt şasi'], 'ISL': ['Pim ıslahı · Ø80', 'Gerilim giderme · bom'], 'KUM': ['Bom kumlama', 'Şasi kumlama'],
 'MON': ['HMK 102B kazıcı yükleyici montajı', 'HMK 220LC paletli ekskavatör montajı', 'HMK 600MG motor greyder montajı', 'HMK 640WL lastikli yükleyici montajı'],
 'HRT': ['Hidrolik hortum seti · HMK 102B', 'Hidrolik hortum seti · HMK 220LC'], 'PLZ': ['Sac kesim · HMK 220LC alt şasi', 'Sac kesim · HMK 102B kol', 'Lazer kesim · kabin parçaları'],
 'KAG': ['Kaynak ağzı açma · bom levhaları'], 'ABK': ['Abkant büküm · kabin panelleri', 'Silindir büküm · tambur sacı'], 'MTK': ['Delik delme · bağlantı plakası'],
 'TST': ['Profil kesim · korkuluk', 'Boru kesim · hidrolik hat'], 'YKM': ['Parça yıkama · şanzıman gövdesi'], 'SNG': ['Kabin süngeri kesimi'], 'PRS': ['Burç presleme · bom', 'Rulman presleme · aks']}
TECH = {'CNC': 'Talaşlı imalat', 'UNV': 'Talaşlı imalat', 'ROB': 'Kaynaklı imalat', 'MKY': 'Kaynaklı imalat', 'TSL': 'Kaynaklı imalat', 'KAG': 'Kaynaklı imalat', 'BRB': 'Boyalı parça', 'BOY': 'Boyalı parça', 'KUM': 'Boyalı parça',
        'MON': 'Montaj grubu', 'HRT': 'Montaj grubu', 'PLZ': 'Sac işleme', 'ABK': 'Sac işleme', 'MTK': 'Talaşlı imalat', 'TST': 'Sac işleme', 'PRS': 'Montaj grubu', 'ISL': 'Isıl işlem', 'YKM': 'Montaj grubu', 'SNG': 'Montaj grubu', 'MBR': 'Sac işleme'}
LINEFOR = {'F6': 'Fabrika 6 kazıcı yükleyici hattı', 'KMP': 'Komponent üretimi', 'F2': 'Fabrika 2 ekskavatör hattı', 'ESB': 'İzmir ESB montaj', 'F1': 'Fabrika 1 greyder hattı', 'SLN': 'Silindirhane'}
disp = json.loads(OUT['GET /api/planning/dispatch']['r'])
tpl_job = dict(disp['lists'][0]['running'][0])
tpl_det = json.loads(OUT['GET /api/job-orders/154261']['r'])
mapped = set(MAP.values()); num = 154400; NEW = []; down = {}
for l in disp['lists']:
    code = l['code']
    if code in mapped: continue
    fc, t = code.split('-')
    g = G[code]
    nrun = 0 if random.random() < 0.18 else min(g[3], random.choice([1, 1, 2, 3]))
    nq = random.choice([0, 1, 2, 2, 3])
    l['running'], l['queue'] = [], []
    for i in range(nrun + nq):
        num += 1; prod = random.choice(PARTS_BY.get(t, ['Genel parça']))
        q = random.choice([4, 6, 8, 10, 12, 16, 20, 24, 30, 40]) if t not in ('MON', 'ESB') else random.choice([2, 3, 4, 6])
        run = i < nrun
        due = today + datetime.timedelta(days=random.choice([-1, 0, 0, 1, 1, 2, 3, 4]))
        j = dict(tpl_job, number=str(num), salesOrder='IFS-45000' + str(14000 + num % 1000), customer=LINEFOR[fc], article='HMK-' + str(7100000 + num * 7 % 899999),
                 productName=prod, quantity=q, doneQuantity=(random.randint(0, q - 1) if run else 0), unit='adet', dueDate=str(due),
                 state='started' if run else 'assigned', startedAt=('2026-11-26T0%d:%02d:00+00:00' % (random.randint(5, 9), random.randint(0, 59))) if run else None,
                 technology=TECH.get(t, 'Talaşlı imalat'), enhancement=family(prod))
        (l['running'] if run else l['queue']).append(j); NEW.append((code, j))
    l['runningJobs'] = nrun
    if random.random() < 0.08: down[code] = random.choice(['ARIZA', 'MALZEME', 'AYAR'])
OUT['GET /api/planning/dispatch']['r'] = json.dumps(disp, ensure_ascii=False)
RN = {r['code']: r['name'] for r in REASONS}
for code, j in NEW:
    det = dict(tpl_det, number=j['number'], salesOrder=j['salesOrder'], customer=j['customer'], article=j['article'], productName=j['productName'], quantity=j['quantity'],
               doneQuantity=j['doneQuantity'], dueDate=j['dueDate'], state=j['state'], equipment=code, startedAt=j['startedAt'], technology=j['technology'], enhancement=j['enhancement'], customerNote=None,
               attributes=[{'key': 'workplace', 'name': 'İş yeri', 'value': code.split('-')[0]}, {'key': 'deliveryPlace', 'name': 'Teslim yeri', 'value': LINEFOR[code.split('-')[0]]}])
    OUT['GET /api/job-orders/' + j['number']] = {'s': 200, 'ct': 'application/json', 'r': json.dumps(det, ensure_ascii=False)}
    OUT['GET /api/job-orders/' + j['number'] + '/nonconformities'] = {'s': 200, 'ct': 'application/json', 'r': '[]'}
# iş emirleri listesi
for k in [k for k in OUT if k.startswith('GET /api/job-orders?page=')]:
    o = json.loads(OUT[k]['r']); rt = o['rows'][0] if o.get('rows') else None
    if rt:
        extra = [dict(rt, **{kk: vv for kk, vv in json.loads(OUT['GET /api/job-orders/' + j['number']]['r']).items() if kk in rt}) for _, j in NEW]
        o['rows'] = o['rows'] + extra; o['total'] = len(o['rows']); o['pageSize'] = max(o.get('pageSize', 10), 10)
        OUT[k]['r'] = json.dumps(o, ensure_ascii=False)
# hat detayları ve duruşlar
lj = json.loads(OUT['GET /api/lines']['r'])
for ln in lj['lines']:
    if ln['code'] in down:
        rc = down[ln['code']]; ln['downtime'] = {'id': 'dt-' + ln['code'], 'reasonCode': rc, 'reasonName': RN[rc], 'planned': False, 'startedAt': '2026-11-26T09:%02d:00+00:00' % random.randint(0, 50), 'note': None}
OUT['GET /api/lines']['r'] = json.dumps(lj, ensure_ascii=False)
for ln in lj['lines']:
    k = 'GET /api/lines/' + ln['code']
    if k not in OUT or ln['code'] in down:
        OUT[k] = {'s': 200, 'ct': 'application/json', 'r': json.dumps({'position': lj.get('position'), 'line': ln, 'workCells': [c for c in lj['workCells'] if c['lineCode'] == ln['code']], 'reasons': REASONS, 'today': []}, ensure_ascii=False)}
print('doldurma:', len(NEW), 'yeni iş emri ·', len(down), 'duruşta grup')

# ---- 8. Vardiya ekipleri (operatörler) ----
random.seed(41)
NAMES = ['Hasan Tekin', 'Mehmet Yılmaz', 'Ali Kaya', 'Can Toprak', 'Zeynep Arslan', 'Ayşe Koç', 'Fatma Demir', 'Elif Şahin', 'Murat Çelik', 'Emre Aydın', 'Burak Öztürk', 'Serkan Polat',
         'Hakan Yıldız', 'Gökhan Kılıç', 'Onur Aksoy', 'Volkan Erdem', 'Cem Kurt', 'Okan Bulut', 'Tolga Aslan', 'Selin Uçar', 'Deniz Kaplan', 'Kemal Tunç', 'Yusuf Doğan', 'Ramazan Er',
         'İbrahim Güneş', 'Mustafa Ateş', 'Sinan Bozkurt', 'Erkan Sarı', 'Barış Yalçın', 'Umut Karaca', 'Levent Çakır', 'Taner Özkan', 'Fikret Acar', 'Orhan Uslu', 'Sedat Ekinci', 'Veli Turan']
ROLE = {'ROB': 'Robot kaynak operatörü', 'MKY': 'Kaynakçı', 'CNC': 'CNC operatörü', 'UNV': 'Tezgâh operatörü', 'MON': 'Montaj operatörü', 'BOY': 'Boyacı', 'BRB': 'Boya robot operatörü', 'PLZ': 'Kesim operatörü', 'ABK': 'Büküm operatörü', 'PRS': 'Pres operatörü'}
lj = json.loads(OUT['GET /api/lines']['r'])
cells_by = {}
for c in lj['workCells']: cells_by.setdefault(c['lineCode'], []).append(c)
shift = json.loads(OUT['GET /api/crew']['r'])['shift']
present_all, inshift_all, stations_all, people = [], [], [], {}
pid = 100
for g in GROUPS:
    code = g[1]; t = code.split('-')[1]
    n = 0 if code in down else min(g[3], random.choice([1, 2, 2, 3, 3, 4]))
    st = [{'code': c['code'] + '-T', 'name': f"{g[2]} · {c['name']} tableti", 'workCellName': c['name'], 'lineCode': code} for c in cells_by.get(code, [])[:max(n, 2)]]
    stations_all += st
    for i in range(n):
        pid += 1; nm = NAMES[(pid * 7) % len(NAMES)]; pidc = 'op-%d' % pid
        people[pidc] = {'id': pidc, 'name': nm, 'roleName': ROLE.get(t, 'Operatör')}
        since = '2026-11-26T08:%02d:00+00:00' % random.randint(0, 25)
        present_all.append({'personId': pidc, 'name': nm, 'station': st[i], 'since': since})
        inshift_all.append({'personId': pidc, 'name': nm, 'station': st[i], 'seconds': random.randint(5400, 9000), 'present': True})
for k in [k for k in OUT if k.startswith('GET /api/crew') and not k.startswith('GET /api/crew/')]:
    o = json.loads(OUT[k]['r']); m = re.search(r'line=([A-Z0-9]+-[A-Z]{3})', k)
    keep = (lambda x: x['station']['lineCode'] == m.group(1)) if m else (lambda x: True)
    o['stations'] = [x for x in stations_all if (not m or x['lineCode'] == m.group(1))]
    o['present'] = [x for x in present_all if keep(x)]; o['inShift'] = [x for x in inshift_all if keep(x)]
    OUT[k]['r'] = json.dumps(o, ensure_ascii=False)
for g in GROUPS:
    k = 'GET /api/crew?line=' + g[1]
    if k not in OUT:
        o = {'at': '2026-11-26T09:00:00+00:00', 'shift': shift, 'stations': [x for x in stations_all if x['lineCode'] == g[1]],
             'present': [x for x in present_all if x['station']['lineCode'] == g[1]], 'inShift': [x for x in inshift_all if x['station']['lineCode'] == g[1]]}
        OUT[k] = {'s': 200, 'ct': 'application/json', 'r': json.dumps(o, ensure_ascii=False)}
pp = json.loads(OUT['GET /api/crew/people']['r']); OUT['GET /api/crew/people']['r'] = json.dumps(pp + list(people.values()), ensure_ascii=False)
print('vardiya ekibi:', len(present_all), 'operatör')

# ---- 9. Tek vardiya: Gündüz vardiyası 08:00–18:00 ----
def one_shift(o):
    if isinstance(o, dict):
        if o.get('name') in ('1. Vardiya',): o['name'] = 'Gündüz vardiyası'
        for k in ('end',):
            if isinstance(o.get(k), str) and o.get('position') == 1 and o[k].endswith('T16:00:00+00:00'): o[k] = o[k].replace('T16:00:00', 'T18:00:00')
        if 'shiftProd' in o and isinstance(o['shiftProd'], list): o['shiftProd'] = [sum(x for x in o['shiftProd'] if isinstance(x, (int, float)))]
        if o.get('foundShift') in (2, 3): o['foundShift'] = 1
        for k, v in list(o.items()):
            if k == 'shifts' and isinstance(v, list) and v and isinstance(v[0], dict) and ('position' in v[0] or 'number' in v[0]):
                o[k] = [x for x in v if (x.get('position') or x.get('number')) == 1]
                for x in o[k]:
                    if x.get('name') == '1. Vardiya': x['name'] = 'Gündüz vardiyası'
                    if isinstance(x.get('end'), str): x['end'] = x['end'].replace('T00:00:00', 'T18:00:00').replace('T16:00:00', 'T18:00:00')
            else: one_shift(v)
    elif isinstance(o, list):
        for v in o: one_shift(v)
for k, v in OUT.items():
    if v['r'] and v['r'][:1] in '[{':
        try: o = json.loads(v['r'])
        except Exception: continue
        one_shift(o); v['r'] = json.dumps(o, ensure_ascii=False).replace('2. Vardiya', 'Gündüz vardiyası').replace('3. Vardiya', 'Gündüz vardiyası')
json.dump(OUT, open(os.path.join(S, 'data', 'veri.json'), 'w'), ensure_ascii=False)
json.dump({'groups': GROUPS, 'reasons': REASONS, 'map': MAP}, open(os.path.join(S, 'data', 'yapi.json'), 'w'), ensure_ascii=False)
print('veri.json:', len(OUT), 'cevap ·', len(GROUPS), 'makine grubu ·', sum(g[3] for g in GROUPS), 'tezgâh')
left = [w for w in ['Bitirme', 'Pakon', 'Koparma', 'Süt Ürünleri', 'IML', 'SOB26'] if any(w in v['r'] for v in OUT.values() if v['r'])]
print('kalan MCC izleri:', left)
