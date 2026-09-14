/// <reference types="vite/client" />

declare module '*.yaml' {
  const content: string
  export default content
}

// Injected by vite.config.ts from the root package.json's version.
declare const __APP_VERSION__: string
