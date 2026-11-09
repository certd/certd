ALTER TABLE cd_risk_record ADD COLUMN review_status varchar(32) NOT NULL DEFAULT 'pending';

UPDATE cd_risk_record SET review_status = 'processed';

CREATE INDEX index_risk_record_review_status ON cd_risk_record (review_status);
