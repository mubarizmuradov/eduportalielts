# EduPortal IELTS (`eduportalielts` reposu)

EduPortal akademileri için **IELTS deneme sınavı** platformu. Sınavlar yapay
zekânın ürettiği bir JSON paketinden kurulur. Öğretmenler sınavı sınıflara
atar ve öğrenciler bilgisayarlı IELTS'e benzeyen bir ekranda çözer.

- Kendi backend'i, frontend'i ve veritabanı vardır.
- EduPortal'ın kullanıcı, akademi, filial ve sınıf bilgilerini **sadece
  okuyarak** kullanır. EduPortal'a hiçbir şey yazmaz.
- Giriş yalnızca **EduPortal SSO** ile yapılır (EduQuiz'deki gibi).
- EduPortal'ın kendi sınav modülünden tamamen ayrıdır.

```text
Tarayıcı ─▶ nginx ─┬─ /        → web (Next.js 16, React 19)
                   └─ /api/*   → api (NestJS 11)
                                  │
                 ┌────────────────┴──────────────────┐
           ielts_db (okuma/yazma)            EduPortal DB (SELECT-only rol)
           testler, atamalar, denemeler,     users, sessions, academies,
           puanlar, ses/görsel dosyaları     campuses, classes, üyelikler
```

## Ne yapar?

1. **AI paketi → sınav.** Yapay zekâ bir tam IELTS sınavını tek JSON olarak
   üretir (metinler, sorular, cevap anahtarı, transkript, base64 veya URL
   olarak ses ve görseller). `buildIeltsExam()` paketi IELTS kurallarına göre
   doğrular ve sınavı hazırlar. Standart: **[docs/IELTS_PACKAGE_FORMAT.md](docs/IELTS_PACKAGE_FORMAT.md)**.
2. **Kütüphane ve atama.** Öğretmen, mentor, menecer veya akademi sahibi
   paketi yükler. Önce kontrol eder, sonra kaydeder. Testi önizler, cevap
   anahtarını ve transkripti görür, açılış/kapanış zamanıyla bir sınıfa atar.
3. **Sınav.** Sınıftaki öğrenciler bilgisayarlı IELTS düzeninde çözer.
4. **Puanlama.** Listening ve Reading otomatik puanlanır (40 soru → bant).
   Öğretmen Writing ve Speaking'i resmî dört kritere göre 0–9 puanlar. Overall
   band IELTS kuralıyla yuvarlanır.
5. **Sonuç.** Öğretmen "Nəticələri göstər" deyince öğrenci Test Report'u, cevap
   kâğıdını, Writing yorumlarını ve kendi ses kayıtlarını görür.

## Sınav ekranı (bilgisayarlı IELTS gibi)

**Bölüm sırası ve süreler**

- Listening (kayıtlar + 2 dk kontrol), Reading (60 dk), Writing (60 dk)
  arasız, ardından Speaking.
- Süreler **sunucuda** tutulur. Sayfa kapansa da işler. Süre bitince bölüm
  otomatik teslim edilir ve bir sonrakine geçilir. Geri dönülmez.

**Üst çubuk**

- Aday adı ve aday numarası, "XX minutes left" (son 5 dakikada kırmızı).
- Listening'de ses düzeyi ayarı.
- Settings: yazı boyutu Standard / Large / Extra large; renkler Black on
  white / White on black / Yellow on black.
- Help ve Hide.

**Alt gezinme**

- Part başlıkları ve soru numaraları. Cevaplanan numaranın altı çizilir.
- "Review" işareti (numara yuvarlak olur), ← → okları ve Submit.

**Listening**

- Kayıt **bir kez** çalar; durdurma veya geri sarma yoktur.
- Sayfa yenilenirse kayıt sınav saatinin bulunduğu yerden devam eder.
- Çalan part otomatik açılır.

**Reading**

- Sol tarafta metin, sağ tarafta sorular. Aradaki çubuk sürüklenerek
  boyutlandırılır.
- Metinde seçim yapılınca **Highlight / Notes / Clear** menüsü açılır.
- Başlıklar paragrafın üstündeki boşluğa sürüklenebilir.

**Writing**

- Sol tarafta görev ve grafik, sağ tarafta yazı alanı ve "Words: N" sayacı.
- Yazım denetimi kapalıdır (gerçek sınavdaki gibi). Dışarıdan yapıştırma
  engellenir.

**Speaking**

- Mikrofon testi yapılır.
- Part 1: soru başına 30 sn kayıt.
- Part 2: konu kartı, 1 dk hazırlık (not alınabilir), 2 dk konuşma ve
  rounding-off soruları.
- Part 3: soru başına 60 sn.
- Her cevap ayrı kaydedilip yüklenir. Bağlantı koparsa kaldığı sorudan devam
  eder.

**Sürükle-bırak**

- Başlık, kelime bankası ve cümle sonu seçenekleri sürüklenerek yerleştirilir.
- Klavye ve dokunmatik için önce seçeneğe, sonra boşluğa tıklamak da yeter.

**13 soru tipinin hepsi**

- Multiple choice (tek cevap ve TWO/THREE).
- True/False/Not Given, Yes/No/Not Given.
- Matching headings, information, features, sentence endings.
- Plan/map labelling.
- Form/note/table/flow-chart/summary completion (yazarak veya kelime
  bankasıyla).
- Sentence completion, diagram label completion, short answer.

## Roller (EduPortal'dan)

| Kim | Ne yapabilir |
| --- | --- |
| Akademi **OWNER** | Akademinin bütün sınıflarına test ekler, atar, puanlar |
| Filial **MANAGER** | Kendi filialinin sınıflarına |
| **Müəllim (INSTRUCTOR)** / **MENTOR** | Akademiye test ekler; kendi sınıflarına atar ve puanlar |
| Sınıf **STUDENT** | Sınıfına atanan sınavı çözer, açıklanan sonucu görür |
| EduPortal sistem yöneticisi | Hepsi |

Kurallar `backend/src/modules/identity/access.policy.ts` dosyasındadır ve
birim testleri vardır. Akademi ADMINISTRATOR ve filial MODERATOR istenen
listede olmadığı için personel sayılmaz. Eklemek tek satırlık bir
değişikliktir.

## Yerelde çalıştırma

Gerekenler: Node 22 ve PostgreSQL 16. EduPortal veritabanının **yerel
kopyası** EduPortal'ın kendi migration'larıyla oluşturulmuş olmalı
(`eduportal_dev`).

```bash
# 1) EduPortal kopyasına salt-okuma rolü ve demo veri
psql postgresql://postgres:postgres@localhost:5432/eduportal_dev -v ro_password="'readonly'" -f docs/sql/eduportal-readonly-role.sql
cd backend && npm install
EDUPORTAL_ADMIN_URL=postgresql://postgres:postgres@localhost:5432/eduportal_dev node scripts/seed-dev-eduportal.js

# 2) Sahte EduPortal SSO (ayrı terminal), yazdırdığı anahtarı .env'e koyun
EDUPORTAL_ADMIN_URL=postgresql://postgres:postgres@localhost:5432/eduportal_dev node scripts/dev-sso-provider.js

# 3) API (backend/.env.example → backend/.env)
npm run prisma:migrate:deploy && npm run start:dev       # :4002

# 4) Web
cd ../frontend && npm install && npm run dev             # :3200
```

Örnek bir sınav: `cd backend && npm run sample > academic-sample.json`. Bu
dosyayı "Test əlavə et (JSON)" ekranından yükleyin. Paket her soru tipini
içerir; sesler yer tutucu tonlardır, görseller SVG'dir.

Demo kullanıcılar (şifre yok, sahte SSO ekranında seçilir):

- `teacher@demo.az` (INSTRUCTOR)
- `mentor@demo.az` (MENTOR)
- `manager@demo.az` (MANAGER)
- `owner@demo.az` (OWNER)
- `student1@demo.az`, `student2@demo.az`
- `outsider@demo.az`

## Testler

```bash
cd backend
npm test                 # format, puanlama, bant tabloları, sınav akışı, roller (unit)
npm run test:e2e         # gerçek veritabanlarıyla: SSO, içe aktarma, atama, L→R→W→S, puanlama, sonuç
npm run package:validate -- paket.json
cd ../frontend && npm run typecheck && npm run lint && npm run build
```

## Canlıya alma

```bash
cp .env.example .env     # değerleri doldurun
docker compose up -d --build
```

- `ielts_uploads` volume'u test seslerini ve öğrenci kayıtlarını tutar.
  Yedekleyin.
- EduPortal tarafında yapılacaklar: **[docs/EDUPORTAL_SSO.md](docs/EDUPORTAL_SSO.md)**
  (`eduielts` istemcisinin kaydı).
- Salt-okuma rolü: `docs/sql/eduportal-readonly-role.sql`.

## API özeti

| Yöntem ve yol | Kim | Açıklama |
| --- | --- | --- |
| `GET /auth/sso/start`, `POST /auth/sso/callback` | herkes | EduPortal SSO |
| `GET /auth/me`, `POST /auth/logout` | girişli | |
| `POST /tests/validate` | personel | paketi kontrol eder, hiçbir şey kaydetmez |
| `POST /tests/import` | personel | `{academyId, package}` → test |
| `GET /tests`, `GET /tests/:id`, `DELETE /tests/:id` | personel | kütüphane, önizleme (transkript ve cevaplar), arşiv |
| `GET /tests/:id/assets/:key` | personel / aday | ses ve görseller; aday Listening sesini sadece Listening sırasında alabilir |
| `GET /assignments/classes`, `POST /assignments` | personel | sınıf listesi, atama |
| `GET /assignments`, `GET /assignments/:id`, `PATCH`, `DELETE` | personel | liste, sınıf raporu, sonuç açıklama |
| `GET /assignments/mine` | öğrenci | bana atanan sınavlar |
| `POST /assignments/:id/start` | öğrenci | sınavı başlatır veya devam ettirir |
| `GET /attempts/:id/state` | aday | sadece **o anki** bölümün içeriği ve kayıtlı cevaplar |
| `PUT /attempts/:id/answers`, `PUT /attempts/:id/writing` | aday | otomatik kayıt |
| `POST /attempts/:id/finish-module` | aday | bölümü teslim eder |
| `POST /attempts/:id/recordings?part&index` | aday | Speaking cevabı (webm/ogg/mp4/wav) |
| `GET /attempts/:id/result` | personel / aday (açıklandıysa) | Test Report ve cevap kâğıtları |
| `PUT /attempts/:id/grade` | personel | Writing ve/veya Speaking kriter puanları |

"IELTS" tescilli bir markadır. Uygulama resmî sınav değildir; deneme sınavı
olarak sunulur ve resmî logo kullanmaz.
