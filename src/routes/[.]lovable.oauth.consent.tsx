import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Local typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthDetails = {
  client?: { name?: string; client_id?: string; redirect_uris?: string[] } | null;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthResult = { data: OAuthDetails | null; error: { message: string } | null };
const oauthApi = () =>
  (supabase.auth as unknown as {
    oauth: {
      getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
      approveAuthorization: (id: string) => Promise<OAuthResult>;
      denyAuthorization: (id: string) => Promise<OAuthResult>;
    };
  }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId =
      new URLSearchParams(location.search).get("authorization_id") ?? "";
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold mb-2">Authorization request failed</h1>
        <p className="text-sm text-slate-400">
          {String((error as Error)?.message ?? error)}
        </p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientName = details?.client?.name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const api = oauthApi();
    const { data, error } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-lg p-6 shadow-lg space-y-4">
        <h1 className="text-xl font-semibold">
          Connect {clientName} to IQRA ID Card Generator
        </h1>
        <p className="text-sm text-slate-300">
          This lets {clientName} use this app's MCP tools while you are signed in.
        </p>
        <ul className="text-sm text-slate-400 list-disc pl-5">
          <li>List built-in card templates</li>
          <li>Compose ID card JSON payloads from data you provide</li>
        </ul>
        <p className="text-xs text-slate-500">
          This does not bypass this app's permissions or backend policies.
        </p>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => decide(true)}
            disabled={busy}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 rounded px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => decide(false)}
            disabled={busy}
            className="flex-1 bg-slate-700 hover:bg-slate-600 rounded px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            Cancel connection
          </button>
        </div>
      </div>
    </main>
  );
}
