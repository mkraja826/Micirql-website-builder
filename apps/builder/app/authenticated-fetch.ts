import type { SupabaseSession } from "./auth-client";

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type AuthenticatedFetchOptions = {
  session: SupabaseSession;
  fetcher: Fetcher;
  refresh: (session: SupabaseSession) => Promise<SupabaseSession>;
  onSession: (session: SupabaseSession) => void;
  onAuthFailure: (error: unknown) => void;
  prepareHeaders?: (headers: Headers) => void;
  now?: () => number;
};

const REFRESH_WINDOW_SECONDS = 60;

export function createAuthenticatedFetch(options: AuthenticatedFetchOptions) {
  let currentSession = options.session;
  let refreshInFlight: Promise<SupabaseSession> | undefined;
  const now = options.now ?? Date.now;

  async function refresh(force: boolean) {
    const expiresAt = currentSession.expires_at ?? 0;
    if (
      !force &&
      expiresAt > Math.floor(now() / 1000) + REFRESH_WINDOW_SECONDS
    ) {
      return currentSession;
    }

    if (!refreshInFlight) {
      refreshInFlight = options
        .refresh(currentSession)
        .then((fresh) => {
          currentSession = fresh;
          options.onSession(fresh);
          return fresh;
        })
        .catch((error) => {
          options.onAuthFailure(error);
          throw error;
        })
        .finally(() => {
          refreshInFlight = undefined;
        });
    }

    return refreshInFlight;
  }

  function execute(request: Request, accessToken: string) {
    const headers = new Headers(request.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);
    options.prepareHeaders?.(headers);

    return options.fetcher(new Request(request.clone(), { headers }));
  }

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    // Keep an untouched canonical request so a 401 retry can replay bodies,
    // including one-shot streams, without rebuilding them from `init`.
    const request = new Request(input, init);
    let activeSession = await refresh(false);
    const attemptedToken = activeSession.access_token;
    let response = await execute(request, attemptedToken);
    if (response.status !== 401) return response;

    activeSession =
      currentSession.access_token === attemptedToken
        ? await refresh(true)
        : currentSession;
    response = await execute(request, activeSession.access_token);
    return response;
  };
}
