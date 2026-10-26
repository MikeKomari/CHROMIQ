"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, LogOut, Trash2, X } from "lucide-react";
import type { useAccount } from "@/hooks/use-account";

type Account = ReturnType<typeof useAccount>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

// Mirrors the server rules so mistakes surface before a round trip. The server
// enforces the same limits and stays the authority.
function validate(email: string, password: string) {
  if (!email || email.length > 320 || !EMAIL_PATTERN.test(email)) {
    return { field: "email", message: "Enter a valid email address." } as const;
  }
  if (password.length < 10) {
    return { field: "password", message: "Use a password of at least 10 characters." } as const;
  }
  if (password.length > 200) {
    return { field: "password", message: "Use a password of 200 characters or fewer." } as const;
  }
  return null;
}

export function AccountModal({
  account,
  close,
}: {
  account: Account;
  close: () => void;
}) {
  const { status, user, error, busy, signIn, signUp, signOut, deleteAccount, clearError } =
    account;
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [problem, setProblem] = useState<ReturnType<typeof validate>>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const dialogRef = useRef<HTMLElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const clearErrorRef = useRef(clearError);
  clearErrorRef.current = clearError;
  const uid = useId();
  const titleId = `${uid}-title`;
  const noteId = `${uid}-note`;
  const errorId = `${uid}-error`;
  const emailId = `${uid}-email`;
  const passwordId = `${uid}-password`;
  const hintId = `${uid}-hint`;
  const deleteId = `${uid}-delete`;
  const deleteHintId = `${uid}-delete-hint`;

  const signedIn = status === "signed-in" && user;
  const isSignUp = mode === "sign-up";
  const message = problem?.message ?? error;

  // Focus the first field on open, hand focus back to the trigger on close,
  // and drop any stale server error so it does not greet the next visit.
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    clearErrorRef.current();
    return () => {
      clearErrorRef.current();
      trigger?.focus();
    };
  }, []);

  // Land on the first field, or on the close button once signed in.
  useEffect(() => {
    if (signedIn) dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    else emailRef.current?.focus();
  }, [signedIn]);

  // Keep Tab and Shift+Tab inside the dialog. Escape is handled by the
  // workspace's shared key handler, like every other modal.
  const trapFocus = (event: React.KeyboardEvent) => {
    if (event.key !== "Tab") return;
    const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !dialogRef.current?.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  };

  const switchMode = () => {
    setMode(isSignUp ? "sign-in" : "sign-up");
    setPassword("");
    setProblem(null);
    clearError();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const trimmed = email.trim();
    const found = validate(trimmed, password);
    setProblem(found);
    if (found) {
      (found.field === "email" ? emailRef.current : document.getElementById(passwordId))?.focus();
      return;
    }
    const ok = await (isSignUp ? signUp(trimmed, password) : signIn(trimmed, password));
    if (ok) close();
  };

  const leave = async () => {
    if (busy) return;
    await signOut();
    close();
  };

  // Typing the address is deliberate friction: this deletes synced projects and
  // share links on the server, and nothing brings them back.
  const confirmed = deleteConfirmation.trim().toLowerCase() === user?.email.toLowerCase();

  const destroy = async () => {
    if (busy || !confirmed) return;
    if (await deleteAccount()) close();
  };

  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        ref={dialogRef}
        className="project-modal account-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={noteId}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={trapFocus}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">Account</span>
            <h2 id={titleId}>
              {signedIn ? "Signed in." : isSignUp ? "Create an account." : "Sign in to sync."}
            </h2>
          </div>
          <button className="icon-button" onClick={close} aria-label="Close account">
            <X size={17} />
          </button>
        </div>
        <p className="modal-copy" id={noteId}>
          {signedIn
            ? "You can use CHROMIQ without an account. Signed in, you can open your saved projects in other browsers and on other devices."
            : "You do not need an account to use CHROMIQ. Everything works without one, and your projects stay in this browser. An account only lets you open your systems in other browsers or on other devices."}
        </p>
        {signedIn ? (
          <>
            <dl className="account-identity">
              <dt>Signed in as</dt>
              <dd>{user.email}</dd>
            </dl>
            <div className="modal-actions">
              <button
                className="secondary-button"
                onClick={leave}
                aria-disabled={busy}
              >
                {busy ? <Loader2 size={15} className="spin" /> : <LogOut size={15} />}
                {busy ? "Signing out" : "Sign out"}
              </button>
            </div>
            {error && (
              <div className="error-message" id={errorId} role="alert">
                {error}
              </div>
            )}
            <section className="account-danger">
              <h3>Delete this account</h3>
              <p id={deleteHintId}>
                Permanently removes your email address, your password, every
                project you have synced, and every share link you have created.
                Work saved only in this browser is not affected. This cannot be
                undone.
              </p>
              {confirmingDelete ? (
                <>
                  <label htmlFor={deleteId}>
                    Type <strong>{user.email}</strong> to confirm
                  </label>
                  <input
                    id={deleteId}
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    value={deleteConfirmation}
                    aria-describedby={deleteHintId}
                    onChange={(event) => setDeleteConfirmation(event.target.value)}
                  />
                  <div className="account-actions">
                    <button
                      type="button"
                      className="account-switch"
                      onClick={() => {
                        setConfirmingDelete(false);
                        setDeleteConfirmation("");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={destroy}
                      aria-disabled={busy || !confirmed}
                      disabled={!confirmed}
                    >
                      {busy ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
                      {busy ? "Deleting" : "Delete account"}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => setConfirmingDelete(true)}
                  aria-describedby={deleteHintId}
                >
                  <Trash2 size={15} /> Delete account
                </button>
              )}
            </section>
          </>
        ) : (
          <form
            className="account-form"
            onSubmit={submit}
            noValidate
            aria-describedby={message ? errorId : undefined}
          >
            <label htmlFor={emailId}>Email</label>
            <input
              id={emailId}
              ref={emailRef}
              type="email"
              name="email"
              autoComplete="email"
              maxLength={320}
              required
              value={email}
              aria-invalid={problem?.field === "email" || undefined}
              onChange={(event) => {
                setEmail(event.target.value);
                setProblem(null);
              }}
            />
            <label htmlFor={passwordId}>Password</label>
            <input
              id={passwordId}
              type="password"
              name="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              maxLength={200}
              required
              value={password}
              aria-invalid={problem?.field === "password" || undefined}
              aria-describedby={isSignUp ? hintId : undefined}
              onChange={(event) => {
                setPassword(event.target.value);
                setProblem(null);
              }}
            />
            {isSignUp && (
              <small className="account-hint" id={hintId}>
                At least 10 characters.
              </small>
            )}
            {message && (
              <div className="error-message" id={errorId} role="alert">
                {message}
              </div>
            )}
            <div className="account-actions">
              <button
                type="button"
                className="account-switch"
                onClick={switchMode}
              >
                {isSignUp ? "I already have an account" : "Create an account"}
              </button>
              <button type="submit" className="primary-button" aria-disabled={busy}>
                {busy && <Loader2 size={15} className="spin" />}
                {busy
                  ? isSignUp
                    ? "Creating account"
                    : "Signing in"
                  : isSignUp
                    ? "Create account"
                    : "Sign in"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
