-- for preview 限制演示环境的数据修改
select setval('sys_permission_id_seq', 1000);
select setval('sys_user_id_seq', 1000);
select setval('sys_role_id_seq', 1000);
