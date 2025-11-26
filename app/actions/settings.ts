"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getSettings() {
    return await prisma.settings.findFirst();
}

export async function updateSettings(formData: FormData) {
    const pcpEmail = formData.get("pcpEmail") as string;
    const pcpName = formData.get("pcpName") as string;

    const existing = await prisma.settings.findFirst();

    if (existing) {
        await prisma.settings.update({
            where: { id: existing.id },
            data: { pcpEmail, pcpName }
        });
    } else {
        await prisma.settings.create({
            data: { pcpEmail, pcpName }
        });
    }

    revalidatePath("/settings");
    revalidatePath("/orders");
}
