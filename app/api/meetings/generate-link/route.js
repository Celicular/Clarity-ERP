/**
 * app/api/meetings/generate-link/route.js
 * POST /api/meetings/generate-link
 * Uses Google Calendar API to automatically generate a Google Meet link.
 */
import { NextResponse } from "next/server";
import { google }       from "googleapis";
import { getSession }   from "../../../../lib/auth";

export async function POST(request) {
  // 1. Verify User Login & Admin Role
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden. Admin only." }, { status: 403 });

  // 2. Check if Environment Config is set
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    return NextResponse.json({ 
      error: "Google API credentials are not fully configured in your .env.local file. Please provide GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN." 
    }, { status: 500 });
  }

  try {
    const { title, description, scheduledAt, durationMin } = await request.json();

    if (!title || !scheduledAt) {
      return NextResponse.json({ error: "Meeting title and scheduled time are required to generate a link." }, { status: 400 });
    }

    // Initialize OAuth2 Client using the standard free Gmail method
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );
    oauth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Calculate start and end ISO strings based on the expected duration
    const startDate = new Date(scheduledAt);
    const endDate   = new Date(startDate.getTime() + (parseInt(durationMin || 60) * 60000));

    // 3. Create Event Request with conferenceData
    const event = {
      summary: title,
      description: description || "Scheduled via CRM",
      start: { dateTime: startDate.toISOString() },
      end:   { dateTime: endDate.toISOString() },
      conferenceData: {
        createRequest: {
          requestId: `meet_${Date.now()}_${Math.random().toString(36).substring(7)}`, // Random unique ID
          conferenceSolutionKey: { type: "hangoutsMeet" }
        }
      }
    };

    // 4. Insert Event to Google Calendar (primary calendar of the authorized user)
    const response = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1, // Must be 1 to process conferenceData
      requestBody: event,
    });

    const googleEvent = response.data;
    const hangoutLink = googleEvent.hangoutLink;

    if (!hangoutLink) {
      throw new Error("Google API did not return a hangoutLink. Please ensure Google Meet is enabled for the account.");
    }

    return NextResponse.json({ 
      success: true, 
      hangoutLink: hangoutLink,
      eventId: googleEvent.id 
    });

  } catch (err) {
    console.error("[GMEET:GENERATE]", err);
    // Return the detailed Google API error back to the client if possible
    const errorMsg = err.errors ? err.errors[0].message : err.message;
    return NextResponse.json({ error: `Google API Error: ${errorMsg}` }, { status: 500 });
  }
}
