# Writing ve Speaking standardı

## Writing

[RESMÎ] İki görev zorunludur. Task 1 için en az 150, Task 2 için en az 250 kelime; toplam 60 dakika. Task 2 ağırlığı Task 1'in iki katıdır. [S06, S07]

[ÖNERİ] Minimum kelime bir input `minLength` kuralı değildir. Öğrenci az yazdıysa gönderim engellenmez; yanıt saklanır ve değerlendirmede dikkate alınır. Fazla kelime yazmaya yapay üst limit veya otomatik sabit puan kesintisi koyma. `minWords` sınav yönergesini, `recommendedSeconds` zaman tavsiyesini ifade eder. Tek Writing deadline kullan.

### Academic Task 1

[RESMÎ/LIZ] Görsel bilgiden rapor: grafik, tablo, harita, süreç veya diyagram; birden fazla görsel bir arada gelebilir. [S06, S18, S21]

| `visualType` | Verilmesi gereken içerik | Renderer davranışı |
|---|---|---|
| `line_chart` | Eksenler, birim, dönem, seriler | Görsel veya güvenilir hazırlanmış grafik |
| `bar_chart` | Kategoriler, birimler, seri açıklaması | Grup/yığılma anlamını koru |
| `pie_chart` | Dilimler, birim, dönem | Birden çok pasta olabilir |
| `table` | Başlıklar, satırlar, sayılar ve birimler | Erişilebilir tablo veya net görsel |
| `process` | Başlangıç/son, aşamalar ve oklar | Doğal döngü veya üretim süreci |
| `map` | Yer, tarih/dönem veya planlar | Önce/sonra gibi karşılaştırmalar |
| `object_diagram` | Parçalar veya işleyiş | Açıklanması istenen nesne/sistem |
| `mixed` | İki veya daha çok görsel | Aynı göreve bağlı görsel dizisi |

Bunlar [ÖNERİ] içerik etiketleridir; sekiz ayrı resmî Writing sınav bölümü değildir. `visualAssetIds[]`, `prompt`, `directives[]` ve minimum kelime saklanır. Görseli üreten pipeline kapsam dışıdır; teslim edilen görselin okunurluğu ve prompt ile tutarlılığı yayından önce kontrol edilir. Grafik verisi ayrıca varsa sonradan görüntüye uydurulmaz; tek içerik kaynağıyla eşleştirilir.

### General Training Task 1

[RESMÎ] Duruma göre mektup; personal/semi-formal/formal ton; üç içerik maddesi. [S07]

[ÖNERİ] `register=personal|semi_formal|formal`, `recipient`, `scenario`, tam üç `bulletPoints` ve gerekiyorsa `opening` kullan. Amaç etiketleri `request`, `complaint`, `apology`, `invitation`, `thanks`, `advice`, `application`, `information`, `mixed` olabilir; bunlar kapalı resmî tür listesi değildir. Mektup ve essay aynı editörü kullanır ama prompt yapıları farklıdır. Öğrencinin adres yazması için zorunlu alan ekleme.

### Task 2

[RESMÎ] IELTS'in prompt açıklaması opinion, discussion, multipart, advantages/disadvantages, positive/negative ve cause/solution gibi biçimleri ele alır. Kalıba değil gerçek sorunun bütün taleplerine cevap verilmelidir. [S20] [LIZ] Liz'in sayfası benzer öğretim başlıkları kullanır. [S16]

| `essayTags` örneği | Kaybolmaması gereken talep |
|---|---|
| `opinion` | Görüş ve destek; “to what extent” varsa derecesi |
| `discussion` | İki görüş; ayrıca isteniyorsa kendi görüşü |
| `advantages_disadvantages` | Her iki yön |
| `outweigh` | Hangisinin ağır bastığına karar |
| `positive_negative` | Gelişmenin değerlendirilmesi |
| `cause_solution` | Sebep ve çözüm |
| `cause_effect` | Sebep ve sonuç |
| `problem_solution` | Sorun ve çözüm |
| `multi_part` | Birden fazla doğrudan soru |
| `mixed` | Birkaç talebin birleşimi |

[ÖNERİ] `essayTags[]` çoklu etiket olabilir; `directives[]` gerçek talep cümlelerini korur. Yeni bir prompt kategorisini desteklemek için essay editor değişmez. Kesin ve sonsuz “bütün essay soru türleri” enum'u varmış gibi davranma.

## Speaking

[RESMÎ] İnsan examiner ile görüşme ve kayıt; P1 tanışma/gündelik konular 4–5 dakika; P2 kart, 1 dakika hazırlık, 1–2 dakika konuşma ve kısa takip, toplam 3–4 dakika; P3 aynı konu etrafında daha soyut tartışma 4–5 dakika. [S08, S17]

[ÖNERİ] Sözleşme:

- `part1`: konu grupları; her birinde stabil ID ve examiner prompt metni. Soru sayısı sabit resmî sayı olarak zorlanmaz.
- `part2`: `topic`, `bulletPoints[]`, `finalPrompt`, `preparationSeconds=60`, `maxTalkSeconds=120`, `roundingQuestions[]`.
- `part3`: `linkedPart2Topic`, `questions[]`; karşılaştırma, gerekçe, geçmiş/gelecek, sonuç, değerlendirme gibi etiketler isteğe bağlıdır.
- Her prompt için önceden üretilmiş `audioAssetId` verilebilir. Bu dinleme parçası değildir; soru sesi ayrı varlıktır.

İki yürütme modu ayrılır:

| Mod | Kullanım | Sonuç |
|---|---|---|
| `live_examiner` | Hoca sorar, devam sorusunu ve süreyi yönetir | İnsan examiner'lı deneme |
| `recorded_simulation` | Önceden verilmiş sorular çalınır, mikrofonla yanıt kaydedilir | Asenkron Speaking simülasyonu; gerçek etkileşimle birebir değildir |

İkinci modu ürün ekranında açık adlandır; “resmî Speaking ile birebir” iddiası kurma. Kayıt/medya üretim AI'ı bu işin dışındadır. Canlı görüşme altyapısı repository'de yoksa varmış gibi kabul etme; bir adapter ve desteklenmeyen durum hatası tanımla.

Öğrenci kartı görünürken not tutabilir; hazırlık sonunda konuşma kaydına geçilir. Kayıtlar `attemptId`, part ve prompt kimliğine bağlanır. Mikrofon izni reddi sessiz/sıfır notlu cevap üretmez; `technical_issue` olur. Tarayıcı MediaRecorder formatına göre gerçek MIME ve süre saklanır; dosya uzantısına bakarak güvenme. Segment upload ve eksik kayıt tespiti gerekir. Bir konuşma içindeki parçaları ayrı ayrı band verip ortalamaya zorlamak yerine değerlendirmeyi bütün performansa göre sakla.
