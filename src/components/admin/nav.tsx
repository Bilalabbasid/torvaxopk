'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/inventory', label: 'Inventory' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/discounts', label: 'Discounts' },
  { href: '/admin/payments', label: 'Payments' },
  { href: '/admin/settings', label: 'Settings' },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible" aria-label="Admin">
      {items.map((item) => {
        const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 px-3 py-2 text-sm transition-colors ${active ? 'bg-bone/10 text-bone' : 'text-bone/60 hover:bg-bone/5 hover:text-bone'}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
