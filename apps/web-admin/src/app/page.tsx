import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function RootPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get("arenax_admin_id")?.value;

    if (userId) {
        redirect(`/${userId}`);
    }

    const authUrl = process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:3000";
    redirect(authUrl);
}
