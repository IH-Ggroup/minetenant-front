import { CheckCircle2, PackagePlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { getProduct } from '@/api/products';
import { paths } from '@/app/paths';
import type { Product } from '@/domain/models';
import { formatPrice } from '@/shared/lib/format';
import { ButtonLink } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { StepIndicator } from '@/shared/ui/StepIndicator';

export function SellCompletePage() {
  const { productId = '' } = useParams();
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!productId) {
      return;
    }

    getProduct(productId)
      .then(setProduct)
      .catch(() => {
        setProduct(null);
      });
  }, [productId]);

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
