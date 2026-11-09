# Toko Dani · Manajemen Toko

Aplikasi web satu halaman dengan HTML, CSS, JavaScript vanilla, Firebase modular SDK, dan Cloud Firestore. Halaman: Beranda, Stok Barang, Kasir, Riwayat Transaksi, Keuangan, Stok Opname, Laporan, dan Pengaturan.

Antarmuka mengikuti arah mobile-first Toko Kita: warna krem-hijau, Plus Jakarta Sans, navigasi cepat bawah, kartu stok dengan filter status, estimasi margin pada form barang, serta pintasan pembayaran tunai dan laporan.

## Menjalankan secara lokal

1. Pastikan project Firebase `toko-dani-77a00` memiliki Cloud Firestore dalam mode production dan **Anonymous Authentication** diaktifkan (Firebase Console → Authentication → Sign-in method).
2. Terbitkan `firestore.rules` ke Firestore Rules. Aturan ini memerlukan sesi Firebase. Sesi anonim dibuat otomatis, sehingga tidak ada halaman login.
3. Jalankan server statis dari folder ini, misalnya `python -m http.server 8000`, lalu buka `http://localhost:8000`. Modul JavaScript dan Firebase tidak dapat diandalkan jika halaman dibuka langsung dengan `file://`.
4. Untuk deployment, unggah isi folder ke Firebase Hosting atau hosting statis yang memakai HTTPS. Gunakan project Firebase yang sama dan terbitkan rules sebelum membuka aplikasi.

Konfigurasi web Firebase yang diberikan sudah berada di `app.js`. Konfigurasi web bukan rahasia dan bukan pengganti aturan akses. Jangan pernah menaruh kredensial service account di browser.

## Keamanan dan akses data

Tanpa login pengguna, aplikasi tidak dapat mengenali pemilik toko. Anonymous Authentication hanya membuat sesi teknis; siapa pun yang dapat membuka website bisa membuat sesi anonim lain. Karena rules contoh mengizinkan sesi Firebase, aturan itu **tidak membatasi data ke pemilik toko dan bukan pengamanan yang cukup untuk data operasional**. Jangan menganggap database aman untuk penggunaan publik.

Untuk pemakaian sungguhan, pilihan yang disarankan adalah autentikasi staf (misalnya email/password) dan rules yang mengizinkan hanya UID staf yang didaftarkan, atau backend tepercaya (Cloud Functions/Cloud Run) dengan kredensial server dan validasi otorisasi di server. Sebelum memakai data nyata, ganti `hasSession()` dengan allowlist UID staf serta jangan aktifkan Anonymous Authentication, atau pindahkan seluruh mutasi ke backend. Aturan deny-all yang paling aman ketika belum siap:

```text
match /{document=**} { allow read, write: if false; }
```

Firestore App Check dapat membantu mengurangi trafik dari klien tidak sah, tetapi tidak menggantikan autentikasi dan otorisasi.

## Data dan perilaku

Koleksi yang dipakai: `products`, `categories` (disediakan sebagai ruang untuk kategori), `stockMovements`, `stockOpnames`, `transactions`, `expenses`, `otherIncomes`, serta dokumen `settings/main`. Harga dan jumlah berupa angka; waktu dicatat sebagai Firestore Timestamp. Detail transaksi menyimpan harga jual dan HPP saat transaksi agar laporan historis tidak berubah ketika harga barang diperbarui. Kategori dan metode pembayaran disimpan sebagai daftar pada `settings/main`, sementara nama kategori yang telah dipakai tetap berada pada catatan lama.

Penjualan kasir mengurangi display lebih dulu lalu gudang bila stok display tidak cukup, dan mencatat pergerakan. Semua perubahan produk, gerakan stok, dan transaksi penjualan terjadi dalam satu transaksi Firestore atomik. ID transaksi Firestore dibuat sekali saat tombol pembayaran diproses, dan nomor transaksi mengandung ID tersebut. Pengeluaran dan pemasukan lain dicatat terpisah; penjualan tidak disalin ke pemasukan lain. Saldo kas laporan menghitung penjualan tunai serta pemasukan lain dikurangi pengeluaran, sehingga transfer/QRIS tidak dianggap uang di laci.

