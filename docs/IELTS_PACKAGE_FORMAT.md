# IELTS Test Package: AI çıktısının JSON standardı (v1.0)

Bu belge, yapay zekânın ürettiği **bir tam IELTS deneme sınavının** hangi JSON
biçiminde teslim edileceğini tanımlar. Üretim tarafı (metin, görsel ve ses
üretimi) bu repo'nun konusu değildir. Bu repo şunu varsayar: üretici fonksiyon
bu standarda uyan **tek bir JSON** döndürür. `buildIeltsExam()` bu JSON'u
doğrular ve sınava dönüştürür.

| Ne | Nerede |
| --- | --- |
| Şema (zod, kaynak) | `backend/src/ielts-format/package.schema.ts` |
| Şema (JSON Schema, üretici için) | `docs/ielts-package.schema.json` (`npm run schema:export`) |
| Sınavı hazırlayan fonksiyon | `backend/src/ielts-format/build-exam.ts` → `buildIeltsExam(json)` |
| Puanlama ve bant tabloları | `backend/src/ielts-format/marking.ts`, `band.ts`, `answer-text.ts` |
| Tüm soru tiplerini içeren örnek | `backend/samples/sample-package.js` (`npm run sample > örnek.json`) |
| Dosyayı içe aktarmadan kontrol | `npm run package:validate -- örnek.json` |
| API | `POST /tests/validate` (kuru deneme), `POST /tests/import` (kaydet) |

> JSON Schema yapısal kuralların hepsini ifade edemez (soru numaraları, `{{n}}`
> boşlukları, cevap anahtarı ve seçenek uyumu, dosya türü gibi). Bunları
> `buildIeltsExam()` kontrol eder. Üretici, structured output için JSON
> Schema'yı kullanabilir; asıl kabul kriteri `package:validate` sonucudur.

---

## 1. Genel yapı

```jsonc
{
  "schemaVersion": "1.0",
  "testType": "academic",           // "academic" | "general_training"
  "title": "Academic Mock Test 7",
  "meta": { "model": "…", "promptId": "…", "targetBand": "6.5" },  // serbest, öğrenciye gösterilmez
  "assets": [ /* ses ve görseller, bölüm 2 */ ],
  "listening": { "parts": [ /* tam 4 bölüm */ ] },
  "reading":   { "sections": [ /* tam 3 bölüm */ ] },
  "writing":   { "task1": { … }, "task2": { … } },
  "speaking":  { "part1": { … }, "part2": { … }, "part3": { … } }
}
```

Dört modülün hepsi zorunludur. Paket her zaman tam bir IELTS sınavıdır.

### IELTS yapı kuralları (builder kontrol eder)

| Modül | Kural |
| --- | --- |
| Listening | 4 part. Her part'ta **tam 10 soru**: Part 1 = 1–10, Part 2 = 11–20, Part 3 = 21–30, Part 4 = 31–40. Her part'ın **bir ses kaydı** var ve kayıt **bir kez** çalınır. Süre = kayıtların toplamı + 2 dk kontrol (bilgisayarlı sınavdaki gibi). |
| Reading | 3 bölüm, toplam **40 soru**, 1–40 boşluksuz ve sıralı. Her bölümde 10–16 soru. Süre 60 dk. **Academic**: her bölümde tek uzun metin (700–1000 kelime önerilir). **General Training**: 1. bölümde 2–3 kısa metin, 2. bölümde 2 metin (iş hayatı), 3. bölümde 1 uzun metin. |
| Writing | Task 1 (20 dk, en az 150 kelime) + Task 2 (40 dk, en az 250 kelime). Academic Task 1 bir görseli anlatır. GT Task 1 bir mektuptur. Toplam süre 60 dk. Task 2'nin ağırlığı iki kattır. |
| Speaking | Part 1 (tanışma, 2–4 konu), Part 2 (konu kartı: 1 dk hazırlık + 2 dk konuşma), Part 3 (tartışma). |

Numaralar bir soru grubunun içinde ardışık olmalı (`Questions 14–19`). Her
numara tam bir kez kullanılır.

### Metin kuralları

- Düz metin kullanılır, HTML **yoktur**. Her şey metin olarak gösterilir.
- `**kalın**` desteklenir. IELTS kelime sınırını kalın yazar.
- Boşluklar (gap) `{{n}}` biçiminde yazılır. `n` sorunun numarasıdır:
  `"Surname: {{1}}"`.
