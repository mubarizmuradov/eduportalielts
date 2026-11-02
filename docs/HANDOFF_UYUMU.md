# Araştırma paketiyle uyum (2 Kasım 2026)

`EduPortal_IELTS_Claude_Paketi_2026-11-02.zip` paketi, daha önce ağdan
erişilemeyen kaynakların (ieltsliz.com, ielts.org, IDP, British Council ve
resmî Inspera örnek ekranları) bilgilerini getirdi. Paket
`docs/handoff-2026-11-02/` altına kopyalandı. Örnek JSON'ları test verisi
olarak `backend/test/fixtures/content-1.0.0/` altında duruyor.

Bu belge şunları anlatır:

- paket ile mevcut uygulama arasındaki farkları,
- bu farklar için ne yapıldığını,
- bilerek farklı bırakılan noktaları,
- hâlâ varsayım olan ürün kararlarını.

## 1. İki JSON biçimi, tek sınav motoru

| | IELTS Test Package 1.1 (ana biçim) | ielts-content 1.0.0 (paketin önerisi) |
| --- | --- | --- |
| Belge | [IELTS_PACKAGE_FORMAT.md](IELTS_PACKAGE_FORMAT.md) | `handoff-2026-11-02/docs/05_JSON_SOZLESMESI.md` |
| Şema | `ielts-package.schema.json` | `handoff-2026-11-02/schema/ielts-content.schema.json` |
| Cevaplar | Sorunun yanında | Ayrı `answerKey[]`, `itemId` ile |
| Medya | base64 veya https URL | `storageKey` (asset deposundaki anahtar) |

İkisi de `POST /tests/validate`, `POST /tests/import` ve
`npm run package:validate` ile kabul edilir.

**ielts-content 1.0.0 nasıl işlenir:** `content-v1.ts` önce paketin JSON
Şeması ile sıkı doğrulama yapar. Bilinmeyen alan veya sürüm reddedilir. Sonra
belgeyi 1.1 paketine çevirir ve aynı `buildIeltsExam()` kontrollerinden
geçirir. Hatalar JSON Pointer ile döner, örneğin
`/answerKey/3/itemId: item "L1g1.i1" has no answerKey entry`. Dönüştürme
sonrası bulunan hatalar `converted:` önekiyle gösterilir.

**Çevirmen tahmin yapmaz.** Şu durumların hepsi hatadır:

- anahtarı olmayan item, ya da iki anahtarı olan item;
- yanlış türde anahtar;
- olmayan `{{itemId}}` yer tutucusu;
- kayıtlı olmayan varyant kombinasyonu;
- talimatta yazan kelime sınırının `wordRule` ile çelişmesi;
- yeniden kullanılabilir işaretlenmiş başlıklar.

**Medya:** `assets[].storageKey`, sunucudaki `ASSET_STORAGE_BASE_URL` (https)
adresine göre indirilir. Bu adresin ana makinesi `ASSET_FETCH_ALLOWED_HOSTS`
içinde de olmalıdır. Adres ayarlı değilse paket kontrol edilebilir ama içe
aktarılamaz.

**`fixtureOnly: true` belgeler:** Kontrol edilir, ama asla içe aktarılmaz
(`FIXTURE_ONLY`). `fixture` durumundaki medya yayınlanamaz.

**Neden iki biçim?** 1.1 yapay zekâ için daha kısa yazılır ve medyayı doğrudan
taşır. 1.0.0 ise kendi medya deposu olan bir üretim hattına uygundur. Üretici
ekip hangisini seçerse seçsin aynı sınav çıkar.

## 2. Fark analizi ve yapılanlar

### Soru tipleri ve varyantlar

**Paketteki 46 kayıtlı varyantın her biri 1.1'de karşılanıyor.** Her biri
birim testte dönüştürülüp sınava kuruluyor (`content-v1.spec.ts`).

