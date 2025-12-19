import React, { useState } from 'react';
import { Table } from '../domain/auth.js';
import { useAuthStore } from '../app/store/authStore.js';
import './styles/feedback.css';
import { extractErrorMessage, normalizeErrorMessage } from '../shared/utils/errorMessage.js';
import { ErrorWindow } from '../shared/components/ErrorWindow.jsx';

const FeedbackPage = () => {
  const { token } = useAuthStore();
  const [form, setForm] = useState({ table: Table.T1, rating: '', comment: '', tipAmount: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const API_BASE = import.meta.env.VITE_API_URL || '';

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSuccess('');
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        tableNumber: form.table,
        rating: Number(form.rating),
        comment: form.comment,
        tipAmount: form.tipAmount ? Number(form.tipAmount) : 0,
      };
      const res = await fetch(`${API_BASE}/feedback/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(extractErrorMessage(res, text));
      setSuccess('Спасибо! Отзыв отправлен.');
      setForm({ table: Table.T1, rating: '', comment: '', tipAmount: '' });
    } catch (err) {
      setError(normalizeErrorMessage(err.message) || 'Ошибка отправки');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="feedback-page">
      <div className="feedback-card">
        <div className="feedback-header">
          <h1 className="feedback-title">Оставить отзыв</h1>
        </div>

        <form className="feedback-form" onSubmit={handleSubmit}>
          <div className="feedback-field">
            <label htmlFor="table">Стол</label>
            <select
              id="table"
              name="table"
              className="feedback-select"
              value={form.table}
              onChange={handleChange}
            >
              {Object.values(Table).map(table => (
                <option key={table} value={table}>
                  {table}
                </option>
              ))}
            </select>
          </div>

          <div className="feedback-field">
            <label htmlFor="rating">Оценка</label>
            <div className="feedback-stars">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  type="button"
                  key={star}
                  className={`feedback-star ${Number(form.rating) >= star ? 'active' : ''}`}
                  onClick={() => setForm(prev => ({ ...prev, rating: star }))}
                  aria-label={`Оценка ${star}`}
                >
                  ★
                </button>
              ))}
            </div>
            <input type="hidden" name="rating" value={form.rating} required />
          </div>

          <div className="feedback-field">
            <label htmlFor="comment">Отзыв</label>
            <textarea
              id="comment"
              name="comment"
              className="feedback-textarea"
              rows="4"
              value={form.comment}
              onChange={handleChange}
              placeholder="Что улучшить?"
            />
          </div>

          <div className="feedback-field">
            <label htmlFor="tipAmount">Чаевые</label>
            <input
              id="tipAmount"
              name="tipAmount"
              type="number"
              className="feedback-input"
              value={form.tipAmount}
              onChange={handleChange}
              placeholder="Сумма, ?"
            />
          </div>

          <div className="feedback-actions">
            <button className="feedback-button" type="submit" disabled={submitting}>
              {submitting ? 'Отправляем...' : 'Отправить'}
            </button>
          </div>
        </form>

        {success && <div className="feedback-note" style={{ color: 'green' }}>{success}</div>}
        {error && (
          <ErrorWindow
            message={error}
            style={{ marginTop: 12 }}
          />
        )}
      </div>
    </div>
  );
};

export default FeedbackPage;
