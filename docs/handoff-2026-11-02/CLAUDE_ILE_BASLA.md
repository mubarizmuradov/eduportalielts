# Claude için uygulama ve denetim talimatı

Bu ZIP, daha önce internet erişimi olmadığı için inceleyemediğin IELTS kaynaklarının araştırma ve teknik devir paketidir. İnternete ihtiyaç duymadan dosyaları oku. Kaynaklarda erişim yöntemi ve belirsizlikler açıkça işaretlendi.

Kullanıcı amacı: AI tarafından önceden üretilmiş metin, görsel ve sesleri standart JSON olarak al; IELTS'e özel deneme sınavı oluştur; Teacher, Mentor, Manager veya Owner'ın yetkisi dâhilindeki sınıflara atamasını ve öğrencilerin çözmesini sağla. AI üretim katmanını geliştirme. Yazma sınırı yalnızca `eduportalielts` repository'sidir. Başka EduPortal repository'lerine, ortak sınav modülüne veya Kahoot projesine yazma.

## Çalışma biçimi

1. Önce repository'nin `AGENTS.md`, mevcut kod, migrations ve testlerini oku. Daha önce yaptığın değişiklikleri koruyarak paketle bir fark analizi çıkar. Var olan kodu sebepsiz yere yeniden yazma.
2. `docs` klasörünü ve `schema/type-registry.json` dosyasını oku. Özellikle `docs/10_BELIRSIZLIKLER.md` içindeki resmî sayfalar arasındaki sınıflandırma farklarını uygula.
3. Paket şemasını önerilen v1 sözleşmesi olarak değerlendir. Mevcut JSON'un daha iyi veya uyumlu alanları varsa adaptör yaz; sözleşme değişikliğini belgeleyip şema, tipler, importer ve renderer'ı birlikte güncelle. Resmî format kurallarını sadeleştirerek kaybetme.
4. Generic EduPortal sınavına dönüştürme. Ayrı IELTS içerik, oturum, atama, deneme, cevap ve değerlendirme varlıkları kullan; mevcut kimlik ve sınıf verilerini yetkili adapter üzerinden yeniden kullan.
5. Kahoot benzeri giriş yalnızca kimlik/giriş/katılım deneyimi talebidir. Var olan akışı incelemeden API veya token biçimi uydurma. Hız puanı, liderlik tablosu, öğretmenin her soruyu ilerletmesi gibi oyun davranışlarını IELTS çözüm ekranına taşıma.
6. `examples` test verilerini yayınlanabilir sınav sayma; fixture engelini kaldırıp bu metinlerle gerçek deneme oluşturma.
7. `qa/validation-report.json` yalnızca paketin sözleşme testlerini gösterir. Repository'nin gerekli testlerini ayrıca çalıştır; UI ve süre/bağlantı davranışlarını tarayıcıda doğrula.

## Atlanmaması gerekenler

- Listening 4 bölüm × 10 puan; Reading 40 puan. Çoklu seçimin 1–2 gibi iki numara ve iki puan taşıması.
- Reading paragrafı, seçenek bankası, tablolar ve akış şemaları yapılandırılmış; tek görsel içine gömülmüş sorular değil.
- Harita: hem numaralı boşluğa etiket yerleştirme hem görseldeki harfli konumu seçme; metin ve seçenek varyantları.
- TFNG ile YNNG farklı tipler; bilgi eksikliği ile çelişki farklı cevaplar.
- Writing tek 60 dakika; 20/40 öneri, iki ayrı zorunlu kilit süresi değil.
- Listening sonunda bilgisayarda 120 saniye kontrol; kâğıt sınavın 10 dakikasını kullanma.
- Speaking gerçek sınavda insanla etkileşimli. Kayıtlı sorular + kayıt alma sürümü ancak açıkça işaretlenmiş bir deneme simülasyonudur.
- Yanıt anahtarı, transkript, doğru cevap koordinat ilişkileri ve puanlama materyali öğrenci DTO'sunda yok.
- Yalnızca rol adına bakarak atama yok; tenant, sınıf yetkisi ve öğrenci üyeliğini sunucu kontrol eder.
- W/S değerlendirilmeden tam overall üretme. Ham doğru sayısını lineer şekilde 9'a ölçekleme.
- Yayınlanmış sınav revizyonu immutable; açık denemeyi yeni JSON ile değiştirme.

Önce uyumsuzluk listesini çıkar, sonra yetkili kapsamda düzeltmeleri tamamla. Kullanıcıya hangi dosyaların değiştiğini, neyin test edildiğini ve hangi ürün kararlarının hâlâ varsayım olduğunu bildir. Bu paket repository'yi incelemediği için hazır bir migration veya auth entegrasyonu olarak kabul edilmemelidir.
