import type React from 'react';

import type { OverlayRootTransform } from '../types';

export interface OverlayHostController {
  add(key: number, element: React.ReactNode): void;
  update(key: number, element: React.ReactNode): void;
  remove(key: number): void;
  removeAll(): void;
  transform(transform: OverlayRootTransform, animated: boolean): void;
  restore(animated: boolean): void;
}

const noopController: OverlayHostController = {
  add: () => {},
  update: () => {},
  remove: () => {},
  removeAll: () => {},
  transform: () => {},
  restore: () => {},
};

// runtime 是模块级命令式 API，Host 是 React 组件；controller 用来连接两边。
// 未挂载 Host 时使用 noop，业务调用会被 runtime 警告但不会让应用崩溃。
let activeController: OverlayHostController = noopController;
let mounted = false;

export function registerOverlayHost(controller: OverlayHostController) {
  activeController = controller;
  mounted = true;
}

export function unregisterOverlayHost(controller: OverlayHostController) {
  if (activeController !== controller) {
    return;
  }

  activeController = noopController;
  mounted = false;
}

export function getOverlayHostController() {
  return activeController;
}

export function isOverlayHostMounted() {
  return mounted;
}
