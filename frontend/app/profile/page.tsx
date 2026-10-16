"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/useTheme";
import Sidebar from "@/components/Sidebar";
import Icon from "@/components/Icon";
import api from "@/app/_utils/axios";
import { getUser } from "@/app/_utils/getUser";
import type { UserProfile } from "@/app/_types";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl border border-[#e8e5df] dark:border-[#302e2c] bg-[#f4f2ee] dark:bg-[#222120]">
      <span className="text-[22px] font-bold font-manrope text-[#34302c] dark:text-[#eee9e4] tracking-[-0.03em]">
        {value}
      </span>
      <span className="text-[11px] text-[#6f6862] dark:text-[#8e8881] font-medium uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { darkMode } = useTheme();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [convCount, setConvCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      try {
        const currentUser = await getUser();
        if (isMounted && currentUser) {
          setUser({
            id: currentUser.id,
            name: currentUser.name,
            initials: currentUser.name.slice(0, 2).toUpperCase(),
            email: currentUser.email,
            joinedAt: "Active member",
          });
        }

        const { data: convs } = await api.get<unknown[]>("/conversations");
        if (isMounted && Array.isArray(convs)) {
          setConvCount(convs.length);
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await api.post("/user/logout");
    } catch {}
    localStorage.removeItem("access_token");
    router.push("/login");
  };

  return (
    <div
      className={`app-shell flex h-svh min-h-svh overflow-hidden text-[#252321] dark:text-[#e8e3de] bg-[#fbfaf8] dark:bg-[#1b1a19] ${
        darkMode ? "dark-mode" : ""
      }`}
    >
      <Sidebar />

      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-150 mx-auto px-8 py-10">
          {/* Back to chat */}
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12px] text-[#918a83] dark:text-[#7a736c] no-underline hover:text-[#6f6862] dark:hover:text-[#9e9690] mb-8 transition-colors duration-160"
          >
            <Icon name="arrowLeft" size={13} />
            Back to chat
          </Link>

          {loading ? (
            <p className="text-[13px] text-[#918a83] dark:text-[#7a736c]">
              Loading profile…
            </p>
          ) : user ? (
            <>
              {/* Avatar + name */}
              <div className="flex items-center gap-5 mb-8">
                <div className="w-16 h-16 rounded-full bg-[#ba806e] dark:bg-[#a86e5f] grid place-items-center text-white text-[22px] font-bold font-manrope shrink-0">
                  {user.initials}
                </div>
                <div>
                  <h1 className="m-0 mb-0.5 font-manrope text-[24px] font-bold tracking-[-0.04em] text-[#26231f] dark:text-[#eee9e4]">
                    {user.name}
                  </h1>
                  <p className="m-0 text-[13px] text-[#918a83] dark:text-[#7a736c]">
                    {user.email}
                  </p>
                  <p className="m-0 mt-0.5 text-[11px] text-[#a29a93] dark:text-[#6f6862]">
                    {user.joinedAt}
                  </p>
                </div>
              </div>

              {/* Stats overview - Goals completely removed */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                <StatCard label="Conversations" value={convCount} />
                <StatCard label="Status" value="Active" />
              </div>

              {/* Quick links */}
              <div className="flex flex-col gap-2 mb-10">
                <h2 className="m-0 mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#6f6862] dark:text-[#8e8881]">
                  Quick links
                </h2>
                <Link
                  href="/settings"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#e8e5df] dark:border-[#302e2c] no-underline text-[#3f3a36] dark:text-[#c8c0b8] hover:bg-[#f4f2ee] dark:hover:bg-[#222120] transition-colors duration-160"
                >
                  <Icon name="settings" size={16} />
                  <span className="text-[13px] font-medium">Settings</span>
                  <Icon name="chevronRight" size={14} />
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border border-[#e8e5df] dark:border-[#302e2c] no-underline text-[#a25e50] dark:text-[#d89180] hover:bg-[#fdf3f0] dark:hover:bg-[#2a1e1b] transition-colors duration-160 bg-transparent cursor-pointer"
                >
                  <Icon name="arrowRight" size={16} />
                  <span className="text-[13px] font-medium">Sign out</span>
                </button>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-[#918a83] dark:text-[#7a736c]">
              Please sign in to view your profile.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
