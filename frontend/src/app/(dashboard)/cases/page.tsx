"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { casesApi } from "@/lib/api-client";

interface Case {
  id: string;
  title: string;
  subtitle?: string;
  category_id?: string;
  difficulty?: string;
  success_rate?: number;
  is_featured?: boolean;
}

interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export default function CasesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ["cases", selectedCategory],
    queryFn: () => casesApi.list(selectedCategory),
  });

  const cases = (data as { cases: Case[]; categories: Category[] })?.cases || [];
  const categories = (data as { cases: Case[]; categories: Category[] })?.categories || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">📚 维权案例库</h1>
        <p className="text-gray-600 dark:text-gray-400">真实胜诉案例，AI 每日更新</p>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedCategory(undefined)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            !selectedCategory
              ? "bg-blue-600 text-white"
              : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400"
          }`}
        >
          全部
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat.id
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400"
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {/* Cases Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : cases.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases.map((c) => (
            <Link
              key={c.id}
              href={`/cases/${c.id}`}
              className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              {c.is_featured && (
                <span className="text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-full mb-3 inline-block">
                  ⭐ 精选
                </span>
              )}
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                {c.title}
              </h3>
              {c.subtitle && (
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                  {c.subtitle}
                </p>
              )}
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                {c.difficulty && <span>难度：{c.difficulty}</span>}
                {c.success_rate && (
                  <span className="text-green-600 dark:text-green-400">
                    ✓ 成功率 {c.success_rate}%
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-3">📭</div>
          <p>暂无案例，请先运行 AI 案例生成服务</p>
        </div>
      )}
    </div>
  );
}
