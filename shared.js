/* ============================================================
   shared.js — 사용자 화면(index.html)과 관리자 화면(admin.html) 공통 로직
   구역 목록 · 지역(위치 설명) 분류 · 식권 아이콘 · 숨김 여부
   ============================================================ */

const SECTIONS = ["식당 (반경 ~200m)","식당 (반경 ~500m)","저녁 (for 회식)","카페&베이커리, 테이크아웃 등","대접하기 좋은 식당"];
const SECTION_SHORT = {
  "식당 (반경 ~200m)":"반경 200m",
  "식당 (반경 ~500m)":"반경 500m",
  "저녁 (for 회식)":"회식·저녁",
  "카페&베이커리, 테이크아웃 등":"카페·베이커리",
  "대접하기 좋은 식당":"대접하기 좋은"
};

/* ---------- 지역 그룹 (위치 설명 → 지역 타이틀) ---------- */
// 표시 순서. "위치 미기재"는 항상 마지막에 붙인다.
const LOCATION_ORDER = [
  "S-OIL 뒷편 먹자골목","공덕시장","효성해링턴스퀘어","삼창프라자","재화스퀘어",
  "공덕 이마트 옆","롯데캐슬(공덕역 2번출구)","공덕역·마포역 주변","서부지법 주변", "기타"
];
function locGroupOf(d){
  const t=((d.map&&d.map.desc)||"").trim();
  if(!t) return "위치 미기재";
  if(/먹자골목|S-?OIL/i.test(t)) return "S-OIL 뒷편 먹자골목";
  if(/공덕시장/.test(t))         return "공덕시장";
  if(/효성|해링턴/.test(t))      return "효성해링턴스퀘어";
  if(/삼창/.test(t))             return "삼창프라자";
  if(/재화스퀘어/.test(t))       return "재화스퀘어";
  if(/이마트/.test(t))           return "공덕 이마트 옆";
  if(/롯데캐슬/.test(t))         return "롯데캐슬(공덕역 2번출구)";
  if(/공덕역|마포역|공덕더샵|공덕역사/.test(t)) return "공덕역·마포역 주변";
  if(/서부지법|서부지방법원|서부지원|법원/.test(t)) return "서부지법 주변";
  return "기타";
}
// 존재하는 그룹만, 정해진 순서로 반환 (+ 위치 미기재는 맨 끝)
function locGroupsPresent(data){
  const set=new Set(data.map(locGroupOf));
  const ordered=LOCATION_ORDER.filter(g=>set.has(g));
  if(set.has("위치 미기재")) ordered.push("위치 미기재");
  return ordered;
}

/* ---------- 식권 아이콘 ---------- */
// 제로페이(비플식권)=bzip.png, 식권대장=sick.png, 둘 다면 함께 표시
function voucherIconsHTML(v, size){
  if(!v || !v.accepted) return "";
  const txt = (((v.systems&&v.systems.join(" "))||"") + " " + (v.note||"")).trim();
  const s = size||16;
  let html = "";
  if(/제로페이|비플/.test(txt)) html += `<img class="vico" src="bzip.png" alt="제로페이" title="제로페이(비플식권)" style="height:${s}px">`;
  if(/식권대장/.test(txt))      html += `<img class="vico" src="sick.png" alt="식권대장" title="식권대장" style="height:${s}px">`;
  return html;
}

/* ---------- 숨김 여부 ---------- */
// 관리자가 숨긴 식당(data.hidden === true)은 사용자 화면에 나오지 않는다
function isHidden(d){ return !!(d && d.hidden); }
