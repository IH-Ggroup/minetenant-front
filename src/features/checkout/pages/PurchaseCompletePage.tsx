import { ArrowRight, CheckCircle2, Package, UserRound } from 'lucide-react';
import { useParams } from 'react-router-dom';

import { useDemoStore } from '@/app/demo-store-context';
import { paths } from '@/app/paths';
import { formatPrice } from '@/shared/lib/format';
import { ButtonLink } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ProductVisual } from '@/shared/ui/ProductVisual';
import { StepIndicator } from '@/shared/ui/StepIndicator';

export function PurchaseCompletePage() {
  const { transactionId = '' } = useParams();
  const { state } = useDemoStore();
  const transaction = state.transactions.find(
    (item) => item.id === transactionId,
  );
  const product = state.products.find(
    (item) => item.id === transaction?.productId,
  );

  if (!transaction || !product) {
    return (
      <EmptyState
        icon={<Package size={32} />}
        title="購入結果が見つかりません"
        description="商品一覧からもう一度操作してください。"
        action={<ButtonLink to={paths.products}>商品一覧へ</ButtonLink>}
      />
    );
  }

  return (
    <div className="narrow-page page-stack">
      <StepIndicator
        steps={['購入情報', '内容確認', '完了']}
        currentStep={3}
        label="購入手続き"
      />

      <section className="success-hero">
        <span className="success-hero__icon" aria-hidden="true">
          <CheckCircle2 size={34} />
        </span>
        <h1>購入が完了しました</h1>
      </section>

      <section className="panel completion-summary">
        <div className="completion-summary__product">
          <ProductVisual
            theme={product.theme}
            emoji={product.emoji}
            name={product.name}
            compact
          />
          <div>
            <h2>{product.name}</h2>
            <p>{formatPrice(transaction.amount)}</p>
          </div>
          <span>在庫 {product.stock}点</span>
        </div>
      </section>

      <div className="completion-actions">
        <ButtonLink to={paths.myPage} leadingIcon={<UserRound size={18} />}>
          マイページへ
        </ButtonLink>
        <ButtonLink
          to={paths.products}
          variant="secondary"
          leadingIcon={<ArrowRight size={18} />}
        >
          買い物を続ける
        </ButtonLink>
      </div>
    </div>
  );
}
