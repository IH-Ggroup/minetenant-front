import { ArrowLeft, Package } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { getProduct, getStore } from '@/api/products';
import { useDemoStore } from '@/app/demo-store-context';
import { paths } from '@/app/paths';
import { formatPrice } from '@/shared/lib/format';
import { ButtonLink } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ProductVisual } from '@/shared/ui/ProductVisual';
import type { Product, Store } from '@/domain/models';

export function ProductDetailPage() {
  const { productId = '' } = useParams();
  const { activeUser } = useDemoStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [store, setStore] = useState<Store | null>(null);

  useEffect(() => {
    if (!productId) return;

    getProduct(productId)
      .then((product) => {
        setProduct(product);

        return getStore(product.storeId);
      })
      .then((store) => {
        setStore(store);
      })
      .catch((error) => {
        console.error('商品詳細取得×', error);
      });
  }, [productId]);

  if (!product) {
    return (
      <EmptyState
        icon={<Package size={32} />}
        title="商品が見つかりません"
        description="URLが正しいか確認するか、商品一覧から選び直してください。"
        action={<ButtonLink to={paths.products}>商品一覧へ戻る</ButtonLink>}
      />
    );
  }

  const isSoldOut = product.stock === 0;
  const isOwnProduct =
    activeUser !== null && product.sellerId === activeUser.id;

  return (
    <div className="page-stack">
      <nav className="breadcrumbs" aria-label="パンくず">
        <Link to={paths.products}>
          <ArrowLeft size={16} aria-hidden="true" />
          商品一覧
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <article className="product-detail">
        <div className="product-detail__visual">
          <ProductVisual
            theme={product.theme}
            emoji={product.emoji}
            name={product.name}
          />
        </div>

        <div className="product-detail__content">
          <h1>{product.name}</h1>
          <p className="product-detail__price">{formatPrice(product.price)}</p>
          <p>{isSoldOut ? '売り切れ' : `在庫 ${product.stock}点`}</p>

          <div className="product-detail__description">
            <h2>商品の説明</h2>
            <p>{product.description}</p>
          </div>

          {store && (
            <Link className="seller-card" to={paths.store(store.id)}>
              <span className="seller-card__details">
                <small>出品店舗</small>
                <strong>{store.name}</strong>
              </span>
              <span className="seller-card__link">店舗を見る</span>
            </Link>
          )}

          {isOwnProduct ? (
            <ButtonLink to={paths.storeManage} variant="secondary" fullWidth>
              自分の出品を管理する
            </ButtonLink>
          ) : (
            <ButtonLink
              to={paths.checkout(product.id)}
              fullWidth
              className={isSoldOut ? 'button--disabled' : undefined}
              aria-disabled={isSoldOut}
              onClick={(event) => {
                if (isSoldOut) event.preventDefault();
              }}
            >
              {isSoldOut ? '売り切れです' : '購入手続きへ進む'}
            </ButtonLink>
          )}
        </div>
      </article>
    </div>
  );
}
