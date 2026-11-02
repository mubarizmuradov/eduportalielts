# Bilgisayarlı IELTS arayüzü

## Doğrudan gözlem kaydı

2 Kasım 2026'da IELTS.org örnek sayfasının bağladığı Inspera örnekleri tarayıcıda açıldı. Reading single MCQ, Reading multi MCQ, Academic Writing Task 1, Listening harita ve Listening flow-chart görevi incelendi. Tam ücretli sınav oturumu çalıştırılmadı; sınav boyunca bütün özelliklerin aynı olduğunu iddia etmiyoruz.

| Kaynak | Gözlenen durum | Uygulama etkisi |
|---|---|---|
| S30A Reading single | Beyaz sayfa; üst kimlik/bağlantı/menü alanı; açık gri yönerge şeridi; solda pasaj sağda sorular; ortada sürükleme tutamacı | İki bağımsız kaydırılabilen panel; görünür metin ve soru birlikte |
| S30A alt gezinme | Part sekmesi, numaralı butonlar, aktif/yanıtlanmamış durumu, previous/next ve review | Soru numarasıyla odaklanma; renk dışında durum etiketi |
| S30A Options | Contrast, Text size, submission page seçenekleri | Görünüm ayarları ve gönderim erişimi |
| S30B Reading multi | Checkbox; tek blokta 1–2, diğer blokta 3–4; altta da aralıklı gezinme butonları | Her blok bir item, iki numara ve iki ham puan |
| S30C Writing Task 1 | Solda prompt/görsel; sağda otomatik kaydedilen editör; Words sayacı | Metni görselden ayrı sakla; editör ve word count |
| S30D Listening map | Başta Play diyalogu; pause/rewind yasak olduğu bildirimi; harf sütunlu seçim matrisi | İlk kullanıcı jestiyle ses başlatma; sonrasında seek/pause yok |
| S30E Listening flow-chart | Oklarla bağlı içerik, metin içi numaralı boşluklar, seçenek bankası ve Help | Boşluklar chart içinde kalır; bankadan yerleştirme desteği |

Harita örneğinde ses başlatılmadan soru tablosu incelendi; sesin içeriği ve bütün oynatma döngüsü test edilmedi. Hiçbir gerçek öğrenci hesabına giriş yapılmadı; gerçek cevap gönderilmedi. Kaynak soru metinleri bu pakete alınmadı.

## Kaynakla doğrulanan özellikler

[RESMÎ] British Council bilgisayarlı sınav için font/renk/ses ayarı, ekran sayacı, not alma, vurgulama/alt çizme ve sorular arasında gezinmeyi açıklıyor. [S10] Word count ve spell/grammar check bulunmaması ayrı British Council kaynağında belirtiliyor. [S27]

[SINIR] Resmî practice sayfası örneklerin zamanlanmadığını ve timer/highlighting/notes işleyişinde gerçek sınavdan farklar olabileceğini söylüyor. Demo üzerinde timer görülmemesi gerçek sınavda timer yok demek değildir. [S11] İncelenen Inspera sürümünü, ülkelerdeki bütün tarihî IELTS ekranlarının tek değişmez tasarımı sayma.

## Önerilen ekran özellikleri

| Alan | Uygulama şartı |
|---|---|
| Üst bar | EduPortal IELTS kimliği, aday kodu/adı, bağlantı ve kaydetme durumu, bileşen timer'ı, ses/görünüm/help |
| İçerik şeridi | Part, soru aralığı ve bozulmadan görünen yönerge |
| Reading | Solda başlık/paragraflar; sağda grup layout'ları; ayırıcı sürüklenebilir; 60 dakika ortak sayaç |
| Listening | Görev, resim/tablo ve cevaplar; yalnız ses seviyesi; çalma otomatik sırada; konuşma metni gizli |
| Writing | Prompt + görsel/mektup durumu; iki ayrı yanıt; word count; Task 1/2 geçişi; tek 60 dakika |
| Speaking | Canlı veya simülasyon etiketi; kart; hazırlık/konuşma durumu; mikrofon ve upload durumu |
| Alt bar | Part ve numaralı soru konumları; aktif, boş, kısmi, cevaplı; geri/ileri; review |
| Review | Cevapsız sayısı; hangi soruya dönüleceği; gönderim; süre bitince otomatik kilit |

Bunlar [ÖNERİ]dir. Font boyutları/piksel değerleri resmî kural değildir: 16 px ana metin, 1.5 satır aralığı, 50/50 başlangıç panel oranı, düz beyaz/açık gri zemin, net koyu yazı uygun başlangıçtır. Resmî IELTS logosunu veya marka varlıklarını kopyalamak bu kapsamda gerekli değildir.

## Renderer ayrıntıları

- Yönerge ve numara her grupta okunur; boşlukların orijinal yerleri korunur. Büyük blok metin + altına bağımsız bütün kutular listesi tek çözüm olamaz.
- Summary/sentence/note için `{{itemId}}` placeholder'ı gerçek input'a dönüşür; bu alana HTML string veya JavaScript enjekte edilmez.
- Tablo gerçek grid/table'dır; satır/sütun başlıkları korunur. Flow-chart yönlü kenarları saklar; sıralı cümlelere indirgenmez.
- Drag-and-drop ile bankadan seçim sunulabilir; klavye ve click/select alternatifi gerekir. Bu alternatif soru anlamını değiştirmez.
- Görsel `object-fit: contain` ile doğal en-boy oranında gösterilir; normalize koordinatlar resmin iç rect'ine uygulanır, container'a değil. Letterbox boşluklarına göre kaydırma yapma.
- Soru numarası tıklandığında ilgili input'a fokus; bir çoklu item aralığının iki numarası da aynı bloğu açar. Cevap/flag görünüm durumları nottan ayrıdır.
- Vurgular sabit content revision + paragraf kimliği + UTF-16 aralığına bağlanabilir; yeniden boyutlandırmada koordinata bağlı highlight kullanma.
- Notes ve highlight sınav cevabı değildir; doğruluk/kelime sayısına girmez. `flag for review` yardımcı öneridir; bu çalışmada menüden doğrulanmış resmî bir davranış diye sunulmuyor.
- UI dili AZ/TR olabilir; İngilizce sınav pasajları, prompt'lar ve yönergeler otomatik çevrilmez.
- Tarayıcı native spellcheck, autocorrect ve autocapitalize kapatılır. Eklentilerin tamamının teknik olarak engellenebildiğini iddia etme.
- Masaüstü IELTS benzerliği ana hedeftir. Mobilde uyarlanmış akış kullanılabilir, “birebir IELTS masaüstü” diye sunulmaz. Klavye, screen reader ve zoom kontrolleri yapılır.