- `instructions` verilmezse builder **resmî IELTS kalıbını** üretir:
  `Complete the notes below. Write ONE WORD AND/OR A NUMBER for each answer.`,
  `Do the following statements agree with the information given in Reading Passage 1? …`
  vb. Üreticinin talimat yazmasına gerek yoktur.

---

## 2. Varlıklar: ses ve görseller (`assets`)

```jsonc
{
  "id": "listening-part-1",         // pakette benzersiz; harf, rakam, _ ve -
  "kind": "audio",                  // "audio" | "image"
  "mimeType": "audio/mpeg",         // audio: mpeg, wav, ogg, webm, mp4 · image: png, jpeg, webp, svg+xml
  "data": "<base64>",               // ya data …
  "url": "https://…",               // … ya url (ikisi birden olamaz)
  "durationSeconds": 412.5,         // ses için zorunlu (dinleme süresi ve kaldığı yerden devam için)
  "alt": "Plan of the park"         // görsel için önerilir
}
```

- Dosyanın gerçek türü baytlardan kontrol edilir. Bildirilen `mimeType`
  tutmazsa paket reddedilir.
- Sınırlar: ses 40 MB, görsel 8 MB, paket toplamı `MAX_PACKAGE_MB` (120 MB).
- `url` ile verilen dosyalar içe aktarma sırasında **bir kez indirilir** ve
  sunucuda saklanır. Sadece `ASSET_FETCH_ALLOWED_HOSTS` listesindeki https
  hostlarına izin verilir. Liste boşsa base64 kullanın.
- Script veya aktif içerik barındıran SVG'ler reddedilir.
- Hiçbir yerde kullanılmayan varlıklar uyarı verir ve saklanmaz.

Nerede kullanılır:

| Alan | Tür |
| --- | --- |
| `listening.parts[].audio` | audio, part başına bir kayıt |
| `map_labelling.image`, `diagram_label_completion.image` | image |
| `reading.sections[].texts[].image` | image (isteğe bağlı) |
| `writing.task1.image` (Academic) | image: grafik, tablo, harita, süreç |
| `speaking.*.questions[].audio`, `speaking.part2.introAudio` | audio (isteğe bağlı, sınav görevlisinin sesi) |

---

## 3. Soru tipleri (`questionGroups[]`)

Her grubun ortak alanları:

```jsonc
{
  "type": "…",
  "instructions": "…",   // isteğe bağlı: standart IELTS talimatını değiştirir
  "title": "…",          // isteğe bağlı: form, tablo veya liste başlığı
  "example": "…"         // isteğe bağlı: "Example" satırı
}
```

Hangi modülde hangi tip olabilir:

| `type` | IELTS adı | Listening | Reading | Ekranda |
| --- | --- | :-: | :-: | --- |
| `multiple_choice` | Multiple choice (one answer) | ✓ | ✓ | radio |
| `multiple_choice_multi` | Multiple choice (choose TWO/THREE) | ✓ | ✓ | checkbox (en çok N) |
| `true_false_not_given` | Identifying information | – | ✓ | radio |
| `yes_no_not_given` | Identifying writer's views/claims | – | ✓ | radio |
| `matching_headings` | Matching headings | – | ✓ | başlıkları paragrafa sürükle |
| `matching_information` | Matching information (which paragraph) | – | ✓ | açılır liste |
| `matching_features` | Matching features / Listening matching | ✓ | ✓ | açılır liste + seçenek kutusu |
| `matching_sentence_endings` | Matching sentence endings | – | ✓ | sonları cümleye sürükle |
| `map_labelling` | Plan / map / diagram labelling (harfli) | ✓ | – | harf tablosu (radio) |
| `completion` | Form / note / table / flow-chart / summary completion | ✓ | ✓ (form hariç) | satır içi kutu veya kelime bankası |
| `sentence_completion` | Sentence completion | ✓ | ✓ | satır içi kutu |
| `diagram_label_completion` | Diagram label completion (yazarak) | ✓ | ✓ | görsel üzerinde kutular |
| `short_answer` | Short-answer questions | ✓ | ✓ | kutu |

### Kelime sınırı (`wordLimit`)

