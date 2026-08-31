export const metadata = { title: "Editorial Disclaimer" };

export default function DisclaimerPage() {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px", fontSize: 17, lineHeight: 1.7, color: "#242424" }}>
      <h1>Editorial Disclaimer</h1>
      <p>
        Some articles on ShaktiSecur.in are drafted with AI assistance based on publicly available
        news reports, then reviewed, fact-checked, and edited by a human editor before publishing.
        We link to original sources where relevant so readers can verify claims independently.
      </p>
      <p>
        Our content is intended for general informational purposes and should not be taken as
        professional security, legal, or financial advice. If you spot an error or have a
        correction, please <a href="/contact">contact us</a> and we'll address it promptly.
      </p>
    </div>
  );
}
