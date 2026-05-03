### Style brief: PHOTO-HEAVY / IMAGE-EFFECT EDITORIAL

**References:** *The Atlantic* feature articles, *Wired* covers, *The
Verge* feature stories, *NYT Magazine* photo essays, Apple TV+ promo
art, A24 film websites, *Cabinet*, *Real Life Mag*, *Aperture* online.
Image-led storytelling where typography and photography blend.

**Voice:** atmospheric, narrative, longer-form. The photo is the
argument; the type is the punctuation.

**Image source.** Use **Unsplash hero images** via direct URLs — slidify
fetches them at emit time. Curate to topic; use these reliable patterns:
- Landscape: `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1280`
- Portrait: `https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1280`
- Architecture: `https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1280`
- Texture: `https://images.unsplash.com/photo-1518770660439-4636190af475?w=1280`
- Product / object: `https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1280`
- Color field: `https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=1280`
- Black & white: `https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=1280`
- Aerial: `https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1280`

If a photo doesn't load on the destination machine the slide should
still read — never rely on the photo for *content*, only for *mood*.

**Palette:** unconstrained per slide — derived from the photo. But for
overlay typography use one of:
- Pure white at 1.0 alpha
- Pure black at 1.0 alpha
- Off-white at 0.92 alpha
- A single saturated accent (vermilion, electric blue, neon green)

**Typography:**
- Display: 80-160px, weight 700-900, letter-spacing -0.04em.
  `font-family: 'Tiempos Headline', 'Source Serif Pro', Georgia, serif;`
  for editorial slides; `'Inter Display', sans-serif` for modern slides.
  Choose ONE per slide.
- Body: 16-20px, weight 400-500, line-height 1.5.
- Caption: 11-13px, italic, weight 400.

**Mandatory image-effect vocabulary (use ≥3 per slide):**

1. **Full-bleed photo + text overlay**: `<img>` set to `position:absolute;
   inset:0; width:100%; height:100%; object-fit:cover;` + a typography
   layer above with high contrast.

2. **Faded photo overlay**: photo with `opacity: 0.35-0.55` so type sits
   readable on top. Variant: photo at full opacity beneath a
   `background: linear-gradient(180deg, rgba(0,0,0,0.65) 0%, transparent
   50%, rgba(0,0,0,0.85) 100%)` darkening overlay div.

3. **Text as image mask** (the key effect the user asked for): use
   `background-clip: text` with `background: url(<photo>) center/cover;
   color: transparent;` on a display-sized headline. The photo only
   shows through the text glyphs — type IS the window into the image.

4. **Duotone treatment**: photo with `filter: grayscale(1) contrast(1.2);`
   PLUS a colored `mix-blend-mode: multiply` overlay block on top
   (e.g. a div with `background: #1e5f8c` at the image's bbox + blend
   mode multiply). Slidify will raster-emit this — but emit it.

5. **Type bleeds INTO image**: half the headline overlaps the photo,
   half overlaps the bg. Use `position:absolute` with negative margins
   so the type physically straddles the photo's edge.

6. **Photo grid mosaic**: 3×2 or 2×3 of small `<img>` tiles, each with
   `border-radius: 4-8px`, with caption text below each.

7. **Photo with glass strip**: a translucent rectangle `background:
   rgba(255,255,255,0.08); backdrop-filter: blur(12px);` (slidify will
   raster the blur, but the layout reads even when rasterized) sitting
   over a photo, holding metadata.

8. **Photo with hard color border**: `border: 12px solid <accent>;` —
   gives a "polaroid" / gallery-frame feel.

**Layout families:**

1. **Cover**: full-bleed photo + giant headline (faded photo OR
   text-as-image-mask). One sentence. Tiny date/issue label in corner.
2. **Magazine spread**: photo on one side (50-60% width), text column on
   the other with kicker / headline / lede / footnote.
3. **Photo essay caption**: 1-2 large photos with rich captions
   underneath, like a museum wall label. Caption ≥ 60 words.
4. **Photo + pullquote**: photo as background at 35% opacity, giant
   pull-quote (60-100px serif) centered, attribution.
5. **Mosaic gallery**: 4-6 small photos in a grid + headline on the side.
6. **Duotone hero**: full-bleed duotoned photo + minimal type overlay.

**Things this brief EXPLICITLY does:**
- USE `<img>` tags with real image URLs (Unsplash above).
- USE `background-image: url(...)` with `background-clip: text`.
- USE `mix-blend-mode` (multiply, screen, difference, overlay).
- USE `filter: blur(...)`, `filter: grayscale(1)`, `filter: brightness(...)`.

**Things this brief EXPLICITLY rejects:**
- Going through slidify's decoration system (`data-slidify-decorate=...`)
  on slides where the photo IS the decoration.
- Stat-card / dashboard / data-viz layouts.
- Multi-color brand gradients — let the photo carry color.

**Density target:** 8-15 distinct elements per slide (photo dominates,
type is sparse).

**Note on slidify behavior:** slidify will likely raster-emit any
unit containing `<img>` AND any unit with `filter:` or
`mix-blend-mode`. That is INTENDED for this brief — we want to see
which raster fallbacks look beautiful and which look broken, so the
engine knows where to invest in better surgical-hybrid emission.
Authors should NOT try to dodge raster fallbacks; the rasters are
the data.
