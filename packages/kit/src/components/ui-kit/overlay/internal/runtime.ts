import React from 'react';

import { getOverlayHostController, isOverlayHostMounted } from './host-controller';
import type { OverlayInstanceRef } from '../types';

const overlayRefs: Record<number, OverlayInstanceRef> = {};
const keyedOverlays = new Map<string, number>();
const overlayKeysById = new Map<number, string>();
let overlayKeyValue = 0;

/**
 * 分配 overlay runtime id。调用方可以预先拿到 id 再渲染 content(handle)，
 * 避免先挂载占位 handle、再 update 回填 id 的额外渲染。
 */
export function createOverlayId() {
  overlayKeyValue += 1;
  return overlayKeyValue;
}

function getOverlayKey(overlayView: React.ReactElement): string | undefined {
  return (overlayView.props as { overlayKey?: string }).overlayKey;
}

function rememberOverlayKey(id: number, overlayKey?: string) {
  const previousKey = overlayKeysById.get(id);

  if (previousKey && previousKey !== overlayKey) {
    keyedOverlays.delete(previousKey);
    overlayKeysById.delete(id);
  }

  if (!overlayKey) {
    return;
  }

  keyedOverlays.set(overlayKey, id);
  overlayKeysById.set(id, overlayKey);
}

function forgetOverlay(id: number) {
  delete overlayRefs[id];

  const overlayKey = overlayKeysById.get(id);
  if (overlayKey) {
    keyedOverlays.delete(overlayKey);
    overlayKeysById.delete(id);
  }
}

/**
 * 为业务传入的 overlay 元素补充 runtime 生命周期：
 * - ref 用于命令式 close/appear/disappear。
 * - onDisappearCompleted 负责从 Host 和 key 映射中移除实例。
 */
function buildManagedElement(getId: () => number, overlayView: React.ReactElement) {
  const onDisappearCompletedSave = (overlayView.props as Record<string, unknown>)
    .onDisappearCompleted as (() => void) | undefined;

  return React.cloneElement(overlayView, {
    onDisappearCompleted: () => {
      const id = getId();
      getOverlayHostController().remove(id);
      forgetOverlay(id);
      onDisappearCompletedSave?.();
    },
    ref: (r: OverlayInstanceRef | null) => {
      const id = getId();
      if (r) {
        overlayRefs[id] = r;
      } else {
        delete overlayRefs[id];
      }
    },
  } as Record<string, unknown>);
}

/**
 * 挂载一个 overlay 元素。传入 overlayKey 且命中已有实例时，会更新旧实例并返回旧 id。
 */
export function showOverlay(overlayView: React.ReactElement, id = createOverlayId()): number {
  if (!isOverlayHostMounted()) {
    console.warn('Overlay: OverlayProvider is not mounted. Wrap your app with <OverlayProvider>.');
  }

  const overlayKey = getOverlayKey(overlayView);
  if (overlayKey && keyedOverlays.has(overlayKey)) {
    const existingId = keyedOverlays.get(overlayKey)!;
    updateOverlay(existingId, overlayView);
    return existingId;
  }

  const element = buildManagedElement(() => id, overlayView);

  getOverlayHostController().add(id, element);
  rememberOverlayKey(id, overlayKey);
  return id;
}

export function updateOverlay(key: number, overlayView: React.ReactElement) {
  rememberOverlayKey(key, getOverlayKey(overlayView));
  getOverlayHostController().update(
    key,
    buildManagedElement(() => key, overlayView)
  );
}

export function hideOverlay(key: number) {
  const ref = overlayRefs[key];
  if (ref?.close) {
    ref.close();
    return;
  }

  getOverlayHostController().remove(key);
  forgetOverlay(key);
}

export function hideAllOverlays() {
  getOverlayHostController().removeAll();
  for (const key in overlayRefs) {
    delete overlayRefs[key];
  }
  keyedOverlays.clear();
  overlayKeysById.clear();
}
