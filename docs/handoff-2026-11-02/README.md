# EduPortal IELTS Claude geliştirme paketi

Araştırma tarihi: 2 Kasım 2026. Dil: Türkçe; sınav içeriği ve sözleşme alanları İngilizce.

Bu paket, internete erişemeyen Claude'un `eduportalielts` uygulamasını kontrol edip tamamlayabilmesi için hazırlanmıştır. Kaynak açıklamaları çevrimdışı okunabilir. Kaynak sitelerinin tamamının kopyası veya hazır bir IELTS soru bankası değildir. Resmî soru metinleri, görselleri ve sesleri yeniden dağıtılmamıştır. Örnekler bu paket için yazılmış küçük yazılım test verileridir.

**İlk açılacak dosya: `CLAUDE_ILE_BASLA.md`.** Bu dosyayı Claude'a ver; ardından ZIP'in tamamını erişimine aç.

## Paketin kapsamı

- Academic ve General Training için soru ailesi eşleştirmeleri, varyantlar ve sınav kuralları.
- IELTS Liz ve resmî kaynaklardan çıkarılan bilgiler; kaynak kimlikleri ve erişim durumları.
- Resmî Inspera örneklerinden doğrudan incelenen Reading, Writing ve Listening harita ekranlarının gözlem notları.
- Önerilen sürümlü JSON Schema; her nesnenin anlamı, iki tam yapısal örnek ve varyant örnekleri.
- JSON'u sınava dönüştürme, rol ve sınıfa atama, aday denemesi, zamanlama ve puanlama sözleşmesi.
- Şema ve çapraz alan doğrulama aracı, negatif testler ve kabul kontrol listesi.

**Mevcut repository okunmadı ve değiştirilmedi.** Bu paket mevcut Claude kodunun denetimi için bir referanstır; mevcut veri modeli veya Kahoot giriş akışı hakkında yapılmış bir keşif değildir. Şema bir IELTS kuruluşunun yayınladığı veri standardı değil, bu proje için önerilen teknik standarttır.

## Okuma sırası

1. `CLAUDE_ILE_BASLA.md`
2. `docs/01_SINAV_YAPISI.md`
3. `docs/02_SORU_TIPLERI.md` ve `schema/type-registry.json`
4. `docs/03_WRITING_SPEAKING.md`
5. `docs/04_ARAYUZ_VE_GOZLEM.md`
6. `docs/05_JSON_SOZLESMESI.md` ve `schema/ielts-content.schema.json`
7. `docs/06_IMPORT_VE_DENEME_MOTORU.md`
8. `docs/07_PUANLAMA.md`, `docs/08_ROLLER_VE_SINIFLAR.md`
9. `docs/09_KABUL_TESTLERI.md`, `docs/10_BELIRSIZLIKLER.md`
10. `sources/KAYNAKLAR.md`, `sources/source-cards.md`

## Test verilerinin sınırı

`examples/academic-structure.json` ve `general-training-structure.json`, 40 Listening ve 40 Reading puan konumunu, 2 Writing görevini ve 3 Speaking bölümünü taşır. **Gerçek uzunlukta pasaj, gerçek dinleme kaydı veya yayınlanabilir sınav değildir.** `fixtureOnly=true`; medya nesneleri `fixture` durumundadır. Yayına izin verilmez. Bunları hazır sınav diye öğrenciye atama.

`examples/group-variants.json`, bütün kayıtlı objektif soru varyantlarını; `writing-variants.json` bütün kayıtlı Writing etiketlerini gösterir. Soru türleri bir gerçek sınavda aynı anda bulunmak zorunda değildir.

## Yerel kontrol

Python 3 ve `jsonschema>=4.18` gereklidir. Üretimde yeni bağımlılık kurmadan önce repository'nin mevcut doğrulama kütüphanesini kullan.

```sh
python tools/validate_examples.py
python tools/validate_examples.py --self-test
```

Çıktı: `qa/validation-report.json`. Çalıştırma sonuçları orada kayıtlıdır. Bu kontroller renderer'ın görsel kalitesini, gerçek sesin uzunluğunu veya IELTS soru kalibrasyonunu kanıtlamaz.

## Kanıt etiketleri

- **[RESMÎ]**: IELTS veya ortaklarının açıklaması.
- **[LIZ]**: IELTS Liz'in öğretim amaçlı sınıflandırması.
- **[GÖZLEM]**: Resmî siteden bağlantı verilen örnek uygulamada doğrudan görülen davranış.
- **[ÖNERİ]**: EduPortal için mühendislik veya ürün kararı; resmî IELTS kuralı değildir.
- **[SINIR]**: Bu çalışmada kesinleştirilemeyen veya kapsam dışı konu.

Bu etiketler özellikle önemlidir: sınıfa atama, öğretmen rolleri, idempotency, yeniden bağlanma ve JSON alan adları IELTS kuralları değil, EduPortal uygulama tasarımıdır.
