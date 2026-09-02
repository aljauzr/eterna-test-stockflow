"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiError, apiRequest } from "../../lib/api";
import { getStoredAccessToken, setStoredAuthSession } from "../../lib/auth-storage";
import styles from "./auth-form.module.css";

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
        description: "Set up your account and start managing products and invoices.",
        submitLabel: "Create Account",
        alternateLabel: "Already have an account?",
        alternateLinkText: "Sign in",
        alternateHref: "/login",
      };
    }

    return {
      title: "Welcome back",
      description: "Use your existing account to enter the StockFlow dashboard.",
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
    <div className={styles.shell}>
      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.header}>
            <div className={styles.brand}>
              <span className={styles.badge}>StockFlow</span>
            </div>
            <h1 className={styles.title}>{content.title}</h1>
            <p className={styles.description}>{content.description}</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span className={styles.label}>Email</span>
              <input
                className={styles.input}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
              {fieldErrors.email ? <span className={styles.fieldError}>{fieldErrors.email}</span> : null}
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Password</span>
              <input
                className={styles.input}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                required
              />
              {fieldErrors.password ? (
                <span className={styles.fieldError}>{fieldErrors.password}</span>
              ) : null}
            </label>

            {formError ? <div className={styles.formError}>{formError}</div> : null}

            <button className={styles.submit} type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : content.submitLabel}
            </button>
          </form>

          <p className={styles.footer}>
            {content.alternateLabel}{" "}
            <Link className={styles.footerLink} href={content.alternateHref}>
              {content.alternateLinkText}
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
