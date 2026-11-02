# Uygulama kabul kontrol listesi

Bu kontrollerin hepsi [ÖNERİ]dir. `qa/validation-report.json` bu listedeki bütün ürün testlerinin geçtiği anlamına gelmez; yalnız referans şema kontrollerinin çıktısıdır.

## Sözleşme ve importer

- [ ] Academic/GT yapısal örneklerini import edip ayrı IELTS draft üretir.
- [ ] 46 varyant şema örneği parse edilir; her kayıtlı renderer fixture'ı görüntülenir.
- [ ] Bilinmeyen sürüm/tür/alan, hatalı numara, eksik key, yanlış asset türü, kopuk kaynak ref ve taşan target reddedilir.
- [ ] Multi item iki numara taşıdığında toplam 40 doğru hesaplanır; 39/41 reject.
- [ ] Aynı idempotency key aynı sonuç; farklı payload conflict; transaction rollback sonrası yarım kayıt yok.
- [ ] Fixture, eksik asset, yönerge/kısıt çelişkisi ve onaysız içerik yayınlanmaz.
- [ ] GT ilk iki bölümde çoklu kısa metin; Academic üç ana pasaj; görevler kaybolmadan saklanır.
- [ ] Mixed Writing iki veya daha çok gerçek görsel gösterir; GT üç maddeyi korur.

## Renderer ve etkileşim

- [ ] Reading iki panelde; iki bağımsız scroll, panel resize ve font/contrast değişimi cevapları korur.
- [ ] Tabloda input satır/sütununu kaybetmez; flow-chart okları ve sıra anlamı korunur.
- [ ] Haritada hem numaralı boşluk hem harfli konum seçimi, doğru image rect'ine hizalanır.
- [ ] Summary'nin metin ve bankalı biçimi aynı cümle içinde input üretir.
- [ ] Heading tekrar kullanılamaz; features/information reuse yönergesine göre çalışır.
- [ ] MCQ tek/multi, TFNG/YNNG, kısa yanıt ve sırasız text_set ayrı cevap türleri üretir.
- [ ] Multi input en çok N seçeneğe izin verir; N'den az yanıt autosave edilebilir.
- [ ] Klavye ile bankadan seçim/yerleştirme; focus sırası, label ve screen reader kontrolü.
- [ ] Sınav sırasında doğru/yanlış animasyonu, puan, açıklama veya liderlik tablosu görünmez.

## Zaman ve veri dayanıklılığı

- [ ] Listening ses testi kayıt tüketmez; sınav sesi bir kere, pause/rewind/speed yok; volume var.
- [ ] Dört ses otomatik sırada; dosya içindeki boşluklar tekrar timer ile eklenmez; sonunda 120 saniye.
- [ ] Writing 20. dakikada Task 1'i kilitlemez; Task 2'ye geçince timer sıfırlanmaz.
- [ ] Browser refresh, saati değiştirme, ikinci tab ve reconnect ek süre kazandırmaz.
- [ ] Kötü ağda autosave ACK beklenir; eski response yeni cevabı ezmez; cevap queue tekrar güvenli.
- [ ] Son saniye save/manual submit/auto-submit yarışında tek kesin yanıt seti.
- [ ] Backend deadline sonrası update reject; kurtarılan geç cevap ayrı review kaydı.
- [ ] Speaking izin reddi, kopan kayıt, kısmi upload ve MIME uyuşmazlığı test edilir.

## Yetki ve açıklama

- [ ] Teacher/Mentor/Manager/Owner kendi kapsamından sınav oluşturur; Student oluşturamaz.
- [ ] Her rolün başka tenant sınıfı ve başka öğrenci attempt'i reddedilir.
- [ ] Kod/link ile sınıf üyeliği atlanamaz; çift sınıf üyeliği ekstra attempt üretmez.
- [ ] API, network response, HTML source, image alt ve dosya adlarında key/transkript sızıntısı yok.
- [ ] Öğrenci yalnız kendi sonucunu, sadece açıklama zamanı geldiyse görür.
- [ ] Yayın sonrası yeni revision eski açık denemenin sorularını/anahtarını değiştirmez.

## Puanlama

- [ ] Correct {B,D}: {B,D}→2; {D,B}→2; {B,C}→1; {B}→1; boş→0. Fazla seçim reject.
- [ ] Aynı sözcüğü iki kez yazma text_set'te çift puan üretmez; maksimum eşleştirme kullanılır.
- [ ] Spelling/plural/article otomatik düzeltilmez; yalnız açık alias'lar kabul edilir.
- [ ] Words-only / number-only / AND-OR / OR yönergeleri ayrı test edilir; sayısal uç durumlar editörce onaylanır.
- [ ] Band tablosu yoksa raw var, band null. GT tablosu Academic yerine kullanılmaz.
- [ ] Writing Task 2 iki kat; eksik grade sıfıra çevrilmez; pronunciation transcript'ten puanlanmaz.
- [ ] Dört component olmadan overall yok; 6.25→6.5, 6.75→7.0, 6.125→6.0.

## Örnek yayın kontrolü

Repository testleri yanında gerçek uzunlukta, izinli içerik ve gerçek medya ile en az bir Academic ve bir GT deneme uçtan uca yürütülmeli. Bu pakette böyle bir gerçek içerik yoktur. Başarılı JSON parse, IELTS zorluk/ölçme kalitesini veya görsel hizalamayı tek başına kanıtlamaz.
