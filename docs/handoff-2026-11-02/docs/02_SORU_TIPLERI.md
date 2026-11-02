# Objektif soru tipleri ve varyantları

Bu katalog, soru türünü **hangi becerinin ölçüldüğünden**, cevap türünü **öğrencinin ne kaydettiğinden**, layout'u **sorunun nasıl çizildiğinden** ayırır. Örneğin aynı Summary Completion görevi serbest metin veya kelime bankasından seçim kullanabilir. `taskType`, `response.kind` ve `layout.kind` üçü birden saklanır. Alan adları [ÖNERİ]; aile eşleştirmeleri kaynak temellidir.

## Listening kapsamı

[RESMÎ] Ana format sayfası altı aile listeler. Resmî örnek sayfası ve IDP, completion ailesinin summary biçimini de açıkça gösterir. [S03, S11, S26]

| Resmî aile | `taskType` | Cevap ve layout | Kritik ayrıntı |
|---|---|---|---|
| Multiple choice | `multiple_choice` | `choice_one` / `choice_many`; `list` | Single genellikle 3 seçenek; multi daha uzun liste; multi için ayrı numaralı puanlar |
| Matching | `matching` | `choice_one`; `matching` | Ortak seçenek bankası; yeniden kullanım yönergeye göre |
| Plan/map/diagram labelling | `visual_labelling` | `choice_one` veya `text`; `visual` | `visualKind=plan/map/diagram/pictures`; resimde cevap veya seçenek konumları |
| Form/note/table/flow-chart completion | `completion` | `text` veya `choice_one`; `form/note/table/flow_chart/summary` | Her boşluk numaralı item; yapı ve metin korunmalı |
| Sentence completion | `sentence_completion` | `text`; `sentence` | Boşluk cümle içine yerleştirilir |
| Short-answer questions | `short_answer` | `text` veya `text_set`; `list` | İki/üç yanıt istenebilir; puan konumlarını doğru say |

[RESMÎ] Haritada doğrudan kayıttaki kelimeyi yazma ile bir listeden seçim yapma varyantları IDP'de açıklanır. [S25] [GÖZLEM] İncelenen resmî örnekte yer isimleri satırlarda, A–H konumları sütunlarda bir seçim matrisi vardı; resim üstü giriş kutusuna indirgenemez. [S30D]

[ÖNERİ] `visual.arrangement` iki değer alır:

- `blank_targets`: görselde numaralı boşluklar; her `target.itemId` cevap girişinin konumudur. Metin veya seçenek bankasıyla cevap verilir.
- `location_options`: görselde A/B/C gibi görünen konum seçenekleri vardır; sorular bir yerin adını sorar. `locations[].optionId` görünür konumdur; doğru item→option ilişkisi yalnız answer key'dedir.

`pictures` bir görsel kompozisyon/görsel seti olabilir. Sadece sözlü “diagrama bak” prompt'u yeterli değildir; gerçek medya referansı ve okunabilir boyut gerekir.

## Reading kapsamı

[RESMÎ] Academic format sayfasındaki 11 aile aşağıdaki tabloda yer alır. [S04] GT format sayfasının sayımı ve ortak örnek sayfası birebir aynı listeyi kullanmadığı için GT için farklı numaralı enum üretmek yerine birleşik yetenek kümesini destekle. [S05, S12] GT için YNNG desteğini sırf GT'nin numaralı format sayfasında ayrı başlık görünmediği için kaldırma.

