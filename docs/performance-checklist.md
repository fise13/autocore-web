# Performance verification checklist

Run Lighthouse on marketing `/` and dashboard `/motors` with CPU 4× slowdown and mobile viewport.

## Targets

| Metric | Target |
|--------|--------|
| Marketing LCP | < 2.5s |
| Dashboard route switch (cache hit) | < 100ms perceived |
| Landing scroll | No visible jank on sticky nav |

## Manual checks

1. Landing scroll — sticky nav stays smooth while scrolling through all sections.
2. Login screen — floating paths respect reduced motion; no background RAF when tab hidden.
3. Dashboard navigation — visit `/` → `/motors` → `/warehouse` → `/motors`; second visit to motors should feel instant.
4. Background panels — open DevTools Performance; hidden cached routes should not fire ScrollTrigger callbacks.
5. Low tier simulation — Chrome DevTools → Performance → CPU 6× slowdown; navigation and scroll remain usable with animations visible on active screen.

## Bundle analysis

```bash
npm run analyze
```

Opens webpack bundle report after production build.
