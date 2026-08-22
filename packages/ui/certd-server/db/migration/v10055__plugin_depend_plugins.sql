-- 在线插件依赖声明使用独立字段存储，避免塞进 extra YAML 解析合并。
-- 旧数据里 extra 中的 dependPlugins 由代码读取时兜底兼容，下次同步后自动迁移到新字段。
ALTER TABLE "pi_plugin" ADD COLUMN "depend_plugins" varchar(4096);
