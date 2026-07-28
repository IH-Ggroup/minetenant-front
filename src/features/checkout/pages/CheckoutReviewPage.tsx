import { ArrowLeft, Package } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import { useDemoStore } from '@/app/demo-store-context';
import { paths } from '@/app/paths';
import {
  type CheckoutDraft,
  DEFAULT_CHECKOUT_DRAFT,
} from '@/features/checkout/checkout-draft';
import { formatPrice } from '@/shared/lib/format';
import { Button, ButtonLink } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ProductVisual } from '@/shared/ui/ProductVisual';
import { StepIndicator } from '@/shared/ui/StepIndicator';

export function CheckoutReviewPage() {
  const { productId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, purchaseProduct } = useDemoStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const product = state.products.find((item) => item.id === productId);
  const checkoutDraft =
    (location.state as { checkoutDraft?: CheckoutDraft } | null | undefined)
      ?.checkoutDraft ?? DEFAULT_CHECKOUT_DRAFT;

  if (!product) {
    return (
      <EmptyState
        icon={<Package size={32} />}
        title="確認する商品が見つかりません"
        description="商品一覧へ戻って、もう一度お試しください。"
        action={<ButtonLink to={paths.products}>商品一覧へ</ButtonLink>}
      />
    );
  }

  const handlePurchase = () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setError('');

    window.setTimeout(() => {
      const result = purchaseProduct(product.id);
      if (result.ok && result.transactionId) {
        navigate(paths.purchaseComplete(result.transactionId));
        return;
      }
      setError(result.error ?? '購入処理に失敗しました。');
      setIsProcessing(false);
    }, 650);
  };

  return (
    <div className="narrow-page page-stack">
      <StepIndicator
        steps={['購入情報', '内容確認', '完了']}
        currentStep={2}
        label="購入手続き"
      />

      <div className="checkout-heading">
        <Link to={paths.checkout(product.id)}>
          <ArrowLeft size={16} aria-hidden="true" />
          入力画面へ戻る
        </Link>
        <h1>購入内容の確認</h1>
      </div>

      <section className="panel review-panel">
        <div className="review-product">
          <ProductVisual
            theme={product.theme}
            emoji={product.emoji}
            name={product.name}
            compact
          />
          <div>
            <h2>{product.name}</h2>
            <p>数量 1</p>
          </div>
          <strong>{formatPrice(product.price)}</strong>
        </div>

        <dl className="review-list">
          <div>
            <dt>お届け先</dt>
            <dd>
              {checkoutDraft.name || '未入力'} / {checkoutDraft.postalCode}{' '}
              {checkoutDraft.address}
            </dd>
          </div>
          <div>
            <dt>支払い方法</dt>
            <dd>デモ決済</dd>
          </div>
        </dl>

        {error && (
          <div className="inline-alert inline-alert--error" role="alert">
            {error}
          </div>
        )}

        <div className="review-actions">
          <ButtonLink to={paths.checkout(product.id)} variant="secondary">
            修正する
          </ButtonLink>
          <Button
            type="button"
            isLoading={isProcessing}
            onClick={handlePurchase}
          >
            購入を確定する
          </Button>
        </div>
      </section>
    </div>
  );
}
