/**
 * app/api/notes/[id]/route.js
 * PATCH  /api/notes/:id — Update status (any user) or topic/description (own note / admin)
 * DELETE /api/notes/:id — Delete own note (admin can delete any)
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const { status, topic, description, elevated_to } = await request.json();

    // Fetch note first
    const { rows } = await query("SELECT * FROM notes WHERE id = $1", [id]);
    if (!rows[0]) return NextResponse.json({ error: "Note not found." }, { status: 404 });

    const isOwner = rows[0].created_by === session.id;
    const isAdmin = session.role === "ADMIN";

    // Only owner or admin can edit topic/description/elevated_to
    const sets = [];
    const vals = [];
    let idx = 1;

    if (status) {
      const validStatuses = ["pending", "in_progress", "complete"];
      if (!validStatuses.includes(status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
      sets.push(`status = $${idx++}`); vals.push(status);
    }
    if ((isOwner || isAdmin) && topic)       { sets.push(`topic = $${idx++}`);       vals.push(topic); }
    if ((isOwner || isAdmin) && description) { sets.push(`description = $${idx++}`); vals.push(description); }
    if ((isOwner || isAdmin) && elevated_to !== undefined) {
      sets.push(`elevated_to = $${idx++}`); vals.push(elevated_to || null);
    }

    if (sets.length === 0) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

    sets.push(`updated_at = NOW()`);
    vals.push(id);
    await query(`UPDATE notes SET ${sets.join(", ")} WHERE id = $${idx}`, vals);

    return NextResponse.json({ success: true, message: "Note updated." });
  } catch (err) {
    console.error("[NOTES:PATCH]", err);
    return NextResponse.json({ error: "Failed to update note." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const { rows } = await query("SELECT created_by FROM notes WHERE id = $1", [id]);
    if (!rows[0]) return NextResponse.json({ error: "Note not found." }, { status: 404 });

    if (rows[0].created_by !== session.id && session.role !== "ADMIN") {
      return NextResponse.json({ error: "You can only delete your own notes." }, { status: 403 });
    }

    await query("DELETE FROM notes WHERE id = $1", [id]);
    return NextResponse.json({ success: true, message: "Note deleted." });
  } catch (err) {
    console.error("[NOTES:DELETE]", err);
    return NextResponse.json({ error: "Failed to delete note." }, { status: 500 });
  }
}
