import { ButtonHTMLAttributes, ReactNode } from "react";
import "./ui.css";

export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`ui-button ${className}`.trim()} {...props} />;
}
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "primary" }) {
  return <span className={`ui-badge ${tone}`}>{children}</span>;
}
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="ui-empty"><strong>{title}</strong>{children && <span>{children}</span>}</div>;
}
export function Skeleton({ rows = 3 }: { rows?: number }) {
  return <div className="ui-skeleton" aria-label="Loading">{Array.from({ length: rows }, (_, index) => <i key={index} />)}</div>;
}
export function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="ui-dialog-backdrop" role="dialog" aria-modal="true" aria-label={title}><section className="ui-dialog"><header><h2>{title}</h2><Button onClick={onClose} aria-label="Close dialog">Close</Button></header>{children}</section></div>;
}
