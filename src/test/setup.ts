import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// jsdom não implementa URL.createObjectURL / revokeObjectURL, usadas para
// baixar arquivos (CSV, PDF). Stubs para que testes de exportação possam rodar.
if (typeof URL.createObjectURL === "undefined") {
  URL.createObjectURL = () => "blob:mock";
}
if (typeof URL.revokeObjectURL === "undefined") {
  URL.revokeObjectURL = () => {};
}
