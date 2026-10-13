import { mergeLocationQuery, pathFromHash } from "./hashQuery";

export type Route =
  | "workspace"
  | "diff"
  | "settings"
  | "onboarding"
  | "credentials"
  | "branch"
  | "status"
  | "engine";

export function readLocationQuery(
  hash = window.location.hash,
  search = window.location.search,
): URLSearchParams {
  return mergeLocationQuery(hash, search);
}

export function readRoute(hash = window.location.hash): Route {
  const path = pathFromHash(hash);
  switch (path) {
    case "diff":
      return "diff";
    case "settings":
      return "settings";
    case "onboarding":
      return "onboarding";
    case "credentials":
      return "credentials";
    case "branch":
      return "branch";
    case "status":
      return "status";
    case "engine":
      return "engine";
    default:
      return "workspace";
  }
}
