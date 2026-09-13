// scripts/react-stub.mjs — 仅用于 test-client-apply.mjs 的最小 React 替身。
//
// 本仓库的 client.tsx 依赖宿主提供的 react（build-client.mjs 把它标为外部），
// 因此 `npm run bundle` 从不需要解析 react，node_modules 里也没有它。测试要在
// node 里跑真实的 apply，就必须把 react 解析到某个东西上 —— 就是这个替身。
// 只求「import 得动、hook 调得通」；apply 只注册席位，不渲染。
const noop = () => {};

const api = {
  useState: (init) => [typeof init === 'function' ? init() : init, noop],
  useEffect: noop,
  useLayoutEffect: noop,
  useInsertionEffect: noop,
  useRef: (v) => ({ current: v }),
  useMemo: (f) => f(),
  useCallback: (f) => f,
  useReducer: (_r, init) => [init, noop],
  useContext: () => ({}),
  useSyncExternalStore: (_sub, get) => get(),
  useId: () => 'test-id',
  createElement: () => null,
  cloneElement: () => null,
  isValidElement: () => false,
  createContext: () => ({ Provider: () => null, Consumer: () => null }),
  memo: (c) => c,
  forwardRef: (c) => c,
  Fragment: Symbol('Fragment'),
};

export default api;
export const {
  useState, useEffect, useLayoutEffect, useInsertionEffect, useRef, useMemo, useCallback,
  useReducer, useContext, useSyncExternalStore, useId, createElement, cloneElement,
  isValidElement, createContext, memo, forwardRef, Fragment,
} = api;
