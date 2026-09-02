/* ============================================================
   config.js — 백엔드 설정 (이 파일만 바꾸면 저장소가 전환됩니다)
   ------------------------------------------------------------
   provider:
     "local"    → 이 브라우저(localStorage)에만 저장 (기본값, 설정 불필요)
     "supabase" → Supabase(클라우드 DB) 사용 → 외부에서 조회·수정 가능

   Supabase를 쓰려면:
     1) supabase.com 에서 프로젝트 생성
     2) supabase/schema.sql, supabase/seed.sql 실행 (SETUP.md 참고)
     3) 아래 provider 를 "supabase" 로 바꾸고 url / anonKey 입력
        (Project Settings → API 에서 확인)
   ============================================================ */
window.APP_CONFIG = {
  provider: "supabase",              // "local" | "supabase"

  supabase: {
    url:     "https://ncgkqwffhwaazgxbbpuu.supabase.co",                  // 예) https://ncgkqwffhwaazgxbbpuu.supabase.co
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZ2txd2ZmaHdhYXpneGJicHV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMjI4MDUsImV4cCI6MjEwMzY5ODgwNX0.pQRmUWYFxJMV_P5Nvhxat1A233QZTHVterdwf97McHk"                   // Project Settings → API → anon public key
  }
};
