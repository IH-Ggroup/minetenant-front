import { PackageSearch, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useDemoStore } from '@/app/demo-store-context';
import { paths } from '@/app/paths';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { ButtonLink } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';

export function ProductListPage() {
  const { state } = useDemoStore();
  const [query, setQuery] = useState('');

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ja');
    return state.products.filter(
      (product) =>
        !normalizedQuery ||
        product.name.toLocaleLowerCase('ja').includes(normalizedQuery) ||
        product.description.toLocaleLowerCase('ja').includes(normalizedQuery),
    );
  }, [query, state.products]);

  return (
    <div className="page-stack">
      <PageHeader
        title="商品を探す"
        description="商品名から出品中の商品を検索できます。"
        actions={
          <ButtonLink to={paths.sell} leadingIcon={<Plus size={18} />}>
            商品を出品
          </ButtonLink>
        }
      />

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

      {filteredProducts.length > 0 ? (
        <section className="product-grid" aria-label="商品一覧">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              store={state.stores.find((store) => store.id === product.storeId)}
            />
          ))}
        </section>
      ) : (
        <EmptyState
          icon={<PackageSearch size={30} />}
          title="条件に合う商品がありません"
          description="検索ワードやカテゴリを変更すると、別の商品を確認できます。"
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
