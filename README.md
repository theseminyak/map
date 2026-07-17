# Seminyak Route Map — OpenStreetMap

Website GitHub Pages untuk menampilkan lokasi **The Seminyak Beach Resort & Spa** dan menghitung rute dari alamat pengguna.

Versi ini memakai OpenStreetMap dan tidak memerlukan:

- Google Cloud
- Billing atau kartu pembayaran
- API key
- Supabase
- Server sendiri
- Proses build

## Langkah 1 — Buat repository GitHub baru

1. Masuk ke [GitHub](https://github.com/).
2. Klik tanda **+** di kanan atas, lalu pilih **New repository**.
3. Isi nama repository: `seminyak-route-map`.
4. Pilih **Public**.
5. Jangan centang pilihan README, `.gitignore`, atau license.
6. Klik **Create repository**.

## Langkah 2 — Upload website

1. Pada halaman repository yang baru, klik **uploading an existing file**.
2. Seret seluruh isi folder ini ke area upload.
3. Pastikan file berikut terlihat:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
   - `.nojekyll`
4. Pada bagian bawah, isi pesan `Website pertama`.
5. Klik **Commit changes**.

Jika `.nojekyll` tidak terlihat di Windows, empat file lainnya sudah cukup.

## Langkah 3 — Aktifkan GitHub Pages

1. Buka tab **Settings** pada repository.
2. Di menu sebelah kiri, klik **Pages**.
3. Pada **Build and deployment**, pilih **Deploy from a branch**.
4. Pada **Branch**, pilih `main` dan folder `/(root)`.
5. Klik **Save**.
6. Tunggu 1–5 menit, lalu refresh halaman tersebut.
7. Website akan tersedia di:

```text
https://NAMA-USER-GITHUB-ANDA.github.io/seminyak-route-map/
```

## Langkah 4 — Tes website

1. Buka alamat GitHub Pages.
2. Pastikan peta Bali dan pin hotel muncul.
3. Masukkan alamat, misalnya `Bandara I Gusti Ngurah Rai, Bali`.
4. Pilih mobil, jalan kaki, atau sepeda.
5. Klik **Calculate route**.
6. Garis rute, waktu, dan jarak akan muncul.

Ikon bus dipertahankan agar tampilan sama dengan foto. Kalkulasi transportasi umum tidak tersedia pada server routing gratis yang digunakan website ini. Pengguna akan diminta memilih mobil, jalan kaki, atau sepeda.

## Layanan gratis yang digunakan

- Peta: tile standar OpenStreetMap
- Pencarian alamat: Nominatim OpenStreetMap
- Kalkulasi rute: server OSRM komunitas FOSSGIS
- Tampilan peta: Leaflet

Pencarian alamat baru dilakukan ketika tombol **Calculate route** ditekan. Hasil alamat yang sama disimpan di browser selama tujuh hari agar tidak mengirim permintaan berulang. Hal ini mengikuti kebijakan layanan publik Nominatim yang melarang autocomplete dan membatasi penggunaan berat.

Layanan komunitas ini cocok untuk website hotel dengan lalu lintas rendah, tetapi tidak memiliki jaminan uptime. Jika website menjadi sangat ramai, pindahkan geocoding dan routing ke provider khusus atau server sendiri.

## Attribution dan kebijakan penggunaan

Attribution **© OpenStreetMap contributors** otomatis tampil di sudut peta dan tidak boleh dihapus.

- [OpenStreetMap Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)
- [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)
- [FOSSGIS routing server](https://routing.openstreetmap.de/about.html)

## Cara memperbarui website nanti

1. Buka repository di GitHub.
2. Klik file yang ingin diubah.
3. Klik ikon pensil **Edit this file**.
4. Ubah isi, lalu klik **Commit changes**.
5. GitHub Pages akan memperbarui website secara otomatis dalam beberapa menit.

## Jika tile peta terlihat terpencar

Versi terbaru menyimpan aturan posisi Leaflet langsung di `styles.css`, sehingga tidak bergantung pada stylesheet CDN. Untuk memperbaiki website lama:

1. Buka repository `theseminyak/map` di GitHub.
2. Klik file `styles.css`.
3. Klik ikon pensil **Edit this file**.
4. Ganti seluruh isinya dengan `styles.css` dari paket terbaru.
5. Klik **Commit changes**.
6. Tunggu sekitar 1–5 menit, lalu buka website dengan refresh paksa `Ctrl + F5`.
