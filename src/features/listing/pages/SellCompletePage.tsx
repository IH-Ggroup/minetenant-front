import { CheckCircle2, PackagePlus } from 'lucide-react';
import { useParams } from 'react-router-dom';

import { useDemoStore } from '@/app/demo-store-context';
import { paths } from '@/app/paths';
import { formatPrice } from '@/shared/lib/format';
import { ButtonLink } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { StepIndicator } from '@/shared/ui/StepIndicator';

export function SellCompletePage() {
  const { productId = '' } = useParams();
  const { state } = useDemoStore();
  const product = state.products.find((item) => item.id === productId);

  if (!product) {
    return (
      <EmptyState
        icon={<PackagePlus size={32} />}
        title="出品結果が見つかりません"
        description="商品情報を入力して、もう一度お試しください。"
        action={<ButtonLink to={paths.sell}>商品を出品する</ButtonLink>}
      />
    );
  }

  return (
    <div className="narrow-page page-stack">
      <StepIndicator
        steps={['商品情報', '内容確認', 'Minecraft同期', '完了']}
        currentStep={4}
        label="商品出品"
      />

      <section className="success-hero">
        <span className="success-hero__icon" aria-hidden="true">
          <CheckCircle2 size={34} />
        </span>
        <h1>出品が完了しました</h1>
        <p>
          {product.name}（{formatPrice(product.price)}・在庫{product.stock}
          点）を商品一覧へ追加しました。
        </p>
      </section>

      <div className="completion-actions">
        <ButtonLink to={paths.myPage}>マイページへ戻る</ButtonLink>
        <ButtonLink to={paths.products} variant="secondary">
          商品一覧へ戻る
        </ButtonLink>
      </div>
    </div>
  );
}
