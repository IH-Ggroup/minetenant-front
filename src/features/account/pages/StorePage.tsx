import { ArrowLeft, PackageSearch, Store as StoreIcon } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';

import { ApiError } from '@/api/client';
import { getProducts, getStore } from '@/api/products';
import { paths } from '@/app/paths';
import type { Product, Store } from '@/domain/models';
import { ProductCard } from '@/features/catalog/components/ProductCard';
import { Badge } from '@/shared/ui/Badge';
import { Button, ButtonLink } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';

type StoreError = 'not-found' | 'request-failed';

export function StorePage() {
  const { storeId = '' } = useParams();

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storeError, setStoreError] = useState<StoreError | null>(null);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState(false);

  const loadStore = useCallback(async () => {
    if (!storeId) {
      setStore(null);
      setStoreError('not-found');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setStoreError(null);
    setStore(null);

    try {
      const result = await getStore(storeId);
      setStore(result);
    } catch (error) {
      setStore(null);
      setStoreError(
        error instanceof ApiError && error.status === 404
          ? 'not-found'
          : 'request-failed',
      );
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  const loadProducts = useCallback(async () => {
    if (!storeId) {
      setProducts([]);
      setProductsError(true);
      return;
    }

    setIsProductsLoading(true);
    setProductsError(false);

    try {
      const result = await getProducts(storeId);
      setProducts(result);
    } catch {
      setProducts([]);
      setProductsError(true);
    } finally {
      setIsProductsLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      if (!storeId) {
        setStore(null);
        setStoreError('not-found');
        setIsLoading(false);
        setProducts([]);
        setIsProductsLoading(false);
        return;
      }

      setIsLoading(true);
      setStore(null);
      setStoreError(null);
      setProducts([]);
      setIsProductsLoading(false);
      setProductsError(false);

      try {
        const storeResult = await getStore(storeId);

        if (cancelled) return;

        setStore(storeResult);
        setIsLoading(false);
        setIsProductsLoading(true);

        try {
          const productResults = await getProducts(storeId);

          if (!cancelled) {
            setProducts(productResults);
          }
        } catch (error) {
          if (!cancelled) {
            console.error('商品取得に失敗しました', error);
            setProducts([]);
            setProductsError(true);
          }
        } finally {
          if (!cancelled) {
            setIsProductsLoading(false);
          }
        }
      } catch (error) {
        if (cancelled) return;

        console.error('店舗取得に失敗しました', error);
        setStoreError(
          error instanceof ApiError && error.status === 404
            ? 'not-found'
            : 'request-failed',
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [storeId]);

  if (isLoading) {
    return (
      <div className="page-stack" role="status" aria-live="polite">
        店舗情報を読み込んでいます...
      </div>
    );
  }

  if (storeError === 'not-found') {
    return (
      <EmptyState
        icon={<StoreIcon size={32} />}
        title="店舗が見つかりません"
        description="商品一覧から店舗を選び直してください。"
        action={<ButtonLink to={paths.products}>商品一覧へ</ButtonLink>}
      />
    );
  }

  if (storeError === 'request-failed' || !store) {
    return (
      <EmptyState
        icon={<StoreIcon size={32} />}
        title="店舗情報を取得できませんでした"
        description="通信に失敗したか、サーバーで問題が発生しました。時間をおいて再度お試しください。"
        action={
          <div className="page-stack">
            <Button onClick={() => void loadStore()}>再試行</Button>
            <ButtonLink to={paths.products} variant="secondary">
              商品一覧へ戻る
            </ButtonLink>
          </div>
        }
      />
    );
  }

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
          <span>{productsError ? '' : `${products.length}件`}</span>
        </div>

        {isProductsLoading && <p role="status">商品を読み込んでいます...</p>}

        {productsError && (
          <EmptyState
            icon={<PackageSearch size={30} />}
            title="商品を取得できませんでした"
            description="通信状況を確認して、もう一度お試しください。"
            action={
              <Button
                onClick={() => void loadProducts()}
                disabled={isProductsLoading}
              >
                再試行
              </Button>
            }
          />
        )}

        {!isProductsLoading &&
          !productsError &&
          (products.length > 0 ? (
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
          ))}
      </section>
    </div>
  );
}