| Paketteki madde | Önceki durum | Şimdi |
| --- | --- | --- |
| Harita / plan / diyagram, harfli konum (`location_options`) | Harfler görselde basılı olmak zorundaydı | `letterPositions`: harfleri sınav ekranı görselin üstüne çizer. Görsel üretici harf çizmek zorunda değil |
| Harita / plan / diyagram, numaralı boşluk + **seçenek kutusu** | Yoktu | `diagram_label_completion` + `answerMode: "select"` + `visualKind` |
| Harita / plan üzerinde **yazarak** etiketleme | Sadece "diagram" adıyla | `visualKind: map / plan / diagram / pictures` ile doğru talimat |
| Resim seçmeli (pictures) | Yoktu | `multiple_choice` sorusunda `image`, veya `visualKind: "pictures"` |
| Short answer, birden çok cevap (`text_set`) | Yoktu | `numbers` + `answerUnits`. Cevaplar her sırada yazılabilir, en iyi eşleştirme kullanılır, aynı cevap iki kez puan almaz |
| Flow-chart'ta dallanma veya döngü | Sadece düz akış | `flow: { nodes, edges }`; dallar yan yana, geri dönüş oku yazılı |
| "ONE WORD OR A NUMBER" (`words_or_number`) | Sadece AND/OR | `numberRule: "or"` |
| Listening summary (metinli ve bankalı) | Vardı | Değişmedi |
| GT: "Which advert …?" (metinler üzerinden eşleştirme) | Sadece paragraf | Metin etiketleri (`label`) + `scope: "texts"` |
| Liz "Choosing a Title", "List Selection", "Classification" | Karşılığı vardı ama belgede yoktu | Eşleşme tablosu format belgesinde |
| Başlıklar soru sayısından fazla, tekrar yok | Eşit sayı uyarıydı | Hata. Cümle sonları için de aynı |
| Passage sözlükçesi (glossary) | Yoktu | `glossary` metnin altında gösterilir |
| Grup sayısı | Part başına en çok 6 | En çok 8 (paketin örneğinde bir bölümde 7 grup vardı) |

### Writing, Speaking ve yerleşim

| Paketteki madde | Önceki durum | Şimdi |
| --- | --- | --- |
| Academic Task 1'de birden çok görsel, `object_diagram` | Tek görsel | `images` (en çok 3), yeni görsel tipi |
| Task 2 tipleri: outweigh, positive/negative, cause/solution, cause/effect, mixed | 5 tip | 10 tip; sadece etiket, aday sorunun kendisini cevaplar |
| Part 1 / Part 3 soru sayısı sabit değil | Konu başına en az 2 soru, en az 2 konu | En az 1. Olağan dışı sayılar sadece uyarı |
| GT bölüm 1 metin sayısı | Tam 2–3 | 1–5 kabul; 2–3 dışı uyarı |

### Açıklamalar ve sınav akışı

