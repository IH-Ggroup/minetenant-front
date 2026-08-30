import { ArrowLeft, CreditCard, Package } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { getProduct } from '@/api/products';
import { useDemoStore } from '@/app/demo-store-context';
import { paths } from '@/app/paths';
import {
  type CheckoutDraft,
  DEFAULT_CHECKOUT_DRAFT,
} from '@/features/checkout/checkout-draft';
import type { Product } from '@/domain/models';
import { formatPrice } from '@/shared/lib/format';
import { Button, ButtonLink } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ProductVisual } from '@/shared/ui/ProductVisual';
import { StepIndicator } from '@/shared/ui/StepIndicator';

export function CheckoutPage() {
  const { productId = '' } = useParams();
  const navigate = useNavigate();
  const { activeUser } = useDemoStore();

  const [product, setProduct] = useState<Product | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState<CheckoutDraft>({
    ...DEFAULT_CHECKOUT_DRAFT, //住所
    name: activeUser?.name ?? '',
  });

  useEffect(() => {
    if (!productId) return;

    getProduct(productId)
      .then((product) => {
        setProduct(product);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [productId]);

  if (isLoading) {
    return (
      <div className="narrow-page page-stack">
        <p>商品情報を読み込んでいます...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <EmptyState
        icon={<Package size={32} />}
        title="商品情報を取得できませんでした"
        description="商品一覧から、もう一度お試しください。"
        action={<ButtonLink to={paths.products}>商品一覧へ</ButtonLink>}
      />
    );
  }

  const cannotPurchase =
    product.stock === 0 || product.sellerId === activeUser?.id;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (cannotPurchase) return;

    navigate(paths.checkoutReview(product.id), {
      state: { checkoutDraft: draft },
    });
  };

  return (
    <div className="narrow-page page-stack">
      <StepIndicator
        steps={['購入情報', '内容確認', '完了']}
        currentStep={1}
        label="購入手続き"
      />

      <div className="checkout-heading">
        <Link to={paths.product(product.id)}>
          <ArrowLeft size={16} aria-hidden="true" />
          商品詳細へ戻る
        </Link>

        <h1>購入情報</h1>
      </div>

      <form className="checkout-grid" onSubmit={handleSubmit}>
        <section className="panel checkout-form-panel">
          <div className="panel__heading">
            <h2>お届け先</h2>
          </div>

          <div className="form-grid form-grid--two">
            <label className="field">
              <span className="field__label">お名前</span>
              <input
                className="input"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                type="text"
                required
              />
            </label>

            <label className="field">
              <span className="field__label">郵便番号</span>
              <input
                className="input"
                value={draft.postalCode}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    postalCode: event.target.value,
                  }))
                }
                inputMode="numeric"
                type="text"
                required
              />
            </label>
          </div>

          <label className="field">
            <span className="field__label">住所</span>
            <input
              className="input"
              value={draft.address}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  address: event.target.value,
                }))
              }
              type="text"
              required
            />
          </label>

          <div className="panel__divider" />

          <div className="panel__heading">
            <h2>お支払い方法</h2>
          </div>

          <label className="payment-option">
            <input type="radio" name="payment" defaultChecked />

            <span className="payment-option__icon" aria-hidden="true">
              <CreditCard size={20} />
            </span>

            <span>
              <strong>デモ決済</strong>
            </span>
          </label>
        </section>

        <aside className="panel order-summary">
          <h2>注文内容</h2>

          <div className="order-summary__product">
            <ProductVisual
              theme={product.theme}
              emoji={product.emoji}
              name={product.name}
              compact
            />

            <div>
              <strong>{product.name}</strong>
              <span>数量 1</span>
            </div>
          </div>

          <dl>
            <div>
              <dt>商品</dt>
              <dd>{formatPrice(product.price)}</dd>
            </div>

            <div>
              <dt>送料</dt>
              <dd>デモのため無料</dd>
            </div>

            <div className="order-summary__total">
              <dt>合計</dt>
              <dd>{formatPrice(product.price)}</dd>
            </div>
          </dl>

          <Button type="submit" fullWidth disabled={cannotPurchase}>
            内容を確認する
          </Button>
        </aside>
      </form>
    </div>
  );
}
