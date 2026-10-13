/** Path segment of a hash route, without the leading `#` or an embedded query. */
export function pathFromHash(hash: string): string {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const queryAt = raw.indexOf("?");
  const path = queryAt === -1 ? raw : raw.slice(0, queryAt);
  return path.replace(/^\/+/, "");
}

/** Query string embedded in a hash route (`#/branch?dirty=0` → `dirty=0`). */
export function queryFromHash(hash: string): string {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const queryAt = raw.indexOf("?");
  return queryAt === -1 ? "" : raw.slice(queryAt + 1);
}

function searchWithoutMark(search: string): string {
  return search.startsWith("?") ? search.slice(1) : search;
}

/**
 * Merge a real `location.search` with the query inside `location.hash`.
 * When the same key is present in both, the hash value wins.
 */
export function mergeLocationQuery(hash: string, search: string): URLSearchParams {
  const params = new URLSearchParams(searchWithoutMark(search));
  const hashParams = new URLSearchParams(queryFromHash(hash));
  hashParams.forEach((value, key) => {
    params.set(key, value);
  });
  return params;
}
