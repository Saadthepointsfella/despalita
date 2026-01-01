'use client';

import * as React from 'react';
import { ProgressBar } from './progress-bar';
import { QuizHeader } from './quiz-header';
import { QuestionCard } from './question-card';
import { OptionCard } from './option-card';
import { QuizNavigation } from './quiz-navigation';
import { ResultPreview } from './result-preview';
import { EmailGateForm } from './email-gate-form';
import type { LevelsJson, PreviewResult, QuizDimension, QuizQuestion, QuizStatus, UTM } from './types';
import { computePreview } from './preview-scoring';
import { track } from '@/lib/analytics';
import { Panel } from '@/components/ui/panel';
import { Divider } from '@/components/ui/divider';

type QuizState = {
  currentIndex: number;
  answers: Record<string, string>;
  selectedOptionId: string | null;
  startedAt: number;
  questionStartAt: number;
  timings: Record<string, number>;
  status: QuizStatus;
  utm: UTM;
  errorMessage?: string | null;
  preview?: PreviewResult | null;
};

type Action =
  | { type: 'INIT'; utm: UTM; now: number }
  | { type: 'SELECT_OPTION'; optionId: string | null }
  | { type: 'NEXT'; questionId: string; now: number }
  | { type: 'BACK'; questionId: string; now: number }
  | { type: 'SUBMIT_PREVIEW'; questionId: string; now: number; preview: PreviewResult }
  | { type: 'SHOW_GATE' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_ERROR'; message: string }
  | { type: 'RESET_ERROR' };

function normalizeCopy(text: string) {
  return text
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s-\s/g, ', ')
    .replace(/\s+,/g, ',')
    .replace(/,\s+/g, ', ')
    .trim();
}

function getUtmFromLocation(): UTM {
  if (typeof window === 'undefined') return {};
  const url = new URL(window.location.href);
  const source = url.searchParams.get('utm_source') ?? undefined;
  const medium = url.searchParams.get('utm_medium') ?? undefined;
  const campaign = url.searchParams.get('utm_campaign') ?? undefined;
  return { source, medium, campaign };
}

function reducer(state: QuizState, action: Action): QuizState {
  switch (action.type) {
    case 'INIT':
      return {
        ...state,
        utm: action.utm,
        status: 'in_quiz',
        startedAt: action.now,
        questionStartAt: action.now,
      };

    case 'SELECT_OPTION':
      return { ...state, selectedOptionId: action.optionId };

    case 'NEXT': {
      const selected = state.selectedOptionId;
      if (!selected) return state;

      const elapsed = Math.max(0, action.now - state.questionStartAt);
      const nextIndex = Math.min(23, state.currentIndex + 1);

      return {
        ...state,
        answers: { ...state.answers, [action.questionId]: selected },
        timings: {
          ...state.timings,
          [action.questionId]: (state.timings[action.questionId] ?? 0) + elapsed,
        },
        currentIndex: nextIndex,
        questionStartAt: action.now,
        selectedOptionId: null,
      };
    }

    case 'BACK': {
      const elapsed = Math.max(0, action.now - state.questionStartAt);
      const prevIndex = Math.max(0, state.currentIndex - 1);

      return {
        ...state,
        timings: {
          ...state.timings,
          [action.questionId]: (state.timings[action.questionId] ?? 0) + elapsed,
        },
        currentIndex: prevIndex,
        questionStartAt: action.now,
        selectedOptionId: null,
      };
    }

    case 'SUBMIT_PREVIEW': {
      const selected = state.selectedOptionId;
      if (!selected) return state;

      const elapsed = Math.max(0, action.now - state.questionStartAt);

      return {
        ...state,
        answers: { ...state.answers, [action.questionId]: selected },
        timings: {
          ...state.timings,
          [action.questionId]: (state.timings[action.questionId] ?? 0) + elapsed,
        },
        status: 'preview',
        preview: action.preview,
        selectedOptionId: null,
      };
    }

    case 'SHOW_GATE':
      return { ...state, status: 'gated' };

    case 'SUBMIT_START':
      return { ...state, status: 'submitting', errorMessage: null };

    case 'SUBMIT_ERROR':
      return { ...state, status: 'error', errorMessage: action.message };

    case 'RESET_ERROR':
      return { ...state, status: 'gated', errorMessage: null };

    default:
      return state;
  }
}

function progressFromAnswered(answered: number, total: number) {
  return 0.1 + 0.9 * (answered / total);
}

