import '@testing-library/jest-dom/vitest';

// jsdom does not implement URL.createObjectURL / revokeObjectURL. The app
// uses these to hand playable/downloadable blob URLs to <video> and <a>
// elements, so tests exercising that code path need a lightweight stand-in.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = (_blob: Blob) => `blob:mock-${Math.random().toString(36).slice(2)}`;
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = () => {};
}
