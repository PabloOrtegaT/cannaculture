type AccessDeniedProps = {
  role: string;
  section: string;
};

export function AccessDenied({ role, section }: AccessDeniedProps) {
  return (
    <section className="rounded-lg border bg-card p-6 text-card-foreground">
      <h1 className="text-xl font-semibold">Access denied</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Role <span className="font-semibold">{role}</span> cannot access {section}.
      </p>
    </section>
  );
}
