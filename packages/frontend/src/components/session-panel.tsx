"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError, apiRequest } from "../lib/api";
import {
  clearStoredAuthSession,
  getStoredAccessToken,
  StoredAuthSession,
} from "../lib/auth-storage";

type MeResponse = {
  success: boolean;
  data: {
    id: string;
    email: string;
    workspaceName: string;
  };
};

export function SessionPanel() {
  const router = useRouter();
  const [session, setSession] = useState<StoredAuthSession | null>(null);
  const [status, setStatus] = useState("Checking your session...");

  const handleCheckSession = useCallback(async (redirectOnFailure = false) => {
    const accessToken = getStoredAccessToken();

    if (!accessToken) {
      clearStoredAuthSession();
      setSession(null);
      setStatus("No active session found. Redirecting to login...");
      if (redirectOnFailure) {
        router.replace("/login");
      }
      return;
    }

    setStatus("Checking token against the backend...");

    try {
      const response = await apiRequest<MeResponse>("/auth/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      setSession({
        accessToken,
        user: response.data,
      });
      setStatus(`Authenticated as ${response.data.email}`);
    } catch (error) {
      clearStoredAuthSession();
      setSession(null);

      if (error instanceof ApiError) {
        setStatus(error.message);
      } else {
        setStatus("Session check failed. Please sign in again.");
      }

      if (redirectOnFailure) {
        router.replace("/login");
      }
    }
  }, [router]);

  useEffect(() => {
    void handleCheckSession(true);
  }, [handleCheckSession]);

  async function handleLogout() {
    const accessToken = getStoredAccessToken();

    if (!accessToken) {
      clearStoredAuthSession();
      setSession(null);
      setStatus("You have been signed out.");
      router.replace("/login");
      return;
    }

    try {
      await apiRequest("/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch {
      // Clear the local session even if the server token has already expired.
    }

    clearStoredAuthSession();
    setSession(null);
    setStatus("You have been signed out.");
    router.replace("/login");
  }

  return (
    <section className="session-panel">
      <div className="session-panel__header">
        <div>
          <h2 className="session-panel__title">Authentication Status</h2>
          <p className="session-panel__description">
            This dashboard remains available only while your authentication session is valid.
          </p>
        </div>
      </div>

      <div className="session-panel__body">
        <p className="session-panel__status">{status}</p>
        {session ? (
          <div className="session-panel__details">
            <span>Email: {session.user.email}</span>
          </div>
        ) : null}
      </div>

      <div className="session-panel__footer">
        <button
          className="session-panel__button"
          type="button"
          onClick={() => void handleCheckSession(false)}
        >
          Refresh Session
        </button>
        <button
          className="session-panel__button session-panel__button--secondary"
          type="button"
          onClick={handleLogout}
        >
          Sign Out
        </button>
      </div>
    </section>
  );
}
