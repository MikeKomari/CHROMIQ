"use client";

import { useEffect, useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Send } from "lucide-react";

type Topic = "site" | "bug" | "idea";

const TOPICS: { value: Topic; label: string; hint: string }[] = [
  { value: "site", label: "A site would not load", hint: "The preview or restyle view could not fetch a page." },
  { value: "bug", label: "Something is broken", hint: "The workbench did something it should not have." },
  { value: "idea", label: "An idea", hint: "Something you wish CHROMIQ did." },
];

const MAX_MESSAGE = 4000;
const MIN_MESSAGE = 4;

/**
 * The in-product report form (CHROMIQ-1007).
 *
 * It reads `?url=` so the restyle and inspector error states can hand over the
 * address that failed, and `?topic=` so they can preselect the right one. The
 * address is shown in a field the person can edit or clear before sending,
 * rather than attached invisibly: it is part of what they are about to tell
 * us, so they get to see it.
 */
export function FeedbackForm({ contactEmail }: { contactEmail: string }) {
  const params = useSearchParams();
  const uid = useId();
  const [topic, setTopic] = useState<Topic>("bug");
  const [message, setMessage] = useState("");
  const [subjectUrl, setSubjectUrl] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  /** True when the report could not be sent, as opposed to not being ready to
   *  send. Only the first case is worth offering an email fallback for. */
  const [sendFailed, setSendFailed] = useState(false);

  // From the query string on mount. Read in an effect so the server-rendered
  // markup and the first client render agree.
  useEffect(() => {
    const url = params.get("url");
    if (url) {
      setSubjectUrl(url);
      setTopic("site");
    }
    const requested = params.get("topic");
    if (requested === "site" || requested === "bug" || requested === "idea") {
      setTopic(requested);
    }
  }, [params]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status === "sending") return;
    // The button stays focusable while the form is incomplete (see below), so
    // the guard lives here rather than in the `disabled` attribute.
    if (message.trim().length < MIN_MESSAGE) {
      setError("Please say a little about what happened before sending.");
      setSendFailed(false);
      setStatus("error");
      document.getElementById(`${uid}-message`)?.focus();
      return;
    }
    setStatus("sending");
    setError(null);
    setSendFailed(false);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, message, subjectUrl, contact }),
      });
      if (response.ok) {
        setStatus("sent");
        return;
      }
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "The report could not be sent.");
      setSendFailed(true);
      setStatus("error");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setSendFailed(true);
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="feedback-done" role="status">
        <CheckCircle2 size={22} aria-hidden="true" />
        <h2>Thank you — that is logged.</h2>
        <p>
          {contact
            ? `If a reply is needed it will go to ${contact}.`
            : "You did not leave an address, so there will be no reply — the report is still read."}
        </p>
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setMessage("");
            setStatus("idle");
          }}
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form className="feedback-form" onSubmit={submit} noValidate>
      <fieldset>
        <legend>What is this about?</legend>
        {TOPICS.map((item) => (
          <label key={item.value} className="feedback-topic">
            <input
              type="radio"
              name="topic"
              value={item.value}
              checked={topic === item.value}
              onChange={() => setTopic(item.value)}
            />
            <span>
              <strong>{item.label}</strong>
              <small>{item.hint}</small>
            </span>
          </label>
        ))}
      </fieldset>

      {topic === "site" && (
        <>
          <label htmlFor={`${uid}-url`}>The address that would not load</label>
          <input
            id={`${uid}-url`}
            type="url"
            inputMode="url"
            placeholder="https://example.com"
            value={subjectUrl}
            onChange={(event) => setSubjectUrl(event.target.value)}
          />
          <small className="feedback-hint">
            Filled in from where you came from. Clear it if you would rather not
            send it.
          </small>
        </>
      )}

      <label htmlFor={`${uid}-message`}>What happened?</label>
      <textarea
        id={`${uid}-message`}
        rows={6}
        required
        maxLength={MAX_MESSAGE}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        aria-describedby={`${uid}-count`}
      />
      <small className="feedback-hint" id={`${uid}-count`}>
        {message.length} of {MAX_MESSAGE} characters. Please do not include
        passwords or anything confidential.
      </small>

      <label htmlFor={`${uid}-contact`}>Your email (optional)</label>
      <input
        id={`${uid}-contact`}
        type="email"
        autoComplete="email"
        placeholder="Leave blank to stay anonymous"
        value={contact}
        onChange={(event) => setContact(event.target.value)}
      />
      <small className="feedback-hint">
        Only used to reply to you. Leave it blank and the report is anonymous.
      </small>

      {error && (
        <div className="error-message" role="alert">
          {error}
          {/* Only when the report could not be sent. Offering an email
              fallback because someone left the message blank is noise. */}
          {sendFailed && (
            <>
              {" "}
              <a href={`mailto:${contactEmail}`}>Email it instead</a>.
            </>
          )}
        </div>
      )}

      {/*
        aria-disabled, not disabled. A `disabled` button is removed from the
        tab order, so a keyboard or screen-reader user tabs straight past it
        and never learns the form has a submit at all, let alone why it will
        not go yet. Setting both, as this did, is contradictory: the native
        attribute wins and the ARIA one says nothing to anybody. The form
        checks the message itself in `submit` and says what is missing.
      */}
      <button
        type="submit"
        className="primary-button"
        aria-disabled={status === "sending" || message.trim().length < MIN_MESSAGE}
      >
        {status === "sending" ? (
          <Loader2 size={15} className="spin" aria-hidden="true" />
        ) : (
          <Send size={15} aria-hidden="true" />
        )}
        {status === "sending" ? "Sending" : "Send report"}
      </button>
    </form>
  );
}
