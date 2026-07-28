import { ArrowLeft, PackageSearch, Store as StoreIcon } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { useDemoStore } from '@/app/demo-store-context';
import { paths } from '@/app/paths';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { Badge } from '@/shared/ui/Badge';
import { ButtonLink } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';

export function StorePage() {
  const { storeId = '' } = useParams();
  const { state } = useDemoStore();
  const store = state.stores.find((item) => item.id === storeId);

  if (!store) {
    return (
      <EmptyState
        icon={<StoreIcon size={32} />}
        title="店舗が見つかりません"
        description="商品一覧から店舗を選び直してください。"
        action={<ButtonLink to={paths.products}>商品一覧へ</ButtonLink>}
      />
    );
  }

  const products = state.products.filter(
    (product) => product.storeId === store.id,
  );

  return (
    <div className="page-stack">
      <nav className="breadcrumbs" aria-label="パンくず">
        <Link to={paths.products}>
          <ArrowLeft size={16} aria-hidden="true" />
          商品一覧
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{store.name}</span>
      </nav>

      <PageHeader
        title={store.name}
        description="購入者から見える店舗ページの基本レイアウトです。"
        actions={<Badge tone="success">Minecraft連携予定</Badge>}
      />

      <section className="panel">
        <div className="panel__heading">
          <h2>店舗について</h2>
        </div>
        <p>{store.description}</p>
      </section>

      <section>
        <div className="section-title-row">
          <h2>出品商品</h2>
          <span>{products.length}件</span>
        </div>

        {products.length > 0 ? (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard product={product} store={store} key={product.id} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<PackageSearch size={30} />}
            title="まだ商品がありません"
            description="商品が出品されると、ここに一覧表示されます。"
          />
        )}
      </section>
    </div>
  );
}
