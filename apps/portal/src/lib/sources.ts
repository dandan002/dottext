// Mirrors the candidate roster in config/sources/README.md.
// Every entry is a candidate: inactive and unvalidated. Nothing here asserts a
// feed, URL, access right, or historical availability.

export type Country = 'chile' | 'colombia';
export type SourceKind = 'official' | 'journalism';
export type SourceStatus =
  | 'inactive'
  | 'healthy'
  | 'quiet'
  | 'overdue'
  | 'failed'
  | 'paused';

export interface Source extends Record<string, unknown> {
  id: string;
  name: string;
  country: Country;
  kind: SourceKind;
  status: SourceStatus;
  /** ISO timestamp of the last successful collection, if any. */
  lastSuccessAt: string | null;
  documentCount: number | null;
}

export const COUNTRY_LABEL: Record<Country, string> = {
  chile: 'Chile',
  colombia: 'Colombia',
};

export const KIND_LABEL: Record<SourceKind, string> = {
  official: 'Official',
  journalism: 'Journalism',
};

export const SOURCES: Source[] = [
  {name: 'Banco Central de Chile', country: 'chile', kind: 'official'},
  {name: 'DIPRES', country: 'chile', kind: 'official'},
  {name: 'INE', country: 'chile', kind: 'official'},
  {name: 'BioBioChile', country: 'chile', kind: 'journalism'},
  {name: 'Radio Universidad de Chile', country: 'chile', kind: 'journalism'},
  {name: 'El Mostrador', country: 'chile', kind: 'journalism'},
  {name: 'Banco de la República', country: 'colombia', kind: 'official'},
  {name: 'DANE', country: 'colombia', kind: 'official'},
  {name: 'Finance ministry', country: 'colombia', kind: 'official'},
  {name: 'La República', country: 'colombia', kind: 'journalism'},
  {name: 'Portafolio', country: 'colombia', kind: 'journalism'},
].map((source, index) => ({
  ...(source as {name: string; country: Country; kind: SourceKind}),
  id: `src-${index + 1}`,
  status: 'inactive' as const,
  lastSuccessAt: null,
  documentCount: null,
}));

/** Pilot operating target from docs/product.md. */
export const MONTHLY_BUDGET_USD = 50;
