# 安装/升级依赖
i:
  pnpm i

# 交互式升级所有包到最新版本
up:
  pnpm up -i --latest

# 开发服务器
dev:
  pnpm dev

# 构建
build:
  pnpm build

# 预览
preview:
  pnpm preview

# 格式化代码
prettier:
  pnpm prettier

# 仅构建
build-only:
  pnpm build-only

# 类型检查
type-check:
  pnpm type-check

# 代码检查
lint:
  pnpm lint

# 推送环境配置到 MacBook
push-env-to-macbook:
  scp .env.development .env.production macbook:~/Desktop/personal_project/coderx/
  @echo "✅ 环境配置已推送到 MacBook"

# 从 MacBook 拉取环境配置
pull-env-from-macbook:
  scp macbook:~/Desktop/personal_project/coderx/.env.development .
  scp macbook:~/Desktop/personal_project/coderx/.env.production .
  @echo "✅ 环境配置已从 MacBook 拉取"

# 查看 MacBook 上的环境配置（不下载）
view-macbook-env:
  @echo "=== MacBook 的 .env.development ==="
  @ssh macbook "cat ~/Desktop/personal_project/coderx/.env.development"
  @echo ""
  @echo "=== MacBook 的 .env.production ==="
  @ssh macbook "cat ~/Desktop/personal_project/coderx/.env.production"
