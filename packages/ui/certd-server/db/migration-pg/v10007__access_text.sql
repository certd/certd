alter table cd_access alter column setting type text using setting::text;
alter table sys_settings alter column setting type text using setting::text;
alter table user_settings alter column setting type text using setting::text;
alter table pi_history_log alter column logs type text using logs::text;
alter table pi_history alter column pipeline type text using pipeline::text;
