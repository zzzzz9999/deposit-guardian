"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProfilePage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="animate-pulse text-4xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">👤 我的账户</h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
        <div className="p-6 flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-2xl">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.username} className="w-full h-full rounded-full object-cover" />
            ) : (
              user.username.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">{user.username}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
            {user.is_admin && (
              <span className="text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full">
                管理员
              </span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">账户信息</h3>
          {[
            { label: "用户名", value: user.username },
            { label: "邮箱", value: user.email },
            { label: "手机", value: user.phone || "未绑定" },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">{label}</span>
              <span className="text-gray-900 dark:text-white">{value}</span>
            </div>
          ))}
        </div>

        <div className="p-6">
          <button
            onClick={() => logout().then(() => router.push("/"))}
            className="w-full text-center text-sm text-red-500 hover:text-red-600 transition-colors"
          >
            退出登录
          </button>
        </div>
      </div>
    </div>
  );
}