Stok dijumlahkan dalam satuan dasar. Buka kemasan memindahkan isi dari gudang ke display dengan mengalikan isi per kemasan. Ekspor menghasilkan CSV ber-UTF-8 yang bisa dibuka dengan Excel; impor saat ini menerima CSV, bukan berkas XLSX. Kasir mendukung pemindaian kamera pada browser yang menyediakan `BarcodeDetector` dan akses kamera (HTTPS diperlukan); pencarian atau scanner barcode USB tetap tersedia sebagai alternatif. Laporan menampilkan estimasi laba bersih dengan perhitungan omzet − HPP − biaya operasional + pemasukan lain; kategori `Pembelian barang` tidak dikurangkan lagi karena HPP sudah memperhitungkan harga barang yang terjual. Pembayaran QRIS/transfer hanya dicatat, tanpa integrasi atau verifikasi otomatis. Nomor atau pengguna operator belum tersedia karena aplikasi belum memiliki identitas staf.

## Batasan sebelum operasional

- Retur dan pembatalan transaksi belum disediakan. Riwayat penjualan tidak dapat dihapus dari antarmuka.
- Impor hanya CSV sederhana; gunakan file kecil dan cocokkan header kolom sebelum mengimpor.
- Aplikasi memuat koleksi ke browser untuk menghitung ringkasan; gunakan pagination/server-side query sebelum jumlah data membesar.
- Kasir hanya mencegah klik ganda selama halaman masih hidup. Untuk jaminan idempotensi lebih kuat ketika koneksi putus dan pengguna mengulang transaksi, transaksi perlu kunci idempotensi di backend.
- Penyesuaian stok opname tersimpan dalam dokumen opname dan gerakan stok, termasuk nilai sistem sebelum/sesudah.

## Pemeriksaan fitur

Tidak ada koneksi browser ke project Firestore yang dijalankan dari lingkungan kerja ini, sehingga penyimpanan nyata, aturan, dan skenario jaringan belum dapat diuji. Status fitur yang menulis/membaca database adalah **BELUM DAPAT DIUJI** sampai aplikasi dijalankan dengan project dan aturan tersebut.

| Alur pada prompt | Status | Catatan |
|---|---|---|
| Navigasi mobile, kartu stok, estimasi margin, periode laporan, format nominal kasir | LULUS (UI) | Diperiksa di browser pada viewport ponsel 375 px; akses Firestore tidak tersedia |
| Scan kamera barcode, cetak laporan, WhatsApp | BELUM DAPAT DIUJI | Bergantung pada dukungan browser, izin kamera, dan perangkat/aksi eksternal |
| Tambah barang / ubah barang | BELUM DAPAT DIUJI | CRUD UI disiapkan; perlu Firestore aktif |
| Tambah stok dan riwayat | BELUM DAPAT DIUJI | Perubahan atomik di Firestore |
| Buka kemasan dus | BELUM DAPAT DIUJI | Isi kemasan dikonversi ke satuan dasar |
| Stok opname | BELUM DAPAT DIUJI | Simpan penyesuaian dan riwayat |
| Arsip barang dan sembunyikan dari kasir | BELUM DAPAT DIUJI | Arsip/pulihkan tersedia |
| Keranjang, tunai, kembalian, non-tunai, struk | BELUM DAPAT DIUJI | Implementasi tersedia; QRIS manual |
| Stok berkurang konsisten dan transaksi atomik | BELUM DAPAT DIUJI | Menggunakan transaksi Firestore |
| Penjualan tidak dihitung ganda pada keuangan | BELUM DAPAT DIUJI | Omzet dihitung dari transaksi; pemasukan lain terpisah |
| Catat pengeluaran dan filter laporan tanggal | BELUM DAPAT DIUJI | Implementasi tersedia |
| Ekspor barang/laporan ke Excel | BELUM DAPAT DIUJI | CSV kompatibel Excel, bukan XLSX |
| Ubah kategori untuk halaman lain | BELUM DAPAT DIUJI | Pengaturan tersimpan pada settings/main |
| Muat ulang, kegagalan Firestore, stok kurang, console browser | BELUM DAPAT DIUJI | Perlu browser dan koneksi ke Firebase |

Gunakan data uji non-produksi untuk menguji alur sebelum memasukkan data toko.
