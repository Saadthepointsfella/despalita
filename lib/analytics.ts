type EventName =
  | 'quiz_started'
  | 'question_answered'
  | 'quiz_completed'
  | 'email_gate_viewed'
  | 'email_gate_submitted';

export function track(event: EventName, payload?: Record<string, unknown>) {
  // Phase 2: no-op by default. Hook a real provider in Phase 7.
  void event;
  void payload;
}
