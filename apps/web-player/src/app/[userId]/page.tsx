
import { supabase } from "@arenax/database";
import DashboardContent from "./DashboardContent";
import { unstable_noStore as noStore } from 'next/cache';

export default async function Page({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  noStore(); // Ensure we don't cache this page so database updates reflect immediately
  const { userId } = await params;

  console.log("[SERVER-PAGE] Fetching dashboard data for:", userId);

  // 1. Fetch Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // 2. Fetch Wallet Balance
  const { data: walletData } = await supabase
    .from('wallets')
    .select('balance')
    .eq('user_id', userId)
    .single();

  // Sanity check log
  if (profile?.hero_url) {
    console.log("[SERVER-PAGE] Hero URL found, length:", profile.hero_url.length);
  } else {
    console.log("[SERVER-PAGE] No Hero URL found");
  }

  return (
    <DashboardContent
      userId={userId}
      initialProfile={profile}
      initialWalletBalance={walletData ? Number(walletData.balance) : 0}
    />
  );
}
