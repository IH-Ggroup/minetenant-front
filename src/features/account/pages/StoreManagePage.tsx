import { PackagePlus } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useDemoStore } from '@/app/demo-store-context';
import { paths } from '@/app/paths';
import { formatPrice } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/Badge';
import { ButtonLink } from '@/shared/ui/Button';
import { PageHeader } from '@/shared/ui/PageHeader';

export function StoreManagePage() {
  const { state, activeStore } = useDemoStore();
  const products = state.products.filter(
    (product) => product.storeId === activeStore.id,
  );

  return (
    <div className="page-stack">
      <PageHeader
        title="店舗管理"
        description="店舗情報と出品商品を確認するための基本画面です。"
        actions={
          <ButtonLink to={paths.sell} leadingIcon={<PackagePlus size={18} />}>
            商品を出品
          </ButtonLink>
        }
      />

      <div className="management-grid">
        <section className="panel">
          <div className="panel__heading">
            <h2>{activeStore.name}</h2>
            <Badge tone="neutral">Lv.{activeStore.level}</Badge>
          </div>
          <p>{activeStore.description}</p>
          <div className="form-actions">
            <ButtonLink to={paths.store(activeStore.id)} variant="secondary">
              公開ページを見る
            </ButtonLink>
          </div>
        </section>

        <section className="panel">
          <div className="panel__heading">
            <h2>Minecraft店舗</h2>
            <Badge tone="info">実装予定</Badge>
          </div>
          <p>
            Minecraftとの同期状態や店舗プレビューは、仕様確定後にこの領域へ追加します。
          </p>
        </section>
      </div>

      <section className="panel inventory-panel">
        <div className="panel__heading">
          <h2>出品商品</h2>
          <span>{products.length}件</span>
        </div>

        {products.length === 0 ? (
          <div className="compact-empty">
            <p>まだ出品商品はありません。</p>
          </div>
        ) : (
          <div
            className="inventory-table"
            role="table"
            aria-label="出品商品一覧"
          >
            <div className="inventory-table__head" role="row">
              <span role="columnheader">商品</span>
              <span role="columnheader">在庫</span>
              <span role="columnheader">状態</span>
              <span role="columnheader">確認</span>
            </div>
            {products.map((product) => (
              <div className="inventory-table__row" role="row" key={product.id}>
                <span className="inventory-table__product" role="cell">
                  <span>
                    <strong>{product.name}</strong>
                    <small>{formatPrice(product.price)}</small>
                  </span>
                </span>
                <strong role="cell">{product.stock}点</strong>
                <span role="cell">
                  <Badge tone={product.stock > 0 ? 'success' : 'warning'}>
                    {product.stock > 0 ? '販売中' : '売り切れ'}
                  </Badge>
                </span>
                <span role="cell">
                  <Link to={paths.product(product.id)}>商品詳細</Link>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
