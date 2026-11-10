const WIDTHS = [400, 800, 1200];

export function variantUrl(src, width) {
  if (typeof src !== 'string' || !/^\/uploads\/(blogs|ads)\//.test(src)) return null;
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
    onError: (event) => {
      // A pre-backfill image may not have variants yet. Remove srcset once so
      // the browser retries the unchanged original src.
      event.currentTarget.removeAttribute('srcset');
      event.currentTarget.removeAttribute('sizes');
    },
  };
}
