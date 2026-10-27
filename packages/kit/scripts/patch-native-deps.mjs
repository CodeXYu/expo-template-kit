import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * SplashScreen 2.2.0 still requests the ProGuard file removed in AGP 9.
 * Keep this patch until the upstream package ships the optimized file name.
 * It only changes that obsolete setting and is safe to repeat after npm ci.
 */
export function patchNativeDependencies(projectRoot = process.cwd()) {
  const require = createRequire(join(projectRoot, 'package.json'));
  let packagePath;
  try {
    packagePath = require.resolve('react-native-splash-screen-newarch/package.json');
  } catch (error) {
    // The native module is an optional peer for consumers of unrelated UI exports.
    if (error.code === 'MODULE_NOT_FOUND') return;
    throw error;
  }
  const gradlePath = join(dirname(packagePath), 'android/build.gradle');
  if (!existsSync(gradlePath)) return;
  const source = readFileSync(gradlePath, 'utf8');
  const patched = source.replaceAll(
    "getDefaultProguardFile('proguard-android.txt')",
    "getDefaultProguardFile('proguard-android-optimize.txt')"
  );
  if (patched !== source) writeFileSync(gradlePath, patched);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  patchNativeDependencies();
}
