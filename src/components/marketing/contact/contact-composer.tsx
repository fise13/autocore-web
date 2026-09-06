"use client";

import { useId, useState, type FormEvent } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CONTACT_MESSAGE_MAX,
  CONTACT_MESSAGE_MIN,
  type ContactIntent,
} from "@/lib/marketing/contact-contract";

type ComposerCopy = {
  heading: string;
  hint: string;
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  companyLabel: string;
  companyPlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
  submit: string;
  sending: string;
  successTitle: string;
  successBody: string;
  sendAnother: string;
  errorGeneric: string;
  errorInvalid: string;
  errorRateLimited: string;
  orEmail: string;
};

type FieldKey = "name" | "email" | "company" | "message";

type ContactComposerProps = {
  intent: ContactIntent;
  mailSubject: string;
  supportEmail: string;
  copy: ComposerCopy;
};

function mailtoFallback(input: {
  supportEmail: string;
  subject: string;
  name: string;
  email: string;
  company: string;
  message: string;
}) {
  const body = [
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    input.company ? `Company: ${input.company}` : null,
    "",
    input.message,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return `mailto:${input.supportEmail}?subject=${encodeURIComponent(input.subject)}&body=${encodeURIComponent(body)}`;
}

export function ContactComposer({
  intent,
  mailSubject,
  supportEmail,
  copy,
}: ContactComposerProps) {
  const formId = useId();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [formKey, setFormKey] = useState(0);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const company = String(data.get("company") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const website = String(data.get("website") ?? "");

    const nextInvalid: Partial<Record<FieldKey, boolean>> = {
      name: name.length === 0,
      email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      message: message.length < CONTACT_MESSAGE_MIN || message.length > CONTACT_MESSAGE_MAX,
    };
    setInvalid(nextInvalid);

    if (nextInvalid.name || nextInvalid.email || nextInvalid.message) {
      setStatus("error");
      setError(copy.errorInvalid);
      return;
    }

    setStatus("sending");
    setError("");

    try {
      const response = await fetch("/api/marketing/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, name, email, company, message, website }),
      });

      if (response.ok) {
        setStatus("sent");
        return;
      }

      if (response.status === 503) {
        window.location.href = mailtoFallback({
          supportEmail,
          subject: mailSubject,
          name,
          email,
          company,
          message,
        });
        setStatus("sent");
        return;
      }

      if (response.status === 429) {
        setStatus("error");
        setError(copy.errorRateLimited);
        return;
      }

      if (response.status === 400) {
        const payload = (await response.json().catch(() => null)) as {
          issues?: string[];
        } | null;
        const issues = new Set(payload?.issues ?? []);
        setInvalid({
          name: issues.has("name"),
          email: issues.has("email"),
          message: issues.has("message"),
        });
        setStatus("error");
        setError(copy.errorInvalid);
        return;
      }

      setStatus("error");
      setError(copy.errorGeneric);
    } catch {
      setStatus("error");
      setError(copy.errorGeneric);
    }
  }

  if (status === "sent") {
    return (
      <div className="contact-composer contact-composer-success" role="status">
        <span className="contact-success-mark" aria-hidden>
          <Check strokeWidth={2.25} />
        </span>
        <p className="contact-success-title">{copy.successTitle}</p>
        <p className="contact-success-body">{copy.successBody}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="contact-success-again"
          onClick={() => {
            setFormKey((key) => key + 1);
            setStatus("idle");
            setInvalid({});
            setError("");
          }}
        >
          {copy.sendAnother}
        </Button>
      </div>
    );
  }

  const busy = status === "sending";

  return (
    <div className="contact-composer-block">
      <p className="contact-composer-kicker" id={`${formId}-heading`}>
        {copy.heading}
      </p>
      <p className="contact-composer-hint" id={`${formId}-hint`}>
        {copy.hint}
      </p>

      <form
        key={formKey}
        className="contact-composer"
        onSubmit={onSubmit}
        noValidate
        aria-labelledby={`${formId}-heading`}
        aria-describedby={`${formId}-hint`}
      >
        <div className="contact-honeypot" aria-hidden="true">
          <label htmlFor={`${formId}-website`}>Website</label>
          <input
            id={`${formId}-website`}
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />
        </div>

        <div className="contact-composer-grid">
          <div className="contact-field">
            <label htmlFor={`${formId}-name`}>{copy.nameLabel}</label>
            <input
              id={`${formId}-name`}
              name="name"
              type="text"
              autoComplete="name"
              placeholder={copy.namePlaceholder}
              required
              aria-invalid={invalid.name || undefined}
              disabled={busy}
              onInput={() => {
                setInvalid((prev) => ({ ...prev, name: false }));
                if (status === "error") setError("");
              }}
            />
          </div>
          <div className="contact-field">
            <label htmlFor={`${formId}-email`}>{copy.emailLabel}</label>
            <input
              id={`${formId}-email`}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder={copy.emailPlaceholder}
              required
              aria-invalid={invalid.email || undefined}
              disabled={busy}
              onInput={() => {
                setInvalid((prev) => ({ ...prev, email: false }));
                if (status === "error") setError("");
              }}
            />
          </div>
          <div className="contact-field contact-field-wide">
            <label htmlFor={`${formId}-company`}>{copy.companyLabel}</label>
            <input
              id={`${formId}-company`}
              name="company"
              type="text"
              autoComplete="organization"
              placeholder={copy.companyPlaceholder}
              disabled={busy}
            />
          </div>
          <div className="contact-field contact-field-message">
            <label htmlFor={`${formId}-message`}>{copy.messageLabel}</label>
            <textarea
              id={`${formId}-message`}
              name="message"
              placeholder={copy.messagePlaceholder}
              minLength={CONTACT_MESSAGE_MIN}
              maxLength={CONTACT_MESSAGE_MAX}
              required
              aria-invalid={invalid.message || undefined}
              disabled={busy}
              onInput={() => {
                setInvalid((prev) => ({ ...prev, message: false }));
                if (status === "error") setError("");
              }}
            />
          </div>
        </div>

        {error ? (
          <p className="contact-composer-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="contact-composer-footer">
          <Button
            type="submit"
            size="sm"
            className="contact-send"
            disabled={busy}
          >
            {busy ? copy.sending : copy.submit}
          </Button>
        </div>
      </form>

      <p className="contact-composer-mail">
        {copy.orEmail}{" "}
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
      </p>
    </div>
  );
}
