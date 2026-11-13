import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { getSettings } from '@/lib/catalog';
import { money } from '@/lib/pricing';

export default async function StoreLayout({ children }: LayoutProps<'/'>) {
  const settings = await getSettings();
  const announcement =
    settings.announcement ||
    (settings.sale_mode === 'preorder'
      ? `Preorder open · Lock in launch prices with a ${money(settings.deposit_amount)} deposit`
      : `Now live · Launch buyers get ${settings.launch_coupon_percent}% off for a year`);

  return (
    <>
      <SiteHeader announcement={announcement} />
      <main className="flex-1">{children}</main>
      <SiteFooter settings={settings} />
    </>
  );
}
