update cd_access set create_time = "2024-08-08 00:00:00.000"  where create_time < '999999999999999999999';
update cd_access set update_time = "2024-08-08 00:00:00.000"  where update_time < '999999999999999999999';

update pi_history set create_time = "2024-08-08 00:00:00.000"  where create_time < '999999999999999999999';
update pi_history set update_time = "2024-08-08 00:00:00.000"  where update_time < '999999999999999999999';

update pi_history_log set create_time = "2024-08-08 00:00:00.000"  where create_time < '999999999999999999999';
update pi_history_log set update_time = "2024-08-08 00:00:00.000"  where update_time < '999999999999999999999';

update pi_pipeline set create_time = "2024-08-08 00:00:00.000"  where create_time < '999999999999999999999';
update pi_pipeline set update_time = "2024-08-08 00:00:00.000"  where update_time < '999999999999999999999';

update sys_permission set create_time = "2024-08-08 00:00:00.000"  where create_time < '999999999999999999999';
update sys_permission set update_time = "2024-08-08 00:00:00.000"  where update_time < '999999999999999999999';

update sys_role set create_time = "2024-08-08 00:00:00.000"  where create_time < '999999999999999999999';
update sys_role set update_time = "2024-08-08 00:00:00.000"  where update_time < '999999999999999999999';

update sys_user set create_time = "2024-08-08 00:00:00.000"  where create_time < '999999999999999999999';
update sys_user set update_time = "2024-08-08 00:00:00.000"  where update_time < '999999999999999999999';
