# Landing page demo reel

Drop your recorded screen capture in this folder. The landing page looks for
these exact filenames:

| File | Required | Purpose |
| --- | --- | --- |
| `chromiq-reel.webm` | recommended | VP9/AV1 in WebM. Preferred by Chrome and Firefox. |
| `chromiq-reel.mp4` | recommended | H.264 in MP4. Needed for Safari and iOS. |
| `chromiq-reel-poster.svg` | present already | First frame, shown before the video plays. |

Nothing here is load-bearing. If both video files are missing, if the browser
refuses to autoplay, or if the viewer prefers reduced motion, the poster is
shown instead and the section still reads correctly. You can ship without the
video and add it later without touching any code.

## Recording contract

- **Silent.** The video is muted and has no controls, so audio would never be
  heard. Record without it.
- **6 to 10 seconds**, looping cleanly: the last frame should sit next to the
  first without a visible jump.
- **16:10**, which is what `.ld-reel-media` reserves. 1920×1200 or 1600×1000.
  A different ratio will be cropped, not letterboxed.
- **Under about 2 MB each.** This is the first thing a visitor downloads. Trim
  the duration before you trim the quality.
- Show one clear action — a token change moving through the preview surfaces —
  rather than a tour of the whole app.

## Replacing the poster

Export the frame you want as the still, then either save it as
`chromiq-reel-poster.svg` or save it under a new name and update the `poster`
prop in `components/landing/landing-scroll.tsx`. A `.png` or `.jpg` is fine;
the extension in the prop just has to match the file.

## Encoding

With ffmpeg, from a source capture named `capture.mov`:

```bash
# MP4 (H.264) — Safari, iOS
ffmpeg -i capture.mov -an -c:v libx264 -crf 26 -preset slow \
  -pix_fmt yuv420p -movflags +faststart chromiq-reel.mp4

# WebM (VP9) — Chrome, Firefox, usually the smaller of the two
ffmpeg -i capture.mov -an -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 \
  chromiq-reel.webm

# Poster, from one second in
ffmpeg -i capture.mov -ss 00:00:01 -frames:v 1 chromiq-reel-poster.png
```

`-an` drops the audio track. Check the output sizes before committing; raise
`-crf` to shrink the files further.