```jsonc
{ "maxWords": 2, "allowNumber": true }   // → "NO MORE THAN TWO WORDS AND/OR A NUMBER"
{ "maxWords": 1, "allowNumber": false }  // → "ONE WORD ONLY"
{ "maxWords": 1, "allowNumber": true }   // → "ONE WORD AND/OR A NUMBER"
{ "maxWords": 0, "allowNumber": true }   // → "A NUMBER"
```

### Kabul edilen cevaplar (`answers`)

- Birden fazla doğru yazım verilebilir: `["Côte d'Ivoire", "Ivory Coast"]`.
- Parantez içi kelimeler isteğe bağlıdır: `"(the) sauna"` hem `the sauna` hem
  `sauna` kabul eder.
- Karşılaştırma büyük/küçük harf, fazla boşluk ve sondaki noktayı yok sayar.
  Ayrıca `1,000 = 1000`, `7:30 = 7.30`, `£50 = 50` sayılır ve kıvrık
  tırnaklar/tireler düzeltilir.
- **Yazım hatası yanlıştır** (IELTS'teki gibi).
- **Kelime sınırını aşan cevap yanlıştır**, doğru kelimeyi içerse bile. Builder,
  anahtardaki her cevabın sınıra uyduğunu kontrol eder. Uymayan paket reddedilir.
- Tireli kelime bir kelime sayılır. Rakamla yazılan sayı "number" sayılır.

### 3.1 `multiple_choice`

```json
{
  "type": "multiple_choice",
  "questions": [
    {
      "number": 11,
      "stem": "The renovation of the park was paid for mainly by",
      "options": [
        { "key": "A", "text": "the city council." },
        { "key": "B", "text": "local businesses." },
        { "key": "C", "text": "a national charity." }
      ],
      "answer": "B"
    }
  ]
}
```

Seçenekler A, B, C… sırasıyla yazılır (3–7 seçenek).

### 3.2 `multiple_choice_multi` (Choose TWO/THREE letters)

```json
{
  "type": "multiple_choice_multi",
  "items": [
    {
      "numbers": [19, 20],
      "stem": "Which TWO rules does the guide mention?",
      "options": [
        { "key": "A", "text": "…" }, { "key": "B", "text": "…" }, { "key": "C", "text": "…" },
        { "key": "D", "text": "…" }, { "key": "E", "text": "…" }
      ],
      "answers": ["B", "D"]
    }
  ]
}
```

`numbers` ve `answers` aynı uzunluktadır (2 veya 3). Her doğru harf 1 puandır
ve sıra önemsizdir.

### 3.3 `true_false_not_given` ve `yes_no_not_given`

```json
{
  "type": "true_false_not_given",
  "questions": [
    { "number": 1, "statement": "The first man-made glass was used to coat stone beads.", "answer": "TRUE" },
    { "number": 4, "statement": "Venetian glass-makers were the first to make coloured bottles.", "answer": "NOT_GIVEN" }
  ]
}
```

Cevaplar: `TRUE | FALSE | NOT_GIVEN` veya `YES | NO | NOT_GIVEN`.

### 3.4 `matching_headings`

Metindeki paragraflar `label` (A, B, C…) taşımalıdır (bölüm 4).

```json
{
  "type": "matching_headings",
  "title": "List of Headings",
  "textIndex": 0,
  "headings": [
    { "key": "i", "text": "Why city conditions can suit bees" },
    { "key": "ii", "text": "The risk of illness spreading" },
    { "key": "iii", "text": "A fashion among businesses" }
  ],
  "example": "Paragraph A: iii",
  "questions": [{ "number": 14, "paragraph": "B", "answer": "vii" }]
}
```

Başlık numaraları küçük roma rakamlarıdır (i, ii, iii… sırayla). Bir başlık
en fazla bir paragrafın cevabıdır. Paragraftan fazla başlık verilmelidir.
Başlıklar sınavda metnin içindeki boşluğa da sürüklenebilir.

### 3.5 `matching_information`

```json
{
  "type": "matching_information",
  "allowReuse": true,
  "questions": [{ "number": 20, "statement": "a reference to the proportion of our food that depends on bees", "answer": "B" }]
}
```

Seçenekler, metnin paragraf etiketleridir. `allowReuse: true` olunca
"NB You may use any letter more than once." yazılır.

### 3.6 `matching_features` (Reading features / Listening matching)

```json
{
  "type": "matching_features",
  "optionsTitle": "List of People",
  "options": [{ "key": "A", "text": "Margaret Hale" }, { "key": "B", "text": "David Ortiz" }, { "key": "C", "text": "Anna Kowalski" }],
  "allowReuse": true,
  "questions": [{ "number": 34, "statement": "Audiences may stop caring about art that no person has made.", "answer": "B" }]
}
```

### 3.7 `matching_sentence_endings`

```json
{
  "type": "matching_sentence_endings",
  "endings": [{ "key": "A", "text": "can now be completed very quickly." }, { "key": "B", "text": "…" }],
  "questions": [{ "number": 39, "sentenceStart": "Tasks such as writing music for advertisements", "answer": "A" }]
}
```

Her son en fazla bir kez cevaptır. Cümleden fazla son verilmelidir.

### 3.8 `map_labelling` (Listening: plan, harita, harfli diyagram)

```json
{
  "type": "map_labelling",
  "title": "Plan of Hilltop Park",
  "image": "park-map",
  "letters": ["A", "B", "C", "D", "E", "F", "G", "H"],
  "questions": [{ "number": 14, "label": "Café", "answer": "G" }]
}
```

Harfler görselin üzerinde basılı olmalıdır. Ekranda bilgisayarlı IELTS'teki
gibi bir harf tablosu çıkar.

### 3.9 `completion` (form, not, tablo, akış şeması, özet)

`variant` hangi içerik alanının kullanılacağını belirler:

| `variant` | İçerik alanı |
| --- | --- |
| `form`, `note`, `summary` | `lines: [{ "text": "...{{n}}...", "style": "heading" \| "text" \| "bullet" \| "indent" }]` |
| `table` | `table: { "columns": [...], "rows": [[...], ...] }` |
| `flow_chart` | `steps: ["kutu 1", "kutu {{37}}", ...]` |

Yazarak cevaplama (`answerMode: "write"`, varsayılan):

```json
{
  "type": "completion",
  "variant": "form",
  "title": "Riverside Sports Centre – Membership form",
  "wordLimit": { "maxWords": 1, "allowNumber": true },
  "example": "Type of membership: individual",
  "lines": [{ "text": "Surname: {{1}}" }, { "text": "Address: {{2}} Mill Road" }],
  "gaps": [
    { "number": 1, "answers": ["Fletcher"] },
    { "number": 2, "answers": ["42"] }
  ]
}
```

Tablo:

```json
{
  "type": "completion",
  "variant": "table",
  "wordLimit": { "maxWords": 2, "allowNumber": true },
  "table": {
    "columns": ["Activity", "Details", "Cost / Note"],
    "rows": [["Swimming pool", "includes the {{6}}", "£{{7}} a month"]]
  },
  "gaps": [{ "number": 6, "answers": ["sauna"] }, { "number": 7, "answers": ["28"] }]
}
```

Kelime bankasından seçme (`answerMode: "select"`, özet tamamlamada sık görülür):

```json
{
  "type": "completion",
  "variant": "summary",
  "answerMode": "select",
  "options": [{ "key": "A", "text": "distances" }, { "key": "B", "text": "flowers" }],
  "lines": [{ "text": "Wild bees cannot travel long {{23}} to feed …" }],
  "gaps": [{ "number": 23, "answer": "A" }]
}
```

Kurallar:

- İçerikteki `{{n}}` boşlukları `gaps` listesiyle **birebir ve aynı sırada**
  olmalı.
- `form` sadece Listening'de kullanılır.
- Tabloda her satırda sütun sayısı kadar hücre olmalı.

### 3.10 `sentence_completion`

```json
{
  "type": "sentence_completion",
  "wordLimit": { "maxWords": 1, "allowNumber": false },
  "questions": [{ "number": 28, "sentence": "First, the students will interview {{28}}.", "answers": ["residents"] }]
}
```

Her cümlede, sorunun kendi numarasıyla tam bir boşluk bulunur.

### 3.11 `diagram_label_completion`

```json
{
  "type": "diagram_label_completion",
  "title": "A Roman glass furnace",
  "image": "furnace",
  "wordLimit": { "maxWords": 2, "allowNumber": false },
  "labels": [{ "number": 11, "x": 80, "y": 30, "answers": ["molten glass"] }]
}
```

`x` ve `y`, kutunun görsel üzerindeki merkezidir (soldan ve yukarıdan %).
Etiket çizgilerini ve boş alanı görsel üretilirken bırakın.

### 3.12 `short_answer`

```json
{
  "type": "short_answer",
  "wordLimit": { "maxWords": 2, "allowNumber": false },
  "questions": [{ "number": 39, "question": "Which country is the largest producer today?", "answers": ["Côte d'Ivoire", "Ivory Coast"] }]
}
```

---

## 4. Listening ve Reading bölümleri

```jsonc
"listening": {
  "parts": [
    {
      "partNumber": 1,
      "context": "A phone call between a man and a receptionist at a sports centre.", // sadece öğretmen görür
      "audio": "listening-part-1",
      "transcript": "RECEPTIONIST: Good morning …",   // zorunlu; sadece öğretmen görür
      "questionGroups": [ … ]                           // 1–6 grup, toplam 10 soru
    }
  ]
},
"reading": {
  "sections": [
    {
      "sectionNumber": 2,
      "texts": [
        {
          "title": "Bees in the City",
          "subtitle": "Urban beekeeping is booming. But is it good for bees?",
          "paragraphs": [
            { "label": "A", "text": "Twenty years ago, …" },
            { "label": "B", "text": "The boom began …" }
          ],
          "image": "opsiyonel-görsel-id",
          "imageCaption": "…"
        }
      ],
      "questionGroups": [ … ]       // matching_headings / information için "textIndex" metni seçer
    }
  ]
}
```

- Listening'in gerçekçi IELTS bağlamları şöyledir. Part 1: günlük konuşma
  (iki kişi, form/not). Part 2: günlük monolog (tur, tesis tanıtımı, harita).
  Part 3: eğitim bağlamında 2–4 kişilik konuşma. Part 4: akademik ders
  (monolog).
- Ses kaydının içinde IELTS'teki gibi talimat ve okuma süresi duraklamaları
  olabilir. Bunlar kayda dahildir ve `durationSeconds` toplam süreyi verir.
- Paragraf etiketleri A, B, C… sırasıyla ve benzersiz olmalı. Etiketsiz
  paragraf (giriş gibi) olabilir.

## 5. Writing

```jsonc
// Academic
"task1": {
  "kind": "academic_report",
  "visualType": "bar_chart",   // line_graph | bar_chart | pie_chart | table | mixed_charts | map | process_diagram
  "prompt": "The chart below shows the number of commuters …",
  "image": "commuter-chart"
}
// General Training
"task1": {
  "kind": "general_letter",
  "letterType": "formal",      // formal | semi_formal | informal
  "situation": "You recently bought a kettle that does not work.",
  "bulletPoints": ["describe the problem", "say what you did", "say what you want the shop to do"],  // tam 3
  "salutation": "Dear Sir or Madam,"   // isteğe bağlı; yoksa türüne göre üretilir
}
"task2": {
  "essayType": "discussion",   // opinion | discussion | advantages_disadvantages | problem_solution | two_part_question
  "prompt": "Some people believe that university students should study whatever they like. Others …",
  "question": "Discuss both these views and give your own opinion."
}
```

Standart cümleleri builder ekler: "You should spend about 20 minutes on this
task.", "Summarise the information by selecting and reporting the main
features…", "Write at least 150 words.", "Give reasons for your answer…".

## 6. Speaking

```jsonc
"speaking": {
  "part1": {
    "topics": [   // 2–4 konu, her biri 2–6 soru (toplam 8–12 önerilir)
      { "topic": "Your home town", "questions": [{ "text": "Where is your home town?", "audio": "opsiyonel-ses-id" }] }
    ]
  },
  "part2": {
    "topic": "Describe a skill you learned that you think is useful.",
    "bulletPoints": ["what the skill is", "when and where you learned it", "how you learned it"],  // 3–4
    "finalPrompt": "and explain why you think this skill is useful.",
    "introAudio": "opsiyonel-ses-id",
    "roundingOff": [{ "text": "Do you think you will learn any other skills in the near future?" }]   // 0–2
  },
  "part3": {
    "themes": [   // 1–3 tema, toplam 4–8 soru önerilir
      { "theme": "Learning skills", "questions": [{ "text": "Which skills are most important for young people today?" }] }
    ]
  }
}
```

Speaking sınavı mikrofonla kaydedilir:

- Part 1: soru başına 30 sn.
- Part 2: 1 dk hazırlık (not alınabilir) ve 2 dk konuşma.
- Rounding-off soruları: 30 sn.
- Part 3: soru başına 60 sn.

Soru sesi (`audio`) verilmişse önce sınav görevlisinin sesi çalar, sonra kayıt
başlar. Ses yoksa soru metni gösterilir.

---

## 7. `buildIeltsExam()` ne yapar?

```ts
import { buildIeltsExam } from './ielts-format/build-exam';

const result = buildIeltsExam(aiJson);
if (!result.ok) {
  result.errors;   // [{ path: "reading.sections.0.questionGroups.2.questions.1.answer", message: "answer D is not an option" }, …]
} else {
  result.exam.candidate;  // öğrenci görünümü: cevap yok, transkript yok, IELTS talimatları eklenmiş
  result.exam.answerKey;  // Listening/Reading puanlama verisi (sunucuda kalır)
  result.exam.staff;      // öğretmen: transkriptler + okunur cevap anahtarı + meta
  result.exam.assets;     // çözülmüş dosyalar (Buffer) veya indirilecek URL'ler
  result.exam.summary;    // soru tipi sayıları, süreler, kelime sayıları
  result.exam.warnings;   // engellemeyen uyarılar (kısa metin, fazla/eksik çeldirici…)
}
```

1. Şemayı doğrular (zod). Hata varsa JSON yoluyla birlikte döner.
2. Yukarıdaki IELTS kurallarını kontrol eder.
3. Standart IELTS ifadelerini ekler: `Questions 1–5`, talimatlar, part/bölüm
   girişleri, Writing kalıpları.
4. Öğrenci görünümünü, cevap anahtarını ve öğretmen görünümünü ayırır. Öğrenci
   görünümünde hiçbir `answer`/`answers` alanı ve transkript bulunmaz (test
   ile güvence altında).

Pure bir fonksiyondur: veritabanı ve ağ kullanmaz. Kaydetme işini
`TestsService.import()` yapar. Ses ve görselleri `UPLOAD_DIR` altına yazar,
URL varlıklarını indirir ve testi akademinin kütüphanesine ekler. AI üretim
servisi hazır olduğunda doğrudan bu metodu (veya `POST /tests/import`)
çağırabilir.

## 8. Puanlama

- **Listening / Reading**: soru başına 1 puan (40 üzerinden). Bantlar
  hazırlık kaynaklarında yayımlanan dönüşüm tablolarından hesaplanır
  (`band.ts`). Academic ve General Training Reading tabloları farklıdır.
  Gerçek sınavda her form ayrıca eşitlenir, bu yüzden deneme bandı bir
  tahmindir. Tablolar tek dosyadadır ve okul isterse ayarlayabilir.
- **Writing**: öğretmen dört kriteri 0–9 tam bant olarak verir (Task
  Achievement/Response, Coherence and Cohesion, Lexical Resource, Grammatical
  Range and Accuracy). Writing bandı = (Task 1 + 2 × Task 2) / 3.
- **Speaking**: dört kriter (Fluency and Coherence, Lexical Resource,
  Grammatical Range and Accuracy, Pronunciation), ortalaması alınır.
- **Overall**: dört bandın ortalaması en yakın yarım banda yuvarlanır.
  .25 yukarı .5'e, .75 yukarı tam banda çıkar (6.25 → 6.5, 6.75 → 7.0,
  6.125 → 6.0).

## 9. Üretici için kontrol listesi

- [ ] `schemaVersion: "1.0"`, dört modülün hepsi var.
- [ ] Listening 4 × 10 soru, Reading 40 soru, numaralar 1–40 boşluksuz.
- [ ] Her soru tipinin modülde izinli olduğu kontrol edildi (tablo bölüm 3).
- [ ] `{{n}}` boşlukları `gaps` ile aynı.
- [ ] Her cevap seçeneklerin, başlıkların veya paragraf etiketlerinin içinde.
- [ ] Yazılı cevaplar kelime sınırına uyuyor. Alternatif yazımlar eklendi.
- [ ] Her ses dosyasında `durationSeconds` var. Görsellerin harf ve etiketleri
  JSON ile uyumlu.
- [ ] `transcript` cevapları gerçekten içeriyor (öğretmen kontrolü için).
- [ ] `npm run package:validate -- dosya.json` → "Valid IELTS test package."
