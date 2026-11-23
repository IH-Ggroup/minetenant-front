import { ArrowLeft, Package } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';

import {
  getProduct,
  getPurchaseByRequestId,
  purchaseProduct as purchaseProductApi,
} from '@/api/products';

import { ApiError } from '@/api/client';

import { useDemoStore } from '@/app/demo-store-context';
import { paths } from '@/app/paths';
import {
  type CheckoutDraft,
  DEFAULT_CHECKOUT_DRAFT,
} from '@/features/checkout/checkout-draft'; // 配送先情報を取得するAPIが未実装のため、既存のデモデータを使用
import type { Product, Transaction } from '@/domain/models';
import { formatPrice } from '@/shared/lib/format';
import { Button, ButtonLink } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ProductVisual } from '@/shared/ui/ProductVisual';
import { StepIndicator } from '@/shared/ui/StepIndicator';

import {
  getPurchaseRequestId,
  clearPurchaseRequest,
} from '@/features/checkout/purchase-request';

//確認
function isAmbiguousPurchaseError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return (
      error.status === 0 ||
      error.status >= 500 ||
      error.code === 'INVALID_RESPONSE'
    );
  }
  return error instanceof DOMException && error.name === 'AbortError';
}

// POSTの通信結果が不明な場合の購入復元。
async function purchaseWithRecovery(
  productId: string,
  requestId: string,
): Promise<Transaction> {
  try {
    const result = await purchaseProductApi(productId, requestId);
    if (!result.ok || !result.transactionId) {
      throw new Error('購入処理に失敗しました。');
    }
    return {
      id: result.transactionId,
    } as Transaction;
  } catch (error) {
    if (!isAmbiguousPurchaseError(error)) {
      throw error;
    }
  }
  // POSTの結果が不明なのでGETで照会
  try {
    return await getPurchaseByRequestId(requestId);
  } catch (lookupError) {
    // 404以外は未成立と判断できないため再送しない
    if (!(lookupError instanceof ApiError) || lookupError.status !== 404) {
      throw lookupError;
    }
  }
  try {
    const result = await purchaseProductApi(productId, requestId);

    if (!result.ok || !result.transactionId) {
      throw new Error('購入処理に失敗しました。');
    }
    return {
      id: result.transactionId,
    } as Transaction;
  } catch (retryError) {
    if (!isAmbiguousPurchaseError(retryError)) {
      throw retryError;
    }
  }
  return getPurchaseByRequestId(requestId);
}

export function CheckoutReviewPage() {
  const { productId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { activeUser } = useDemoStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const processingRef = useRef(false);

  const checkoutDraft =
    (location.state as { checkoutDraft?: CheckoutDraft } | null | undefined)
      ?.checkoutDraft ?? DEFAULT_CHECKOUT_DRAFT;

  useEffect(() => {
    if (!productId) return;

    getProduct(productId)
      .then((product) => {
        setProduct(product);
      })
      .catch(() => {
        setProduct(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [productId]);

  if (isLoading) {
    return (
      <div className="page-stack">
        <p>商品情報を読み込んでいます...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <EmptyState
        icon={<Package size={32} />}
        title="商品情報を取得できませんでした"
        description="商品一覧へ戻って、もう一度お試しください。"
        action={<ButtonLink to={paths.products}>商品一覧へ</ButtonLink>}
      />
    );
  }

  const handlePurchase = async () => {
    if (!activeUser) {
      setError('ログインしてください。');
      return;
    }
    if (processingRef.current) return;
    processingRef.current = true;
    if (isProcessing) return;
    setIsProcessing(true);
    setError('');

    const requestId = getPurchaseRequestId(activeUser.id, product.id);

    try {
      const transaction = await purchaseWithRecovery(product.id, requestId);

      // 購入成立を確認できた場合だけ保存情報を削除する。
      clearPurchaseRequest(activeUser.id, product.id, requestId);

      navigate(paths.purchaseComplete(transaction.id));
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : '購入結果を確認できませんでした。同じ購入操作から再度お試しください。',
      );
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
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
