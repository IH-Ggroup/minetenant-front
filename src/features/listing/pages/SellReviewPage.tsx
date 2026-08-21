import { ArrowLeft, ArrowRight, PackageCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useDemoStore } from '@/app/demo-store-context';
import { paths } from '@/app/paths';
import { categoryLabels, formatPrice } from '@/shared/lib/format';
import { Button, ButtonLink } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { StepIndicator } from '@/shared/ui/StepIndicator';

export function SellReviewPage() {
  const navigate = useNavigate();
  const { state, activeStore, publishListing } = useDemoStore();
  const [error, setError] = useState('');
  const draft = state.listingDraft;

  if (!draft) {
    return (
      <EmptyState
        icon={<PackageCheck size={32} />}
        title="確認する出品情報がありません"
        description="商品情報を入力してから確認画面へ進んでください。"
        action={<ButtonLink to={paths.sell}>商品情報を入力する</ButtonLink>}
      />
    );
  }

  const handlePublish = async () => {
    const product = await publishListing();
    if (!product) {
      setError('出品情報を保存できませんでした。');
      return;
    }
    navigate(paths.sellSync(product.id));
  };

  return (
    <div className="narrow-page page-stack">
      <StepIndicator
        steps={['商品情報', '内容確認', 'Minecraft同期', '完了']}
        currentStep={2}
        label="商品出品"
      />

      <div className="checkout-heading">
        <h1>出品内容を確認</h1>
        <p>入力した内容に間違いがないか確認してください。</p>
      </div>

      <section className="panel listing-review">
        <dl className="review-list">
          <div>
            <dt>商品名</dt>
            <dd>{draft.name}</dd>
          </div>
          <div>
            <dt>商品説明</dt>
            <dd>{draft.description}</dd>
          </div>
          <div>
            <dt>価格</dt>
            <dd>{formatPrice(draft.price)}</dd>
          </div>
          <div>
            <dt>在庫数</dt>
            <dd>{draft.stock}点</dd>
          </div>
          <div>
            <dt>カテゴリ</dt>
            <dd>{categoryLabels[draft.category]}</dd>
          </div>
          <div>
            <dt>出品店舗</dt>
            <dd>{activeStore.name}</dd>
          </div>
        </dl>

        {error ? (
          <div className="inline-alert inline-alert--error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="review-actions">
          <ButtonLink to={paths.sell} variant="secondary">
            <ArrowLeft size={16} aria-hidden="true" />
            修正する
          </ButtonLink>
          <Button type="button" onClick={handlePublish}>
            出品する
            <ArrowRight size={18} aria-hidden="true" />
          </Button>
        </div>
      </section>
    </div>
  );
}
