"use client";

import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { brandFetch } from '@/lib/api';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  features: string[];
  benefits: string[];
  usp: string | null;
  targetCustomer: string | null;
  offers: string[];
  availability: string | null;
  purchaseUrl: string | null;
  objections: string[];
}

/** "name, name, name" <-> ["name","name","name"], same convention as the existing Business Brain array fields (competitors, avoid-topics, etc.). */
function parseList(text: string): string[] {
  return text.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Products/Services management -- the one structural gap the $1M ARR
 * blueprint's audit flagged. Lives inside the Business Brain tab (not a
 * separate top-level page) because that's exactly what these are: real
 * facts BusinessBrainService.buildPromptContext injects into every
 * generation, right alongside brand voice and content pillars, so captions
 * and ideas can reference actual products instead of inventing generic ones.
 *
 * FAQs (a Product field the backend supports) aren't editable here yet --
 * scoped out of this first pass to keep the form to the fields that matter
 * most for generation grounding (name/price/USP/description). The API
 * already accepts faqs; a follow-up can add that editor without a backend
 * change.
 */
export default function ProductsManager() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);

  const load = () => {
    setLoading(true);
    brandFetch<Product[]>('/products')
      .then(setProducts)
      .catch((e: any) => setError(e?.message || "Couldn't load products."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this product? Oyinca will stop referencing it in new content.')) return;
    try {
      await brandFetch(`/products/${id}`, { method: 'DELETE' });
      load();
    } catch (e: any) {
      alert(e?.message || 'Could not remove this product.');
    }
  };

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      ) : error ? (
        <p className="text-body-sm" style={{ color: 'var(--accent-error)' }}>{error}</p>
      ) : (
        <>
          {products && products.length > 0 && (
            <div className="space-y-2">
              {products.map((p) => (
                <div key={p.id} className="exec-card card-pad flex items-start justify-between gap-3">
                  <div>
                    <p className="text-body-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {p.name}
                      {p.price != null && (
                        <span className="font-normal" style={{ color: 'var(--text-muted)' }}>
                          {' '}
                          · {p.currency ? `${p.currency} ` : ''}
                          {p.price}
                        </span>
                      )}
                    </p>
                    {(p.usp || p.description) && (
                      <p className="text-caption mt-1" style={{ color: 'var(--text-secondary)' }}>{p.usp || p.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => setEditing(p)} className="btn-secondary p-2 rounded-[var(--radius-md)] touch-target" aria-label={`Edit ${p.name}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => handleDelete(p.id)} className="btn-secondary p-2 rounded-[var(--radius-md)] touch-target" aria-label={`Remove ${p.name}`}>
                      <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--accent-error)' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="btn-secondary px-4 py-2 rounded-[var(--radius-md)] text-xs font-bold touch-target flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add product or service
          </button>
        </>
      )}

      {editing && (
        <ProductModal
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ProductModal({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price != null ? String(product.price) : '');
  const [currency, setCurrency] = useState(product?.currency || '');
  const [usp, setUsp] = useState(product?.usp || '');
  const [targetCustomer, setTargetCustomer] = useState(product?.targetCustomer || '');
  const [purchaseUrl, setPurchaseUrl] = useState(product?.purchaseUrl || '');
  const [features, setFeatures] = useState(product?.features?.join(', ') || '');
  const [benefits, setBenefits] = useState(product?.benefits?.join(', ') || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) {
      setError('Give this product or service a name.');
      return;
    }
    const priceNum = price.trim() === '' ? null : Number(price);
    if (priceNum != null && !Number.isFinite(priceNum)) {
      setError('Enter a valid price, or leave it blank.');
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      price: priceNum,
      currency: currency.trim() || null,
      usp: usp.trim() || null,
      targetCustomer: targetCustomer.trim() || null,
      purchaseUrl: purchaseUrl.trim() || null,
      features: parseList(features),
      benefits: parseList(benefits),
    };
    try {
      if (product) {
        await brandFetch(`/products/${product.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        await brandFetch('/products', { method: 'POST', body: JSON.stringify(body) });
      }
      onSaved();
    } catch (e: any) {
      setError(e?.message || 'Could not save this product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="exec-card card-pad max-w-md w-full space-y-3 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-surface)' }}>
        <h3 className="text-h3" style={{ color: 'var(--text-primary)' }}>{product ? 'Edit product' : 'Add product or service'}</h3>

        <label className="block">
          <span className="text-caption font-bold" style={{ color: 'var(--text-muted)' }}>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-[var(--radius-md)] border px-3 py-2 text-body-sm" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)', color: 'var(--text-primary)' }} />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-caption font-bold" style={{ color: 'var(--text-muted)' }}>Price</span>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1 w-full rounded-[var(--radius-md)] border px-3 py-2 text-body-sm" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)', color: 'var(--text-primary)' }} />
          </label>
          <label className="block">
            <span className="text-caption font-bold" style={{ color: 'var(--text-muted)' }}>Currency</span>
            <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" className="mt-1 w-full rounded-[var(--radius-md)] border px-3 py-2 text-body-sm" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)', color: 'var(--text-primary)' }} />
          </label>
        </div>

        <label className="block">
          <span className="text-caption font-bold" style={{ color: 'var(--text-muted)' }}>Unique selling point</span>
          <input value={usp} onChange={(e) => setUsp(e.target.value)} placeholder="Why this over alternatives, in one line" className="mt-1 w-full rounded-[var(--radius-md)] border px-3 py-2 text-body-sm" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)', color: 'var(--text-primary)' }} />
        </label>

        <label className="block">
          <span className="text-caption font-bold" style={{ color: 'var(--text-muted)' }}>Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 w-full rounded-[var(--radius-md)] border px-3 py-2 text-body-sm" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)', color: 'var(--text-primary)' }} />
        </label>

        <label className="block">
          <span className="text-caption font-bold" style={{ color: 'var(--text-muted)' }}>Target customer</span>
          <input value={targetCustomer} onChange={(e) => setTargetCustomer(e.target.value)} className="mt-1 w-full rounded-[var(--radius-md)] border px-3 py-2 text-body-sm" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)', color: 'var(--text-primary)' }} />
        </label>

        <label className="block">
          <span className="text-caption font-bold" style={{ color: 'var(--text-muted)' }}>Key features (comma-separated)</span>
          <input value={features} onChange={(e) => setFeatures(e.target.value)} className="mt-1 w-full rounded-[var(--radius-md)] border px-3 py-2 text-body-sm" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)', color: 'var(--text-primary)' }} />
        </label>

        <label className="block">
          <span className="text-caption font-bold" style={{ color: 'var(--text-muted)' }}>Key benefits (comma-separated)</span>
          <input value={benefits} onChange={(e) => setBenefits(e.target.value)} className="mt-1 w-full rounded-[var(--radius-md)] border px-3 py-2 text-body-sm" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)', color: 'var(--text-primary)' }} />
        </label>

        <label className="block">
          <span className="text-caption font-bold" style={{ color: 'var(--text-muted)' }}>Purchase URL</span>
          <input value={purchaseUrl} onChange={(e) => setPurchaseUrl(e.target.value)} className="mt-1 w-full rounded-[var(--radius-md)] border px-3 py-2 text-body-sm" style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--bg-surface-sunken)', color: 'var(--text-primary)' }} />
        </label>

        {error && <p className="text-caption" style={{ color: 'var(--accent-error)' }}>{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 rounded-[var(--radius-md)] text-xs font-bold touch-target">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={saving} className="btn-primary-gradient px-4 py-2 rounded-[var(--radius-md)] text-xs font-bold touch-target disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
