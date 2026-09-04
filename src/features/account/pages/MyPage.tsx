import { PackagePlus, ReceiptText } from 'lucide-react';
import { useEffect, useState } from 'react';

import { getProduct, getTransactions } from '@/api/products';
import { useDemoStore } from '@/app/demo-store-context';
import { paths } from '@/app/paths';
import { LogoutButton } from '@/features/auth/components/LogoutButton';
import type { Product, Transaction } from '@/domain/models';
import {
  formatDateTime,
  formatPrice,
  transactionStatusLabel,
} from '@/shared/lib/format';
import { Badge } from '@/shared/ui/Badge';
import { ButtonLink } from '@/shared/ui/Button';
import { PageHeader } from '@/shared/ui/PageHeader';

export function MyPage() {
  const { activeUser } = useDemoStore();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!activeUser) {
      return;
    }

    const loadTransactions = async () => {
      try {
        setIsLoading(true);

        // ログインユーザーに関係する取引を取得
        const transactionData = await getTransactions();

        // 新しい順に並べる
        const sortedTransactions = [...transactionData].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        );

        setTransactions(sortedTransactions);

        // 取引に紐づく商品情報を取得
        const productEntries = await Promise.all(
          sortedTransactions.map(async (transaction) => {
            const product = await getProduct(transaction.productId); //メモ

            return [transaction.productId, product] as const;
          }),
        );

        setProducts(Object.fromEntries(productEntries));
      } catch {
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadTransactions();
  }, [activeUser]);

  if (!activeUser) {
    return (
      <div className="page-stack">
        <PageHeader
          title="マイページ"
          description="マイページを利用するにはログインしてください。"
        />
        <ButtonLink to={paths.login}>ログインする</ButtonLink>
      </div>
    );
  }

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

          <LogoutButton />
        </div>

        <div className="review-actions">
          <ButtonLink to={paths.store(activeUser.storeId)} variant="secondary">
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

        {isLoading ? (
          <div className="compact-empty">
            <p>取引履歴を読み込み中...</p>
          </div>
        ) : isError ? (
          <div className="compact-empty">
            <ReceiptText size={25} aria-hidden="true" />
            <p>取引履歴を取得できませんでした。</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="compact-empty">
            <ReceiptText size={25} aria-hidden="true" />
            <p>まだ取引はありません。</p>
          </div>
        ) : (
          <div className="transaction-list__rows">
            {transactions.map((transaction) => {
              const product = products[transaction.productId];

              return (
                <article key={transaction.id} className="transaction-row">
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
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
