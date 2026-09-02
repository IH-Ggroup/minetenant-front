import { ArrowRight } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useDemoStore } from '@/app/demo-store-context';
import { paths } from '@/app/paths';
import type { ProductCategory } from '@/domain/models';
import { categoryLabels } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { PageHeader } from '@/shared/ui/PageHeader';
import { StepIndicator } from '@/shared/ui/StepIndicator';

interface ListingFormState {
  name: string;
  description: string;
  price: string;
  stock: string;
  category: ProductCategory;
}

export function SellPage() {
  const navigate = useNavigate();
  const { activeUser, saveListingDraft } = useDemoStore();

  const [form, setForm] = useState<ListingFormState>({
    name: '',
    description: '',
    price: '',
    stock: '1',
    category: 'fashion',
  });

  const updateField = <Key extends keyof ListingFormState>(
    key: Key,
    value: ListingFormState[Key],
  ) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeUser) {
      return;
    }

    saveListingDraft({
      sellerId: activeUser.id,
      storeId: activeUser.storeId,
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
      category: form.category,
      theme: 'forest',
      emoji: '📦',
    });

    navigate(paths.sellReview);
  };

  return (
    <div className="narrow-page page-stack">
      <StepIndicator
        steps={['商品情報', '内容確認', 'Minecraft同期', '完了']}
        currentStep={1}
        label="商品出品"
      />

      <PageHeader
        title="商品を出品する"
        description="商品の基本情報を入力してください。"
      />

      <form className="panel listing-form" onSubmit={handleSubmit}>
        <div className="form-stack">
          <label className="field">
            <span className="field__label">商品名</span>
            <input
              className="input"
              type="text"
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              placeholder="例：鉱石モチーフのペンダント"
              required
            />
          </label>

          <label className="field">
            <span className="field__label">商品説明</span>
            <textarea
              className="textarea"
              value={form.description}
              onChange={(event) =>
                updateField('description', event.target.value)
              }
              placeholder="商品の特徴を入力してください"
              rows={4}
              required
            />
          </label>

          <div className="form-grid form-grid--two">
            <label className="field">
              <span className="field__label">価格</span>
              <div className="input-affix">
                <span>¥</span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={form.price}
                  onChange={(event) => updateField('price', event.target.value)}
                  placeholder="3000"
                  required
                />
              </div>
            </label>

            <label className="field">
              <span className="field__label">在庫数</span>
              <div className="input-affix input-affix--suffix">
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(event) => updateField('stock', event.target.value)}
                  required
                />
                <span>点</span>
              </div>
            </label>
          </div>

          <label className="field">
            <span className="field__label">カテゴリ</span>
            <select
              className="select"
              value={form.category}
              onChange={(event) =>
                updateField('category', event.target.value as ProductCategory)
              }
            >
              {(
                Object.entries(categoryLabels) as [ProductCategory, string][]
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-actions">
          <Button type="submit">
            内容を確認する
            <ArrowRight size={18} aria-hidden="true" />
          </Button>
        </div>
      </form>
    </div>
  );
}
