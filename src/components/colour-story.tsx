'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Chevrons } from './brand';

interface Colour {
  id: string;
  name: string;
  hex: string;
  image: string;
  /** The product page, opened in this colour. */
  href: string;
}

export function ColourStory({ colours }: { colours: Colour[] }) {
  const [index, setIndex] = useState(0);
  const active = colours[index];
  if (!active) return null;

  return (
    <section id="colours" className="overflow-hidden bg-paper">
      <div className="container-x grid items-center gap-10 py-20 lg:grid-cols-12 lg:py-28">
        <div className="lg:col-span-4">
          <p className="label text-steel-600">04 — Colours</p>
          <h2 className="display mt-4 text-5xl sm:text-6xl">
            Pick your
            <br />
            signal.
          </h2>
          <div className="hairline mt-10 border-t">
            {colours.map((colour, i) => (
              <Link
                key={colour.id}
                href={colour.href}
                aria-current={i === index ? 'true' : undefined}
                className={`hairline flex w-full items-center gap-5 border-b py-5 text-left transition-colors ${
                  i === index ? 'text-ink' : 'text-ink/40 hover:text-ink/70'
                }`}
                onMouseEnter={() => setIndex(i)}
                onFocus={() => setIndex(i)}
              >
                <span className="label w-6">0{i + 1}</span>
                <span className="size-5 rounded-full ring-1 ring-ink/10 ring-inset" style={{ backgroundColor: colour.hex }} />
                <span className="flex-1 text-2xl font-medium tracking-tight sm:text-3xl">{colour.name}</span>
                <Chevrons count={3} className={`h-4 w-auto text-ember transition-opacity ${i === index ? 'opacity-100' : 'opacity-0'}`} />
              </Link>
            ))}
          </div>
          <Link href={active.href} className="btn-primary mt-8">
            Shop {active.name}
          </Link>
        </div>
        <div className="relative lg:col-span-8 lg:-mr-12">
          <Link href={active.href} aria-label={`The Forward set in ${active.name}`} className="relative block aspect-[2048/1360]">
            {colours.map((colour, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={colour.id}
                src={colour.image}
                alt={`The Forward series in ${colour.name}`}
                loading="lazy"
                className={`hero-image absolute inset-0 size-full object-contain transition-opacity duration-500 ${
                  i === index ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
          </Link>
        </div>
      </div>
    </section>
  );
}
