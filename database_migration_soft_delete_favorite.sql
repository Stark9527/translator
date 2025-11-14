-- 数据库迁移：添加软删除和收藏功能
-- 说明：此迁移为 groups 和 flashcards 表添加软删除标记和收藏字段
-- 执行时间：请在 Supabase Dashboard 的 SQL Editor 中执行此脚本

-- ============================================
-- 1. 为 groups 表添加软删除字段
-- ============================================

-- 添加 deleted 字段（布尔值，默认为 false）
ALTER TABLE groups
ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false NOT NULL;

-- 添加 deleted_at 字段（时间戳，可为空）
ALTER TABLE groups
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 为 deleted 字段创建索引，提高查询性能
CREATE INDEX IF NOT EXISTS idx_groups_deleted
ON groups(deleted);

-- 为 deleted_at 字段创建索引
CREATE INDEX IF NOT EXISTS idx_groups_deleted_at
ON groups(deleted_at)
WHERE deleted_at IS NOT NULL;

-- ============================================
-- 2. 为 flashcards 表添加软删除和收藏字段
-- ============================================

-- 添加 deleted 字段（布尔值，默认为 false）
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false NOT NULL;

-- 添加 deleted_at 字段（时间戳，可为空）
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 添加 favorite 字段（布尔值，默认为 false）
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS favorite BOOLEAN DEFAULT false NOT NULL;

-- 为 deleted 字段创建索引，提高查询性能
CREATE INDEX IF NOT EXISTS idx_flashcards_deleted
ON flashcards(deleted);

-- 为 deleted_at 字段创建索引
CREATE INDEX IF NOT EXISTS idx_flashcards_deleted_at
ON flashcards(deleted_at)
WHERE deleted_at IS NOT NULL;

-- 为 favorite 字段创建索引，方便筛选收藏的卡片
CREATE INDEX IF NOT EXISTS idx_flashcards_favorite
ON flashcards(favorite)
WHERE favorite = true;

-- ============================================
-- 3. 添加注释说明
-- ============================================

COMMENT ON COLUMN groups.deleted IS '软删除标记：true 表示已删除，false 表示未删除';
COMMENT ON COLUMN groups.deleted_at IS '删除时间：记录删除操作的时间戳';

COMMENT ON COLUMN flashcards.deleted IS '软删除标记：true 表示已删除，false 表示未删除';
COMMENT ON COLUMN flashcards.deleted_at IS '删除时间：记录删除操作的时间戳';
COMMENT ON COLUMN flashcards.favorite IS '收藏标记：true 表示已收藏，false 表示未收藏';

-- ============================================
-- 4. 验证迁移结果
-- ============================================

-- 查看 groups 表结构
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'groups'
  AND column_name IN ('deleted', 'deleted_at')
ORDER BY ordinal_position;

-- 查看 flashcards 表结构
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'flashcards'
  AND column_name IN ('deleted', 'deleted_at', 'favorite')
ORDER BY ordinal_position;

-- 查看创建的索引
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('groups', 'flashcards')
  AND indexname LIKE 'idx_%deleted%' OR indexname LIKE 'idx_%favorite%'
ORDER BY tablename, indexname;
