import type { DocumentWatermarkRenderModel } from "@/lib/documents/watermark/build-watermark-render-model";
import { cn } from "@/lib/utils";

const PATTERN_TILE_COUNT = 56;

type DocumentWatermarkLayerProps = {
  watermark: DocumentWatermarkRenderModel;
  className?: string;
};

function WatermarkPatternGrid({ watermark }: { watermark: DocumentWatermarkRenderModel }) {
  const cells = Array.from({ length: PATTERN_TILE_COUNT }, (_, index) => index);

  return (
    <div className="doc-watermark__pattern" style={{ gap: watermark.repeatSpacing }}>
      {cells.map((index) => {
        const showLogo = index % 2 === 0 && watermark.logoDataUri;
        return (
          <div key={index} className="doc-watermark__pattern-cell">
            {showLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={watermark.logoDataUri} alt="" className="doc-watermark__pattern-logo" />
            ) : (
              <span className="doc-watermark__pattern-name">{watermark.companyName}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DocumentWatermarkLayer({ watermark, className }: DocumentWatermarkLayerProps) {
  if (!watermark.active) return null;

  return (
    <div
      className={cn(
        "doc-watermark",
        `doc-watermark--${watermark.type}`,
        `doc-watermark--pos-${watermark.position}`,
        watermark.grayscale && "doc-watermark--grayscale",
        watermark.blend === "multiply" && "doc-watermark--multiply",
        className,
      )}
      style={watermark.style}
      aria-hidden="true"
    >
      {watermark.type === "logo" && watermark.logoDataUri ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={watermark.logoDataUri} alt="" className="doc-watermark__logo-mark" />
      ) : null}

      {watermark.type === "brand_mark" ? (
        <div className="doc-watermark__brand-mark">
          {watermark.logoDataUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={watermark.logoDataUri} alt="" className="doc-watermark__brand-logo" />
          ) : null}
          {[0, 1, 2].map((line) => (
            <span key={line} className="doc-watermark__brand-line">
              {watermark.companyName}
            </span>
          ))}
        </div>
      ) : null}

      {watermark.type === "pattern" ? <WatermarkPatternGrid watermark={watermark} /> : null}
    </div>
  );
}
