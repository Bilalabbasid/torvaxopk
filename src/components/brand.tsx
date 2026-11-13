// Torvaxo wordmark and the "forward strip" chevrons (Brand Identity V1 geometry, from the German shop).

export function Logo({ className, mono = false }: { className?: string; mono?: boolean }) {
  return (
    <svg viewBox="0 -1 823.69 102" role="img" aria-label="Torvaxo" fill="currentColor" className={className}>
      <polygon points="0,0 92,0 92,17 0,17" />
      <polygon points="37.5,0 54.5,0 54.5,100 37.5,100" />
      <path
        transform="translate(105,0)"
        fillRule="evenodd"
        d="M0,50a55,51 0 1,0 110,0a55,51 0 1,0 -110,0ZM17,50a38,34 0 1,0 76,0a38,34 0 1,0 -76,0Z"
      />
      <g transform="translate(232,0)">
        <polygon points="0,0 17,0 17,100 0,100" />
        <path fillRule="evenodd" d="M0,0H63A29,29 0 0 1 63,58H0ZM17,17H63A12,12 0 0 1 63,41H17Z" />
        <polygon points="32.09,41 52.55,41 92,100 71.55,100" />
      </g>
      <g transform="translate(332,0)">
        <polygon points="0,0 18.83,0 66.41,100 47.59,100" />
        <polygon points="95.17,0 114,0 66.41,100 47.59,100" />
      </g>
      <g transform="translate(426,0)">
        <polygon points="47.59,0 66.41,0 18.83,100 0,100" />
        <polygon points="47.59,0 66.41,0 114,100 95.17,100" />
      </g>
      <g transform="translate(549,0)">
        <g fill={mono ? 'currentColor' : 'var(--color-ember)'}>
          <polygon points="0,0 6.17,0 40.17,50 6.17,100 0,100 34,50" />
          <polygon transform="translate(14.67,0)" points="0,0 11.31,0 45.31,50 11.31,100 0,100 34,50" />
          <polygon transform="translate(34.47,0)" points="0,0 20.56,0 54.56,50 20.56,100 0,100 34,50" />
        </g>
        <polygon transform="translate(94.13,0)" points="54.56,0 34,0 0,50 34,100 54.56,100 20.56,50" />
      </g>
      <path
        transform="translate(713.69,0)"
        fillRule="evenodd"
        d="M0,50a55,51 0 1,0 110,0a55,51 0 1,0 -110,0ZM17,50a38,34 0 1,0 76,0a38,34 0 1,0 -76,0Z"
      />
    </svg>
  );
}

export function Chevrons({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${(count - 1) * 36.885 + 44.88} 100`}
      aria-hidden="true"
      fill="currentColor"
      preserveAspectRatio="xMaxYMid meet"
      className={className}
    >
      {Array.from({ length: count }, (_, i) => (
        <polygon
          key={i}
          transform={`translate(${i * 36.885},0)`}
          opacity={count === 1 ? 1 : 0.2 + (0.8 * i) / (count - 1)}
          points="0,0 10.88,0 44.88,50 10.88,100 0,100 34,50"
        />
      ))}
    </svg>
  );
}
