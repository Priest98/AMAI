"use client";

import { useCallback, useEffect, useState } from "react";

type Provider = "instagram" | "tiktok";

interface ConnectedAccount {
  id: string;
  provider: Provider;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  status: "CONNECTED" | "DISCONNECTED" | "ERROR" | "EXPIRED";
  lastErrorMessage: string | null;
}

const PROVIDER_LABEL: Record<Provider, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
};

export default function ConnectAccountsCard() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingProvider, setPendingProvider] = useState<Provider | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/oauth/status");
      if (!res.ok) throw new Error("Failed to load connection status");
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();

    // Surface the redirect-back result from the OAuth callback, if present.
    const params = new URLSearchParams(window.location.search);
    const status = params.get("connection_status");
    if (status === "error") {
      setError(params.get("detail") || "Connection failed");
    }
  }, [loadStatus]);

  function connect(provider: Provider) {
    setPendingProvider(provider);
    window.location.href = `/api/oauth/${provider}`;
  }

  async function disconnect(accountId: string) {
    setPendingProvider(null);
    const res = await fetch("/api/oauth/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
    if (res.ok) {
      await loadStatus();
    } else {
      setError("Failed to disconnect account");
    }
  }

  const connectedByProvider = (provider: Provider) =>
    accounts.find((a) => a.provider === provider && a.status !== "DISCONNECTED");

  return (
    <div className="rounded-xl border border-neutral-200 p-6 space-y-5">
      <div>
        <h3 className="text-lg font-semibold">Connected Accounts</h3>
        <p className="text-sm text-neutral-500">
          Connect your social accounts to enable automated posting and scheduling.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-neutral-500">Loading connections…</div>
      ) : (
        <div className="space-y-3">
          {(["instagram", "tiktok"] as Provider[]).map((provider) => {
            const account = connectedByProvider(provider);
            const isPending = pendingProvider === provider;

            return (
              <div
                key={provider}
                className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {account?.avatarUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={account.avatarUrl}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <div className="font-medium">{PROVIDER_LABEL[provider]}</div>
                    {account ? (
                      <div className="text-xs text-neutral-500">
                        {account.status === "ERROR" || account.status === "EXPIRED"
                          ? account.lastErrorMessage || "Needs reconnection"
                          : `@${account.username ?? account.displayName ?? "connected"}`}
                      </div>
                    ) : (
                      <div className="text-xs text-neutral-400">Not connected</div>
                    )}
                  </div>
                </div>

                {account && account.status === "CONNECTED" ? (
                  <button
                    onClick={() => disconnect(account.id)}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => connect(provider)}
                    disabled={isPending}
                    className="text-sm bg-black text-white rounded-md px-3 py-1.5 font-medium disabled:opacity-50"
                  >
                    {isPending
                      ? "Redirecting…"
                      : account
                        ? "Reconnect"
                        : `Connect ${PROVIDER_LABEL[provider]}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
