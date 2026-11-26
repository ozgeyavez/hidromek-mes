# Hidromek MES prototipi

Hidromek için üretim yönetim sistemi (MES) tasarım prototipi. Hidromek'in resmi sistemi değildir; makine grupları Hidromek tezgâh listesinden, iş emirleri, kalite ve bakım kayıtları örnektir. Sunucu yoktur; ürünün istekleri tarayıcıda örnek veriden cevaplanır, yapılan işlemler kalıcı değildir.

Canlı: https://ozgeyavez.github.io/hidromek-mes/

## Kapsam
- Üst çubukta fabrika seçimi: Fabrika 6, Komponent, Fabrika 2, İzmir ESB, Fabrika 1, Silindirhane
- Makinelerim: tezgâh listesindeki türlere göre 66 makine grubu, 924 tezgâh (IoT bağlı ve beyanla çalışan)
- İş istasyonu: işi başlat, duruş, işi bitir, vardiya ekibi, ilk parça kontrol formu, 2 saatlik pano (kamera yok)
- Planlama, vardiya sayı raporu, formlar, uygunsuzluklar, hata analizi, bakım yönetimi, raporlar, ayarlar
- Ek modüller: Kapasite ve IFS iş emirleri, Şasi izlenebilirliği, Kontrol planı ve 8D, Planlı ve kestirimci bakım, Akıllı otomasyonlar ve ajan
- ERP: IFS (iş emri alma, üretim teyidi, stok)

## Yapı
- `src/vendor/`: ürünün derlenmiş ön yüzü
- `src/mock.js`: çevrimdışı çalışma katmanı (sunucu isteklerini örnek veriden cevaplar)
- `src/hidromek.py`: örnek veriyi Hidromek verisine dönüştürür (`src/data/veri.json`)
- `src/ext.js`: Hidromek ek modülleri
- `src/ui-patch.txt`: ekran yazılarının Hidromek terimlerine çevrilmesi
- `src/brand/`: Hidromek logosu ve renkleri
- `docs/`: yayınlanan site (GitHub Pages)

## Derleme
`python3 src/build.py` → `dist/` ve `docs/`
