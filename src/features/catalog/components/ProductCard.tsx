import { Link } from 'react-router-dom';

import { paths } from '@/app/paths';
import type { Product, Store as StoreModel } from '@/domain/models';
import { formatPrice } from '@/shared/lib/format';
import { ProductVisual } from '@/shared/ui/ProductVisual';

interface ProductCardProps {
  product: Product;
  store?: StoreModel;
}

export function ProductCard({ product, store }: ProductCardProps) {
  const isSoldOut = product.stock === 0;

  return (
    <article className="product-card">
      <Link
        className="product-card__visual-link"
        to={paths.product(product.id)}
        aria-label={`${product.name}の詳細を見る`}
      >
        <ProductVisual
          theme={product.theme}
          emoji={product.emoji}
          name={product.name}
        />
      </Link>
      <div className="product-card__body">
        <h2>
          <Link to={paths.product(product.id)}>{product.name}</Link>
        </h2>
        <p className="product-card__store">{store?.name ?? '店舗情報なし'}</p>
        <div className="product-card__footer">
          <strong>{formatPrice(product.price)}</strong>
          <span>{isSoldOut ? '売り切れ' : `在庫 ${product.stock}点`}</span>
        </div>
      </div>
    </article>
  );
}
