import { createAdminClient } from "@/lib/supabase/admin";

export type Player = {
  id: string;
  displayName: string;
};

export async function getPlayer(request: Request): Promise<Player> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  const admin = createAdminClient();

  if (admin && token) {
    const { data, error } = await admin.auth.getUser(token);
    if (!error && data.user) {
      const displayName = data.user.user_metadata.display_name || "Player";
      return { id: data.user.id, displayName };
    }
  }

  const fallbackId = request.headers.get("x-player-id") || "local-player";
  const displayName = request.headers.get("x-display-name") || "Player";
  return { id: fallbackId, displayName };
}
