// ═══════════════════════════════════════════════════════════════════════
// LOGO — actual cito wordmark image
// ═══════════════════════════════════════════════════════════════════════
function CitoLogo({ size = 40 }) {
  return (
    <img src="assets/cito-tight.png" alt="cito" style={{ height: size, width: 'auto', display: 'block' }}
      className="cito-logo-img select-none pointer-events-none" />
  );
}

// Row of four sitting cats — uses the actual logo cat slices
function CatRow({ className = "", height = 24, gap = 8 }) {
  return (
    <div className={`inline-flex items-end cito-cat-row ${className}`} style={{ gap: `${gap}px` }}>
      <img src="assets/cat-1.png" alt="" style={{ height, width: 'auto' }} className="cito-cat-img select-none" />
      <img src="assets/cat-2.png" alt="" style={{ height, width: 'auto' }} className="cito-cat-img select-none" />
      <img src="assets/cat-3.png" alt="" style={{ height, width: 'auto' }} className="cito-cat-img select-none" />
      <img src="assets/cat-4.png" alt="" style={{ height, width: 'auto' }} className="cito-cat-img select-none" />
    </div>
  );
}

// Single cat — lets you pick which slice and how big
function CatSilhouette({ index = 3, height = 24, className = "", style = {} }) {
  return (
    <img src={`assets/cat-${index}.png`} alt="" style={{ height, width: 'auto', ...style }}
      className={`cito-cat-img select-none pointer-events-none ${className}`} />
  );
}

// Tiny "tail" SVG accent — used as a fluid divider/ornament
function TailFlourish({ className = "", width = 80, height = 24, color }) {
  const c = color || 'var(--hair)';
  return (
    <svg className={className} width={width} height={height} viewBox="0 0 80 24" fill="none">
      <path d="M2 12 C 14 12, 18 4, 30 4 S 50 20, 62 20 S 76 12, 78 12"
        stroke={c} strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  );
}
