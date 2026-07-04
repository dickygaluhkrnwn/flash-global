// Menggunakan trik Triple-Slash Reference agar file tetap bersifat GLOBAL
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../.next/dev/types/routes.d.ts" />

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}