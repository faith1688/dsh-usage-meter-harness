// scripts/react-jsx-runtime-stub.mjs — 仅用于 test-client-apply.mjs 的最小 jsx-runtime 替身。
// 见 react-stub.mjs 的说明：apply 只注册席位、不渲染，jsx 求值为 null 即可。
export const Fragment = Symbol('Fragment');
export const jsx = () => null;
export const jsxs = () => null;
export const jsxDEV = () => null;
