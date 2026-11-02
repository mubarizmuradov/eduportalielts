# Yetkiler ve sınıfa atama

Bu dosyanın tamamı [ÖNERİ]dir; kullanıcı isteğinin EduPortal tarafını tanımlar.

## Rol matrisi

| İşlem | Teacher | Mentor | Manager | Owner | Student |
|---|---|---|---|---|---|
| Sınav draft oluşturma | Yetkili tenant | Yetkili tenant | Kendi tenant'ı | Kendi tenant'ı | Hayır |
| Sınıfa atama | İzinli sınıfları | İzinli sınıfları | Yetki alanındaki sınıflar | Kendi tenant sınıfları | Hayır |
| Anahtar/transkript okuma | İçerik yetkisi varsa | İçerik yetkisi varsa | İçerik yetkisi varsa | Kendi tenant'ı | Aktif denemede hayır |
| Öğrenci denemesini çözme | Öğretmen preview ayrı | Preview ayrı | Preview ayrı | Preview ayrı | Kendi ataması |
| Değerlendirme | Ayrı grading yetkisi | Ayrı grading yetkisi | Ayrı grading yetkisi | Yetkilendirme politikası | Hayır |
| Sonuç görme | İzinli öğrenciler | İzinli öğrenciler | Yetki alanı | Kendi tenant'ı | Yalnız kendi sonucu, yayın politikasına göre |

Kullanıcı dört rolün sınav oluşturmasını açıkça istedi. Bu, herhangi bir tenant'taki herhangi bir sınıfa erişim yetkisi vermez. Rol metinleri mevcut backend enum'larına adapter ile eşlenir; `owner` yazımı kullanılır. Öğretmenin aynı isimli rol iddiası istemciden alınmaz.

## Atama

`assignIeltsExam(revisionId, classIds, policy, actorContext)` tüm sınıfları sunucuda doğrular. `policy`: açılma, son başlama, son teslim anı, attempt sayısı, Speaking modu/oturumu, sonuç ve cevap açıklama zamanı. Tarihler ISO UTC; kullanıcıya tenant saat diliminde gösterilir. Pencere mevcut tam süreyi karşılamıyorsa son başlayabileceği zamanı hesapla veya öğretmene açık uyarı ver; 60 dakikalık görevi fark ettirmeden 12 dakikada kesme.

Önerilen varsayılan: atama anında sınıf öğrenci listesi snapshot'ı; sonradan eklenenler için açık senkronizasyon. Alternatif canlı üyelik politikası da mümkündür, fakat başlangıçta sabitlenmeli. Sınıftan çıkarılan öğrenci, başlamış deneme ve geçmiş sonuç için açık politika gerekir. Bir öğrenci iki atanmış sınıftaysa aynı assignment üzerinde çift deneme hakkı oluşmaz.

## Katılım ve giriş

Kahoot benzeri kod/link katılımı mevcut repository akışına göre adapte edilir. Kod tek başına sınıf üyeliğinin yerine geçmez. Auth sonrası assignment yetkisi denetlenir. Public random guest katılımı otomatik eklenmez. Preview sayısal puan istatistiklerini, attempt haklarını veya gerçek öğrenci sonuçlarını kirletmez.

## Bilgi sınırı

Student DTO explicit allowlist ile üretilir; tam JSON'u yayıp birkaç alan silmek yeterli değildir. Öğrenciye şunlar gönderilmez: `answerKey`, transkriptler, evidence/explanation, model essay, examiner notes ve sesin private materyal metadatası. Görselde görünmesi gereken A–H konum koordinatları public olabilir; item→doğru konum eşleşmesi private'dır. Anahtar kaynak image alt metninde, filename'de veya hidden DOM'da da bulunmamalı.

Asset URL yetkili denemeye bağlanır ve süreli olabilir; content revision immutable asset key ve hash'i tutar. JSON içinde keyfî dış URL yerine güvenli nesne anahtarı kullanılır. Aynı key başka tenant'a aitse importer reddeder. Upload dosyası MIME/byte ve ölçü kontrolleri yapılır; SVG script, dış referans veya HTML ise sanitize edilmeden render edilmez.

Medya üreticisi JSON'una `tenantId`, SQL, HTML, role, permission veya endpoint ekleyemez. Importer allowlist ve `additionalProperties:false` uygular. Öğrencinin post ettiği item ID sadece denemenin sabit revision'ında varsa kabul edilir. Gönderim sonrası answer update reddedilir. Sınıf/tenant değiştirerek başka öğrencinin attemptId'sini okumayı engelleyen kontroller endpoint başına yapılır.
