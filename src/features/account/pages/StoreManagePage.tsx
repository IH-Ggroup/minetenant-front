import { PackagePlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { ApiError } from '@/api/client';
import { getStoreDashboard } from '@/api/products';
import { useDemoStore } from '@/app/demo-store-context';
import { paths } from '@/app/paths';
import type { StoreDashboard } from '@/domain/models';
import { formatPrice } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/Badge';
import { Button, ButtonLink } from '@/shared/ui/Button';
import { PageHeader } from '@/shared/ui/PageHeader';

type DashboardError = 'forbidden' | 'request-failed' | 'missing-store';

export function StoreManagePage() {
  const { activeUser } = useDemoStore();
  const storeId = activeUser?.storeId;

  const [dashboard, setDashboard] = useState<StoreDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<DashboardError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchDashboard = async () => {
      setDashboard(null);
      setError(null);

      if (!storeId) {
        setIsLoading(false);
        setError('missing-store');
        return;
      }

      setIsLoading(true);

      try {
        const result = await getStoreDashboard(storeId);

        if (!cancelled) {
          setDashboard(result);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(
            fetchError instanceof ApiError && fetchError.status === 403
              ? 'forbidden'
              : 'request-failed',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, [storeId, retryCount]);

  const pageHeader = (
    <PageHeader
      title="店舗管理"
      description="店舗情報と出品商品を確認するための基本画面です。"
      actions={
        <ButtonLink to={paths.sell} leadingIcon={<PackagePlus size={18} />}>
          商品を出品
        </ButtonLink>
      }
    />
  );

  if (isLoading) {
    return (
      <div className="page-stack">
        {pageHeader}
        <div role="status" aria-live="polite">
          店舗情報を読み込んでいます...
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="page-stack">
        {pageHeader}

        <section className="panel" role="alert">
          {error === 'forbidden' ? (
            <>
              <h2>店舗情報を表示できません</h2>
              <p>
                この店舗情報を閲覧する権限がありません。
                ログイン中のアカウントと本人のstoreIdを確認してください。
              </p>
            </>
          ) : error === 'missing-store' ? (
            <>
              <h2>管理する店舗がありません</h2>
              <p>
                ログイン中のアカウントに店舗が登録されているか確認してください。
              </p>
            </>
          ) : (
            <>
              <h2>店舗情報を取得できませんでした</h2>
              <p>
                通信に失敗したか、サーバーで問題が発生しました。
                時間をおいて再度お試しください。
              </p>
              <Button onClick={() => setRetryCount((count) => count + 1)}>
                再試行
              </Button>
            </>
          )}
        </section>
      </div>
    );
  }

  const { store, products, stats } = dashboard;

  return (
    <div className="page-stack">
      {pageHeader}

      <div className="management-grid">
        <section className="panel">
          <div className="panel__heading">
            <h2>{store.name}</h2>
            <Badge tone="neutral">Lv.{store.level}</Badge>
          </div>
          <p>{store.description}</p>
          <div className="form-actions">
            <ButtonLink to={paths.store(store.id)} variant="secondary">
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
          <span>{stats.productCount}件</span>
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
              <span role="columnheader">販売状態</span>
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

                <span role="cell">
                  <Badge
                    tone={
                      product.status === 'available' ? 'success' : 'warning'
                    }
                  >
                    {product.status === 'available' ? '販売中' : '売却済み'}
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
