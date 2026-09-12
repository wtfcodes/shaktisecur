import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayUsage = await prisma.apiUsage.findMany({
    where: { createdAt: { gte: todayStart } },
    orderBy: { createdAt: "desc" },
  });

  const requestsToday = todayUsage.length;
  const successToday = todayUsage.filter((u) => u.success).length;
  const failedToday = requestsToday - successToday;
  const totalTokensToday = todayUsage.reduce((sum, u) => sum + u.totalTokens, 0);
  const promptTokensToday = todayUsage.reduce((sum, u) => sum + u.promptTokens, 0);
  const candidatesTokensToday = todayUsage.reduce((sum, u) => sum + u.candidatesTokens, 0);

  return NextResponse.json({
    requestsToday,
    successToday,
    failedToday,
    totalTokensToday,
    promptTokensToday,
    candidatesTokensToday,
    recent: todayUsage.slice(0, 15).map((u) => ({
      createdAt: u.createdAt,
      success: u.success,
      totalTokens: u.totalTokens,
      errorType: u.errorType,
    })),
  });
}
