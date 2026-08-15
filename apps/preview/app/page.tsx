import { seedSectionCatalog } from "@micirql/sections";

export default function PreviewHome() {
  const sample = seedSectionCatalog.slice(0, 24);
  return (
    <main style={{ padding: 24, fontFamily: "Arial, Helvetica, sans-serif" }}>
      <h1>MiCirql Preview Runtime</h1>
      <p>Deterministic library previews used by the MiCirql protocol and visual QA harness.</p>
      <p>{seedSectionCatalog.length} seed section designs are currently addressable through the preview runtime.</p>
      <ul>
        {sample.map((entry) => (
          <li key={entry.id}><a href={`/library/${entry.id}`}>{entry.id}</a></li>
        ))}
      </ul>
    </main>
  );
}
