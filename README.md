# Miya Lab M1 — PWA

Versi **Miya** berdasarkan PWA Gord Lab V11 yang dilampirkan. Layout tetap serupa: 5 slot musuh, 4 slot teman, pencarian 133 hero, hasil 6 item, alasan item, tombol Refresh urutan, tombol Salin, dan draft tersimpan pada perangkat.

## Cara pasang

1. Ekstrak **semua isi ZIP**, lalu upload **seluruh isi folder `miya-lab-pwa`** ke satu direktori hosting yang mendukung HTTPS. Jangan ubah nama atau pindah folder `assets`.
2. Buka `index.html` melalui HTTPS. Gunakan browser Chrome/Edge/Android atau Safari iOS yang mendukung PWA.
3. Pilih hero lawan dan teman. Hasil build berubah otomatis. Tekan `Refresh urutan` untuk membeli counter lebih awal; tekan item dengan titik biru untuk menukar opsi pertahanan ke ofensif. Draft disimpan melalui localStorage.
4. Gunakan **Install app / Add to Home Screen** dari browser. Buka sekali saat online untuk menyalin file program dan mulai mencache gambar sumber.

**PWA tidak dapat diinstal dengan membuka `index.html` lewat `file://`.** Hosting HTTPS atau `localhost` diperlukan untuk service worker. App shell dan fallback ikon dibundel agar logika dan tampilan berfungsi offline setelah service worker terpasang.

## Struktur

- `index.html`: tampilan identik gaya Gord Lab, tetapi khusus Miya.
- `data.js`: 133 profil hero dari source pengguna + 16 item Miya, beserta metadata stat dasar.
- `logic.js`: pemilihan critical/on-hit dan scoring draft yang deterministik.
- `app.js`: interaksi pencarian, draft, refresh, copy, render, cache gambar.
- `sw.js`: offline service worker (cache halaman, file, favicon, fallback thumbnail lokal; caching aset game saat image berhasil dimuat).
- `manifest.webmanifest`: metadata instalasi PWA.
- `favicon.png`, `icon-180.png`, `icon-192.png`, `icon-512.png`, `icon.svg`: **ikon PWA lokal bergambar bulan dan busur**, dibuat khusus untuk paket agar selalu tersedia tanpa internet. Bukan gambar resmi Miya.
- `assets/heroes/` dan `assets/items/`: thumbnail placeholder lokal untuk **seluruh** hero/item apabila gambar remote belum tersedia.
- `asset-sources.json`: semua URL gambar hero dan item game, berasal dari pola repositori dalam file asli (Ceplin03 GitHub dan MLBBHub). UI menggunakan gambar original dari sumber ini ketika online, dengan fallback lokal.
- `tests/test-build.js`: unit test untuk logika pemilihan item, kompatibilitas Golden Staff, duplikat, jumlah slot dan agregat stat.

## Detail build

- Jalur **critical**: Swift/Tough/Warrior Boots + Windtalker + Berserker's Fury + 3 slot sesuai lawan (Haas' Claws, Malefic Gun, Blade of Despair, Sea Halberd, Malefic Roar, Wind of Nature, Rose Gold Meteor).
- Jalur **on-hit anti-tank**: Boots + Corrosion Scythe + Demon Hunter Sword + Golden Staff + 2 slot situasional.
- **Golden Staff tidak digabung item critical** (Berserker's Fury dan Haas' Claws).
- Sea Halberd untuk heal/regen/shield; Malefic Roar untuk tebal; Wind of Nature untuk ancaman fisik; Rose Gold Meteor untuk magic burst. Pilihan terbatas 6 slot, jadi semua ancaman mungkin tidak tertutup.
- Menjumlahkan AS, critical chance, lifesteal, physical attack, serta gold **dari stat dasar item saja**. Tidak menghitung DPS/damage final atau mekanik pasif, level hero, emblem, spell, defense aktual, dan item musuh. Analisis ancaman memakai traits 0–3 milik profil hero dari source asli, bukan akses langsung ke match.
- Emblem Marksman; spell adaptif Inspire/Flicker/Purify.

## Gambar game / offline

**Penting:** file unggahan pengguna berisi URL gambar hero/item, bukan file gambar PNG-nya. Lingkungan pembuat paket tidak bisa mengambil seluruh file PNG remote. Karena itu **PNG asli game tidak disertakan dalam ZIP**; ia dimuat dari URL pada `asset-sources.json` jika koneksi tersedia dan dapat tercache oleh service worker. Fallback SVG lokal tersimpan di ZIP agar layout tetap lengkap dan terbaca saat offline. Bila situs sumber mengubah path atau memblokir hotlink, fallback dipakai. Avatar pada beranda memilih gambar Miya dari GitHub bila ada akses.

## Menjalankan test logika

`node tests/test-build.js`

## Referensi pengecekan gameplay/item

- https://www.mlbbdraft.com/en/build/miya (direview 28 Oktober 2026)
- https://mlbb.io/id/hero/miya/build (build komunitas Oktober 2026)
- https://mlbbhub.com/heroes/miya (contoh build critical dan anti-frontline, patch 2.2.16a)

Catatan: Ini bantuan pengambilan keputusan berbasis **draft**, bukan rekomendasi yang menjamin kemenangan. Verifikasi inventori musuh dan patch game saat bermain.
