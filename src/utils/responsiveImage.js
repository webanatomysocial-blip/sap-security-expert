const WIDTHS = [400, 800, 1200];

export function variantUrl(src, width) {
  if (typeof src !== 'string' || !/^\/uploads\/(blogs|ads)\//.test(src)) return null;
  // Generated variants are never sources themselves.
  if (/-(400|800|1200)\.webp$/i.test(src)) return null;
  const dot = src.lastIndexOf('.');
  if (dot <= src.lastIndexOf('/')) return null;
  return `${src.slice(0, dot)}-${width}.webp`;
}

export function responsiveImageProps(src, sizes = '(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 800px') {
  const candidates = WIDTHS.map((width) => ({ width, url: variantUrl(src, width) })).filter((item) => item.url);
  if (!candidates.length) return {};
  return {
    srcSet: candidates.map(({ width, url }) => `${url} ${width}w`).join(', '),
    sizes,
    // Default src is the 800w WebP so crawlers and non-srcset clients don't fetch the full-size original.
    src: variantUrl(src, 800),
    onError: (event) => {
      // A pre-backfill image may not have variants yet. Drop srcset and fall
      // back to the original once.
      const img = event.currentTarget;
      img.removeAttribute('srcset');
      img.removeAttribute('sizes');
      img.onerror = null;
      img.src = src;
    },
  };
}
