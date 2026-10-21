import { visionMatrices } from "@/lib/vision";

const names = Object.keys(visionMatrices) as (keyof typeof visionMatrices)[];

/** Hidden SVG defs for the color-vision filters referenced by lib/vision.ts. */
export function VisionFilters() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" className="vision-filters">
      <defs>
        {names.map((name) => {
          const values = visionMatrices[name]
            .map((row) => `${row.join(" ")} 0 0`)
            .concat("0 0 0 1 0")
            .join(" ");
          return (
            <filter key={name} id={`prism-vision-${name}`} colorInterpolationFilters="linearRGB">
              <feColorMatrix type="matrix" values={values} />
            </filter>
          );
        })}
      </defs>
    </svg>
  );
}
