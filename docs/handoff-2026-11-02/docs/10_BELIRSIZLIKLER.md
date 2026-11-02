# Kaynak farkları ve açık ürün kararları

## Kaynakların uyuşmadığı veya farklı grupladığı noktalar

| Konu | Bulgular | Uygulama kararı |
|---|---|---|
| Reading sayısı | Liz 14 öğretim başlığı; Academic resmî format 11 aile | Adları eşleştir; tek `questionTypeCount` sabiti kullanma |
| GT listesi | GT numaralı format sayfasında YNNG ayrı başlık görünmüyor; resmî GT sample girişi YNNG'yi de sayıyor | Birleşik motor desteğini koru; GT tipini hatalı diye reject etme |
| Listening summary | Ana format completion başlığında summary adı geçmeyebilir; resmî sample ve IDP açıkça içeriyor | Summary layout desteği gerekli |
| Harita metin/opsiyon | Academic format sayfası liste seçimini vurguluyor; IDP doğrudan kelime yazmayı da açıklıyor | İki cevap biçimini destekle |
| Listening süre | Bazı sayfalarda kâğıt sınava ait 10 dakika bulunuyor | Bu proje computer profilinde 2 dakika son kontrol kullanır |
| Writing süre | 20/40 kaynaklarda öneri olarak kullanılıyor | Tek 60 dakika; iki ayrı zorunlu timer değil |
| Reading metin sayısı | Liz girişte basitçe üç pasaj der; resmî GT ilk bölümlerde birden çok metin tanımlar | Üç section; `passages[]` değişken sayıda |
| UI demo | Resmî practice timer/highlight/notes farklılıkları bildiriliyor | Demo screenshot'ından sınav süresi/özellik yokluğu sonucu çıkarma |
| Güncel teslim biçimi | Resmî kaynaklar 2026 için computer ve bazı yerlerde Writing on Paper seçeneklerini anlatıyor | Core question standardını ülke bazlı sunum takvimine bağlama |
| Speaking | Gerçekte examiner ile etkileşim | Önceden kaydedilmiş sorular modu açıkça simülasyon |

Kaynaklar: S03–S18, S25–S28, S30A–S30E. Liz bağımsız öğretim kaynağıdır; resmî kuruluş kaynağıyla çeliştiğinde resmî format esas alınır.

## Henüz doğrulanmayan noktalar

- Her sağlayıcının ve ülkenin güncel canlı sınavındaki bütün piksel/menü davranışları; bu çalışma beş örnek görev ekranını inceledi.
- Bütün 0–40 ham değerleri için tek evrensel resmî dönüşüm tablosu; resmî sayfa sürüme göre fark olabileceğini söyler.
- Writing/Speaking examiner yazılımındaki bütün ara yuvarlama ayrıntıları.
- Tarih, ondalık, telefon ve yazıyla sayı için bütün word-limit parser uç durumları. Maddeye özgü kabul listesi ve test gerekir.
- Kahoot giriş akışı, mevcut repository şeması, mevcut role enum'ları ve sınıf yetkileri; repository okunmadı.
- Tam gerçek sınav içerik zorluğu ve eşdeğerliği; şema bunu doğrulayamaz.

## Ürün kararı gerekenler ve önerilen varsayılanlar

| Karar | Önerilen varsayılan |
|---|---|
| İlk profil | Tam Academic ve GT sözleşmesi; computer arayüzü |
| Speaking | Var olan live adapter varsa insan; yoksa açık etiketli recorded simulation |
| W/S değerlendirmesi | İnsan review; AI değerlendirme entegrasyonu kapsam dışı |
| Sonuçlar | LR raw hemen hesaplanabilir; açıklama öğretmen politikasında, tam overall bütün grade'ler hazırken |
| Sınıf öğrenci üyeliği | Atama snapshot'ı, açık senkronizasyon |
| Kesilen Listening | Teknik sorun kaydı + yetkili telafi; gizli replay/ek süre yok |
| Erişilebilirlik | Başlangıçta standart klavye/zoom; sınav anlamını değiştiren uyarlamalar ayrıca incelenir |
| Kısmi beceri practice | Gelecek ayrı profil; v1 full-mock örneğini kısaltarak full-mock deme |

Bu varsayılanlar kullanıcı tarafından ayrıca onaylanmış ürün kararları değildir; Claude mevcut uygulamayı incelerken uyumlu olanı uygulayıp kalan farkları açıkça raporlamalı. Paket hiçbir ücretli hizmet, gerçek sınav başvurusu veya dış sistem değişikliği yetkilendirmez.
