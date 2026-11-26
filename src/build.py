"""Ürünü çevrimdışı çalışan paket olarak derler: python3 src/build.py
Çıktı: dist/ (index.html + main.js + mock katmanı + veri + stiller)."""
import os, json, shutil, re
S = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(S, '..', 'dist')
shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
V = os.path.join(S, 'vendor')
shutil.copytree(os.path.join(V, 'fonts'), os.path.join(OUT, 'fonts'))
shutil.copytree(os.path.join(S, 'brand'), os.path.join(OUT, 'brand'))
shutil.copy(os.path.join(V, 'favicon.png'), OUT)
css = open(os.path.join(V, 'styles.css')).read().replace('url(/fonts/', 'url(fonts/')
open(os.path.join(OUT, 'styles.css'), 'w').write(css)
# Hidromek'te koli yok, palet var: görünen metinlerde koli -> palet (anahtar/değişken adlarına dokunmaz)
SUF = {'': '', 'ler': 'ler', 'lerde': 'lerde', 'lerdeki': 'lerdeki', 'lerin': 'lerin', 'leri': 'leri', 'de': 'te', 'nin': 'in', 'yi': 'i', 'ye': 'e', 'si': 'i', 'dan': 'ten'}
_kw = re.compile(r'(?<![\w{.\-])([Kk])oli(' + '|'.join(sorted([k for k in SUF if k], key=len, reverse=True)) + r')?(?![\w}\-:])')
def koli_fix(t):
    def lit(m):
        x = m.group(0)
        if ' ' not in x and not x[1:2].isupper(): return x
        return _kw.sub(lambda k: ('P' if k.group(1) == 'K' else 'p') + 'alet' + SUF[k.group(2) or ''], x)
    return re.sub(r'`[^`]*`', lit, t)
PATCH = [l.split('|||') for l in open(os.path.join(S, 'ui-patch.txt'), encoding='utf8').read().splitlines() if '|||' in l]
hits = {}
for src, dst in [('main.js', 'main-CMN2A4ZL.js')] + [(f, f) for f in os.listdir(V) if f.startswith('chunk-') and f.endswith('.js')]:
    t = open(os.path.join(V, src), encoding='utf8').read()
    for a, b2 in PATCH:
        n = t.count(a)
        if n: hits[a] = hits.get(a, 0) + n; t = t.replace(a, b2)
    t = koli_fix(t)
    open(os.path.join(OUT, dst), 'w', encoding='utf8').write(t)
miss = [a for a, _ in PATCH if a not in hits]
print('arayüz yaması:', sum(hits.values()), 'değişiklik', '· bulunamayan:', miss)
shutil.copy(os.path.join(S, 'mock.js'), os.path.join(OUT, 'mock.js'))
shutil.copy(os.path.join(S, 'ext.js'), os.path.join(OUT, 'ext.js'))
data = json.load(open(os.path.join(S, 'data', 'veri.json' if os.path.exists(os.path.join(S, 'data', 'veri.json')) else 'mcc-kayit.json')))
# marka logosu göreli yoldan
for k, v in data.items():
    if k == 'GET /api/brand':
        b = json.loads(v['r']); b['logo'] = 'brand/logo.svg'; b['site'] = 'Birlikte Daha Güçlüyüz'; b['logoDark'] = 'brand/logo-dark.svg'; v['r'] = json.dumps(b, ensure_ascii=False)
lines = json.loads(data['GET /api/lines']['r'])['lines']
known = sorted({c for k in data for c in re.findall(r'(?:F6|KMP|F2|ESB|F1|SLN)-[A-Z]{3}', k)})
extra_js = 'window.__TEMPLATE_LINE="F6-ROB";window.__KNOWN_LINES=' + json.dumps(known) + ';window.__LINE_NAMES=' + json.dumps({l['code']: l['name'] for l in lines}, ensure_ascii=False) + ';'
open(os.path.join(OUT, 'data.js'), 'w').write('window.__MOCK=' + json.dumps(data, ensure_ascii=False) + ';' + extra_js)
extra = os.path.join(S, 'handlers.js')
if os.path.exists(extra): shutil.copy(extra, os.path.join(OUT, 'handlers.js'))
h = open(os.path.join(V, 'index.orig.html')).read()
h = h.replace('<base href="/">', '<script>document.write(\'<base href="\'+location.pathname.replace(/[^/]*$/,\'\')+\'">\')</script>')
h = re.sub(r'<link rel="preload"[^>]*>', '', h).replace('<title>Kuika - Intelligent Systems</title>', '<title>Hidromek MES</title>')
import time as _t; VER = str(int(_t.time()))
h = h.replace('href="/brand/brand.css"', 'href="brand/brand.css?v=' + VER + '"').replace('styles-RCQEQ2P5.css', 'styles.css')
shim = '<style>[data-tab="camera"],[data-tab-panel="camera"],a[href*="tab=camera"],a[href*="camera-codes"]{display:none!important}</style><script src="data.js?v=' + VER + '"></script>' + ('<script src="handlers.js"></script>' if os.path.exists(extra) else '') + '<script src="mock.js?v=' + VER + '"></script>'
h = h.replace('<script src="main-CMN2A4ZL.js" type="module">', shim + '<script src="ext.js?v=' + VER + '" defer></script><script src="main-CMN2A4ZL.js" type="module">')
h = h.replace('url(/fonts/', 'url(fonts/')
# Önbellek: JS dosya adlarına içerik özeti eklenir (tarayıcı eski sürümü tutamaz)
import hashlib
jsf = sorted(f for f in os.listdir(OUT) if f.endswith('.js') and (f.startswith('chunk-') or f.startswith('main-')))
HS = hashlib.md5(b''.join(open(os.path.join(OUT, f), 'rb').read() for f in jsf)).hexdigest()[:8]
REN = {f: f[:-3] + '.' + HS + '.js' for f in jsf}
rx = re.compile('|'.join(re.escape(f) for f in jsf))
for f in jsf:
    t = open(os.path.join(OUT, f), encoding='utf8').read(); t = rx.sub(lambda m: REN[m.group(0)], t)
    open(os.path.join(OUT, REN[f]), 'w', encoding='utf8').write(t); os.remove(os.path.join(OUT, f))
h = rx.sub(lambda m: REN[m.group(0)], h)
open(os.path.join(OUT, 'index.html'), 'w').write(h)
open(os.path.join(OUT, 'app.html'), 'w').write(h)
# GitHub Pages: docs/ (alt yolda yayın, derin bağlantı için 404.html)
D2 = os.path.join(S, '..', 'docs'); shutil.rmtree(D2, ignore_errors=True); shutil.copytree(OUT, D2)
for f in ['app.html']:
    if os.path.exists(os.path.join(D2, f)): os.remove(os.path.join(D2, f))
pg = open(os.path.join(D2, 'index.html')).read()
open(os.path.join(D2, '404.html'), 'w').write(pg.replace("location.pathname.replace(/[^/]*$/,'')", "(location.pathname.indexOf('/hidromek-mes/')===0?'/hidromek-mes/':location.pathname.replace(/[^/]*$/,''))"))
open(os.path.join(D2, '.nojekyll'), 'w').write('')
print('dist ve docs hazır:', len(os.listdir(OUT)), 'dosya')
