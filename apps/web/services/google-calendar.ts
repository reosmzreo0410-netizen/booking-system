import { google, calendar_v3 } from "googleapis";
import { prisma } from "@repo/database";

const AVAILABLE_KEYWORD = "[予約可]";

export async function getGoogleCalendarClient(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      accessToken: true,
      refreshToken: true,
      tokenExpiry: true,
    },
  });

  if (!user?.accessToken || !user?.refreshToken) {
    throw new Error("User has no Google credentials");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: user.accessToken,
    refresh_token: user.refreshToken,
    expiry_date: user.tokenExpiry?.getTime(),
  });

  // Handle token refresh
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          accessToken: tokens.access_token,
          tokenExpiry: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : undefined,
        },
      });
    }
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function syncAvailableBlocks(adminId: string) {
  const calendar = await getGoogleCalendarClient(adminId);

  // Get events from the next 30 days that contain the keyword
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: thirtyDaysLater.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    q: AVAILABLE_KEYWORD,
  });

  const events = response.data.items || [];

  // Get existing blocks
  const existingBlocks = await prisma.availableBlock.findMany({
    where: { adminId },
    select: { googleEventId: true },
  });
  const existingEventIds = new Set(existingBlocks.map((b) => b.googleEventId));

  // Process new/updated events
  const processedEventIds = new Set<string>();

  for (const event of events) {
    if (!event.id || !event.start?.dateTime || !event.end?.dateTime) continue;
    if (!event.summary?.includes(AVAILABLE_KEYWORD)) continue;

    processedEventIds.add(event.id);

    await prisma.availableBlock.upsert({
      where: { googleEventId: event.id },
      update: {
        title: event.summary.replace(AVAILABLE_KEYWORD, "").trim() || null,
        startTime: new Date(event.start.dateTime),
        endTime: new Date(event.end.dateTime),
      },
      create: {
        adminId,
        googleEventId: event.id,
        title: event.summary.replace(AVAILABLE_KEYWORD, "").trim() || null,
        startTime: new Date(event.start.dateTime),
        endTime: new Date(event.end.dateTime),
      },
    });
  }

  // Remove blocks that no longer exist in Google Calendar
  const blocksToRemove = [...existingEventIds].filter(
    (id) => !processedEventIds.has(id)
  );

  if (blocksToRemove.length > 0) {
    await prisma.availableBlock.deleteMany({
      where: {
        adminId,
        googleEventId: { in: blocksToRemove },
      },
    });
  }

  return {
    synced: processedEventIds.size,
    removed: blocksToRemove.length,
  };
}

export async function createCalendarEvent(
  userId: string,
  params: {
    summary: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    attendeeEmails?: string[];
  }
): Promise<string | null> {
  const calendar = await getGoogleCalendarClient(userId);

  const event: calendar_v3.Schema$Event = {
    summary: params.summary,
    description: params.description,
    start: {
      dateTime: params.startTime.toISOString(),
      timeZone: "Asia/Tokyo",
    },
    end: {
      dateTime: params.endTime.toISOString(),
      timeZone: "Asia/Tokyo",
    },
    attendees: params.attendeeEmails?.map((email) => ({ email })),
  };

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
    sendUpdates: "all",
  });

  return response.data.id || null;
}

export async function updateCalendarEvent(
  userId: string,
  eventId: string,
  params: {
    summary?: string;
    description?: string;
    attendeeEmails?: string[];
  }
) {
  const calendar = await getGoogleCalendarClient(userId);

  const event: calendar_v3.Schema$Event = {};
  if (params.summary) event.summary = params.summary;
  if (params.description) event.description = params.description;
  if (params.attendeeEmails) {
    event.attendees = params.attendeeEmails.map((email) => ({ email }));
  }

  await calendar.events.patch({
    calendarId: "primary",
    eventId,
    requestBody: event,
    sendUpdates: "all",
  });
}

export async function deleteCalendarEvent(userId: string, eventId: string) {
  const calendar = await getGoogleCalendarClient(userId);

  await calendar.events.delete({
    calendarId: "primary",
    eventId,
    sendUpdates: "all",
  });
}

// Get busy times from Google Calendar (excluding [予約可] events)
export async function getBusyTimes(
  userId: string,
  timeMin: Date,
  timeMax: Date
): Promise<{ start: Date; end: Date }[]> {
  const calendar = await getGoogleCalendarClient(userId);

  // Get all events in the time range
  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: "startTime",
  });

  const events = response.data.items || [];
  const busyTimes: { start: Date; end: Date }[] = [];

  for (const event of events) {
    // Skip [予約可] events - these are available slots
    if (event.summary?.includes(AVAILABLE_KEYWORD)) continue;

    // Skip cancelled events
    if (event.status === "cancelled") continue;

    // Get event times
    const start = event.start?.dateTime || event.start?.date;
    const end = event.end?.dateTime || event.end?.date;

    if (start && end) {
      busyTimes.push({
        start: new Date(start),
        end: new Date(end),
      });
    }
  }

  return busyTimes;
}
