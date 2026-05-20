-- 内容森林：媒体资源系统事实表
-- 依据：
-- - docs/design/内容森林架构设计文档.md
-- - docs/design/domain/果实领域模块设计文档.md
-- - docs/design/domain/枝化生长领域模块设计文档.md
-- - content-forest-backend/openspec/changes/add-media-asset-backend/specs/media-asset-management/spec.md
--
-- 约束说明：
-- - 图片、视频等媒体二进制属于内容本体，只通过 content_location 指向内容访问层。
-- - 数据库只维护资源身份、所属种子、媒体类型、MIME、大小、来源、内容位置、挂载关系和审计时间。
-- - content_location 必须是内容根目录下的相对位置，不保存 Windows、Linux 或 macOS 绝对路径。
-- - 果实媒体挂载关系由 fruit_media_assets 维护，不写入果实 Markdown 正文。

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  seed_id TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  mime_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  content_location TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'user_upload' CHECK (source_type IN ('user_upload', 'generated_output', 'imported')),
  source_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_media_assets_seed_updated_at
  ON media_assets (seed_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_media_assets_media_type_updated_at
  ON media_assets (media_type, updated_at);

CREATE TABLE IF NOT EXISTS fruit_media_assets (
  id TEXT PRIMARY KEY,
  fruit_id TEXT NOT NULL,
  media_asset_id TEXT NOT NULL,
  display_role TEXT NOT NULL DEFAULT 'attachment' CHECK (display_role IN ('primary', 'inline', 'reference', 'attachment')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE (fruit_id, media_asset_id)
);

CREATE INDEX IF NOT EXISTS idx_fruit_media_assets_fruit_order
  ON fruit_media_assets (fruit_id, sort_order, created_at);

CREATE INDEX IF NOT EXISTS idx_fruit_media_assets_media_asset
  ON fruit_media_assets (media_asset_id);
