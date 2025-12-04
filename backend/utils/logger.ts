import { db } from "../db";
import { activityLogs } from "../db/schema";

interface LogActivityParams {
  userId?: string;
  userName: string;
  action: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await db.insert(activityLogs).values({
      userId: params.userId,
      userName: params.userName,
      action: params.action,
      details: params.details,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}