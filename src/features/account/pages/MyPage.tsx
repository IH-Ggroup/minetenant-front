import { MessageCircle, PackagePlus, ReceiptText } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useDemoStore } from '@/app/demo-store-context';
import { paths } from '@/app/paths';
import {
  formatDateTime,
  formatPrice,
  transactionStatusLabel,
} from '@/shared/lib/format';
import { Badge } from '@/shared/ui/Badge';
import { ButtonLink } from '@/shared/ui/Button';
import { PageHeader } from '@/shared/ui/PageHeader';

export function MyPage() {
  const { state, activeUser, activeStore } = useDemoStore();
  const transactions = state.transactions
    .filter(
      (transaction) =>
        transaction.buyerId === activeUser.id ||
        transaction.sellerId === activeUser.id,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="page-stack">
      <PageHeader
        title="マイページ"
        description="プロフィールと最近の取引を確認するための基本画面です。"
        actions={
          <ButtonLink to={paths.sell} leadingIcon={<PackagePlus size={18} />}>
            商品を出品
          </ButtonLink>
        }
      />

      <section className="panel">
        <div className="panel__heading">
          <div>
            <h2>{activeUser.name}</h2>
            <p>{activeUser.roleLabel}</p>
          </div>
          <ButtonLink to={paths.login} variant="secondary">
            ユーザーを切り替える
          </ButtonLink>
        </div>

        <div className="review-actions">
          <ButtonLink to={paths.store(activeStore.id)} variant="secondary">
            店舗ページを見る
          </ButtonLink>
          <ButtonLink to={paths.storeManage} variant="secondary">
            店舗を管理する
          </ButtonLink>
        </div>
      </section>

      <section className="panel transaction-list">
        <div className="panel__heading">
          <h2>最近の取引</h2>
          <Badge tone="neutral">{transactions.length}件</Badge>
        </div>

        {transactions.length === 0 ? (
          <div className="compact-empty">
            <ReceiptText size={25} aria-hidden="true" />
            <p>まだ取引はありません。</p>
          </div>
        ) : (
          <div className="transaction-list__rows">
            {transactions.map((transaction) => {
              const product = state.products.find(
                (item) => item.id === transaction.productId,
              );

              return (
                <Link
                  key={transaction.id}
                  className="transaction-row"
                  to={paths.transaction(transaction.id)}
                >
                  <span className="transaction-row__icon" aria-hidden="true">
                    <ReceiptText size={18} />
                  </span>
                  <span className="transaction-row__main">
                    <strong>{product?.name ?? '商品情報なし'}</strong>
                    <small>{formatDateTime(transaction.createdAt)}</small>
                  </span>
                  <span className="transaction-row__price">
                    {formatPrice(transaction.amount)}
                  </span>
                  <Badge tone="neutral">
                    {transactionStatusLabel(transaction.status)}
                  </Badge>
                  <MessageCircle size={18} aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
