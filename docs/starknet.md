# Starknet Sepolia Withdrawal Bug — Kök Neden Analizi ve Çözüm

> [!IMPORTANT]
> Bu belge, Starknomo projesinde yaşanan **withdrawal (çekim) hatasının** tam teknik analizini, kök nedenini ve uygulanan çözümü içermektedir. İleride benzer sorunlarla karşılaşıldığında referans olarak kullanılabilir.

---

## 🐛 Sorunun Özeti

Kullanıcılar bakiyelerinden STRK çekim yapmaya çalıştığında, işlem Starknet Sepolia ağı tarafından reddediliyordu. Hata **iki aşamada** kendini gösterdi:

### Aşama 1: `Input too long for arguments`

```
Account validation failed: 'Input too long for arguments'
```

**Calldata** (9 eleman — Cairo 0 formatı):
```json
["0x1", "0x4718f5a...", "0x83afd3f...", "0x0", "0x3", "0x3", "0x162d75...", "0x44004c...", "0x0"]
```

### Aşama 2: `Account: invalid signature`

Cairo version düzeltildikten sonra calldata doğru formata (7 eleman) dönüştü, ancak bu sefer imza doğrulaması başarısız oldu:

```
Account validation failed: 'Account: invalid signature'
```

---

## 🔍 Kök Neden Analizi

### 1. Hesap Tipi Tespiti

Treasury hesabı (`0x2b13984f...`) on-chain sorgulandığında:

| Parametre | Değer |
|---|---|
| **Class Hash** | `0x05b4b537eaa2399e3aa99c4e2e0208ebd6c71bc1467938cd52c798c601e43564` |
| **Hesap Tipi** | **OpenZeppelin AccountUpgradeable (Cairo 1)** |
| **ABI Impl'leri** | `UpgradeableImpl`, `AccountMixinImpl`, `OutsideExecutionV2Impl` |
| **Public Key** | On-chain ve private key'den türetilen public key eşleşiyor ✅ |

### 2. [.env](file:///c:/Users/enliven/Documents/GitHub/Starknomo/.env) Konfigürasyon Hatası

```env
# HATALI - Hesap Cairo 1 ama Cairo 0 olarak yapılandırılmış
STARKNET_TREASURY_CAIRO_VERSION=0
```

`starknet.js`'de `Account` sınıfı `cairoVersion` parametresine göre **calldata yapısını** belirler:

| Cairo Version | Calldata Yapısı | Eleman Sayısı |
|---|---|---|
| **Cairo 0** | `[call_array_len, to, selector, data_offset, data_len, calldata_len, ...calldata]` | 9 |
| **Cairo 1** | `[call_count, to, selector, data_len, ...calldata]` | 7 |

**Sonuç:** Cairo 0 formatında 9 elemanlı calldata, Cairo 1 hesabına gönderilince hesap "Input too long" hatası verdi.

### 3. SDK ile RPC Sürüm Uyumsuzluğu (Asıl Kritik Sorun)

