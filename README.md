# TTS · Teknofest Takım Takip Sistemi

ISUBÜ Teknofest takımları için üye kaydı, birim (yazılım / donanım / elektronik / mekanik) ve görev dağılımı ile haftalık ilerleme takip sistemi. Takım kaptanlarının girdiği bilgiler danışman hocanın admin panelinde eksiksiz görüntülenir.

| Adres | Kim kullanır | Ne yapar |
| --- | --- | --- |
| `/` | Takım kaptanı (telefondan) | **Takım + takıma özel şifre** ile giriş. Her hafta üyelerin katılımını (*Geldi / Gelmedi*) ve her üyenin o hafta yaptığı işi kısaca girer. |
| `/admin` | Danışman hocalar | Takım, üye, birim ve görev tanımlar; kaptan şifrelerini yönetir; takımların birimlere göre görev dağılımını, haftalık raporları ve devamsızlığı görür; CSV indirir. |

Teknoloji: Next.js (App Router, Server Actions) · Tailwind CSS · Cloudflare R2 (private bucket) · Vercel.

## Veri modeli

- **Takım:** ad, kaptan, danışman hoca, Teknofest kategorisi, kaptan şifresi, devamsızlık sınırı.
- **Üye:** ad soyad, öğrenci no, telefon, bölüm, **birim** (yazılım / donanım / elektronik / mekanik / diğer) ve **uygulama planındaki görevi**.
- **Haftalık rapor:** hafta, tarih, özet, her üye için katılım durumu ve **o hafta yaptığı işin notu**.

## Güvenlik

- **Admin oturumu:** `.env` içindeki `ADMIN_PASSWORD` ile açılır. Oturum sunucuda kayıtlıdır, açıldığı tarayıcıya bağlıdır ve `ADMIN_SESSION_MINUTES` (varsayılan 120 dk) sonunda biter. *Oturumlar* sayfasından kapatılabilir. Çerez `httpOnly`, `Secure`, `SameSite=Strict`, yalnızca `/admin` yoluna gönderilir.
- **Kaptan oturumu:** Süresizdir. Admin o takımın şifresini değiştirdiği anda tüm açık kaptan oturumları geçersiz olur. Takım arşivlenir veya silinirse de oturum düşer.
- **Kaptan yetkisi:** Yalnızca kendi takımında haftalık rapor girmek/düzeltmek ve takım üyelerine görev atamak/silmek. Üye ekleyemez, rapor silemez, *İzinli* giremez; takım kimliği istemciden değil imzalı oturumdan alınır.
- **Şifreler:** Takım şifreleri bcrypt ile saklanır, geri okunamaz; oluşturulurken bir kez gösterilir.
- **Kaba kuvvet koruması:** Aynı IP'den 15 dk içinde 5 hatalı giriş → 15 dk kilit (admin ve kaptan girişi ayrı ayrı).
- **Diğer:** HSTS, clickjacking koruması, `nosniff`, `noindex`, kişisel veri içeren sayfalarda `no-store`, CSV'de Excel formül enjeksiyonu koruması.

## Kurulum

### 1. Cloudflare R2

1. **R2 → Create bucket** ile bucket oluşturun (ör. `tts`). Public erişimi **kapalı** bırakın.
2. **R2 → Manage R2 API Tokens → Create API token**: izin *Object Read & Write*, kapsam yalnızca bu bucket.
3. Son ekrandaki **Access Key ID**, **Secret Access Key** ve endpoint'teki Account ID'yi kaydedin.

### 2. Ortam değişkenleri

```bash
openssl rand -base64 24   # ADMIN_PASSWORD
openssl rand -base64 48   # SESSION_SECRET (isteğe bağlı)
```

| Değişken | Açıklama |
| --- | --- |
| `ADMIN_PASSWORD` | `/admin` şifresi (en az 12 karakter) |
| `ADMIN_SESSION_MINUTES` | Admin oturum süresi, dakika (varsayılan 120) |
| `SESSION_SECRET` | *İsteğe bağlı.* Boşsa ilk çalışmada rastgele bir anahtar üretilip private bucket'ta (`tts/signing-secret.json`) saklanır. Doluysa en az 32 karakter olmalı. |
| `R2_ACCOUNT_ID` | Cloudflare hesap ID'si |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 API token bilgileri |
| `R2_BUCKET_NAME` | Bucket adı |

> Geliştirmede `R2_ACCOUNT_ID` boşsa veri yerel `.data/` klasörüne yazılır. Production'da R2 zorunludur.

### 3. Çalıştırma

```bash
npm install
npm run dev
```

### 4. Vercel

1. Projeyi GitHub'a gönderin, Vercel'de **Add New → Project** ile içe aktarın.
2. **Settings → Environment Variables** altına tüm değişkenleri ekleyin.
3. Deploy edin. (IP tabanlı giriş kilidi Vercel'in `x-vercel-forwarded-for` başlığına dayanır.)

## Kullanım

1. `/admin` → **Takımlar**: takım oluşturun (danışman hoca ve kategori dahil). Şifre alanını boş bırakırsanız güçlü bir şifre üretilir; takım adı ve şifreyi kaptana iletin.
2. Üyeleri girin: her üye için **birim** seçin ve **görevini** yazın. Excel'den `ad soyad, numara, telefon, bölüm, birim, görev` sütunlarını yapıştırabilirsiniz.
3. Kaptan telefondan giriş yapar, her hafta **“N. hafta raporunu gir”** ile katılımı işaretler ve her üyenin o hafta yaptığı işi yazar.
4. Danışman hoca takım sayfasında birimlere göre görev dağılımını ve haftalık notları, üye sayfasında kişinin tüm haftalarını görür. CSV çıktısı birim, görev ve haftalık notları da içerir.
