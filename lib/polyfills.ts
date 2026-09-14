import structuredClone from '@ungap/structured-clone';

const root = globalThis as typeof globalThis & {
  structuredClone?: typeof structuredClone;
};

if (typeof root.structuredClone !== 'function') {
  root.structuredClone = structuredClone;
}
