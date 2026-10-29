# ESTEH — Juragan Es Teh

ESTEH adalah game simulasi usaha 2D isometrik tentang merintis dan membesarkan usaha es teh, dari satu gerobak dorong di kompleks perumahan sampai kios di kawasan elit. Game ini terinspirasi game *tycoon* klasik tahun 2000-an, tetapi semua gambar, peta, dan sistemnya dibuat sendiri.

Game ini berjalan di browser. Tidak perlu server dan tidak perlu internet. Progres tersimpan otomatis di browser (LocalStorage).

## Menjalankan game

Kamu butuh [Node.js](https://nodejs.org) versi 18 atau lebih baru.

```bash
npm install        # pasang dependensi (sekali saja)
npm run dev        # buka http://localhost:5173 di browser
```

Perintah lain:

| Perintah | Kegunaan |
| --- | --- |
| `npm run build` | Cek tipe TypeScript lalu buat versi produksi di folder `dist/` |
| `npm run preview` | Menjalankan hasil build |
| `npm test` | Menjalankan unit test rumus ekonomi |
| `npm run sim -- 14` | Simulasi 14 hari tanpa tampilan untuk cek keseimbangan dan pembukuan |
| `npm run sim -- 8 premium 7` | Simulasi 8 hari di lokasi tertentu dengan *seed* tertentu |

## Deploy ke Netlify

Pengaturan ada di `netlify.toml`: Netlify menjalankan `npm run build` (Node 22) dan menerbitkan folder **`dist`**. Jangan menerbitkan folder akar proyek: `index.html` di akar memuat `src/main.ts` mentah yang tidak bisa dijalankan browser, sehingga halaman tampil putih kosong. Game tidak memakai routing sisi klien, jadi tidak perlu aturan *redirect/SPA fallback*.

Cek sebelum deploy: `npm ci && npm run build && npm run preview`, lalu buka alamat yang ditampilkan. Kalau game gagal dimulai (skrip tidak termuat atau error saat start), halaman menampilkan kotak "ESTEH gagal dimuat" beserta pesan error-nya, bukan layar kosong.

## Menu utama

Game dibuka di layar judul: logo di tengah atas dan menu vertikal yang ringkas. Latarnya adalah peta yang hidup (sedikit buram dan perlahan bergeser) supaya menu tetap jadi fokus. Nomor versi dan keterangan penyimpanan ada di pojok kiri bawah, dan "A game by Rafi Aziz" di pojok kanan bawah.

- **Lanjutkan:** membuka permainan yang terakhir dimainkan.
- **Main Baru:** isi **Nama Pemilik** (wajib, 2–24 karakter) dan **Nama Usaha** (boleh kosong, otomatis "ESTEH"), lalu pilih penampilan penjual di gerobak. Setelah pesan sambutan, tekan **Mulai Bisnis**.
- **Muat Permainan:** daftar semua simpanan dengan nama usaha, pemilik, hari, lokasi, kas, dan waktu simpan. Simpanan bisa dimuat atau dihapus. Menghapus selalu minta konfirmasi.
- **Pengaturan:** balon reaksi pelanggan, efek cuaca (penuh/ringan/mati), zoom awal, kecepatan awal, tips pemula, dan **suara** (lihat bagian Suara).
- **Kredit.**

Saat bermain, tombol **☰** atau **Esc** membuka **menu jeda**: Lanjutkan, Simpan Permainan, Pengaturan, Cara Bermain, dan Kembali ke Menu Utama. Kembali ke menu utama selalu menyimpan progres dulu dan menutup menu jeda; selama layar judul terbuka permainan ditahan. **Lanjutkan Permainan** di layar judul langsung kembali ke permainan yang sama dan berjalan lagi (tanpa menu jeda, tanpa biaya buka lagi). Memuat simpanan juga langsung masuk ke permainan yang berjalan; menu jeda hanya muncul kalau kamu menekan jeda. Karena game berjalan di browser, tidak ada tombol "Keluar".

**Jeda benar-benar menghentikan permainan**, di tahap apa pun (persiapan maupun berjualan) dan di kecepatan berapa pun. Pejalan kaki, kendaraan, antrean, penjual, penjualan, kas, stok, jam, perubahan cuaca, peringatan, dan animasi dunia (air, pohon, lampu gerobak) semuanya diam sampai kamu menekan **Lanjutkan**. Peta tetap terlihat di belakang menu jeda, dan menyimpan atau mengubah pengaturan tidak melanjutkan permainan. Selama layar judul terbuka, permainan yang sedang berjalan juga ditahan (tanpa mengubah status jeda). Setelah dilanjutkan, semua bergerak lagi dari posisi semula tanpa melompat.

## Layar permainan

Peta mengisi seluruh layar; gerobak, penjual, dan pembeli adalah pusat perhatian. Antarmuka melayang di atasnya dan dibuat sekecil mungkin:

- **HUD atas:** kas, stok teh/gula/es/gelas (klik untuk membeli; menyala oranye saat menipis, merah saat habis), jam dan hari dengan garis kemajuan hari, ikon cuaca dan suhu (arahkan kursor untuk prakiraan besok dan berita), ringkasan penjualan (gelas terjual · puas · kecewa/pergi), tombol jeda dan kecepatan, serta tombol menu.
- **Kartu lokasi (kanan atas):** nama dan ciri lokasi, bar popularitas dan kepuasan, serta sewa. Kartu ini muncul setelah lapak dibuka.
- **Bilah alat (kiri bawah):** Resep, Bahan, Lokasi, Gerobak, Alat, Staf, Promosi, Statistik. Hanya satu panel terbuka pada satu waktu dan selalu punya tombol tutup (✕ atau Esc). Saat panel terbuka, kamera bergeser supaya gerobak tetap terlihat.
- **Kontrol peta (kanan bawah):** perkecil, perbesar, kembali ke gerobak (kamera meluncur halus ke gerobak), dan **Tutup Lapak** saat sedang berjualan. Kamera selalu dibuka dengan gerobak di tengah dan tidak bisa digeser terlalu jauh ke luar peta.
- **Klik gerobak** untuk membuka kotak kecil: ubah harga, lihat resep dan stok, atau lompat ke Resep, Bahan, Gerobak, dan Alat.
- **Umpan balik langsung:** penjual menyapa saat melayani ("Makasih!"), pembeli berkomentar singkat ("Segar banget!", "Manisnya pas!", "Kok mahal?", "Antreannya lama!"), kas memantul dengan angka +Rp, stok yang terpakai berkedip, dan pemberitahuan singkat muncul kalau pembeli batal karena harga atau antrean, bahan habis, atau cuaca berubah siang hari.

## Cara bermain

Setiap hari punya tiga tahap.

1. **Persiapan (07:00).** Waktu berhenti. Kartu persiapan di kanan menunjukkan lokasi, cuaca saat ini (selalu sama dengan HUD, dan sama dengan yang dipakai hitungan permintaan) beserta perkiraan suhu puncak siang, tingkat permintaan (rendah/normal/tinggi/sangat tinggi), peringatan stok, dan biaya buka. Tombol **Rincian** menampilkan berita, perkiraan laba, dan saran belanja. Tombol **—** di pojok kanan atas kartu meminimalkan kartu menjadi satu baris kecil (lokasi · suhu · permintaan · tanda **!** kalau stok kurang) supaya peta bisa dilihat dengan leluasa; klik **Buka Panel** untuk menampilkannya lagi. Kartu langsung hilang dan muncul kembali di tempat yang sama, tanpa animasi geser, dan peta tidak ikut bergeser. Meminimalkan tidak membuka lapak, tidak memotong uang, dan tidak mengubah apa pun; isi kartu selalu dihitung ulang dari keadaan terbaru (misalnya setelah pindah lokasi). Atur bahan, resep, harga, atau lokasi bila perlu, lalu tekan **BUKA LAPAK**. Sewa, gaji, dan biaya perawatan dibayar saat itu, satu kali.
2. **Berjualan.** Pejalan kaki lewat di trotoar. Yang melihat gerobakmu akan menimbang harga, panjang antrean, dan stok, lalu mungkin ikut antre dan membeli. Setelah minum, mereka bereaksi singkat ("Segar banget!", "Kurang manis."). Arahkan kursor ke seseorang untuk melihat selera dan batas harganya.
3. **Tutup (19:00, atau 21:00 dengan Lampu Malam).** Laporan harian muncul. Es yang tersisa akan mencair semalaman.

Kalau cuaca buruk atau sedang tidak menguntungkan, kamu bisa memilih **Libur**: tidak ada sewa dan gaji, tetapi es tetap mencair dan popularitas sedikit turun.

**Kontrol:**

| Tombol | Fungsi |
| --- | --- |
| Spasi | Jeda cepat / lanjut tanpa menu (persiapan atau berjualan) |
| Esc | Tutup panel; kalau tidak ada panel, buka/tutup menu jeda |
| 1 / 2 / 3 | Kecepatan 1× / 2× / 4× |
| + / − atau roda mouse | Zoom |
| Seret peta / tombol panah | Geser kamera |
| C | Kembali ke gerobak |
| Klik gerobak | Atur harga cepat |
| R, B, L, G, U, F, P, S | Buka panel Resep, Bahan, Lokasi, Gerobak, Alat, Staf, Promosi, Statistik |
| M | Menu jeda |

## Keputusan yang harus kamu ambil

Setiap sistem saling memengaruhi. Beberapa pertanyaan yang akan sering muncul:

- Hari ini panas terik. Naikkan harga? Beli es lebih banyak?
- Besok diperkirakan hujan. Apakah stok perlu dikurangi supaya es tidak terbuang?
- Kawasan Premium sewanya mahal sekali. Apakah resepmu cukup enak untuk membayarnya?
- Resep terlalu manis atau terlalu encer? Apakah menambah teh sepadan dengan biaya bahannya?
- Antrean sering penuh. Rekrut peracik teh atau beli dispenser?
- Ada berita "Festival Kuliner di Pusat Kota". Pindah lokasi hari ini?

## Sistem permainan

### Cuaca dan suhu

Ada 10 jenis cuaca. Masing-masing memengaruhi jumlah pejalan kaki, rasa haus, batas harga pembeli, dan seberapa peka mereka terhadap harga.

| Cuaca | Suhu puncak | Pengaruh utama |
| --- | --- | --- |
| Panas Terik | 35–38 °C | Permintaan melonjak, pembeli rela bayar lebih |
| Panas Cerah | 32–35 °C | Banyak pembeli potensial |
| Cerah Hangat | 29–32 °C | Di atas rata-rata |
| Cerah Berawan | 28–31 °C | Normal |
| Berawan | 26–29 °C | Penjualan lebih sedikit |
| Mendung | 25–28 °C | Minat minuman dingin turun |
| Sejuk Berangin | 21–25 °C | Permintaan rendah, pembeli sangat peka harga |
| Gerimis | 24–27 °C | Pejalan kaki berkurang |
| Hujan Deras | 22–25 °C | Jalanan sepi, risiko stok tidak terjual |
| Badai Petir | 22–25 °C | Hampir tidak ada yang keluar rumah |

- **Suhu berubah sepanjang hari.** Pagi lebih sejuk dan siang paling panas. Setiap 1 °C di atas 29 °C menaikkan rasa haus sekitar 4,5%.
- **Prakiraan besok** muncul di bilah atas. Prakiraan ini tepat sekitar 75% dari waktu, jadi kadang meleset. Cuaca juga bisa berubah pukul 13:00.
- **Resep tidak pernah diubah otomatis.** Cuaca hanya mengubah *jumlah* pembeli (yang berarti jumlah es yang terpakai) dan sedikit menggeser selera es pembeli. Kamu sendiri yang memutuskan berapa es per gelas.
- **Hujan bisa diredam.** Payung, kios beratap, mobil esteh, dan lokasi teduh (Pasar, Pusat Kota, Kawasan Premium) mengurangi dampak hujan.

### Berita harian

Setiap pagi ada satu berita yang bisa menguntungkan atau merugikan. Beberapa contoh:

- **Gelombang Panas Melanda Kota!** Semua orang lebih haus.
- **Festival Kuliner di Pusat Kota!** Pusat Kota jauh lebih ramai, tetapi pesaing juga bertambah.
- **Gaji Bulanan Cair!** Pekerja, guru, dan keluarga punya batas harga 20% lebih tinggi. Biasanya muncul di akhir bulan.
- **Promo Minuman Murah di Sebelah!** Persaingan naik di salah satu lokasi.
- **Jalan Utama Ditutup** dan **Hari Libur Nasional** mengubah keramaian lokasi tertentu.
- **Harga Gula Naik** dan **Pabrik Es Gangguan** membuat harga beli bahan naik hari itu.
- **Kampanye "Kurangi Gula"** membuat pembeli lebih suka teh yang kurang manis.

Berita tampil sebelum lapak dibuka, jadi kamu masih sempat menyesuaikan resep, harga, stok, promosi, atau lokasi.

### Resep, rasa, dan kepuasan

Resep terdiri dari takaran teh, gula, dan es per gelas, ditambah lemon setelah resep lemon dibuka. Setiap jenis pelanggan punya selera sendiri. Pelajar suka manis dan murah. Pekerja kantoran suka teh pekat dan tidak suka menunggu. Eksekutif mengutamakan kualitas.

- **Skor rasa** = 100 − 15 × selisih teh − 12 × selisih gula − 7 × selisih es, ± lemon, + bonus alat.
- **Kepuasan (0–100)** dihitung dari rasa (diberi bobot sesuai seberapa peduli pelanggan itu), harga dibanding harga wajar, lama antre, dan pelayanan (staf, payung saat terik, konsistensi dispenser, kesegaran es dari cooler).
  - Resep enak saja tidak cukup kalau harganya kemahalan atau antreannya lama.
- **Reaksi pelanggan** dipilih dari pengalaman nyata mereka, bukan acak. Contohnya "Esnya kebanyakan, rasa tehnya kurang terasa." atau "Enak, tapi harganya agak mahal." Paling banyak 3 balon teks tampil bersamaan. Daftar "Kata pelanggan" di pojok kiri bawah menyimpan reaksi terakhir.

### Tip

Pelanggan yang **sangat puas** kadang memberi tip ("Kembaliannya ambil aja!").

- **Kapan muncul:** tidak ada tip di bawah kepuasan 78. Peluangnya naik tajam mendekati 100. Wisatawan dan eksekutif memberi tip lebih sering dan lebih besar, sedangkan pelajar jarang.
- **Berapa besar:** tip kecil, kelipatan Rp 100, maksimal 30% harga dan maksimal Rp 5.000 per gelas.
- **Pembukuan:** tip langsung masuk kas tetapi **dicatat terpisah** dari pendapatan minuman.

### Harga wajar dan perkiraan penjualan

Harga sepenuhnya kamu yang tentukan. Setiap lokasi punya profil ekonomi sendiri: harga dasar, sewa, keramaian, daya beli, kepekaan harga, pesaing, dan selera pelanggan.

- **Harga wajar** = harga dasar lokasi × kualitas resep × cuaca × daya beli (berita) × popularitas.
- **Minat beli** turun kalau harga di atas harga wajar dan naik kalau di bawahnya. Seberapa tajam perubahannya tergantung lokasi: Kawasan Sekolah dan Pasar sangat peka harga, Kawasan Premium tidak.

Panel **Resep & Harga** dibuat seperti meja racik:
- gelas besar yang berubah warna, es, gula, dan lemon sesuai resep;
- tombol **[−] angka [+]** besar untuk teh, gula, es, dan lemon;
- meter rasa (Istimewa/Enak/Lumayan/Kurang pas) dengan satu petunjuk selera pelanggan setempat;
- modal per gelas, harga jual (dengan tombol −/+), dan untung per gelas;
- satu baris ringkas: harga wajar, perkiraan gelas, dan perkiraan laba.

Rincian bahan per gelas dan **Analisis harga** (tabel efek harga −Rp 1.000 sampai +Rp 1.000, minat beli, dan harga dengan perkiraan laba tertinggi) tersedia di bagian yang bisa dibuka-tutup. Peringatan singkat muncul kalau harga di bawah modal atau jauh di atas harga wajar.

### Rencana stok

Panel **Bahan** dibuka dengan kartu **saran hari ini**: perkiraan gelas, apa yang perlu dibeli, totalnya, dan tombol **Beli sesuai saran**. Di bawahnya ada stok tiap bahan dengan tombol paket. Tabel rencana stok lengkap (stok sekarang, perkiraan terpakai, saran beli dengan cadangan 15% dan es 8%, biaya, dan perkiraan sisa termasuk es yang mencair) ada di bagian **Rincian rencana stok**.

Tombol **Beli sesuai saran** selalu meminta konfirmasi dulu. Kamu tetap bebas membeli jumlah berapa pun yang muat di gerobak.

### Popularitas dan pelanggan tetap

- **Popularitas disimpan per lokasi.** Pindah lokasi tidak membawa popularitas lama.
  - **Naik** karena pembeli puas, harga wajar, pelanggan tetap, dan promosi.
  - **Turun** karena keluhan, antrean penuh, menunggu terlalu lama, dan bahan habis.
  - **Perubahannya bertahap:** maksimal +8 dan −10 per hari dari pengalaman pelanggan, lalu perlahan kembali ke nilai dasar lokasi setiap malam.
- **Pelanggan tetap:** pembeli yang sangat puas bisa menjadi langganan. Mereka sengaja datang lagi di hari-hari berikutnya dan berhenti datang kalau kecewa.

### Lokasi

Ada 11 lokasi, urut dari yang paling awal terbuka:

| Lokasi | Sewa/hari | Izin | Ciri khas |
| --- | --- | --- | --- |
| Perumahan Asri | Gratis | — | Tenang, pelanggan setia, popularitas cepat naik |
| Kawasan Sekolah | Rp 12.000 | Rp 120.000 | Sangat ramai jam sekolah, sepi akhir pekan, peka harga |
| Kampus | Rp 15.000 | Rp 200.000 | Mahasiswa hemat, ramai saat jeda kuliah & makan siang, sepi akhir pekan |
| Taman Kota | Rp 25.000 | Rp 280.000 | Ramai sore dan akhir pekan, suka es banyak, terbuka (rawan hujan) |
| Terminal Angkutan | Rp 30.000 | Rp 380.000 | Sangat padat jam berangkat & pulang kerja, penumpang tidak sabar |
| Pusat Kota | Rp 75.000 | Rp 550.000 | Pekerja kantoran berduit, pesaing ketat |
| Alun-Alun Kota | Rp 35.000 | Rp 700.000 | Keluarga, ramai malam & akhir pekan, cocok dengan Lampu Malam |
| Kawasan Perkantoran | Rp 70.000 | Rp 750.000 | Puncak makan siang, daya beli tinggi, butuh saji cepat, sepi akhir pekan |
| Pasar Tradisional | Rp 40.000 | Rp 900.000 | Padat pagi hari, bahan 12% lebih murah, teduh |
| Pantai Wisata | Rp 55.000 | Rp 1.000.000 | Sangat laris saat terik, kosong saat hujan, ramai akhir pekan |
| Kawasan Premium | Rp 180.000 | Rp 1.200.000 | Daya beli sangat tinggi, tapi hanya untung kalau resepnya istimewa |

Setiap lokasi adalah dunia 36×36 petak (dulu 24×24). Lingkungan asli di sekitar gerobak tetap di tengah, dan di sekelilingnya ada jalan, trotoar, bangunan, dan landmark baru yang khas untuk lokasi itu:
- **Perumahan Asri:** gang yang mengelilingi kompleks, lebih banyak rumah, musala, lapangan voli RW, dan pos ronda.
- **Kawasan Sekolah:** Jl. Pendidikan dengan deretan kios pelajar, jalan samping, SMA dengan lapangan basket, dan perumahan guru.
- **Kampus:** gedung fakultas mengelilingi taman tengah, ditambah Fakultas Hukum & Kedokteran, masjid kampus, asrama, GOR dengan lapangan, dan deretan fotokopi/warnet/laundry.
- **Taman Kota:** deretan kafe & toko yang menghadap taman, masjid, danau dengan jalur lari, panggung, dan taman bunga.
- **Terminal:** bus parkir di antara peron, pool & bengkel bus, pangkalan angkot dan agen travel, musala, serta deretan warung makan dan pangkalan ojek.
- **Pusat Kota:** blok-blok baru dengan menara, apartemen, rumah sakit, balai kota, bioskop, stasiun, swalayan, dan taman kecil berair mancur.
- **Alun-Alun:** dua beringin besar, pendopo joglo, lapak kuliner; kini dikelilingi jalan di keempat sisinya, dengan Masjid Agung, Kantor Bupati, bank, dan pertokoan.
- **Perkantoran:** menara kantor, food court, dan parkiran, ditambah jalan raya kedua, gedung parkir, masjid, co-working, hotel bisnis, gedung bursa, dan taman korporat.
- **Pasar Tradisional:** gudang dan grosir, pasar ikan, lebih banyak lapak, halte angkot, dan deretan ruko.
- **Pantai:** garis pantai diagonal dengan jalan papan sepanjang peta, resor & hotel di tepi jalan pantai, kampung nelayan, dan dermaga kayu ke tengah laut.
- **Kawasan Premium:** menara hunian, klinik, rumah sakit, galeri, showroom, dan promenade butik.

Pejalan kaki datang dan pergi dari banyak pintu masuk di semua sisi peta serta dari pintu-pintu bangunan, dan memilih rute yang berbeda-beda. Karena peta lebih luas, sebagian orang berjalan jauh dari gerobak; jumlah pejalan kaki disesuaikan otomatis supaya jumlah orang yang **melihat** gerobakmu tetap sama seperti keseimbangan ekonomi lokasi itu. Jadi permintaan, sewa, pengaruh cuaca, dan jenis pelanggan tiap lokasi tidak berubah. Saat lapak dibuka, orang yang sedang lewat langsung bisa mampir, sehingga perkiraan penjualan dan hasil nyata lebih dekat.

Lokasi baru terbuka dengan uang ditambah syarat kemajuan, misalnya jumlah gelas terjual, kepuasan pelanggan, atau jumlah lokasi yang sudah dibuka.

### Gerobak

Ada 9 gerobak dan kendaraan. Tidak ada yang unggul di semua hal:

| Gerobak | Harga | Kelebihan | Kekurangan |
| --- | --- | --- | --- |
| Gerobak Es Teh Klasik | gratis | tanpa biaya perawatan | kecil, lambat |
| Gerobak Sepeda | Rp 90.000 | saji cepat, terlihat dari jauh | stok & antrean paling kecil |
| Gerobak Kayu Plus | Rp 180.000 | kapasitas 2× lipat | — |
| Gerobak Modern | Rp 280.000 | saji cepat, es lebih awet | kurang memikat |
| Gerobak Vintage | Rp 340.000 | paling memikat, popularitas naik cepat | saji lambat |
| Booth Kios Modern | Rp 650.000 | beratap (tahan hujan), cepat | perawatan mulai mahal |
| Gerobak Premium | Rp 780.000 | rasa +3, stok besar | perawatan tinggi |
| Gerobak Festival | Rp 950.000 | antrean 12 orang, saji kilat | perawatan sangat tinggi |
| Mobil Esteh | Rp 1.600.000 | kapasitas raksasa, beratap | paling mahal |

Gambar gerobak di toko dibuat oleh fungsi yang sama dengan gerobak di peta (`render/cartModel.ts`). Pratinjau dirender 1:1 lalu diperbesar piksel per piksel, jadi kanopi, badan, roda, tanda, dan peralatan yang terpasang selalu sama persis dengan di peta. Penjual berdiri di balik meja dan menuang serta menyerahkan es teh setiap ada penjualan.

### Peralatan, staf, dan promosi

- **20 peralatan dalam 4 kelompok.** Semuanya mengubah angka permainan, dan sebagian besar juga terlihat di gerobak.
  - **Penyimpanan Bahan:** kotak es, cooler, wadah konsentrat teh, dispenser gula, rak gelas.
  - **Racik & Saji:** meja racik, gelas takar, panci seduh, dispenser teh, termometer & timer, kasir QRIS.
  - **Perlengkapan Gerobak:** payung, terpal anti hujan, roda & sasis, lampu malam, lampu hias.
  - **Usaha & Pelanggan:** papan nama, papan menu, tiang & tali antrean, kartu stempel langganan.
  - **Gerobak beratap:** kios dan mobil esteh tidak memakai payung dan terpal karena sudah beratap. Toko memberi tahu hal ini.
- **4 staf:** penjual, peracik teh, kasir, dan supervisor. Ada biaya rekrut dan gaji harian. Staf memengaruhi kecepatan, daya tarik, kesabaran pembeli, kepuasan, dan peluang tip.
- **5 jenis promosi:** berlaku di lokasi tempat promosi dijalankan, dengan efek yang makin kecil kalau ditumpuk.

### Menjual aset

Kalau kas tidak cukup untuk belanja bahan, peralatan dan gerobak cadangan bisa dijual kembali lewat panel **Jual Aset** (dari tautan di panel Alat, Gerobak, dan Bahan, dari kartu persiapan, atau dari peringatan "Kas menipis!").

- Harga jual selalu **80% dari harga beli** (susut 20%), dibulatkan ke bawah: Rp 100.000 → Rp 80.000, Rp 50.000 → Rp 40.000. Yang dipakai adalah harga yang dulu kamu bayar, bukan harga toko sekarang (simpanan lama memakai harga katalog).
- Setiap penjualan minta konfirmasi, menampilkan harga beli, susut, uang yang diterima, kas sesudahnya, dan efek yang akan hilang. Efek alat (kapasitas, kecepatan, daya tarik, dll.) langsung hilang.
- Tidak bisa dijual: gerobak yang sedang dipakai, gerobak awal (tidak punya nilai jual), alat yang menjadi dasar alat lain (misalnya Kotak Es selama Cooler masih terpasang), dan alat penyimpanan kalau stok sekarang tidak akan muat lagi. Bahan (teh, gula, es, gelas, lemon), izin lokasi, resep, dan staf bukan aset.
- Uang dari penjualan masuk kas dan tercatat di laporan sebagai **Penjualan aset** (arus kas, bukan laba).
- **Tidak ada pinjaman, utang, kredit pemasok, atau uang gratis.** Kalau bahan habis, kas kurang, dan tidak ada aset tersisa, permainan menawarkan memuat simpanan lain atau memulai usaha baru, tanpa menghapus simpanan ini.

### Laporan dan statistik

Laporan akhir hari dibuat ringkas: laba bersih besar di atas, empat angka utama (gelas terjual, kepuasan, popularitas, pembeli yang pergi), empat baris uang (pendapatan, tip, biaya bahan, operasional), alasan pembeli pergi, dan hal yang baru terbuka. **Rincian keuangan** yang bisa dibuka memuat:
- gelas terjual, pendapatan minuman, dan tip;
- biaya bahan (terpakai dan terbuang) dan laba kotor;
- sewa, gaji, promosi, operasional lain, dan laba bersih;
- kepuasan dan perubahan popularitas;
- pelanggan hilang (kemahalan, antrean penuh, bosan menunggu, bahan habis);
- arus kas (kas awal + arus kas = kas akhir).

Rumus yang dipakai:
- **Laba kotor** = pendapatan minuman − biaya bahan
- **Laba bersih** = pendapatan minuman + tip − biaya bahan − sewa − gaji − promosi − operasional lain

Rincian keuangan tidak ditampilkan di layar permainan, hanya di laporan dan panel **Statistik**. Tab **Hari Ini** berisi angka keuangan hari berjalan, kepuasan, popularitas, alasan pembeli pergi, dan komentar pelanggan terbaru. Tab lainnya: Ringkasan, Riwayat Hari (30 hari), **Analisis** (laba per hari menurut lokasi, harga, resep, dan cuaca), dan Target.

## Suara

Semua suara dibuat khusus untuk ESTEH (disintesis dengan skrip, bukan rekaman atau musik orang lain) dan ikut dibundel di `public/audio/`, jadi tidak ada yang diunduh dari server lain.

- **Musik latar "Teh Sore":** lagu instrumental santai 84 BPM (piano elektrik, marimba, petikan gitar, bas lembut, dan brush) sepanjang 24 bar yang berulang tanpa jeda. Sistem suara disiapkan sejak halaman dibuka: semua berkas langsung diunduh dan didekode di layar judul. Kalau browser mengizinkan autoplay, musik langsung terdengar di menu utama. Kalau browser memblokirnya (perilaku bawaan Chrome, Safari, dan Firefox untuk situs yang belum pernah diinteraksi), muncul tulisan kecil "Musik akan diputar setelah klik pertama", dan musik serta bunyi klik langsung terdengar pada klik atau tombol pertama di layar mana pun, termasuk menu utama. Musik tidak pernah diputar ulang dari awal saat membuka menu, masuk permainan, menjeda, atau kembali ke menu utama, dan tidak pernah terputar dobel. Saat menu jeda terbuka, musik bisa tetap normal, dipelankan (bawaan), atau dimatikan.
- **Efek suara:** klik lembut untuk tombol (satu klik = satu bunyi; tombol nonaktif tidak berbunyi), bunyi kasir "cha-ching" setiap kali penjualan benar-benar selesai (bahan terpakai dan uang tercatat), bunyi beli bahan, bunyi koin untuk membeli alat/gerobak/staf/promosi, bunyi gagal saat uang kurang atau aksi tidak diizinkan, denting saat ada yang terbuka atau target tercapai, bel pintu saat lapak dibuka, nada penutup saat hari selesai, dan bunyi pendek saat stok menipis atau habis.
- **Pengaturan → Suara:** semua suara (bisu/aktif), musik aktif/mati, volume musik, efek aktif/mati, volume efek, dan musik saat jeda. Perubahan langsung terdengar dan disimpan di browser untuk semua simpanan permainan. Volume bawaan: musik 25%, efek 70%.
- Kalau browser tidak mendukung audio atau berkas gagal dimuat, permainan tetap berjalan tanpa suara.

Untuk membuat ulang berkas suara: `python3 scripts/audio/generate_audio.py` (butuh numpy, scipy, dan `lame`).

## Simpanan

- **Slot bernama:** setiap usaha punya slot sendiri dengan ID unik (`esteh.slot.<id>` di LocalStorage). ID tidak pernah diambil dari nama, jadi dua usaha dengan nama sama tetap terpisah. Menyimpan game yang sama selalu menimpa slotnya sendiri, tidak membuat duplikat, dan tidak menyentuh simpanan lain.
- **Kapan menyimpan:** otomatis setiap beberapa detik, setiap ada aksi penting, saat tab ditutup, dan saat kembali ke menu utama. Bisa juga lewat **menu jeda → Simpan Permainan**.
- **Simpanan lama:** simpanan lama (satu slot, versi 2–3) otomatis dipindah menjadi slot bernama ("ESTEH" milik "Juragan") lalu dimigrasi ke versi 4.
- **Simpanan rusak:** ditandai di daftar Muat Permainan, tidak bisa dimuat (jadi tidak membuat game macet), tapi bisa dihapus.

## Tampilan

Antarmuka memakai identitas **Amber Tea + Cream**:

| Peran | Nama | Kode |
| --- | --- | --- |
| Latar | krem hangat | `#F5E6C8` |
| Panel | gading lembut | `#FFF8E9` |
| Judul | cokelat teh | `#6B4226` |
| Tombol utama | amber | `#C98A32` |
| Sorotan | madu | `#E7B65C` |
| Teks utama | cokelat tua | `#38271D` |
| Teks kedua | cokelat lembut | `#75583F` |
| Garis | karamel | `#D8C19A` |
| Positif | hijau lembut | `#397A55` |
| Negatif | merah hangat | `#B9473E` |

Semua warna diambil dari variabel CSS di `src/styles/main.css`. Warna ini dipakai secukupnya untuk antarmuka (krem dan cokelat); peta tetap memakai warna alami. Ukuran layar: panggung permainan mengikuti bentuk layar. Di layar 16:9 ukurannya tepat 1280×720 (tampilan desktop tidak berubah); di layar lain ia melebar atau meninggi tanpa pita hitam dan tanpa terpotong, dengan skala minimum supaya teks dan tombol tetap terbaca di ponsel. Notch dan indikator home iPhone dihormati (safe area), dan rotasi layar langsung disesuaikan.
- **Ponsel tegak:** HUD terbagi menjadi beberapa baris, bilah alat selebar layar, panel menu dan kartu persiapan muncul sebagai lembar dari bawah sehingga gerobak tetap terlihat di atasnya, dan kotak gerobak muncul di atas gerobak.
- **Ponsel mendatar:** bilah alat ramping, kartu persiapan menaruh tombol **BUKA LAPAK**, Ganti Lokasi, dan Libur di bagian atas, dan panel dapat digulir.
- **Layar sentuh** (ponsel dan tablet): tombol dan pengatur dibuat lebih besar, tooltip hanya muncul sebentar saat diketuk, dan ketukan pada gerobak tidak dianggap sebagai geser peta.
- Kanvas digambar sesuai piksel layar yang sebenarnya (maksimal 2× agar ringan), jadi seni piksel dan balon kata tetap tajam.

Sudah diperiksa di 320×568, 375×667, 390×844, 430×932, 768×1024, 568×320, 844×390, 932×430, 1366×768, dan 1920×1080: semua elemen penting terlihat, tombol utama bisa diketuk, dan gerobak tetap di area bermain.

Di layar judul, nomor versi dan keterangan penyimpanan ada di kiri bawah. **"A game by Rafi Aziz"** ada di kanan bawah, sejajar dengan nomor versi. Lencana "Powered by Netlify" yang dipasang Netlify di pojok kanan bawah boleh menutupinya.

Halaman selalu pas satu layar tanpa bilah gulir: panggung memakai ukuran piksel bulat dengan skala yang tidak pernah melebihi jendela, dan wadahnya tidak bisa digulir.

Gaya peta:
- seni piksel isometrik dengan garis tepi gelap yang konsisten;
- cahaya dari kiri atas, dan bayangan bangunan serta pohon jatuh ke kanan bawah;
- trotoar bertepi dan jalan bergaris tepi;
- jendela berbingkai dan berambang, sebagian rumah bercerobong;
- karakter berupa sprite piksel bergaris tepi yang disimpan dalam cache, dengan arah hadap depan/belakang dan animasi jalan 4 langkah.

## Untuk pengembang

### Struktur proyek

```
src/
  main.ts                 boot, skala layar, hook simpan/muat
  game/                   GameState (tipe + migrasi), Game (semua aksi pemain, siklus hari), loop, renderer, kamera
  data/
    balance.ts            SEMUA angka penyeimbang (rasa, kepuasan, tip, popularitas, pelanggan tetap, cuaca, stok)
    weather.ts            10 jenis cuaca dan parameternya
    events.ts             berita harian dan efek mekaniknya
    locations.ts          profil ekonomi tiap lokasi
    mapKit.ts             ukuran peta bersama (36×36) dan pembantu tata letak (rumah, bangunan, jalan setapak)
    maps.ts, mapsMore.ts  tata letak 11 peta
    customers.ts          jenis pelanggan (selera, kepekaan harga/antre, kecenderungan tip)
    carts.ts              SATU definisi tiap gerobak: statistik + tampilan (CartLook)
    upgrades.ts           katalog peralatan per kelompok
    supplies.ts, business.ts
  systems/
    EconomySystem.ts      model permintaan, harga wajar, kepuasan, tip, laba
    ForecastSystem.ts     perkiraan penjualan, tingkat permintaan, opsi harga, rencana stok
    ExposureSystem.ts     berapa banyak pejalan kaki melihat gerobak; menjaga arus pembeli tetap sama di peta besar
    AssetSystem.ts        menjual alat & gerobak cadangan: aturan harga 80%, syarat boleh dijual
    CustomerSystem.ts     simulasi pejalan kaki, antrean, penjualan, reaksi, pelanggan tetap
    WeatherSystem.ts      cuaca harian, prakiraan, kurva suhu
    EventSystem.ts        pemilihan berita dan penerapan efeknya
    ReactionSystem.ts     kalimat reaksi berdasarkan pengalaman
    RecipeSystem.ts, InventorySystem.ts, Modifiers.ts, ProgressionSystem.ts, SaveSystem.ts
  world/                  grid peta, pathfinding A*, rute pejalan kaki
  render/
    cartModel.ts          renderer gerobak tunggal (peta dan toko) + penjual
    characters.ts         sprite karakter piksel bergaris tepi (cache), penampilan penjual
    ground.ts, structures.ts, props.ts   tanah + bayangan, bangunan, pohon & properti
  ui/
    TitleScreen.ts        menu utama, usaha baru, muat permainan, pengaturan, kredit
    UI.ts                 pengendali layar permainan: HUD, bilah alat, satu panel, menu jeda, kotak gerobak, efek
    panels.ts             HUD, kartu lokasi, kartu persiapan, kotak gerobak, menu jeda, laporan
    menusBusiness.ts      panel Resep (meja racik), Bahan, Lokasi, Alat, Gerobak
    menusManage.ts        panel Staf, Promosi, Statistik
    dom.ts, widgets.ts, icons.ts   morph DOM, tooltip, dialog, ikon piksel
  audio/
    AudioManager.ts       satu-satunya pemutar suara (Web Audio): musik berulang, efek, volume, bisu
    audioConfig.ts        daftar berkas suara dan kerasnya masing-masing
    gameSounds.ts         menghubungkan klik tombol dan kejadian permainan ke suara
scripts/
  test.ts                 unit test (node:test, tanpa dependensi tambahan)
  simulate.ts             simulasi banyak hari + pengecekan pembukuan
  audio/generate_audio.py pembuat musik & efek suara (hasilnya di public/audio)
```

### Prinsip

- **Satu sumber kebenaran.** Hanya ada satu `GameState`. Renderer tidak pernah mengubah state, dan UI hanya membaca state lalu memanggil method `Game`.
- **Rumus yang sama di mana-mana.** Simulasi, perkiraan, dan tooltip memakai rumus yang sama (`EconomySystem.demand`, `satisfactionFor`, dan seterusnya), jadi angka yang ditampilkan selalu konsisten dengan apa yang terjadi.
- **Perkiraan bisa diuji.** `npm run sim` mencetak selisih perkiraan dengan hasil nyata, biasanya sekitar 10–15%.

## Batasan saat ini

- Hanya satu gerobak yang berjualan per hari. Gerobak lain bisa dimiliki dan ditukar, tetapi belum berjualan paralel.
- Hanya ada satu resep aktif. Kalau satu bahan habis, penjualan berhenti sampai kamu membeli lagi.
- Pejalan kaki tidak saling bertabrakan.
- Belum ada suara.
- Tampilan dioptimalkan untuk desktop (1280×720 ke atas, diskalakan otomatis).

## Rencana pengembangan

- Beberapa gerobak berjualan bersamaan di lokasi berbeda.
- Resep alternatif dan menu kedua (teh tarik, teh susu) sebagai cadangan saat bahan habis.
- Pesaing yang bereaksi terhadap harga dan kualitasmu.
- Harga pemasok yang naik-turun mingguan dan kontrak pemasok.
- Efek suara, pengaturan, dan beberapa slot simpanan.
