Animated corpus — Framer Motion / GSAP slides

Each `anim-NN-*.html` is a self-contained 1280×720 slide that uses
JavaScript animation libraries (Framer Motion or GSAP). They are NOT
intended for the static-emit pipeline: the existing renderer freezes
animations, so it would only ever capture the first frame.

The `slidify capture-gif` command (or `_bench/scripts/capture_anim.py`)
loads each HTML in headless Chromium *without* the freeze, samples N
frames at the declared fps, and writes an animated GIF beside the source.

Each HTML declares its capture parameters via meta tags:

  <meta name="slidify-capture-duration" content="3000">  <!-- ms -->
  <meta name="slidify-capture-fps" content="15">

Defaults: 3000ms duration, 15fps (45 frames at 1280×720).

To embed in a deck: reference the resulting GIF as
`<img src="anim-NN-foo.gif">` from a normal slide HTML. slidify's
classifier picks the unit as NativePicture and add_picture() preserves
the GIF animation in PowerPoint slideshow mode.

`embed-demo-deck.html` in this directory is a 3-slide example. Compile
with:

    slidify convert _bench/corpus/animated/embed-demo-deck.html out.pptx

slidify resolves relative `<img src>` paths against the source HTML's
parent directory (inlining as data URIs before render), so the same
deck works on any machine without absolute paths baked in.
