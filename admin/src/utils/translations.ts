// Shim: re-exports from the shared workspace package so every existing
// relative import ('../contexts/X', '../types', etc.) keeps working unchanged.
// Actual source of truth lives in /shared.
export * from '@shared/utils/translations';
