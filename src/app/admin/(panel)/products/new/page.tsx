import Link from 'next/link';
import { ProductForm } from '@/components/admin/product-form';
import { Flash, PageHeader } from '@/components/admin/ui';

export const metadata = { title: 'New product' };

export default async function NewProductPage(props: PageProps<'/admin/products/new'>) {
  const sp = await props.searchParams;
  return (
    <>
      <PageHeader
        title="New product"
        actions={
          <Link href="/admin/products" className="btn-outline btn-sm">
            Back
          </Link>
        }
      />
      <Flash msg={sp.msg} error={sp.error} />
      <ProductForm />
      <p className="mt-4 text-sm text-ink/60">After creating the product you can add colours, prices, stock and photos.</p>
    </>
  );
}
