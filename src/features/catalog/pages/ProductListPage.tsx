import { PackageSearch, Plus, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getProducts } from '@/api/products';
import { useDemoStore } from '@/app/demo-store-context';
import { paths } from '@/app/paths';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { ButtonLink } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import type { Product } from '@/domain/models';

export function ProductListPage() {
  const { activeUser } = useDemoStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async (isRetry = false) => {
    if (isRetry) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const result = await getProducts();
      setProducts(result);
      setError(null);
    } catch {
      setError('商品を取得できませんでした。時間をおいて再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchProducts = async () => {
      try {
        const result = await getProducts();
        if (!cancelled) {
          setProducts(result);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError(
            '商品を取得できませんでした。時間をおいて再度お試しください。',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    void fetchProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ja');

    return products.filter(
      (product) =>
        !normalizedQuery ||
        product.name.toLocaleLowerCase('ja').includes(normalizedQuery) ||
        product.description.toLocaleLowerCase('ja').includes(normalizedQuery),
    );
  }, [query, products]);

  const pageHeader = (
    <PageHeader
      title="商品を探す"
      description="商品名から出品中の商品を検索できます。"
      actions={
        activeUser?.storeId != null ? (
          <ButtonLink to={paths.sell} leadingIcon={<Plus size={18} />}>
            商品を出品
          </ButtonLink>
        ) : undefined
      }
    />
  );

  if (isLoading) {
    return (
      <div className="page-stack">
        {pageHeader}
        <div role="status" aria-live="polite">
          商品を読み込んでいます...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        {pageHeader}
        <div role="alert">
          <p>{error}</p>
          <button
            className="text-button"
            type="button"
            onClick={() => void loadProducts(true)}
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-stack">
      {pageHeader}

      <section className="catalog-tools" aria-label="商品を検索">
        <label className="search-field">
          <Search size={19} aria-hidden="true" />
          <span className="sr-only">商品を検索</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="商品名・説明から検索"
          />
        </label>
        <span>{filteredProducts.length}件</span>
      </section>

      {products.length === 0 ? (
        <EmptyState
          icon={<PackageSearch size={30} />}
          title="出品中の商品はありません"
          description="新しい商品が出品されるまでお待ちください。"
        />
      ) : filteredProducts.length > 0 ? (
        <section className="product-grid" aria-label="商品一覧">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      ) : (
        <EmptyState
          icon={<PackageSearch size={30} />}
          title="条件に合う商品がありません"
          description="検索ワードを変更すると、別の商品を確認できます。"
          action={
            <button
              className="text-button"
              type="button"
              onClick={() => setQuery('')}
            >
              検索を解除する
            </button>
          }
        />
      )}
    </div>
  );
}
