import { useState, type FormEvent } from "react";
import { updateTalukAdmin, type TalukAdminRecord } from "../../../api/talukAdminApi";

interface EditTalukAdminFormProps {
  talukAdmin: TalukAdminRecord;
  onUpdated: () => Promise<void> | void;
  onCancel: () => void;
}

export function EditTalukAdminForm({ talukAdmin, onUpdated, onCancel }: EditTalukAdminFormProps) {
  const [username, setUsername] = useState(talukAdmin.username);
  const [password, setPassword] = useState("");
  const [talukName, setTalukName] = useState(talukAdmin.talukName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!username.trim() || !talukName.trim()) {
      setError("Username and taluk name are required.");
      return;
    }
    if (password.trim() && password.trim().length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateTalukAdmin(talukAdmin.id, {
        username: username.trim(),
        talukName: talukName.trim(),
        ...(password.trim() ? { password: password.trim() } : {}),
      });
      await onUpdated();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update Taluk Admin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <article className="card stack">
      <h3>Edit Taluk Admin</h3>
      <form className="stack" onSubmit={submit}>
        <label className="field">
          <span className="field-label">Username</span>
          <input className="input" value={username} onChange={(event) => setUsername(event.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Password (optional)</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Leave empty to keep current password"
          />
        </label>
        <label className="field">
          <span className="field-label">Taluk Name</span>
          <input className="input" value={talukName} onChange={(event) => setTalukName(event.target.value)} />
        </label>
        {error ? <p className="field-error">{error}</p> : null}
        <div className="inline-actions">
          <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update Taluk Admin"}
          </button>
          <button className="btn btn-secondary" type="button" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </button>
        </div>
      </form>
    </article>
  );
}
