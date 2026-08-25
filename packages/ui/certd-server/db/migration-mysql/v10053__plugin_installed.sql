ALTER TABLE `pi_plugin` ADD COLUMN `installed` boolean NOT NULL DEFAULT true;

UPDATE `pi_plugin` SET `installed` = true;

ALTER TABLE `pi_plugin` ADD COLUMN `ai_check_status` varchar(32) NOT NULL DEFAULT '';

ALTER TABLE `pi_plugin` ADD COLUMN `vip` varchar(50);

-- 旧版插件没有 full_name，以作者和插件名回填，后续统一以 full_name 识别插件。
-- MySQL 中 || 默认是逻辑或，字符串拼接必须用 CONCAT。
UPDATE `pi_plugin`
SET `full_name` = CASE
  WHEN `author` IS NOT NULL AND TRIM(`author`) <> '' THEN CONCAT(TRIM(`author`), '/', `name`)
  ELSE `name`
END
WHERE `full_name` IS NULL OR TRIM(`full_name`) = '';

ALTER TABLE `cd_domain` ADD COLUMN `remark` varchar(500) NOT NULL DEFAULT '';

-- 在线插件依赖声明使用独立字段存储，避免塞进 extra YAML 解析合并。
-- 旧数据里 extra 中的 dependPlugins 由代码读取时兜底兼容，下次同步后自动迁移到新字段。
ALTER TABLE `pi_plugin` ADD COLUMN `depend_plugins` varchar(1024);
