import React from 'react';

import OverlayModal from './internal/OverlayModal';
import OverlayPopover from './internal/OverlayPopover';
import OverlaySheet from './internal/OverlaySheet';
import { createOverlayId, hideOverlay, showOverlay, updateOverlay } from './internal/runtime';
import type {
  OverlayCommandBaseOptions,
  OverlayContent,
  OverlayHandle,
  OverlayModalOptions,
  OverlayPopoverOptions,
  OverlaySheetOptions,
} from './types';

const activeOverlayHandles = new Map<number, Pick<OverlayHandle, 'close'>>();

interface OverlayInstanceConfig<TOptions extends OverlayCommandBaseOptions> {
  initialOptions: TOptions;
  render: (options: TOptions, handle: OverlayHandle<Partial<TOptions>>) => React.ReactElement;
}

function resolveContent<TOptions extends OverlayCommandBaseOptions>(
  content: OverlayContent,
  handle: OverlayHandle<Partial<TOptions>>
) {
  return typeof content === 'function' ? content(handle as unknown as OverlayHandle) : content;
}

function createCommandOverlay<TOptions extends OverlayCommandBaseOptions>(
  initialOptions: TOptions,
  render: (options: TOptions, handle: OverlayHandle<Partial<TOptions>>) => React.ReactElement
) {
  const instanceHandle = createOverlayInstance({
    initialOptions,
    render: (options, handle) => render(options, handle),
  });

  const publicHandle: OverlayHandle<Partial<TOptions>> = {
    id: instanceHandle.id,
    close: () => {
      instanceHandle.close();
    },
    update: nextOptions => {
      instanceHandle.update(nextOptions);
    },
  };

  activeOverlayHandles.set(publicHandle.id, publicHandle);
  return publicHandle;
}

function createOverlayInstance<TOptions extends OverlayCommandBaseOptions>({
  initialOptions,
  render,
}: OverlayInstanceConfig<TOptions>): OverlayHandle<Partial<TOptions>> {
  let options = initialOptions;
  let closed = false;
  let closeNotified = false;

  const handle: OverlayHandle<Partial<TOptions>> = {
    id: createOverlayId(),
    close: () => {
      if (closed) return;
      closed = true;
      if (!closeNotified) {
        closeNotified = true;
        options.onClose?.();
      }
      activeOverlayHandles.delete(handle.id);
      hideOverlay(handle.id);
    },
    update: nextOptions => {
      if (closed) return;
      options = { ...options, ...nextOptions } as TOptions;
      updateOverlay(handle.id, render(options, handle));
    },
  };

  // Runtime 预分配 id，让 content(handle) 初次渲染时就能拿到稳定 id。
  // 只有 overlayKey 命中已有实例时才需要二次渲染，用已有 id 替换预分配 id。
  const mountedId = showOverlay(render(options, handle), handle.id);
  if (mountedId !== handle.id) {
    handle.id = mountedId;
    updateOverlay(mountedId, render(options, handle));
  }
  return handle;
}

function resolveCloseRequest(
  options: OverlayCommandBaseOptions,
  handle: Pick<OverlayHandle, 'close' | 'id'>
) {
  if (options.onCloseRequest) {
    options.onCloseRequest(handle as OverlayHandle);
    return;
  }

  if (!options.modal) {
    handle.close();
  }
}

function resolveDisappearCompleted(
  options: OverlayCommandBaseOptions,
  handle: Pick<OverlayHandle, 'id'>
) {
  // 动画完成后兜底清理 command handle，覆盖背景点击、返回键和内部动画关闭路径。
  activeOverlayHandles.delete(handle.id);
  options.onDisappearCompleted?.();
}

export function showOverlayModal(options: OverlayModalOptions) {
  return createCommandOverlay(options, (currentOptions, handle) => (
    <OverlayModal
      animated={currentOptions.animated ?? true}
      autoKeyboardInsets={currentOptions.autoKeyboardInsets}
      closeOnHardwareBackPress={currentOptions.closeOnHardwareBackPress}
      containerStyle={currentOptions.containerStyle}
      customBounds={currentOptions.customBounds}
      maskColor={currentOptions.maskColor}
      modal={currentOptions.modal ?? true}
      overlayKey={currentOptions.overlayKey}
      overlayOpacity={currentOptions.overlayOpacity}
      overlayPointerEvents={currentOptions.overlayPointerEvents}
      onCloseRequest={() => resolveCloseRequest(currentOptions, handle)}
      onDisappearCompleted={() => resolveDisappearCompleted(currentOptions, handle)}
      style={currentOptions.style}
      type={currentOptions.type ?? 'zoomOut'}
    >
      {resolveContent(currentOptions.content, handle)}
    </OverlayModal>
  ));
}

export function showOverlaySheet(options: OverlaySheetOptions) {
  return createCommandOverlay(options, (currentOptions, handle) => (
    <OverlaySheet
      animated={currentOptions.animated ?? true}
      autoKeyboardInsets={currentOptions.autoKeyboardInsets}
      closeOnHardwareBackPress={currentOptions.closeOnHardwareBackPress}
      containerStyle={currentOptions.containerStyle}
      maskColor={currentOptions.maskColor}
      modal={currentOptions.modal ?? false}
      overlayKey={currentOptions.overlayKey}
      overlayOpacity={currentOptions.overlayOpacity}
      overlayPointerEvents={currentOptions.overlayPointerEvents}
      onCloseRequest={() => resolveCloseRequest(currentOptions, handle)}
      onDisappearCompleted={() => resolveDisappearCompleted(currentOptions, handle)}
      rootTransform={currentOptions.rootTransform ?? 'none'}
      side={currentOptions.side ?? 'bottom'}
      style={currentOptions.style}
    >
      {resolveContent(currentOptions.content, handle)}
    </OverlaySheet>
  ));
}

export function showOverlayPopover(options: OverlayPopoverOptions) {
  return createCommandOverlay(options, (currentOptions, handle) => (
    <OverlayPopover
      align={currentOptions.align}
      alignInsets={currentOptions.alignInsets}
      animated={currentOptions.animated}
      autoDirection={currentOptions.autoDirection}
      closeOnHardwareBackPress={currentOptions.closeOnHardwareBackPress}
      direction={currentOptions.direction}
      directionInsets={currentOptions.directionInsets}
      fromBounds={currentOptions.fromBounds}
      fromView={currentOptions.fromView}
      maskColor={currentOptions.maskColor}
      modal={currentOptions.modal}
      overlayKey={currentOptions.overlayKey}
      overlayOpacity={currentOptions.overlayOpacity}
      overlayPointerEvents={currentOptions.overlayPointerEvents ?? 'auto'}
      paddingCorner={currentOptions.paddingCorner}
      popoverStyle={currentOptions.popoverStyle}
      showArrow={currentOptions.showArrow}
      onCloseRequest={() => resolveCloseRequest(currentOptions, handle)}
      onDisappearCompleted={() => resolveDisappearCompleted(currentOptions, handle)}
      style={currentOptions.style}
    >
      {resolveContent(currentOptions.content, handle)}
    </OverlayPopover>
  ));
}

export function hideAllOverlayViews() {
  Array.from(activeOverlayHandles.values()).forEach(handle => handle.close());
}