[.env](file:///c:/Users/enliven/Documents/GitHub/Starknomo/.env)'deki `CAIRO_VERSION=1` düzeltmesi calldata yapısını düzeltti, ancak **imza hatası** devam etti. Bunun nedeni:

```
starknet.js v6.24.1 + RPC v0.8.1 = İMZA UYUMSUZLUĞU
```

#### Teknik Detay:

**V3 İşlem Hash Hesaplaması:**

- **starknet.js v6**: Transaction hash hesaplanırken `l1_data_gas` resource bound'u **dahil edilmez**
- **RPC v0.8**: İşlemi doğrularken `l1_data_gas` **dahil ederek** hash hesaplar

Bu fark, aynı işlem için iki farklı hash üretilmesine neden olur → imza, RPC'nin hesapladığı hash ile uyuşmaz → **"invalid signature"**.

#### RPC Sürüm Durumu (Mart 2025):

Tüm ücretsiz Starknet Sepolia RPC sağlayıcıları artık **v0.8** sunmaktadır:

| Sağlayıcı | Spec Version | Durum |
|---|---|---|
| dRPC (`starknet-sepolia.drpc.org`) | 0.8.1 | ✅ Aktif |
| Lava Network (`rpc.starknet-testnet.lava.build`) | 0.8.1 | ✅ Aktif |
| Nethermind (`free-rpc.nethermind.io/sepolia-juno/`) | — | ❌ Erişilemez |
| BlastAPI (`starknet-sepolia.public.blastapi.io`) | — | ❌ Kapatılmış |

**v0.7 RPC artık mevcut değil**, dolayısıyla v6'daki "v0.7'ye fallback" stratejisi de işe yaramıyordu.

#### Sürüm Uyumluluk Matrisi:

| RPC Spec | starknet.js v6 | starknet.js v7 | starknet.js v8 |
|---|---|---|---|
| v0.7.x | ✅ | ✅ | ❌ |
| **v0.8.x** | **❌ İmza hatası** | **✅** | ✅ |
| v0.9.x | ❌ | ❌ | ✅ |

---

## ✅ Uygulanan Çözüm

### Değişiklik 1: [.env](file:///c:/Users/enliven/Documents/GitHub/Starknomo/.env) — Cairo Version Düzeltmesi

```diff
- STARKNET_TREASURY_CAIRO_VERSION=0
+ STARKNET_TREASURY_CAIRO_VERSION=1
```

### Değişiklik 2: [package.json](file:///c:/Users/enliven/Documents/GitHub/Starknomo/package.json) — starknet.js Yükseltmesi

```diff
- "starknet": "^6.24.1",
+ "starknet": "^7.6.4",
```

```bash
npm install starknet@7.6.4
```

### Değişiklik 3: [lib/ctc/client.ts](file:///c:/Users/enliven/Documents/GitHub/Starknomo/lib/ctc/client.ts) — Account Constructor

```diff
- this.account = new Account(this.provider, addr, privateKey, cairoVersion, '0x3');
+ this.account = new Account(this.provider, addr, privateKey, cairoVersion);
```

> v7 varsayılan olarak V3 işlemleri kullanır, 5. parametre (`'0x3'`) artık gereksiz.

### Değişiklik 4: [lib/ctc/client.ts](file:///c:/Users/enliven/Documents/GitHub/Starknomo/lib/ctc/client.ts) — sendTransaction Basitleştirmesi

```diff
- // Manuel v3BoundsWithL1DataGas / v3BoundsWithoutL1DataGas yapıları
- const response = await accountAny.execute(call, undefined, {
-   version: '0x3',
-   resourceBounds: v3BoundsWithL1DataGas,
- });
+ // v7 otomatik fee estimation
+ const response = await this.account.execute(call);
```

> v7, `execute()` çağrısında otomatik olarak `estimateFee` yaparak uygun `resourceBounds` değerlerini hesaplar ve `l1_data_gas`'ı da doğru şekilde dahil eder.

### Değişiklik 5: [lib/ctc/backend-client.ts](file:///c:/Users/enliven/Documents/GitHub/Starknomo/lib/ctc/backend-client.ts) — v0.7 Fallback Kaldırılması

```diff
- const V07_RPC_FALLBACK = process.env.STARKNET_SEPOLIA_RPC_SERVER_V07 || '...';
- function ensureV07Rpc(url: string): string { ... }
- const serverRpc = ensureV07Rpc(baseRpc || '');
+ const serverRpc = process.env.STARKNET_SEPOLIA_RPC_SERVER || process.env.NEXT_PUBLIC_STARKNET_SEPOLIA_RPC || '';
```

> v7, RPC v0.8'i doğal olarak desteklediği için v0.7'ye düşürme mekanizması artık gereksiz.

---

## 🧪 Doğrulama

Düzeltme sonrası doğrudan komut satırından test işlemi başarıyla gerçekleştirildi:

```
SUCCESS: 0x44180e9f6eb558c4444c858f088bb13bb16d95651ba09b8794b6bcdc8bb17e4
```

Doğrulama komutları:

```bash
# Public key eşleşmesini kontrol et
node -e "
const { ec, RpcProvider } = require('starknet');
const pk = process.env.STARKNET_TREASURY_PRIVATE_KEY;
const derived = ec.starkCurve.getStarkKey(pk);
const p = new RpcProvider({ nodeUrl: 'https://starknet-sepolia.drpc.org' });
p.callContract({
  contractAddress: process.env.STARKNET_TREASURY_ADDRESS,
  entrypoint: 'get_public_key',
  calldata: []
}).then(r => console.log('Match:', derived === r[0]));
"

# RPC spec version kontrol et
node -e "
const { RpcProvider } = require('starknet');
new RpcProvider({ nodeUrl: 'https://starknet-sepolia.drpc.org' })
  .getSpecVersion().then(v => console.log('RPC Spec:', v));
"

# starknet.js sürümünü kontrol et
node -e "console.log(require('./node_modules/starknet/package.json').version);"
```

---

## 📋 İleride Dikkat Edilmesi Gerekenler

> [!WARNING]
> Starknet agresif bir şekilde güncellenen bir protokoldür. RPC spec sürümleri ve SDK sürümleri her zaman eşleştirilmelidir.

1. **RPC Spec güncellendiğinde** → `starknet.js`'i de uyumlu sürüme yükselt
2. **Yeni hesap deploy edildiğinde** → `STARKNET_TREASURY_CAIRO_VERSION`'ı hesabın gerçek versiyonuyla eşleştir
3. **"invalid signature" hatası alındığında** → Büyük ihtimalle SDK/RPC sürüm uyumsuzluğu var
4. **"Input too long" hatası alındığında** → `cairoVersion` parametresini kontrol et
5. **Singleton [TreasuryClient](file:///c:/Users/enliven/Documents/GitHub/Starknomo/lib/ctc/backend-client.ts#20-120)** → [.env](file:///c:/Users/enliven/Documents/GitHub/Starknomo/.env) değişikliği yapıldıktan sonra dev server yeniden başlatılmalı (singleton cache temizlenmeli)

### Güncel Bağımlılıklar (Mart 2025)

```
starknet.js: ^7.6.4
RPC Endpoint: https://starknet-sepolia.drpc.org (spec 0.8.1)
Treasury Account: OpenZeppelin AccountUpgradeable (Cairo 1)
```

---

## 🔧 Mainnet Fix (Mart 2025)

> [!IMPORTANT]
> Yukarıdaki testnet hataları mainnet (Binomo) kodunda da tespit edilip düzeltildi.

### Mainnet'te Bulunan Aynı Hatalar:

| # | Sorun | Mainnet Durumu | Fix |
|---|-------|---------------|-----|
| 1 | `starknet.js v6.24.1` kullanılıyor | **❌ İmza uyumsuzluğu** (mainnet RPC v0.8.1) | `v7.6.4`'e yükseltildi |
| 2 | `CAIRO_VERSION` `.env`'de yok | **⚠️ Eksik** | `STARKNET_TREASURY_CAIRO_VERSION=1` eklendi |
| 3 | Account constructor'da `cairoVersion` yok | **⚠️ Eksik** | `backend-client.ts`'de `.env`'den okunan cairoVersion eklendi |
| 4 | `v0_7` fallback RPC endpoint | **⚠️ Gereksiz** | `client.ts`'den kaldırıldı |

### Değişiklik Yapılan Dosyalar:

- `package.json` — starknet `^6.24.1` → `^7.6.4`
- `.env` — `STARKNET_TREASURY_CAIRO_VERSION=1` eklendi
- `lib/starknet/backend-client.ts` — Account constructor'a cairoVersion parametresi eklendi
- `lib/starknet/client.ts` — v0_7 fallback endpoint kaldırıldı

