'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';

export interface CardColour {
  id: string;
  name: string;
  hex: string;
  image: { url: string; alt: string } | null;
}

/** The interactive part of a product card: colour dots preview on hover and stick on click. */
export function ProductCardView({
  href,
  name,
  tagline,
  index,
  colours,
  initial,
  preorder,
  soldOut,
  price,
}: {
  href: string;
  name: string;
  tagline: string;
  index: number;
  colours: CardColour[];
  initial: number;
  preorder: boolean;
  soldOut: boolean;
  price: ReactNode;
}) {
  const [chosen, setChosen] = useState(initial);
  const [preview, setPreview] = useState<number | null>(null);
  const active = colours[preview ?? chosen] ?? colours[0];
  const image = active?.image ?? colours.find((c) => c.image)?.image ?? null;

  return (
    <div className="group">
      <Link href={href} className="relative block aspect-[4/5] overflow-hidden bg-paper">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={image.alt}
            loading="lazy"
            className="size-full object-contain transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.03]"
          />
        ) : null}
        <span className="label absolute top-4 left-4 text-steel-600">0{index + 1}</span>
        {preorder ? <span className="label absolute top-4 right-4 bg-ember px-2 py-1 text-[10px] text-ink">Preorder</span> : null}
        {soldOut ? (
          <span className="label absolute right-4 bottom-4 bg-ink px-2 py-1 text-[10px] text-bone">Sold out</span>
        ) : null}
      </Link>
      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <Link href={href} className="block">
            <h3 className="text-xl font-medium tracking-tight">{name}</h3>
            <p className="mt-1 text-sm text-ink/60">{tagline}</p>
          </Link>
          <div className="mt-2 -ml-1 flex" role="radiogroup" aria-label={`${name} colour`} onPointerLeave={() => setPreview(null)}>
            {colours.map((c, i) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={i === chosen}
                aria-label={c.name}
                title={c.name}
                className="grid size-6 place-items-center"
                onPointerEnter={(e) => (e.pointerType === 'mouse' ? setPreview(i) : undefined)}
                onFocus={() => setPreview(i)}
                onBlur={() => setPreview(null)}
                onClick={() => setChosen(i)}
              >
                <span
                  className={`size-3.5 rounded-full ring-offset-2 ring-offset-bone transition ${
                    i === chosen ? 'ring-1 ring-ink' : 'ring-1 ring-ink/15 ring-inset'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              </button>
            ))}
          </div>
        </div>
        <Link href={href} className="shrink-0">
          {price}
        </Link>
      </div>
    </div>
  );
}
