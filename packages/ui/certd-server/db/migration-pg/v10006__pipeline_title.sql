alter table pi_pipeline alter column title type varchar(100) using title::varchar(100);
alter table pi_pipeline alter column content type text using content::text;
alter table pi_storage alter column value type text using value::text;

alter table pi_pipeline  add "order" bigint default 0;
