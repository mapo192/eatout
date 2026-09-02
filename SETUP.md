# 동네 밥집 노트 — 데이터 API 서비스 적용 가이드

이 페이지는 **저장소를 바꿔 끼울 수 있는** 구조입니다.

| provider | 저장 위치 | 외부 조회/수정 | 설정 |
|---|---|---|---|
| `local` (기본) | 각자 브라우저(localStorage) | ❌ (기기별 개별 저장) | 없음 — 바로 사용 |
| `supabase` | 클라우드 Postgres + 자동 REST API | ✅ 누구나 조회 · 비밀번호로 수정 | 아래 5단계 |

파일 구성
```
index.html            화면 + 로직
restaurant-data.js    기본 식당 데이터(초기 seed 원본)
config.js             ← 백엔드 선택 (여기만 수정)
api.js                데이터소스 계층 (local / supabase)
supabase/schema.sql   테이블 + 권한(RLS) + 공유 비밀번호
supabase/seed.sql     초기 데이터 108곳 (INSERT)
```

---

## 추천: Supabase (관리형)

이유 — 서버를 직접 운영할 필요가 없고, 테이블만 만들면 **조회·수정 REST API가 자동 생성**되며, 외부에서 접근 가능한 HTTPS 주소와 무료 티어를 제공합니다. 정적 페이지에서 `fetch`로 바로 붙습니다.

### 1단계 — 프로젝트 생성
1. https://supabase.com 가입 → **New project** 생성 (Region은 `Northeast Asia (Seoul)` 권장)
2. 프로젝트가 준비되면 좌측 메뉴 **SQL Editor** 로 이동

### 2단계 — 테이블 & 권한 생성
1. `supabase/schema.sql` 내용을 SQL Editor에 붙여넣기
2. 실행 전, 파일 안의 이 줄에서 **비밀번호를 원하는 값으로 변경**:
   ```sql
   values ('write_password', 'change-this-please')
   ```
   → 예: `values ('write_password', '우리팀맛집2026')`
   이 값이 **동료들과 공유할 "수정용 비밀번호"** 입니다.
3. **Run** 실행

### 3단계 — 초기 데이터 넣기
1. `supabase/seed.sql` 내용을 SQL Editor에 붙여넣고 **Run** (108곳 입력)
2. 재실행해도 안전합니다(같은 id면 갱신).

### 4단계 — 키 확인
좌측 **Project Settings → API** 에서:
- **Project URL** (예: `https://abcdefgh.supabase.co`)
- **anon public** key

### 5단계 — 페이지 연결
`config.js` 를 이렇게 수정:
```js
window.APP_CONFIG = {
  provider: "supabase",
  supabase: {
    url:     "https://abcdefgh.supabase.co",   // 내 Project URL
    anonKey: "eyJhbGciOi...(anon public key)"  // 내 anon key
  }
};
```
저장 후 페이지를 새로고침하면 끝입니다.
- **조회**: 누구나 (비밀번호 불필요)
- **수정/등록/삭제**: 처음 시도할 때 공유 비밀번호를 물어봅니다. 한 번 입력하면 이 브라우저에 기억됩니다.

> ⚠️ **호스팅**: `index.html`을 여러 사람이 열려면 파일들을 **정적 호스팅**에 올려야 합니다.
> Supabase 자체는 DB/API이고 페이지 호스팅은 별도입니다. 무료 정적 호스팅 추천:
> **Cloudflare Pages / Netlify / Vercel / GitHub Pages** 중 아무거나 폴더째 업로드.
> (사내 웹서버·공유 폴더에 올려도 됩니다.)

---

## 외부에서 API 직접 사용 (다른 앱/스크립트에서)

Supabase가 만들어 준 REST 엔드포인트를 그대로 호출할 수 있습니다.

**조회 (GET)**
```bash
curl "https://<PROJECT>.supabase.co/rest/v1/restaurants?select=id,data,updated_at" \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>"
```

**등록 (POST) — 비밀번호 필요**
```bash
curl -X POST "https://<PROJECT>.supabase.co/rest/v1/restaurants" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -H "x-write-password: <공유_비밀번호>" \
  -d '{"data":{"name":"새식당","section":"식당 (반경 ~200m)","favorite":false,"map":{"url":"","desc":"공덕시장"},"voucher":{"accepted":true,"systems":["식권대장"],"note":"식권대장"},"rating":{"stars":[5],"avg":5,"note":""},"review":""}}'
```

**수정 (PATCH)** / **삭제 (DELETE)** — 같은 방식, `?id=eq.<id>` 로 대상 지정 + `x-write-password` 헤더.

레코드 스키마(`data` 안):
```
name, section, cat_major, cat_minor, menu, favorite(bool),
map:{url,desc}, voucher:{accepted(bool),systems[],note},
rating:{stars[],avg,note}, review
```

---

## 보안 메모 (공유 비밀번호 방식)
- 조회는 공개(anon), 쓰기는 **요청 헤더의 비밀번호가 DB의 비밀번호와 일치할 때만** 허용됩니다(RLS).
- 비밀번호는 서버(비공개 `app_secret` 테이블)에만 있고 anon은 읽지 못합니다.
- 페이지에는 비밀번호를 **하드코딩하지 않습니다.** 수정 시 사용자가 입력 → 이 브라우저에만 저장됩니다.
- 비밀번호 변경: SQL Editor에서
  ```sql
  update public.app_secret set value = '새비밀번호' where key = 'write_password';
  ```
- 더 강한 보안이 필요하면 Supabase **Auth(이메일 로그인)** 로 승격할 수 있습니다.

---

## 로컬로 다시 되돌리기
`config.js` 의 `provider` 를 `"local"` 로 바꾸면 즉시 브라우저 저장 모드로 돌아갑니다(설정 불필요).