export function QuizClient({
  dimensions,
  questions,
  levelsJson,
}: {
  dimensions: QuizDimension[];
  questions: QuizQuestion[];
  levelsJson: LevelsJson;
}) {
  const total = questions.length;

  const [state, dispatch] = React.useReducer(reducer, {
    currentIndex: 0,
    answers: {},
    selectedOptionId: null,
    startedAt: 0,
    questionStartAt: 0,
    timings: {},
    status: 'loading',
    utm: {},
    errorMessage: null,
    preview: null,
  });

  React.useEffect(() => {
    const now = Date.now();
    dispatch({ type: 'INIT', utm: getUtmFromLocation(), now });
    track('quiz_started', { ts: now });
  }, []);

  const currentQuestion = questions[state.currentIndex];
  const currentDim = dimensions.find((d) => d.id === currentQuestion.dimension_id);

  const answeredCount = Object.keys(state.answers).length;
  const progress = progressFromAnswered(answeredCount, total);
  const progressLabel = `${Math.round(progress * 100)}%`;

  const options = currentQuestion.options;

  const optionRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  // Restore selection when navigating
  React.useEffect(() => {
    if (state.status !== 'in_quiz') return;
    const saved = state.answers[currentQuestion.id] ?? null;
    if (saved !== state.selectedOptionId) {
      dispatch({ type: 'SELECT_OPTION', optionId: saved });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentIndex, state.status, currentQuestion.id]);

  // Keyboard-first focus: focus answered option or first option (DO NOT select on focus)
  React.useEffect(() => {
    if (state.status !== 'in_quiz') return;

    const focusId = state.answers[currentQuestion.id] ?? options[0]?.id;
    if (!focusId) return;

    let raf1 = 0;
    let raf2 = 0;

    raf1 = window.requestAnimationFrame(() => {
      const el = optionRefs.current[focusId];
      if (el) el.focus();
      else raf2 = window.requestAnimationFrame(() => optionRefs.current[focusId]?.focus());
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentIndex, state.status, currentQuestion.id]);

  function setSelected(optionId: string, emitEvent = true) {
    dispatch({ type: 'SELECT_OPTION', optionId });
    if (emitEvent) track('question_answered', { question_id: currentQuestion.id });
  }

  function onBack() {
    if (state.status !== 'in_quiz' || state.currentIndex === 0) return;
    dispatch({ type: 'BACK', questionId: currentQuestion.id, now: Date.now() });
  }

  function onNext() {
    if (state.status !== 'in_quiz' || !state.selectedOptionId) return;

    const isLast = state.currentIndex === total - 1;

    if (isLast) {
      const preview = computePreview({
        dimensions,
        questions,
        levels: levelsJson,
        answers: { ...state.answers, [currentQuestion.id]: state.selectedOptionId },
      });

      track('quiz_completed', { ts: Date.now() });

      dispatch({
        type: 'SUBMIT_PREVIEW',
        questionId: currentQuestion.id,
        now: Date.now(),
        preview,
      });
      return;
    }

    dispatch({ type: 'NEXT', questionId: currentQuestion.id, now: Date.now() });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (state.status !== 'in_quiz') return;

    const selectedIndexRaw = options.findIndex((o) => o.id === state.selectedOptionId);

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();

      let nextIdx: number;
      if (selectedIndexRaw === -1) {
        nextIdx = e.key === 'ArrowDown' ? 0 : options.length - 1;
      } else {
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        nextIdx = (selectedIndexRaw + delta + options.length) % options.length;
      }

      const nextOpt = options[nextIdx];
      if (nextOpt) {
        setSelected(nextOpt.id);
        optionRefs.current[nextOpt.id]?.focus();
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (!state.selectedOptionId) return;
      onNext();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      dispatch({ type: 'SELECT_OPTION', optionId: null });
    }
  }

  async function submitEmailGate(data: { email: string; company?: string }) {
    track('email_gate_submitted', { ts: Date.now() });
    dispatch({ type: 'SUBMIT_START' });

    const answersPayload = Object.entries(state.answers).map(([question_id, option_id]) => ({
      question_id,
      option_id,
    }));

    const timingsPayload = Object.entries(state.timings).map(([question_id, time_spent_ms]) => ({
      question_id,
      time_spent_ms,
    }));

    try {
      const res = await fetch('/api/assessment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          company: data.company,
          answers: answersPayload,
          timings: timingsPayload,
          utm: state.utm,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (res.ok && json?.token) {
        window.location.href = `/results/${json.token}`;
        return;
      }

      dispatch({
        type: 'SUBMIT_ERROR',
        message: 'Could not generate your report yet. Please try again.',
      });
    } catch {
      dispatch({
        type: 'SUBMIT_ERROR',
        message: 'Network error. Please try again.',
      });
    }
  }

  React.useEffect(() => {
    if (state.status === 'gated') track('email_gate_viewed', { ts: Date.now() });
  }, [state.status]);

  if (state.status === 'loading') {
    return (
      <main className="container-narrow py-10">
        <Panel className="space-y-4">
          <div className="h-3 w-28 bg-border" />
          <Divider />
          <div className="space-y-2">
            <div className="h-5 w-3/4 bg-border" />
            <div className="h-4 w-2/3 bg-border" />
          </div>
          <div className="space-y-2">
            <div className="h-14 w-full bg-border" />
            <div className="h-14 w-full bg-border" />
            <div className="h-14 w-full bg-border" />
          </div>
        </Panel>
      </main>
    );
  }

  if (state.status === 'preview' && state.preview) {
    return (
      <main className="container-narrow py-10 space-y-6">
        <QuizHeader section="06" dimensionLabel="Preview" progressLabel="100%" />
        <ResultPreview
          level={state.preview.level.level}
          heroTitle={state.preview.level.hero_title}
          heroCopy={state.preview.level.hero_copy}
          topGapLabel={state.preview.top_gap.label}
          onUnlock={() => dispatch({ type: 'SHOW_GATE' })}
        />
      </main>
    );
  }

  if (state.status === 'gated' || state.status === 'submitting' || state.status === 'error') {
    return (
      <main className="container-narrow py-10 space-y-6">
        <QuizHeader section="06" dimensionLabel="Results" progressLabel="100%" />

        {state.preview ? (
          <ResultPreview
            level={state.preview.level.level}
            heroTitle={state.preview.level.hero_title}
            heroCopy={state.preview.level.hero_copy}
            topGapLabel={state.preview.top_gap.label}
            onUnlock={() => void 0}
          />
        ) : null}

        <EmailGateForm
          submitting={state.status === 'submitting'}
          error={
            state.status === 'error'
              ? state.errorMessage ?? 'Something went wrong. Please try again.'
              : null
          }
          onSubmit={submitEmailGate}
        />

        {state.status === 'error' ? (
          <button
            type="button"
            onClick={() => dispatch({ type: 'RESET_ERROR' })}
            className="text-sm text-faint hover:text-fg transition-colors"
          >
            Retry →
          </button>
        ) : null}
      </main>
    );
  }

  const isLast = state.currentIndex === total - 1;
  const canGoBack = state.currentIndex > 0;
  const canGoNext = !!state.selectedOptionId;

  return (
    <main className="container-max py-16" onKeyDown={handleKeyDown}>
      {/* Atmosphere: subtle grid + thin rule frame */}
      <div className="grid-overlay border border-border bg-bg p-10">
        <div className="mx-auto max-w-narrow">
          <QuizHeader
            section={currentDim?.section ?? '01'}
            dimensionLabel={`${currentDim?.section ?? '01'} ${currentDim?.short_label ?? currentDim?.name ?? ''}`}
            progressLabel={progressLabel}
          />

          <ProgressBar value={progress} className="mt-6" />

          <div className="mt-10">
            <QuestionCard
              prompt={`${state.currentIndex + 1}/${total}, ${normalizeCopy(currentQuestion.prompt)}`}
              helper="Keyboard: ↑/↓ • Enter next • Esc clear"
            >
              <div role="radiogroup" aria-label="Answer options" className="space-y-2">
                {options.map((o, idx) => {
                  const checked = o.id === state.selectedOptionId;
                  const tabIndex = checked || (!state.selectedOptionId && idx === 0) ? 0 : -1;

                  // A, B, C, D, E
                  const indexLabel = String.fromCharCode(65 + idx);

                  return (
                    <OptionCard
                      key={o.id}
                      id={`opt-${o.id}`}
                      ref={(el) => {
                        optionRefs.current[o.id] = el;
                      }}
                      label={normalizeCopy(o.label)}
                      checked={checked}
                      indexLabel={indexLabel}
                      tabIndex={tabIndex}
                      onSelect={() => setSelected(o.id)}
                    />
                  );
                })}
              </div>
            </QuestionCard>
          </div>

          <QuizNavigation
            canGoBack={canGoBack}
            canGoNext={canGoNext}
            isLast={isLast}
            onBack={onBack}
            onNext={onNext}
          />
        </div>
      </div>
    </main>
  );
}
