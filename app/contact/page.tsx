export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px", fontSize: 17, lineHeight: 1.7, color: "#242424" }}>
      <h1>Contact Us</h1>
      <p>
        Have a story tip, spotted an error, or want to work with us? We'd like to hear from you.
      </p>
      <p>
        General inquiries: <a href="mailto:shaktisecur.in@gmail.com">shaktisecur.in@gmail.com</a>
        <br />
        Corrections &amp; tips: <a href="mailto:shaktisecur.in@gmail.com">shaktisecur.in@gmail.com</a>
      </p>
      <p style={{ color: "#888", fontSize: 14 }}>
        We typically respond within 2–3 business days.
      </p>
    </div>
  );
}
