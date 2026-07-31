import React, { Suspense, useEffect } from 'react';

// Lazy-load SimpleRTE to avoid circular import (SimpleRTE → AccordionModal → SimpleRTE).
// By the time this component renders, SimpleRTE is already fully initialized so the
// lazy resolution completes synchronously from the module cache.
const SimpleRTE = React.lazy(() => import('./SimpleRTE'));

export default function AccordionModal({ modal, setModal, onInsert, onCancel, rteImageUpload }) {
  useEffect(() => {
    window.__lenis?.stop();
    return () => window.__lenis?.start();
  }, []);
  const answerText = modal.answer.replace(/<[^>]*>/g, '').trim();
  const hasAnswer = answerText.length > 0;
  const hasQuestion = modal.question.trim().length > 0;

  return (
    <div className="rte-modal-overlay" onMouseDown={(e) => e.stopPropagation()}>
      <div className="rte-modal" style={{ width: '820px', maxWidth: '97vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <h4>🔽 Insert Accordion</h4>

        {modal.items.length > 0 && (
          <ul className="rte-accordion-item-list">
            {modal.items.map((item, i) => (
              <li key={i}>
                <div className="rte-accordion-item-move">
                  <button
                    type="button"
                    title="Move up"
                    disabled={i === 0}
                    onClick={() => setModal((m) => {
                      const items = [...m.items];
                      [items[i - 1], items[i]] = [items[i], items[i - 1]];
                      return { ...m, items };
                    })}
                  >▲</button>
                  <button
                    type="button"
                    title="Move down"
                    disabled={i === modal.items.length - 1}
                    onClick={() => setModal((m) => {
                      const items = [...m.items];
                      [items[i + 1], items[i]] = [items[i], items[i + 1]];
                      return { ...m, items };
                    })}
                  >▼</button>
                </div>
                <span
                  className="rte-accordion-item-edit"
                  title="Click to edit"
                  onClick={() => setModal((m) => ({
                    ...m,
                    items: m.items.filter((_, idx) => idx !== i),
                    question: item.question,
                    answer: item.answer,
                    answerSyncKey: m.answerSyncKey + 1,
                  }))}
                >
                  {item.question}
                </span>
                <button
                  type="button"
                  className="rte-accordion-item-remove"
                  title="Remove"
                  onClick={() => setModal((m) => ({
                    ...m,
                    items: m.items.filter((_, idx) => idx !== i),
                  }))}
                >✕</button>
              </li>
            ))}
          </ul>
        )}

        <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#475569', marginBottom: '6px' }}>
          Question *
        </label>
        <input
          type="text"
          autoFocus
          placeholder="e.g. What is SAP GRC?"
          value={modal.question}
          onChange={(e) => setModal((m) => ({ ...m, question: e.target.value }))}
          style={{ width: '100%', marginBottom: '16px' }}
        />

        <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#475569', marginBottom: '6px' }}>
          Answer *
        </label>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '16px' }}>
          <Suspense fallback={
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              Loading editor…
            </div>
          }>
            <SimpleRTE
              key={modal.answerSyncKey}
              value={modal.answer}
              onChange={(html) => setModal((m) => ({ ...m, answer: html }))}
              onImageUpload={rteImageUpload}
              minHeight="180px"
              maxHeight="400px"
            />
          </Suspense>
        </div>

        <button
          type="button"
          className="btn-cancel"
          disabled={!hasQuestion || !hasAnswer}
          onClick={() => setModal((m) => ({
            ...m,
            items: [...m.items, { question: m.question, answer: m.answer }],
            question: '',
            answer: '',
            answerSyncKey: m.answerSyncKey + 1,
          }))}
        >
          + Add Item
        </button>

        <div className="rte-modal-actions">
          <button className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-insert"
            disabled={modal.items.length === 0 && (!hasQuestion || !hasAnswer)}
            onClick={() => {
              const items = [...modal.items];
              if (hasQuestion && hasAnswer) {
                items.push({ question: modal.question, answer: modal.answer });
              }
              onInsert(items);
            }}
          >
            Insert{modal.items.length > 0
              ? ` (${modal.items.length + (hasQuestion && hasAnswer ? 1 : 0)})`
              : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
