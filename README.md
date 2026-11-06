# Hisse Bildirim Sistemi · Nasdaq Sinyal Radarı

Nasdaq hisselerini tarar, **%10–%50 arası hareket eşiğini** aşanları sinyal olarak listeler ve haber manşetlerini
duygu analizinden geçirir. Arayüz Türkçe, koyu "trading terminal" temasındadır. Masaüstü kurulumu yoktur;
tamamı **statik web** olarak GitHub Pages üzerinde çalışır.

- **Canlı panel:** https://cehennemgibiyim.github.io/HisseBildirimSistemi/
- **Depo:** https://github.com/CehennemGibiyim/HisseBildirimSistemi

## Mimari (neden sunucusuz)

GitHub Pages yalnızca statik dosya sunar ve Nasdaq/haber sağlayıcıları tarayıcıdan yapılan isteklere kapalıdır
(CORS). Bu yüzden veri toplama işi tarayıcıdan **GitHub Actions**'a taşındı:

1. `Tarama anlık görüntüsü` iş akışı **5 dakikada bir** çalışır, `scanner.tradingview.com` üzerinden Nasdaq taramasını
   ve Yahoo Finance RSS manşetlerini toplar.
2. Sonuç `data` dalındaki `market.json` dosyasına yazılır (tek commit, kuvvetle güncellenir).
3. Panel bu dosyayı 15 saniyede bir okur, eşik/ölçüt değişimlerini tarayıcıda anında yeniden hesaplar.

Dosyaya ulaşılamazsa depoyla birlikte yayınlanan yedek anlık görüntü (`public/data/market.json`) kullanılır ve panel
bunu "yedek görüntü" uyarısıyla bildirir. Grafik, TradingView'ın gömülebilir widget'ıyla gösterilir.

## Nasıl çalışır

- **Tarama:** Tek istekte tüm Nasdaq hisseleri günlük değişime göre sıralı gelir. Warrant/unit/right/SPAC/ETF
  satırları, 1 $ altı ve 10 mn $ piyasa değeri altı semboller elenir.
- **Sinyal motoru:** Seçilen ölçüte göre eşiği aşanlar sinyal olur.
  - `Günlük değişim` — önceki kapanışa göre
  - `Gün içi dipten` — günün en düşüğüne göre
  - `İzleme başlangıcı` — tarayıcının o gün ilk gördüğü fiyata göre (localStorage, New York günü ile sıfırlanır)
- **Güç skoru (1-99):** eşiği aşma oranı + haber tonu + fiyatın gün aralığındaki konumu.
- **Haber analizi:** Manşetler anahtar kelime sözlüğüyle (İngilizce + Türkçe) -1..1 arası duyguya çevrilir; tazelik
  ağırlıklı ortalama "haber nabzı" olarak gösterilir, sinyal kartına en etkili manşet iliştirilir.
- **Bildirim:** Yeni sinyal eşiği geçtiğinde masaüstü bildirimi + uygulama içi toast; sinyal başına 30 dk bekleme,
  ilk yükleme ve eşik/ölçüt değişimi sessizdir. Sesli uyarı düğmeyle açılır (tarayıcı autoplay kuralı).

## Yerel geliştirme

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run build      # statik çıktı: out/
npm run snapshot   # public/data/market.json dosyasını tazeler
```

Proje sitesi alt dizinde yayınlandığı için derleme `BASE_PATH` ile yapılır:

```bash
BASE_PATH=/HisseBildirimSistemi NEXT_PUBLIC_BASE_PATH=/HisseBildirimSistemi npm run build
```

## Yayınlama

- `main` dalına yapılan her push `Web sürümünü yayınla` iş akışını tetikler: statik derleme → GitHub Pages.
- Pages kaynağı **GitHub Actions** olarak ayarlıdır (Settings → Pages → Source: GitHub Actions).
- Anlık görüntüyü elle tazelemek için Actions → `Tarama anlık görüntüsü` → *Run workflow*.
- GitHub, 60 gün hareket olmayan depoların zamanlanmış iş akışlarını durdurabilir; panel bu durumda yedek görüntüyle
  açılır, akışı geri getirmek için iş akışını bir kez elle çalıştırmak yeterlidir.

## Veri kaynakları

| Amaç | Kaynak | Not |
| --- | --- | --- |
| Nasdaq taraması | TradingView tarayıcı ucu | Actions içinde, anahtar gerektirmez |
| Haber manşetleri | Yahoo Finance RSS | Actions içinde, anahtar gerektirmez |
| Grafik | TradingView widget (iframe) | Tarayıcıda, CORS gerektirmez |

## Sınırlar

- Tarama **5 dakikada bir** tazelenir; fiyatlar anlık değil, son tarama anına aittir (panel bunu gösterir).
- Veriler gecikmeli olabilir ve **yatırım tavsiyesi değildir**.
- Tarayıcı bildirimi yalnızca panel açıkken çalışır; kapalı sekme için sunucu tarafı bir kanal (Telegram/e-posta)
  gerekir.
- Likidite filtresi nedeniyle 1 $ altı mikro kap hisseleri taranmaz.
