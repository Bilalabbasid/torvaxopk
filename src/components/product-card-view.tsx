'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { colourSlug } from '@/lib/colour';

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
  // Every colour's photo is in the card from the start, resized for the card, so a click swaps
  // instantly instead of waiting for a download while the old photo stays on screen.
  const photos = [...new Map(colours.flatMap((c) => (c.image ? [[c.image.url, c.image] as const] : []))).values()];
  // Open the product in the colour that is showing (hovered or chosen).
  const link = active ? `${href}?colour=${colourSlug(active.name)}` : href;

  return (
    <div className="group">
      <Link href={link} className="relative block aspect-[4/5] overflow-hidden bg-paper">
        {photos.map((photo) => {
          const on = photo.url === image?.url;
          return (
            <Image
              key={photo.url}
              src={photo.url}
              alt={on ? photo.alt : ''}
              aria-hidden={on ? undefined : true}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className={`object-contain group-hover:scale-[1.03] ${on ? 'opacity-100' : 'opacity-0'}`}
              style={{ transition: 'opacity 250ms ease, transform 1400ms var(--ease-out-expo)' }}
            />
          );
        })}
        <span className="label absolute top-4 left-4 text-steel-600">0{index + 1}</span>
        {preorder ? <span className="label absolute top-4 right-4 bg-ember px-2 py-1 text-[10px] text-ink">Preorder</span> : null}
        {soldOut ? (
          <span className="label absolute right-4 bottom-4 bg-ink px-2 py-1 text-[10px] text-bone">Sold out</span>
        ) : null}
      </Link>
      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <Link href={link} className="block">
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
        <Link href={link} className="shrink-0">
          {price}
        </Link>
      </div>
    </div>
  );
}
