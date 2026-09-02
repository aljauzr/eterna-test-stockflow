"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiError, apiRequest } from "../lib/api";
import { getStoredAccessToken, setStoredAuthSession } from "../lib/auth-storage";

type AuthMode = "login" | "register";

type AuthFormProps = {
  mode: AuthMode;
};

type AuthResponse = {
  success: boolean;
  data: {
    accessToken: string;
    expiresIn: string;
    user: {
      id: string;
      email: string;
      workspaceName: string;
    };
  };
};

const initialFieldErrors = {
  email: "",
  password: "",
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState(initialFieldErrors);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (getStoredAccessToken()) {
      router.replace("/dashboard");
    }
  }, [mode, router]);

  const content = useMemo(() => {
    if (mode === "register") {
      return {
        title: "Create your account",
        description: "Register a workspace owner account to start using StockFlow.",
        submitLabel: "Create Account",
        alternateLabel: "Already have an account?",
        alternateLinkText: "Sign in",
        alternateHref: "/login",
      };
    }

    return {
      title: "Welcome back",
      description: "Sign in with your email and password to continue.",
      submitLabel: "Sign In",
      alternateLabel: "Need an account?",
      alternateLinkText: "Create one",
      alternateHref: "/register",
    };
  }, [mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError("");
    setFieldErrors(initialFieldErrors);

    try {
      const payload = { email, password };

      const response = await apiRequest<AuthResponse>(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setStoredAuthSession({
        accessToken: response.data.accessToken,
        user: response.data.user,
      });

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        setFieldErrors({
          email: error.fieldErrors?.email?.[0] ?? "",
          password: error.fieldErrors?.password?.[0] ?? "",
        });
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-grid">
        <section className="auth-panel">
          <div className="auth-panel__header">
            <div className="auth-brand">
              <span className="auth-brand__badge">StockFlow</span>
            </div>
            <h2 className="auth-panel__title">{content.submitLabel}</h2>
            <p className="auth-panel__description">
              {mode === "register"
                ? "Set up your owner account and start managing products and invoices."
                : "Use your existing account to enter the StockFlow dashboard."}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span className="auth-label">Email</span>
              <input
                className="auth-input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
              {fieldErrors.email ? (
                <span className="auth-field-error">{fieldErrors.email}</span>
              ) : null}
            </label>

            <label className="auth-field">
              <span className="auth-label">Password</span>
              <input
                className="auth-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                required
              />
              {fieldErrors.password ? (
                <span className="auth-field-error">{fieldErrors.password}</span>
              ) : null}
            </label>

            {formError ? <div className="auth-form-error">{formError}</div> : null}

            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : content.submitLabel}
            </button>
          </form>

          <p className="auth-footer">
            {content.alternateLabel}{" "}
            <Link className="auth-footer__link" href={content.alternateHref}>
              {content.alternateLinkText}
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
