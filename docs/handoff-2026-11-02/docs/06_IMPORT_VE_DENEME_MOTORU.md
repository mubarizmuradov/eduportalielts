# JSON import ve sınav yürütme sözleşmesi

Bu dosyanın tamamı [ÖNERİ]dir. Repository entegrasyonu mevcut yapıya göre yapılır.

## Fonksiyon sınırı

```ts
compileIeltsContent(input: unknown, assetResolver: AssetResolver):
  Result<ValidatedIeltsContent, ValidationIssue[]>;

createIeltsMockExam(
  input: unknown,
  context: { authenticatedActorId: string; tenantId: string },
  idempotencyKey: string
): Promise<{ examId: string; revisionId: string; status: 'draft' }>;
```

`compile` AI çağırmaz, ses/görsel üretmez. Bilinmeyen `schemaVersion`, tür veya alanı sessizce yoksaymaz. `context` doğrulanmış sunucu kimliğinden gelir; içerik JSON'u role/tenant/creator seçemez.

## Aşamalar

1. Boyut ve JSON parse sınırı; sürüm kontrolü; strict schema validation.
2. ID tekilliği, referanslar, layout placeholder'ları, seçenekler, anahtar ve puan sayısı gibi semantik kontroller.
3. Asset resolver ile tenant mülkiyeti, MIME sniffing, gerçek boyut/süre ve kullanılabilirlik kontrolü. URL'yi keyfî dış ağdan fetch etme. Öğrenciye storage key değil yetkili signed URL ver.
4. Yönerge/kısıt uyumu ve pedagojik inceleme raporu. Dil modeli metninden “NO MORE THAN” yorumlayarak sessiz düzeltme yapma; düzenlenmesi gereken alanı bildir.
5. Yetki kontrolü; revision/asset/question/answer key kayıtlarını tek transaction içinde oluştur. Başarısızsa kısmi sınav bırakma.
6. Aynı tenant + actor + idempotencyKey + aynı canonical payload için aynı sonuç; farklı payload için conflict. `contentId` tek başına yetki veya idempotency kanıtı değildir.
7. Sonuç daima draft. Yayınlama ayrı açık lifecycle işlemidir; medya hazır, fixture kapalı ve içerik onaylı olmalı.

Hata örneği: `{code:'DUPLICATE_NUMBER', path:'/reading/sections/1/groups/0/items/0/numbers', message:'Reading 14 iki kez kullanılmış.'}`. `path` JSON Pointer; UI'nin alanı bulabilmesi gerekir. “Invalid exam” tek genel hata yeterli değildir.

## İki doğrulama seviyesi

`tools/validate_examples.py` schema + yapısal sözleşmeyi denetler. Gerçek asset resolver, tenant yetkisi, gerçek metin uzunluğu, yönerge uyumu ve pedagojik kaliteyi kanıtlamaz. `--publish` fixture/veri uzunluğu/medya durumu kapılarını ayrıca kontrol eder; gerçek asset byte doğrulamasının yerini almaz.

## Kalıcı varlıklar

| Varlık | Ana bağlar |
|---|---|
| IeltsExam | tenant, creator, draft/published/archived |
| IeltsExamRevision | immutable canonical JSON, schemaVersion, içerik hash'i |
| IeltsAssignment | revision, classIds, açılma/son başlama/son teslim, deneme hakkı, sonuç açıklama politikası |
| IeltsAttempt | assignment, student, revision, durum, component deadlines, cihaz oturum kilidi |
| IeltsAnswer | attempt, item ID, typed value, revision counter, server accepted time |
| IeltsRecording | attempt, part/prompt, gerçek MIME/duration, upload state |
| IeltsGrade | raw, table version, criteria, assessor, provenance, review status |
| IeltsAuditEvent | actor, tenant, event, time, target; ham ses veya cevap anahtarı loglanmaz |

Bu isimler tablo oluşturma zorunluluğu değildir; bağımsız IELTS alan sınırını ifade eder. Auth ve sınıf adapter'ı mevcut EduPortal kimliklerini kullanabilir. Bir soru deposunda mixed type kullanılıyorsa IELTS nesnesini generic quiz cevabına dönüştürmeden ayrım korunur.

## Deneme durumları

`eligible → preflight → in_progress → submitted → grading_pending → graded → released`.
Alternatifler: `technical_issue`, `voided`, `expired`. Void neden, yapan kişi ve audit ile saklanır; sessiz silme yok. `submitted` durumu W/S'nin değerlendirildiği anlamına gelmez.

Preflight: sınıf üyeliği, zaman penceresi, attempt hakkı, desteklenen tarayıcı, bütün gerekli medya, kulaklık/ses testi ve Speaking gerekiyorsa mikrofon kontrolü. Ses testi gerçek kayıt tüketmez. Kullanıcı jesti ve browser autoplay izni sağlanmadan Listening timer başlatılmaz.

## Süre ve ağ davranışı

- Backend başlangıç/deadline otoritesidir; frontend geri sayımı sadece gösterim. Sistem saati değiştirmek veya refresh süre kazandırmaz.
- `sectionStartedAt`, `deadlineAt`, `serverNow` dön; yanıt yazma işlemi sunucuda deadline ve bileşen kilidi kontrolünden geçer.
- Reading ve Writing her biri 3600 saniye. Task geçişi Writing timer'ını sıfırlamaz. Öğrenci 20 dakikadan sonra Task 1'de yazmaya devam edebilir.
- Listening timeline gerçek asset süreleriyle üretilir; dört sesin ardından 120 saniye. Parça başına keyfî “10 dakika” yok.
- Refresh/reconnect Reading/Writing'i saklanan draft ve eski deadline ile açar. Listening yeniden baştan çalmaz.
- Kesintide **açık politika** gerekir: strict sürekli zaman çizgisi ve kaybedilen ses için destek akışı; veya proctor tarafından denetlenmiş duraklatma. Otomatik tekrar dinleme/ek süre verip birebir sınav demek yanlış olur. Kullanıcı ürün kararı vermediyse teknik sorun olarak işaretle ve kontrollü telafi denemesi sağla.
- Aynı öğrenci/atama için izin verilmeyen eşzamanlı deneme atomik olarak engellenir. Geç kalan istemci update'i eski cevabı ezmez.
- Autosave debounce + anlık blur/section transition flush; `clientMutationId` ile tekrar güvenli, monoton revizyon ile sırasız istek koruması. Offline queue ham cevapları kaybetmemeli; sunucu kabul zamanı geçerse otomatik backdate etme.
- Deadline sonrası offline Writing metni varsa kurtarma kaydı olarak yetkili incelemeye alınabilir; gizlice zamanında cevap diye işaretlenmez.
- Auto-submit backend göreviyle tamamlanabilir; tarayıcının açık kalmasına bağlı değildir. Manual submit ve auto-submit yarışında tek kesin sonuç.
- Speaking upload eksikse “başarılı gönderim” gösterme; metin yanıtlar ve upload oturumları ayrı doğrulanır.
