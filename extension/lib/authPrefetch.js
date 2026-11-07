/**
 * Try cached OAuth token first; prompt user once if missing.
 * @param {(interactive: boolean) => Promise<string>} getToken
 * @returns {Promise<string>}
 */
export async function prefetchAuthToken(getToken) {
  try {
    return await getToken(false);
  } catch {
    return await getToken(true);
  }
}
