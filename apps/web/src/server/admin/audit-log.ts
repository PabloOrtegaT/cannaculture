type AdminAuditEvent = {
  action: string;
  outcome: "success" | "failure";
  actorId?: string | null;
  actorRole?: string | null;
  code?: string;
  message?: string;
};

export function logAdminAuditEvent(event: AdminAuditEvent) {
  const payload = {
    ...event,
    timestamp: new Date().toISOString(),
  };
  console.info("[admin-audit]", JSON.stringify(payload));
}

