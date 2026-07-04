import { useState, type FormEvent } from "react";
import { createTalukAdmin } from "../../../api/talukAdminApi";

interface CreateTalukAdminFormProps {
  onCreated: () => Promise<void> | void;
}

export function CreateTalukAdminForm({ onCreated }: CreateTalukAdminFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [talukName, setTalukName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username.trim() || !password.trim() || !talukName.trim()) {
      setError("All fields are required.");
      return;
    }
    if (password.trim().length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createTalukAdmin({
        username: username.trim(),
        password: password.trim(),
        talukName: talukName.trim(),
      });
      setUsername("");
      setPassword("");
      setTalukName("");
      setSuccess("Taluk Admin created successfully.");
      await onCreated();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create Taluk Admin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <article className="card stack">
      <h3>Create Taluk Admin</h3>
      <p className="muted">Use a valid email as username so existing login can work directly.</p>
      <form className="stack" onSubmit={submit}>
        <label className="field">
          <span className="field-label">Username</span>
          <input className="input" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="taluk.admin@example.com" />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
          />
        </label>
        <label className="field">
          <span className="field-label">Taluk Name</span>
          <input className="input" value={talukName} onChange={(event) => setTalukName(event.target.value)} placeholder="Thanjavur" />
        </label>
        {error ? <p className="field-error">{error}</p> : null}
        {success ? <p className="taluk-success">{success}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Taluk Admin"}
        </button>
      </form>
    </article>
  );
}
