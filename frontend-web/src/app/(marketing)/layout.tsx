import './landing.css';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="pc-scope">{children}</div>;
}
