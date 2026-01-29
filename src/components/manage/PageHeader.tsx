import "./PageHeader.css";

export default function PageHeader({
  chip,
  caption,
  title,
  sub,
  right,
  error,
  children,
}: {
  chip: string;
  caption?: string;
  title: string;
  sub?: string;
  right?: React.ReactNode;
  error?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="phHeader">
      <div className="phLeft">
        <div className="phChipRow">
          <span className="phChip">{chip}</span>
          {caption && <span className="phCaption">{caption}</span>}
        </div>

        <div className="phTitleRow">
          <h1 className="phTitle">{title}</h1>
          {sub && <div className="phSub">{sub}</div>}
        </div>

        {children && <div className="phChildren">{children}</div>}

        {error && <div className="phErr">{error}</div>}
      </div>

      {right && <div className="phRight">{right}</div>}
    </header>
  );
}
