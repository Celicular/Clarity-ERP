/**
 * app/api/developers/suggest/route.js
 * GET — ranked developer suggestions based on skills, workload, rating
 * Query: ?skills=react,node (comma-separated)
 */
import { NextResponse } from "next/server";
import { getSession }   from "../../../../lib/auth";
import { query }        from "../../../../lib/db";

export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const skillsParam = searchParams.get("skills") || "";
  const requiredSkills = skillsParam.split(",").map((s) => s.trim()).filter(Boolean);

  /* Only users in the Development department with a profile */
  const { rows: devs } = await query(`
    SELECT u.id, u.name, dp.skills, dp.rating, dp.availability, dp.notes,
      (SELECT COUNT(*)::int FROM projects p WHERE p.assigned_dev = u.id AND p.status = 'active') AS active_projects
    FROM users u
    JOIN developer_profiles dp ON dp.user_id = u.id
    JOIN user_details       ud ON ud.user_id  = u.id
    JOIN sub_roles          sr ON sr.id = ud.sub_role_id AND sr.department = 'Development'
    WHERE dp.availability <> 'unavailable'
    ORDER BY dp.rating DESC
  `);

  /* Score each dev */
  const scored = devs.map((dev) => {
    const total = requiredSkills.length || 1;
    const matched = requiredSkills.filter((s) =>
      dev.skills?.some((ds) => ds.toLowerCase().includes(s.toLowerCase()))
    ).length;
    const skillMatch = matched / total;
    const workloadPct = Math.min((dev.active_projects || 0) / 5, 1); // cap at 5 projects
    const score = (skillMatch * 0.5) + ((1 - workloadPct) * 0.3) + ((Number(dev.rating) / 5) * 0.2);
    return { ...dev, skill_match_pct: Math.round(skillMatch * 100), score: Math.round(score * 100) };
  });

  scored.sort((a, b) => b.score - a.score);

  return NextResponse.json({ success: true, developers: scored });
}
