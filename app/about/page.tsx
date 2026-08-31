export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px", fontSize: 17, lineHeight: 1.7, color: "#242424" }}>
      <h1>About ShaktiSecur</h1>
      <p>
        ShaktiSecur is an independent publication covering technology and cybersecurity — from
        breaking product launches and AI developments to the vulnerabilities, breaches, and
        defensive practices that shape the security world.
      </p>
      <p>
        The site is run by a security practitioner with hands-on experience in bug bounty hunting
        and blue-team analysis, bringing a working understanding of both offense and defense to
        everyday tech coverage. Our goal is straightforward: explain what happened, why it
        matters, and what it means for the people reading it — without the hype.
      </p>
      <p>
        Every article is researched from primary sources and reviewed by an editor before
        publishing. See our <a href="/disclaimer">editorial disclaimer</a> for details on how we
        use AI tools as part of that process.
      </p>
      <p>
        Have a story tip, correction, or partnership inquiry? Reach out via our{" "}
        <a href="/contact">contact page</a>.
      </p>
    </div>
  );
}
