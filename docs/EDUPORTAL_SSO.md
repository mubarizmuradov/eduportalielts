# EduPortal ile tek oturum (SSO): IELTS

> **Durum**
>
> - **IELTS tarafı: hazır ve test edildi.** Birim, e2e ve tarayıcı testleri
>   geçiyor.
> - **EduPortal tarafı: yapılacak.** Bu belgenin 3. bölümü.
> - EduPortal reposunda **hiçbir değişiklik yapılmadı.**
> - **Giriş yapmanın tek yolu budur.** IELTS'te e-posta/şifre formu yoktur.
>   Yerelde geliştirme için bkz. bölüm 5.

Protokol, EduQuiz'deki (`eduportalkahoot` reposu, `docs/EDUPORTAL_SSO.md`)
ile **birebir aynıdır**. Tek fark istemci kimliği ve dönüş adresidir.
EduPortal bir kez çok istemcili SSO yazarsa iki uygulama da aynı kodu kullanır.

| | EduQuiz | IELTS |
| --- | --- | --- |
| `client_id` / JWT `aud` | `eduquiz` | `eduielts` |
| Yetkilendirme sayfası | `https://eduportal.az/az/sso/eduquiz` | `https://eduportal.az/az/sso/eduielts` |
| `redirect_uri` | `https://quiz.eduportal.az/api/auth/sso/callback` | `https://ielts.eduportal.az/api/auth/sso/callback` |
| State çerezi | `eq_sso_state` | `ei_sso_state` |
| Oturum çerezi | `eq_session` | `ei_session` |

## 1. Akış

```text
Tarayıcı                         ielts.eduportal.az                          eduportal.az
   ├── GET /api/auth/sso/start?next=/dashboard ──▶
   │◀── 302 + ei_sso_state çerezi (imzalı, 10 dk) ─────
   ├── GET /az/sso/eduielts?client_id=eduielts&redirect_uri=…&state=… ─────────▶
   │        girişli değilse EduPortal girişi, sonra geri
   │        girişliyse backend 60 sn'lik ES256 JWT imzalar
   │◀── otomatik POST formu (token, state) ─────────────────────────────────────
   ├── POST /api/auth/sso/callback ──▶ doğrula → ei_session → 303 /dashboard
```

## 2. Sözleşme

- **İstek:** `GET {authorize}?client_id=eduielts&redirect_uri={kayıtlı adres}&state={16–128 karakter}`.
  EduPortal sadece kayıtlı `client_id` ve **birebir eşleşen** `redirect_uri`
  kabul eder.
- **Cevap:** `redirect_uri` adresine otomatik gönderilen HTML formu (POST,
  `application/x-www-form-urlencoded`).
  - Başarılıysa: `token`, `state`.
  - İptal edilirse: `error=access_denied`, `state`.
- **JWT (ES256 veya RS256):**

  ```json
  { "iss": "eduportal", "aud": "eduielts", "sub": "<users.id>", "sid": "<sessions.id>",
    "nonce": "<state>", "jti": "<uuid>", "iat": 0, "exp": "iat + 60" }
  ```

- IELTS şunları kontrol eder:
  - imza, `iss`, `aud`, ömür ≤ 120 sn ve `nonce === state`;
  - `jti` tek kullanımlıktır;
  - `sid` hâlâ geçerli bir EduPortal oturumudur.

  EduPortal'da çıkış yapılınca (`sessions` satırı silinince) IELTS oturumu da
  biter.

## 3. EduPortal'da yapılacaklar

EduQuiz belgesindeki 4. bölüm aynen geçerlidir. EduQuiz için SSO henüz
yazılmadıysa onu **istemci listesiyle** yazın, IELTS bir satır olarak eklensin:

1. **Anahtar:** Tek bir EduPortal ES256 anahtar çifti iki istemci için de
   yeterlidir. `aud` alanı bir istemcinin token'ının diğerinde
   kullanılmasını engeller. Ayrı anahtar da kullanılabilir.

   ```bash
   openssl ecparam -name prime256v1 -genkey -noout -out sso-private.pem
   openssl ec -in sso-private.pem -pubout -out sso-public.pem   # IELTS'e verilecek
   ```

2. **Backend `.env`:**

   ```env
   EDUIELTS_SSO_REDIRECT_URI=https://ielts.eduportal.az/api/auth/sso/callback
   ```

3. **Backend `sso` modülü:** istemci tablosuna ekleyin.

   ```ts
   const SSO_CLIENTS = {
     eduquiz: process.env.EDUQUIZ_SSO_REDIRECT_URI,
     eduielts: process.env.EDUIELTS_SSO_REDIRECT_URI,
   } as const;
   // POST /sso/:clientId/assertion → client_id SSO_CLIENTS'ta yoksa 400,
   // redirect_uri birebir eşleşmezse 400, aksi halde aud = clientId ile imzala.
   ```

4. **Frontend:** `app/[locale]/sso/eduquiz/page.tsx` sayfasını
   `app/[locale]/sso/[client]/page.tsx` olarak genelleştirin (veya
   `eduielts` için bir kopya). `proxy.ts` içindeki `PROTECTED_PATH_PREFIXES`'e
   `"/sso"` eklenmesi ikisi için de yeterlidir.

5. **İsteğe bağlı:** EduPortal menüsüne "IELTS sınaqları"
   (`https://ielts.eduportal.az`) bağlantısı.

Değişmeyenler:

- EduPortal veritabanı şeması: IELTS sadece SELECT yetkili rolle okur
  (`docs/sql/eduportal-readonly-role.sql`).
- Kullanıcı, akademi, filial ve sınıf yönetimi.

## 4. IELTS'i ayarlama

```env
PUBLIC_URL=https://ielts.eduportal.az
EDUPORTAL_SSO_AUTHORIZE_URL=https://eduportal.az/az/sso/eduielts
EDUPORTAL_SSO_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n…\n-----END PUBLIC KEY-----"
EDUPORTAL_SSO_CLIENT_ID=eduielts
EDUPORTAL_SSO_ISSUER=eduportal
```

Production'da yetkilendirme adresi `https://` olmalıdır, aksi halde API
açılmaz.

## 5. EduPortal hazır olmadan yerelde deneme

`backend/scripts/dev-sso-provider.js`, gerçek uca birebir uyan sahte bir
EduPortal SSO sayfası açar (sadece yerel `*_dev`/`*_test` veritabanlarında
çalışır):

```bash
cd backend
EDUPORTAL_ADMIN_URL=postgresql://postgres:postgres@localhost:5432/eduportal_dev node scripts/dev-sso-provider.js
```

Komut, `.env` için `EDUPORTAL_SSO_AUTHORIZE_URL` ve `EDUPORTAL_SSO_PUBLIC_KEY`
satırlarını yazdırır. Giriş ekranında demo kullanıcılardan biri seçilir:
öğretmen, mentor, menecer, sahip, öğrenci 1-2 veya sınıfta olmayan kullanıcı.

## 6. Alan adı

Önerilen adres: `ielts.eduportal.az`. "IELTS" tescilli bir markadır
(British Council, IDP, Cambridge). Uygulama kendini **"IELTS deneme sınavı /
IELTS mock test"** olarak tanıtır. Resmî logo veya resmî sınav olduğu
izlenimi kullanılmaz.
