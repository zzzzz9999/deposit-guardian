import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 主色：深邃海蓝
        navy: {
          DEFAULT: '#1e3a8a',
          light: '#1d4ed8',
          dim: 'rgba(30,58,138,0.08)',
          border: 'rgba(30,58,138,0.16)',
        },
        // 辅助色：蒂芙尼青（成功/完成）
        teal: {
          DEFAULT: '#2dd4bf',
          dark: '#0d9488',
          dim: 'rgba(45,212,191,0.10)',
          border: 'rgba(45,212,191,0.20)',
        },
        // 行动色：珊瑚橘（警告/紧急）
        coral: {
          DEFAULT: '#fb923c',
          dark: '#ea580c',
          dim: 'rgba(251,146,60,0.10)',
          border: 'rgba(251,146,60,0.20)',
        },
        // 保留兼容旧代码
        primary: {
          DEFAULT: '#1e3a8a',
          light: '#1d4ed8',
          dim: 'rgba(30,58,138,0.08)',
        },
        success: { DEFAULT: '#0d9488', light: '#2dd4bf' },
        warn: { DEFAULT: '#ea580c', light: '#fb923c' },
      },
      fontFamily: {
        sans: ['-apple-system', 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.05), 0 8px 24px rgba(30,58,138,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(30,58,138,0.10)',
        'navy': '0 4px 16px rgba(30,58,138,0.25)',
        'teal': '0 4px 16px rgba(13,148,136,0.25)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
    },
  },
  plugins: [],
} satisfies Config
