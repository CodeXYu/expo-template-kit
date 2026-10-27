import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

test('theme owns the default full-screen overlay color', () => {
  const theme = readFileSync(join(root, 'src/constants/theme.ts'), 'utf8');
  const themeUi = readFileSync(join(root, 'src/constants/theme-ui.ts'), 'utf8');
  const overlayBase = readFileSync(
    join(root, 'src/components/ui-kit/overlay/internal/OverlayBase.tsx'),
    'utf8'
  );

  assert.match(theme, /overlay: 'rgba\(0,0,0,0\.4\)'/);
  assert.match(theme, /overlay: 'rgba\(0,0,0,0\.6\)'/);
  assert.match(themeUi, /backdropOpacity: 1/);
  assert.match(overlayBase, /maskColor \?\? theme\.overlay/);
  assert.match(overlayBase, /bottom: 0,[\s\S]*left: 0,[\s\S]*right: 0,[\s\S]*top: 0/);
});
