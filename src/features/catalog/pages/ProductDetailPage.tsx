import { ArrowLeft, Package } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { getProduct, getStore } from '@/api/products';
import { useDemoStore } from '@/app/demo-store-context';
import { paths } from '@/app/paths';
import { formatPrice } from '@/shared/lib/format';
import { ButtonLink, Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ProductVisual } from '@/shared/ui/ProductVisual';
import type { Product, Store } from '@/domain/models';
import { ApiError } from '@/api/client';

type ProductError = 'not-found' | 'request-failed';

export function ProductDetailPage() {
  const { productId = '' } = useParams();
  const { activeUser } = useDemoStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [productError, setProductError] = useState<ProductError | null>(null);
  const [isStoreLoading, setIsStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState(false);

  const loadStore = useCallback(async (storeId: string) => {
    setIsStoreLoading(true);
    setStoreError(false);
    try {
      const result = await getStore(storeId);
      setStore(result);
    } catch {
      setStore(null);
      setStoreError(true);
    } finally {
      setIsStoreLoading(false);
    }
  }, []);

  const loadProduct = useCallback(async () => {
    if (!productId) {
      setProduct(null);
      setProductError('not-found');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setProductError(null);
    setProduct(null);
    setStore(null);
    setStoreError(false);

    try {
      const result = await getProduct(productId);
      setProduct(result);
      setIsLoading(false);
      await loadStore(result.storeId);
    } catch (error) {
      setProduct(null);
      setProductError(
        error instanceof ApiError && error.status === 404
          ? 'not-found'
          : 'request-failed',
      );
      setIsLoading(false);
    }
  }, [productId, loadStore]);

  useEffect(() => {
    let cancelled = false;
    const fetchProduct = async () => {
      if (!productId) {
        setProductError('not-found');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setProduct(null);
      setStore(null);
      setProductError(null);
      setStoreError(false);
      try {
        const result = await getProduct(productId);
        if (cancelled) return;
        setProduct(result);
        setIsLoading(false);
        setIsStoreLoading(true);
        try {
          const storeResult = await getStore(result.storeId);
          if (!cancelled) {
            setStore(storeResult);
          }
        } catch {
          if (!cancelled) {
            setStore(null);
            setStoreError(true);
          }
        } finally {
          if (!cancelled) {
            setIsStoreLoading(false);
          }
        }
      } catch (error) {
        if (cancelled) return;
        setProductError(
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
    void fetchProduct();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (isLoading) {
    return (
      <div className="page-stack" role="status" aria-live="polite">
        商品を読み込んでいます...
      </div>
    );
  }
  if (productError === 'not-found') {
    return (
      <EmptyState
        icon={<Package size={32} />}
        title="商品が見つかりません"
        description="商品が削除されたか、URLが間違っている可能性があります。"
        action={<ButtonLink to={paths.products}>商品一覧へ戻る</ButtonLink>}
      />
    );
  }
  if (productError === 'request-failed' || !product) {
    return (
      <EmptyState
        icon={<Package size={32} />}
        title="商品を取得できませんでした"
        description="通信に失敗したか、サーバーで問題が発生しました。時間をおいて再度お試しください。"
        action={
          <div className="page-stack">
            <Button onClick={() => void loadProduct()}>再試行</Button>
            <ButtonLink to={paths.products} variant="secondary">
              商品一覧へ戻る
            </ButtonLink>
          </div>
        }
      />
    );
  }
  const isSoldOut = product.status === 'sold';
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
          <p>{isSoldOut ? '売り切れ' : '販売中'}</p>

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

          {isStoreLoading && <p role="status">店舗情報を読み込んでいます...</p>}

          {storeError && (
            <div role="alert">
              <p>店舗情報を取得できませんでした。</p>
              <Button
                variant="secondary"
                onClick={() => void loadStore(product.storeId)}
              >
                店舗情報を再試行
              </Button>
            </div>
          )}

          {isOwnProduct ? (
            <div className="page-stack">
              <p role="status">自分の出品商品は購入できません。</p>
              <ButtonLink to={paths.storeManage} variant="secondary" fullWidth>
                自分の出品を管理する
              </ButtonLink>
            </div>
          ) : isSoldOut ? (
            <div className="page-stack">
              <p role="status">売り切れのため購入できません。</p>
              <Button fullWidth disabled aria-disabled="true">
                売り切れです
              </Button>
            </div>
          ) : (
            <ButtonLink to={paths.checkout(product.id)} fullWidth>
              購入手続きへ進む
            </ButtonLink>
          )}
        </div>
      </article>
    </div>
  );
}