export function toApiErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;

  if (message.includes("schema cache") || message.includes("public.game_sessions")) {
    return "Supabase tables are missing. Run the SQL migration in supabase/migrations/20260711120000_initial_schema.sql, then redeploy or refresh.";
  }

  return message;
}
