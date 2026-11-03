import type { NextConfig } from "next";

// STATIC_EXPORT=1 时导出纯静态站点（用于 GitHub Pages）
// NEXT_PUBLIC_BASE_PATH 用于项目页部署，例如 /scu-tutor-finder
const isStaticExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  // PPR（cacheComponents）与静态导出互斥，两种模式二选一
  ...(isStaticExport
    ? {
        output: "export" as const,
        // GitHub Pages 是纯静态托管，没有图片优化服务
        images: { unoptimized: true },
        // 生成 /page/index.html，避免刷新子路径时 404
        trailingSlash: true,
      }
    : {
        cacheComponents: true,
        partialPrefetching: true,
      }),

  basePath,
  assetPrefix: basePath || undefined,
};

export default nextConfig;
