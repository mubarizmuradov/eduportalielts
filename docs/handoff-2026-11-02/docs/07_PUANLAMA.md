# Puanlama ve değerlendirme

## Objektif bileşenler

[RESMÎ] Listening ve Reading toplam 40 puandır; her doğru yanıt bir puan. Ham puandan band'a dönüşüm test sürümüne göre biraz değişebilir; GT ve Academic Reading aynı ham eşikleri paylaşmaz. [S19]

[ÖNERİ] `numbers[]` puan konumlarını temsil eder. Örneğin `numbers:[7,8]`, `selectionCount:2`, doğru `{B,D}`, cevap `{D,B}` ise 2; `{B,C}` ise 1; `{B}` ise 1; boşsa 0. Yanlış yanıt doğruyu götürmez. Aynı seçeneği tekrarlamak ek puan üretmez. Fazla seçim UI'de engellenir; API'de reddedilir, ilk iki seçeneği sessizce alma. Kısmi yanıt gönderilebilir, `complete` olmayabilir ama bilinen doğru seçim puanını alır.

Choice-one, judgement ve metin cevabı tek konumsa 0/1. Answer key seçenek harfine veya indeksine değil stabil option ID'ye bağlanır. YNNG'de `TRUE` cevabını `YES` yerine kabul eden dönüşüm yapma; UI doğru enum'u üretir.

## Metin normalizasyonu

[RESMÎ] Kelime limiti aşılırsa yanıtın puanı kaybolur; hyphenated sözcükler tek kelime sayılır. [S03, S04] Büyük/küçük harf ve cevap kontrolü bilgisayarlı Listening açıklamasında belirtilir. [S09]

[ÖNERİ] Önerilen `exact_normalized_v1`:

1. Orijinal yanıtı kaydet. Karşılaştırma kopyasında Unicode NFC, baş/son boşluk temizliği, ardışık whitespace birleştirme ve locale bağımsız İngilizce casefold uygula.
2. Spelling düzeltme, lemmatization, fuzzy match, artikel atma, çoğul tekil eşitleme veya genel synonym kabulü yapma.
3. `accepted[]` açık alternatiflerdir: örneğin `centre/center`, `20/twenty`, belirli tarih biçimleri gerçekten kabul edilecekse anahtara ayrı yazılır. Cevabın yerine rastgele eşanlamlı üretme.
4. Noktalama anlamlı olabilir; apostrof, ondalık nokta, saat ayıracı veya tireyi global silme. Uygun varyantlar açık listede olsun.
5. Formlarda basılı para birimi veya ölçü metni öğrenci cevabına iki kez eklenmesin; accepted değerleri boşluğun gerçek anlamıyla uyuşsun.

Kelime kısıtları `words_only`, `number_only`, `words_and_number`, `words_or_number` olarak saklanır. İlki yalnız sözcük; ikincisi bir sayısal ifade; üçüncüsü en çok N sözcük ve en çok bir sayı; dördüncüsü sözcük yanıtı veya tek sayısal yanıt kabul eder. “AND/OR” üçüncü moda karşılık gelir; ikisinin birden yazılması zorunlu değildir.

**Sınır:** Sayı, tarih, telefon, para, yazıyla sayı ve noktalama tokenizasyonunun bütün uç durumları için bu araştırma evrensel bir resmî parser doğrulamadı. Üretimde sayı whitelist'i ve maddeye özgü kabul örnekleri gerekir. Onaylanmış her `accepted` varyantı yönergeye göre editörce kontrol edilmeli; bu paket Python aracı otomatik essay/word-limit grader'ı değildir. Basit whitespace split ile bütün cevapları resmî doğrulukta saydığını iddia etme.

Birden çok kısa yanıt için `text_set` kullanılır. `answerUnits` içindeki her puan bir kabul listesi taşır; sıra önemsizse her öğrenci slot'u en fazla bir unit ile eşleşir. Kısmi puan için maksimum bipartite matching; aynı kelimeyi iki kez yazmak tek unit'ten iki puan vermez. Her slot kendi kelime kısıtına uyar. Doğru unit'lerin belirsiz biçimde çakışmasını yayın öncesi işaretle.

## Band dönüşümü

`scoring-policy.json` resmî sayfada bulunan **seçilmiş ortalama referans noktalarını** içerir; tam dönüşüm tablosu değildir. Aradaki değerleri interpolasyonla doldurma. Uygulama `rawScore`, `maxScore`, `band:null`, `bandStatus:'table_not_configured'` gösterebilir. Onaylı bir practice dönüşüm tablosu sağlandığında `tableId`, sürüm, testType ve `approximate=true` saklanır; bütün 0–40 girişleri ayrı tanımlı olmalıdır. Listening/Academic Reading/GT Reading ayrı config kullanır.

## Writing ve Speaking

[RESMÎ] Writing: TA (Task 1) / TR (Task 2), CC, LR, GRA; kriterler görev içinde eşit, Task 2 daha ağırdır. Speaking: FC, LR, GRA, Pronunciation eşit ağırlıktadır. [S06, S07, S21, S23]

[ÖNERİ] Writing ham değerlendirme `T1mean=(TA+CC+LR+GRA)/4`, `T2mean=(TR+CC+LR+GRA)/4`; `weighted=(T1mean+2*T2mean)/3`. Ham ara değerleri sakla. W/S component yuvarlama ve assessor ölçeği onaylı değerlendirme politikasında sürümlenir; bu araştırma resmî examiner yazılımının bütün ara yuvarlama kurallarını doğrulamadı. `pending` ile `0` farklıdır.

İnsan değerlendirici, kriter puanları, kısa gerekçeler ve yorumlar kaydedilir. AI değerlendirmesi sonradan eklenirse `ai_estimate`, model/rubric sürümü ve review durumu belirtilir; bu işte implementasyonu kapsam dışıdır. AI kaynaklı sonucu resmî examiner notu diye sunma. Speaking pronunciation yalnız transcript'ten değerlendirilemez; gerçek sese ihtiyaç vardır.

[RESMÎ] Overall dört bileşenin ortalamasının en yakın yarım banda yuvarlanmasıdır; .25 yukarı yarıma, .75 yukarı tam banda gider. [S19] [ÖNERİ] Dört nihai component hazırsa `floor(mean*2+0.5)/2` uygulanabilir. 6.25→6.5; 6.75→7; 6.125→6. W/S eksikse overall `null`; 2 bileşenli ortalamayı overall diye gösterme.

Resmî descriptor tablolarının tamamı bu ZIP'e kopyalanmadı. Kriterlerin amacı çevrimdışı özetlendi; ayrıntılı band yargısı için kaynak PDF'leri referans alınır. [S22, S24] Paket bir examiner sertifikası veya kalibre edilmiş soru bankası sağlamaz.
