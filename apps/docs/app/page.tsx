const packages = [
  "primitives",
  "components",
  "sections",
  "themes",
  "domains",
  "schema",
  "registry",
  "renderer",
  "functions",
  "protocol",
  "ai"
];

export default function DocsHome() {
  return (
    <main style={{ padding: 24, fontFamily: "Arial, Helvetica, sans-serif" }}>
      <h1>MiCirql Library Foundation</h1>
      <p>Internal package boundaries established for the schema-driven website platform.</p>
      <ul>
        {packages.map((name) => (
          <li key={name}>@micirql/{name}</li>
        ))}
      </ul>
    </main>
  );
}
