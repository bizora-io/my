/** Client app version shown in Settings / support diagnostics. */
export const APP_NAME = 'Bizora';
export const APP_VERSION = '1.0.0';
/** Bump when shipping a release so Update banner / SW users can correlate. */
export const APP_BUILD = '2026.04.04-stage281';

export function appVersionLabel(): string {
  return `${APP_NAME} ${APP_VERSION} (${APP_BUILD})`;
}
