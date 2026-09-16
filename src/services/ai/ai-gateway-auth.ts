/**
 * Pure helpers for AI gateway authentication decisions.
 * Kept free of React Native / Expo imports so unit tests can load them under tsx.
 */

/** True when the gateway rejected the request for authentication reasons. */
export function isGatewayAuthFailure(
  httpStatus: number | undefined,
  code: string | undefined,
): boolean {
  if (httpStatus === 401) return true;
  return (
    code === 'invalid_session' ||
    code === 'not_authenticated' ||
    code === 'unauthorized'
  );
}