| Paketteki madde | Önceki durum | Şimdi |
| --- | --- | --- |
| Cevap açıklaması (`explanation`), examiner notları | Yoktu | Öğretmen cevap anahtarında görür. Öğrenci açıklamaları sonuç açıklanınca görür. Sınav sırasında hiçbir zaman gönderilmez |
| Speaking: canlı examiner ile recorded simulation ayrımı | Sadece kayıt | Atamada seçilir: onlayn simülasyon (ekranda "simulation" yazar) veya öğretmenle yüz yüze (onlayn oturum Writing'den sonra biter, öğretmen soru kartlarıyla görüşür ve puan girer) |
| Listening öncesi ses testi, kaydı tüketmeden | Yoktu | "Play sound" test tonu ve ses seviyesi, Listening başlamadan önce |
| Autosave: eski yanıt yeni cevabı ezmemeli | Gecikmeli istekler sırasız gelebiliyordu | Kayıt istekleri tek tek gider; bir istek bitmeden sonraki gönderilmez |
| Aynı paketin iki kez yüklenmesi | İki ayrı test oluşuyordu | Aynı akademide aynı içerik `409 DUPLICATE_PACKAGE` döner ve mevcut testin kimliğini verir |
| Atama penceresi | "Bağlanır" alanının anlamı belirsizdi | "Son başlama zamanı" diye açıklandı. Ekranda tahmini oturum süresi gösterilir; o saatten önce başlayan öğrenci tam süresini alır |

## 3. Zaten uyumlu olan noktalar

Bunlar paketin kabul listesiyle karşılaştırıldı; uygulamada zaten vardı.

**Sınav yapısı ve zamanlama**

- Listening 4 × 10 soru, Reading toplam 40 soru, numaralar 1–40 boşluksuz.
- Çoklu seçimde bir item iki numara taşır ve iki puan değerindedir:
  {B,D} → 2, {B,C} → 1, {B} → 1. Fazla seçim arayüzde engellenir.
- Listening'de ses bir kez çalar; durdurma, geri sarma ve hız ayarı yok, ses
  seviyesi var. Dört kayıt sırayla çalar, ardından 120 saniye kontrol süresi
  verilir. Kâğıt sınavın 10 dakikası kullanılmaz.
- Reading ve Writing 60'ar dakika. Writing'de tek ortak süre var; 20/40
  dakikalık bölünme sadece öneridir.
- Süreler sunucuda tutulur. Sayfayı yenilemek veya saati değiştirmek süre
  kazandırmaz. Süre dolunca bölüm sunucu tarafından teslim edilir; terk
  edilmiş bir oturum da eski son süreden devam ederek biter.

**Ekran**

- Reading iki panelli; ayırıcı sürüklenebilir.
- Tablolar gerçek tablo, boşluklar yerinde.
- Bankadan seçmede sürükle-bırak ve klavye/tıklama alternatifi var.
- Yazım denetimi kapalı.
- Kontrast ve yazı boyutu ayarlanabilir.
- Soru numarasıyla gezinme ve Review işareti var.

**Puanlama**

- Yazım düzeltme, kök bulma veya eş anlamlı kabul edilmez; sadece açıkça
  verilen alternatifler kabul edilir.
- Overall band sadece dört bileşen hazır olunca hesaplanır; yuvarlama
  6.25 → 6.5, 6.75 → 7, 6.125 → 6.
- Writing'de Task 2 iki kat ağırlıktadır. Eksik not 0 sayılmaz.
- Ham puan banda doğrusal ölçeklenmez.

**Güvenlik ve yetki**

- Öğrenci görünümünde cevap, açıklama, transkript ve doğru konum eşleşmesi
  yoktur. Bu, testle kontrol edilir.
- Yetki sunucuda kontrol edilir: akademi sahibi (owner), menecer, öğretmen ve
  mentor sadece kendi kapsamındaki sınıflara atama yapabilir; öğrenci sadece
  kendi sınıfının sınavını görür. Bir sınıfa tek atama, öğrenci başına tek
  deneme demektir.
- Yüklenmiş bir test değiştirilemez; yeni JSON yeni bir test oluşturur, açık
  denemeler etkilenmez.

## 4. Bilerek farklı bırakılanlar

**Bant tabloları.** Paket, resmî sayfadaki dört referans noktası dışında
tablo vermiyor ve "tablo yoksa band gösterme" diyor. Uygulamadaki 0–40
tabloları hazırlık kaynaklarının yayımladığı tam tablolardır. Resmî referans
noktalarının hepsine uyduğu test edildi: Listening 16/23/30/35 → 5/6/7/8,
Academic Reading 15/23/30/35 → 5/6/7/8, GT Reading 15/23/30/35 → 4/5/6/7.
Ekranda ve belgede bunun bir tahmin olduğu yazar. Okul başka bir tablo
isterse `band.ts` tek yerdir.

**Cevap normalizasyonu.** Paket noktalama işaretlerinin genel olarak
silinmemesini öneriyor. Uygulama sadece şunları eşit sayar:

- sondaki nokta,
- `1,000 = 1000`,
- `7:30 = 7.30`,
- para birimi işareti (`£50 = 50`).

Bunlar IELTS değerlendirmesinde zaten kabul edilen biçimlerdir. Apostrof ve
tireye dokunulmaz. Artikel atma, tekil/çoğul ve yazım düzeltme yapılmaz.

**Highlight (vurgulama).** Vurgular aynı oturumda kalır. Paketin önerdiği
"paragraf kimliği + karakter aralığı" ile kalıcı saklama yapılmadı; notlar
sınav cevabı değildir.

**Çevrimdışı cevap kuyruğu ve "geç kurtarma kaydı".** Bağlantı koparsa
kaydedilemeyen cevap sayfa açık kaldıkça bellekte tutulur ve 5 saniyede bir
yeniden gönderilir. Sayfa kapanırken `keepalive` ile gönderilir. Süre bittikten sonra gelen cevap
reddedilir; ayrıca bir inceleme kaydı oluşturulmaz.

## 5. Hâlâ varsayım olan ürün kararları

1. **Sınıfa sonradan katılan öğrenci** atamayı görür (canlı üyelik). Atama
   anındaki listeyi sabitlemek (snapshot) istenirse küçük bir değişiklik.
2. **Kesilen Listening.** Ses tekrar baştan çalmaz; sınav saatinin bulunduğu
   yerden devam eder. Telafi gerekirse öğretmen ayrı bir atama verir.
   "Teknik sorun" durumu ve öğretmen kontrollü duraklatma yok.
3. **Speaking simülasyonunda mikrofon izni reddi.** Aday Speaking'e
   başlayamaz ve uyarı görür; sıfır puanlı cevap oluşmaz. Eksik kayıtlar
   öğretmen sayfasında "kayıt yok" olarak görünür.
4. **Deneme hakkı.** Atama başına bir. Yeniden deneme için yeni atama
   gerekir.
5. **İçerik onayı.** Paketin "draft → yayın" adımı yok. Test, kontrolden
   geçince kütüphaneye girer; öğrenciye ulaşması için ayrıca atanması gerekir.
   Önizleme ve cevap anahtarı atamadan önce incelenebilir.
6. **Akademi ADMINISTRATOR ve filial MODERATOR** personel sayılmıyor (önceki
   karar).
7. **"Kahoot gibi giriş".** Sadece EduPortal SSO ile tek tık giriş.
   Kod/link ile katılma yok; sınıf üyeliği atlanamaz.

## 6. Doğrulama

**Backend**

- Birim testler: format, 1.1 alanları, 46 varyant, bozuk belgeler, puanlama,
  bant, sınav akışı, roller.
- Uçtan uca testler, gerçek veritabanıyla:
  - aynı paketi ikinci kez yükleme (409);
  - ielts-content 1.0.0 belgesini kontrol etme ve fixture olduğu için
    reddetme;
  - General Training paketiyle yüz yüze Speaking akışı;
  - puanlama ve açıklamalar.
- Migration şemayla birebir (`prisma migrate diff` boş).

**Frontend**

- Typecheck, lint ve build temiz.

**Tarayıcı**, General Training örneği ile:

- ses testi;
- ONE WORD OR A NUMBER talimatı;
- "Which TWO" için iki kutu;
- resimli soru;
- harfleri sınavın çizdiği harita;
- kutudan sürüklenen plan etiketleri;
- dallanan akış şeması;
- A–D etiketli GT metinleri;
- sözlükçe;
- yüz yüze Speaking bitiş ekranı;
- öğretmenin soru kartları ve açıklamalı cevap kâğıdı;
- 1.0.0 paketinin "geçerli ama kaydedilemez" uyarısı.

Bu kontroller IELTS içerik zorluğunu veya kalibrasyonunu kanıtlamaz. Gerçek
uzunlukta metin ve gerçek seslerle en az bir Academic ve bir GT sınavının
öğretmenlerce denenmesi gerekir.
