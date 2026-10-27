import { useCallback, useEffect, useRef } from 'react';

import {
  hideAllOverlayViews,
  showOverlayModal,
  showOverlayPopover,
  showOverlaySheet,
} from './actions';

export function useOverlayGuard(trigger: unknown, options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};
  const prevTrigger = useRef(trigger);

  useEffect(() => {
    if (enabled && trigger !== prevTrigger.current) {
      hideAllOverlayViews();
      prevTrigger.current = trigger;
    }
  }, [trigger, enabled]);
}

export function useOverlay() {
  const showModal = useCallback(
    (...args: Parameters<typeof showOverlayModal>) => showOverlayModal(...args),
    []
  );
  const showSheet = useCallback(
    (...args: Parameters<typeof showOverlaySheet>) => showOverlaySheet(...args),
    []
  );
  const showPopover = useCallback(
    (...args: Parameters<typeof showOverlayPopover>) => showOverlayPopover(...args),
    []
  );
  const hideAll = useCallback(() => hideAllOverlayViews(), []);

  return {
    showModal,
    showSheet,
    showPopover,
    hideAll,
  };
}
