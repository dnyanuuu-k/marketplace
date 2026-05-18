import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, apiResponse, apiError, validateBody } from "@/lib/api-auth";

const updateSettingsSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string().min(1, "Setting key is required"),
      value: z.string().min(1, "Setting value is required"),
    })
  ).min(1, "At least one setting is required"),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request, ["SUPER_ADMIN"]);

    const settings = await db.platformSetting.findMany({
      orderBy: { key: "asc" },
    });

    // Convert to key-value object
    const settingsMap: Record<string, string> = {};
    for (const setting of settings) {
      settingsMap[setting.key] = setting.value;
    }

    return apiResponse(settingsMap);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Get settings error:", error);
    return apiError("Failed to fetch settings", 500, "INTERNAL_ERROR");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await requireAuth(request, ["SUPER_ADMIN"]);
    const body = await request.json();
    const validated = validateBody(updateSettingsSchema, body);

    if (validated instanceof Response) return validated;

    // Batch update settings using upsert
    const results = await Promise.all(
      validated.settings.map((setting) =>
        db.platformSetting.upsert({
          where: { key: setting.key },
          update: { value: setting.value },
          create: { key: setting.key, value: setting.value },
        })
      )
    );

    // Create audit log
    await db.auditLog.create({
      data: {
        actorId: currentUser.id,
        action: "SETTINGS_UPDATE",
        targetType: "PlatformSetting",
        metadata: JSON.stringify({
          updatedKeys: validated.settings.map((s) => s.key),
          settings: validated.settings,
        }),
      },
    });

    // Convert to key-value object
    const settingsMap: Record<string, string> = {};
    for (const setting of results) {
      settingsMap[setting.key] = setting.value;
    }

    return apiResponse(settingsMap);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Update settings error:", error);
    return apiError("Failed to update settings", 500, "INTERNAL_ERROR");
  }
}
