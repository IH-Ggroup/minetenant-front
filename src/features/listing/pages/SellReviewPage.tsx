import { ArrowLeft, ArrowRight, PackageCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { createProduct, getStore } from '@/api/products';
import { useDemoStore } from '@/app/demo-store-context';
import { paths } from '@/app/paths';
import type { Store } from '@/domain/models';
import { categoryLabels, formatPrice } from '@/shared/lib/format';
import { Button, ButtonLink } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { StepIndicator } from '@/shared/ui/StepIndicator';
//
import { ApiError } from '@/api/client';
import {
  getListingRequestId,
  clearListingRequest,
} from '@/features/listing/listing-request';

export function SellReviewPage() {
  const navigate = useNavigate();
  const { activeUser, listingDraft } = useDemoStore();

  const [store, setStore] = useState<Store | null>(null);
  const [error, setError] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  const draft = listingDraft;

  useEffect(() => {
    if (!activeUser || activeUser.storeId === null) {
      return;
    }

    getStore(activeUser.storeId)
      .then(setStore)
      .catch(() => {
        setError('店舗情報を取得できませんでした。');
      });
  }, [activeUser]);

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
  //
  const handlePublish = async () => {
    if (isPublishing) return;
    if (!activeUser || activeUser.storeId === null) {
      setError('出品には店舗の登録が必要です。');
      return;
    }

    setIsPublishing(true);
    setError('');

    try {
      const requestId = getListingRequestId(draft);
      const product = await createProduct({
        ...draft,
        requestId,
      });

      clearListingRequest(requestId);
      navigate(paths.sellSync(product.id));
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          setError('出品内容が競合しています。内容を確認してください。');
        } else if (error.status === 422) {
          setError(
            Object.values(error.errors).flat().join('\n') || error.message,
          );
        } else if (error.status === 429) {
          setError(
            error.retryAfter
              ? `リクエストが集中しています。${error.retryAfter}秒後を目安に再試行してください。`
              : error.message,
          );
        } else {
          setError(error.message);
        }
      } else {
        setError(
          error instanceof Error
            ? error.message
            : '出品情報を保存できませんでした。',
        );
      }
    } finally {
      setIsPublishing(false);
    }
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
            <dt>カテゴリ</dt>
            <dd>{categoryLabels[draft.category]}</dd>
          </div>

          <div>
            <dt>出品店舗</dt>
            <dd>{store?.name ?? '店舗情報を取得中...'}</dd>
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

          <Button
            type="button"
            isLoading={isPublishing}
            onClick={handlePublish}
          >
            出品する
            <ArrowRight size={18} aria-hidden="true" />
          </Button>
        </div>
      </section>
    </div>
  );
}
