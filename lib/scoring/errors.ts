export type ScoringErrorCode =
  | 'INVALID_INPUT'
  | 'CONFIG_INVALID'
  | 'CONFIG_MISSING'
  | 'UNKNOWN';

export class ScoringError extends Error {
  readonly code: ScoringErrorCode;

  constructor(code: ScoringErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'ScoringError';
  }
}
