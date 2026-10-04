begin;
-- 값이 채워진 뒤에는 행 삭제(스크립트로 재생성 가능한 파생 값). 그때는 별도 사용자 승인 필요.
drop table occupation_embeddings;
commit;
