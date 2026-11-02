# Önerilen JSON veri sözleşmesi v1

Bu dosyanın tamamı [ÖNERİ]dir. Standart `schema/ielts-content.schema.json`, Draft 2020-12 kullanır. Şema kendi içinde taşınabilir; internetten `$ref` indirmez. Discriminated union'lar `oneOf` ile tanımlıdır. JSON Schema çapraz nesne ilişkilerini tek başına doğrulamaz; `tools/validate_examples.py` ve üretimdeki semantik doğrulama da gereklidir.

## Temel ayrım

Bir exam içerik revision'ıdır. `assignment`, `classId`, `studentId`, kullanıcı rolü, tarihler, öğrenci cevapları veya tenant içeriğin içine gömülmez. Aynı immutable revision birkaç sınıfa atanabilir; her öğrenci için ayrı attempt oluşur.

| Alan | Anlam |
|---|---|
| `schemaVersion` | Bu paket için `1.0.0`; bilinmeyen sürüm reddedilir |
| `contentId` | Üreticinin içerik kimliği; DB yetkisi/tenant anlamına gelmez |
| `testType` | `academic` / `general_training` |
| `language`, `deliveryProfile` | Sırasıyla `en`, `computer` |
| `fixtureOnly` | true ise asla yayınlama |
| `assets[]` | Görsel/ses nesneleri; gerçek medyayı üretmez |
| `listening.parts[]` | Tam 4, sıralı, her biri 10 numaralı puan |
| `reading.sections[]` | Tam 3; her birinde bir veya birkaç `passages[]` |
| `writing.tasks[]` | Task 1 ve Task 2; testType ile uyumlu |
| `speaking` | 3 bölümün prompt/kart verisi ve yürütme modu |
| `answerKey[]` | Objektif item başına bir private puan anahtarı |
| `examinerMaterials` | Private transkript ve öğretmen notları |
| `scoring` | Onaylı tablo/politika kimlikleri; null olabilir, null ise band yayınlanmaz |

## Asset

Her asset `id`, `kind`, `storageKey`, `mimeType`, `byteLength`, `status` taşır. Image için `width/height`; audio için `durationMs`. `ready` yalnız metinde yazmasıyla doğrulanmış olmaz; güvenilir asset resolver gerçek byte'ları ve tenant sahipliğini kontrol eder. Süresi dolan signed URL canonical JSON'da saklanmaz. Aynı asset ID'nin içeriği değiştirilmez; yeni asset ve revision oluşturulur.

Bu şema inline base64 kabul etmez. İleride checksum eklenecekse sürümlü biçimde bütün taraflarda desteklenir. `fixtures/no-publish/...` yolları bu ZIP'te gerçek dosyaya karşılık gelmez.

## Group ve item

Group alanları: `id`, `variantId`, `taskType`, tam `instructions`, `sourceRefs`, `optionReuse`, `options`, `items`, `layout`. `variantId` kayıtlı bir kombinasyondur; renderer desteklemiyorsa hata, generic soruya fallback yok.

`item` alanları: `id`, `numbers[]`, `prompt`, `response`; gerektiğinde `targetRef`. Birden fazla numara yalnız `choice_many` veya sırasız `text_set` item'da kullanılır. `numbers:[7,8]` iki puan konumudur. Her skill kendi 1..40 numarasını taşır; item ID'leri bütün içerikte benzersizdir.

Seçenek `id` stabil anahtar, `label` görünen A/i vb., `text` görünen içeriktir. Reading paragraph choice için `sourceRef` referansı kullanılır. Heading item `targetRef` ile hedef paragraf/section'a bağlanır; `prompt` hedefi öğrenciye anlaşılır biçimde gösterir. Grubun `sourceRefs` listesi sadece bulunduğu Reading section içindeki passage/paragraf ID'lerine gider.

## Response ve private key

| `response.kind` | Öğrenci değeri | Private anahtar | Puan |
|---|---|---|---|
| `choice_one` | Tek `optionId` veya boş | `acceptedOptionId` | 0/1 |
| `choice_many` | Tekrarsız `optionIds[]`, en çok `selectionCount` | `acceptedOptionIds[]` | Küme kesişimi; numara sayısı kadar |
| `judgement` | İlgili enum değeri veya boş | `value` | 0/1 |
| `text` | Ham metin | Açık `accepted[]` varyantları | 0/1, kısıtlar geçerliyse |
| `text_set` | Sırasız birkaç metin slot'u | `answerUnits[].accepted[]` | Bir unit en çok bir eşleşme; numara sayısı kadar |

Anahtarların hepsi açıklama taşır; bu açıklama öğrenciye ancak sonuç açıklama politikasında gösterilir. Anahtar, item cevabının türüyle aynı kind'a sahip olmalı. Bir item'a iki key veya hiç key olması hata. Writing ve Speaking'e `answerKey` eklenmez; kriter değerlendirmesi ayrı grade kaydındadır.

Yanıt API örnekleri `examples/answer-payloads.json` içinde. Bunlar content şemasının alanları değildir. API boş yanıtı ayrıca temsil etmeli; invalid option değerini boş yanıt sayıp sessizce kabul etmemeli. İstemcinin gönderdiği `score`, `correct`, `tenantId` veya `timeRemaining` asla otorite değildir.

## Layout'lar

| `layout.kind` | Alanlar | Cevap alanını bulma |
|---|---|---|
| `list` | Ek alan yok | Item prompt'unun altında |
| `matching` | Ek alan yok | Item prompt + bankadan seçim/matris |
| `form/note/summary/sentence` | `blocks[]` | `{{itemId}}` placeholder'ı |
| `table` | `columns[]`, `rows[][]` | Hücrede `{{itemId}}` |
| `flow_chart` | `nodes[{id,body}]`, `edges[{from,to}]` | Node body içinde `{{itemId}}` |
| `visual`, blank_targets | `assetId`, `visualKind`, `targets[]` | `itemId,x,y,width,height` |
| `visual`, location_options | `assetId`, `visualKind`, `locations[]` | `optionId,x,y`; item seçim matrisi ayrı |

Koordinatlar 0..1, görselin sol üstünden başlar. Width/height pozitif, kutunun tamamı 0..1 sınırları içinde olmalı. Her item'ın bir target'ı; her visible option'ın bir location'ı olur. Yönerge ve seçenek etiketleri koordinattan üretilmez.

Placeholder her item için tam bir kez geçer. `{{unknown}}`, kayıp item ve yanlış yazılmış placeholder hata. Flow edge mevcut node'a gitmeli; table satırları column sayısıyla eşleşmeli. Akış şeması döngü içerebilir; süreç döngüsü diye otomatik reddetme. Görsel/video gibi keyfî zengin HTML kabul edilmez; gerekirse ileride güvenli text run modeli eklenir.

## Sürümleme ve kaynak tipler

TypeScript union tipleri veya Zod şeması oluşturulacaksa bu JSON Schema ile anlamı eş tutulmalı. Sadece `type: string` ve her şey optional bir interface yazmak doğru değildir. Şema `additionalProperties:false` kullanır; yeni alan için sürüm/adaptör gerekir.

Fixture validasyonu ile içerik onayı ayrı kapılardır. Bu ZIP'in 46 objektif varyantı, 46 resmî IELTS ailesi anlamına gelmez; bir resmî aile için layout/cevap varyantlarının ayrılmasıdır. 21 Writing örneği de pedagojik etiket/şekil örneğidir; her birinin prompt'u o etikete özel tamamlanmış gerçek sınav değildir.