| Aile | `taskType` | Cevap | Yazılım standardı |
|---|---|---|---|
| Multiple choice | `multiple_choice` | `choice_one/many` | Single genellikle 4 seçenek; multi `selectionCount` ve `numbers[]` |
| Identifying information | `information_tfng` | `judgement` | Değerler `TRUE`, `FALSE`, `NOT_GIVEN` |
| Writer views/claims | `writer_ynng` | `judgement` | Değerler `YES`, `NO`, `NOT_GIVEN` |
| Matching information | `matching_information` | `choice_one` | Bir ayrıntıyı paragraf/section seçeneğiyle eşleştir |
| Matching headings | `matching_headings` | `choice_one` | Ana fikir; başlıkların görünen etiketi i/ii/iii olabilir |
| Matching features | `matching_features` | `choice_one` | Kişi, dönem, kategori gibi özellikler; reuse yönergesi |
| Matching sentence endings | `matching_endings` | `choice_one` | Başlangıç + ortak bitiş bankası |
| Sentence completion | `sentence_completion` | `text` | Pasajdan kelime; cümle içi boşluk |
| Summary/note/table/flow-chart completion | `completion` | `text/choice_one` | Dört layout; kaynaktan yazma veya bankadan seçme varyantı |
| Diagram label completion | `visual_labelling` | `text` | Diyagram + numaralı hedefler |
| Short answer | `short_answer` | `text` | Kısa olgusal yanıt; kelime kısıtı |

[RESMÎ] Başlıklar yeniden kullanılmaz; kullanılmayan fazla başlıklar bulunur. Information ve features türlerinde yeniden kullanım mümkünse yönergede belirtilir. [S04] [ÖNERİ] `optionReuse` yayın anında denetlenir; Matching Headings için `forbidden`, diğer eşleştirmelerde göreve göre `allowed/forbidden`. Fazla seçenek bulunmasını başlık ve bitiş eşleştirmede denetle. Önceden çözülmüş örnekleri numaralı puan konumu olarak sayma.

## IELTS Liz 14 başlık eşleştirmesi

[LIZ] Aşağıdaki adlar Liz'in öğretim sınıflandırmasıdır. Ayrı 14 backend renderer gerektirmez. [S13]

| Liz sıra | Liz başlığı | Standardın karşılığı |
|---|---|---|
| 1 | Matching Headings | `matching_headings` |
| 2 | TFNG / YNNG | İki ayrı judgement `taskType` |
| 3 | Matching Paragraph Information | `matching_information` |
| 4 | Summary Completion | `completion`, summary |
| 5 | Sentence Completion | `sentence_completion` |
| 6 | Multiple Choice | `multiple_choice`, one/many |
| 7 | List Selection | Ortak bankalı `choice_one`; anlama göre `matching_features` veya completion |
| 8 | Choosing a Title | `multiple_choice`, `focus=whole_passage_title` |
| 9 | Classification / Categorisation | `matching_features` |
| 10 | Matching Sentence Endings | `matching_endings` |
| 11 | Table Completion | `completion`, table |
| 12 | Flow Chart Completion | `completion`, flow_chart |
| 13 | Diagram Completion | `visual_labelling` |
| 14 | Short Answer | `short_answer` |

[ÖNERİ] “List Selection” tek başına semantik tür belirlemez. Üretici hangi ilişkiyi sorduğunu açıkça vermeli; importer prompt'tan tahmin etmemeli. Ham etiketleri sessizce generic MCQ'ya çevirme. `schema/type-registry.json` desteklenen kesin kombinasyonları listeler; bilinmeyen kombinasyon hata verir.

## Bütün tipler için ortak kurallar

- [ÖNERİ] Yönerge metni ve makinece doğrulanan cevap kısıtı birlikte tutulur; çelişirse yayını engelle.
- [ÖNERİ] Seçenekler karıştırılmaz. Harfler, Roma rakamları ve metindeki atıflar korunur; stabil option ID kullanılır.
- [ÖNERİ] Bir `item` birden fazla numara taşıyabilir; toplam soru sayısını `items.length` ile hesaplama.
- [ÖNERİ] `sourceRefs` hangi pasajların kullanıldığını gösterir; salt paragraf kimliği tüm metin kapsamı demek değildir.
- [ÖNERİ] Görünür soru sırası, JSON array sırası ve numaralandırma tutarlı olmalı. Reading cevap konumlarının her türde pasaj sırasını izlediğini varsayma.
- [ÖNERİ] Metin/görselde cevabı açığa çıkaran erişilebilir açıklama bulunmamalı. Erişilebilir alternatif görevi çözmemeli; uyarlamalar ayrı inceleme gerektirir.
