import { Link } from "react-router-dom";

interface ModuleCardProps {
  title: string;
  description: string;
  ctaLabel: string;
  onClick?: () => void;
  to?: string;
}

export function ModuleCard({ title, description, ctaLabel, onClick, to }: ModuleCardProps) {
  const content = (
    <>
      <div className="module-card-header">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {to ? (
        <Link to={to} className="btn btn-primary mt-auto">
          {ctaLabel}
        </Link>
      ) : (
        <button type="button" className="btn btn-primary mt-auto" onClick={onClick}>
          {ctaLabel}
        </button>
      )}
    </>
  );

  return (
    <article className="module-card">
      {content}
    </article>
  );
}

