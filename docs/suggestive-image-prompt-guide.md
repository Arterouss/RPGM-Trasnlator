# Prompt Ref Foto "Semi 18+" (Suggestive, Bukan Explicit)

## Strategi Prompt untuk Gemini Gem

Filter image model lebih mudah dilewati lewat **kata sifat artistik** daripada kata vulgar. Jangan pakai kata "sexy/nude/18+" — ganti dengan istilah fotografi & fashion.

### Kata Kunci Aman yang Hasilnya Suggestive

- `elegant boudoir photography` — foto intim gaya studio, pakaian dalam elegan
- `lingerie fashion editorial` — editorial majalah fashion lingerie
- `soft glamour portrait, silk robe` — potret glamor dengan kimono sutra
- `off-shoulder, cinematic lighting` — bahu terbuka, lighting sinematik
- `wet look, beach photoshoot, vogue style` — basah kuyup gaya majalah
- `sensual but tasteful, artistic nude-inspired silhouette` — siluet, tanpa detail
- `low-cut dress, golden hour lighting` — dada terbuka secukupnya
- `bedroom scene, morning light, cozy intimate atmosphere` — suasana intim tanpa eksplisit

### Contoh Prompt Jadi

```
Boudoir photography, woman in silk robe sitting by window, soft morning
light, elegant and tasteful, editorial magazine style, shallow depth of
field, 85mm lens
```

### Trik Tambahan

1. **Framing artistik**: tambahkan `fine art photography`, `tasteful`, `classy` — ini menandakan konten artistik, bukan vulgar, jadi filter longgar.
2. **Hindari kata**: `nude`, `naked`, `explicit`, `erotic` — ganti `implied`, `silhouette`, `covered`, `strategically draped`.
3. **Iterasi bertahap**: generate dulu versi berpakaian, lalu minta edit "remove jacket", "lower the neckline slightly" per langkah.
4. **Style reference**: sebut gaya fotografer/majalah (mis. "Victoria's Secret catalog style", "boudoir studio style").

## AI/Software Alternatif dengan Filter Lebih Longgar

| Tool                                        | Catatan                                                                                                        |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Stable Diffusion (lokal, ComfyUI/A1111)** | Full control, tanpa filter, jalankan di GPU sendiri. Pakai model checkpoint realistis + LoRA sesuai kebutuhan. |
| **Fooocus**                                 | SD dengan UI simpel, jalankan lokal.                                                                           |
| **Civitai**                                 | Galeri + download model SD khusus berbagai gaya; ada on-site generator.                                        |
| **NovelAI**                                 | Berbayar, filter longgar untuk konten anime/semi-18+.                                                          |
| **PixAI / SeaArt**                          | Generator online berbasis SD, filter moderat.                                                                  |
| **Mage.space / Tensor.art**                 | Berbasis SD, opsi NSFW toggle di pengaturan.                                                                   |

## Rekomendasi Praktis

- Kalau cuma butuh **suggestive** (bukan explicit): Gemini Gem + prompt boudoir/editorial di atas biasanya cukup.
- Kalau mau **kontrol penuh tanpa filter**: Stable Diffusion lokal (ComfyUI + checkpoint realistis dari Civitai) — sekali setup, bebas.
