-- for preview 限制演示环境的数据修改
update sqlite_sequence set seq = 1000 where name = 'sys_user' ;
update sqlite_sequence set seq = 1000 where name = 'sys_permission' ;
update sqlite_sequence set seq = 1000 where name = 'sys_role' ;
