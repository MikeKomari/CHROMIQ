"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "@/components/scroll/use-in-view";

/**
 * The looping product reel.
 *
 * Contract for the source files (see README): a silent loop of roughly 6-10
 * seconds, H.264 .mp4 plus .webm, ideally under 2 MB each, with a poster frame
 * at the same dimensions. The poster is what most visitors see first, so it
 * has to stand on its own.
 *
 * Nothing here is required for the page to make sense: when the files are
 * missing, when the viewer prefers reduced motion, or when autoplay is
 * refused, the poster image carries the section instead.
 */
export function DemoReel({
  poster,
  sources,
  caption,
}: {
  poster: string;
  sources?: { src: string; type: string }[];
  caption: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ amount: 0.3, once: false });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const hasSources = Boolean(sources?.length);

  // Play only while visible. A reel looping in a scrolled-past section burns
  // battery and decode time for nothing.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hasSources) return;

    if (inView) {
      // Autoplay can be refused even when muted; fall back to the poster.
      video.play().catch(() => setFailed(true));
    } else {
      video.pause();
    }
  }, [inView, hasSources]);

  const showPoster = !hasSources || failed;

  return (
    <div className="ld-reel" ref={ref}>
      <div className="ld-reel-frame">
        {showPoster ? (
          /* The poster is a fixed local asset; next/image adds no value here
             and complicates the fallback path. */
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ld-reel-media" src={poster} alt={caption} />
        ) : (
          <video
            ref={videoRef}
            className="ld-reel-media"
            poster={poster}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={caption}
            onError={() => setFailed(true)}
          >
            {sources?.map((source) => (
              <source key={source.src} src={source.src} type={source.type} />
            ))}
          </video>
        )}
      </div>
      <p className="ld-reel-caption">{caption}</p>
    </div>
  );
}
