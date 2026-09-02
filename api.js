/* ============================================================
   api.js — 데이터소스 계층 (Local ↔ Supabase 교체 가능)
   ------------------------------------------------------------
   공통 인터페이스 (모두 Promise 반환):
     list()          → 레코드 배열
     create(rec)     → 생성된 레코드
     update(rec)     → 수정된 레코드 (rec.id 필요)
     remove(id)      → 삭제
     resetToSeed()   → 기본 데이터로 초기화 (local 전용)
   속성:
     needsPassword   → 쓰기 시 공유 비밀번호 필요 여부
     mode            → 표시용 라벨
   레코드 형태: { id, name, section, cat_major, cat_minor, menu,
                 favorite, map:{url,desc}, voucher:{accepted,systems,note},
                 rating:{stars,avg,note}, review, _t }
   ============================================================ */
(function(){
  "use strict";

  function deepCopy(o){ return JSON.parse(JSON.stringify(o)); }
  // BASE_DATA 는 restaurant-data.js 의 최상위 const (classic script 간 공유). window 프로퍼티가 아님.
  function baseData(){
    if(typeof BASE_DATA !== "undefined" && Array.isArray(BASE_DATA)) return BASE_DATA;
    if(Array.isArray(window.BASE_DATA)) return window.BASE_DATA;
    return [];
  }
  function seedFromBase(){ return baseData().map(deepCopy); }
  function genId(){ return "r-" + Date.now().toString(36) + "-" + Math.floor(Math.random()*1e6).toString(36); }

  /* ---------------- Local (localStorage) ---------------- */
  class LocalDataSource {
    constructor(){ this.key = "restaurant-records-v2"; this.seededKey = "restaurant-records-v2-seeded"; this.mem = null; this.storageOK = true; }
    _load(){
      try{
        const seeded = localStorage.getItem(this.seededKey);
        const r = localStorage.getItem(this.key);
        if(seeded && r != null) return JSON.parse(r);   // 한 번 시드된 뒤에는 빈 목록도 존중
      }catch(e){ this.storageOK = false; }
      if(this.mem) return this.mem;
      const seed = seedFromBase();
      this._save(seed);
      try{ localStorage.setItem(this.seededKey, "1"); }catch(e){}
      return seed;
    }
    _save(arr){
      this.mem = arr;
      try{ localStorage.setItem(this.key, JSON.stringify(arr)); }
      catch(e){ this.storageOK = false; }
    }
    async list(){ return this._load(); }
    async create(rec){
      const arr = this._load();
      const r = { ...rec, id: rec.id || genId(), _t: Date.now() };
      arr.push(r); this._save(arr); return r;
    }
    async update(rec){
      const arr = this._load();
      const i = arr.findIndex(x => x.id === rec.id);
      if(i < 0) throw new Error("대상을 찾을 수 없습니다");
      arr[i] = { ...arr[i], ...rec, _t: Date.now() };
      this._save(arr); return arr[i];
    }
    async remove(id){ this._save(this._load().filter(x => x.id !== id)); }
    async resetToSeed(){ const seed = seedFromBase(); this._save(seed); return seed; }
    get needsPassword(){ return false; }
    get mode(){ return this.storageOK ? "로컬 저장" : "임시(저장 불가)"; }
  }

  /* ---------------- Supabase (자동 REST API) ---------------- */
  class SupabaseDataSource {
    constructor(cfg){
      this.url = String(cfg.url || "").replace(/\/+$/, "");
      this.anon = cfg.anonKey || "";
      this.table = "restaurants";
      this.pw = null;
    }
    setPassword(pw){ this.pw = pw || null; }
    _headers(write){
      const h = { apikey: this.anon, Authorization: "Bearer " + this.anon, "Content-Type": "application/json" };
      if(write && this.pw) h["x-write-password"] = this.pw;
      return h;
    }
    _rowToRec(row){ return { ...(row.data || {}), id: row.id, _t: row.updated_at ? Date.parse(row.updated_at) : 0 }; }
    _recToData(rec){ const { id, _t, ...data } = rec; return data; }
    async _err(res){
      let msg = "";
      try{ const j = await res.json(); msg = j.message || j.hint || j.error || ""; }catch(e){}
      const e = new Error(`요청 실패 (${res.status})${msg ? " · " + msg : ""}`);
      e.status = res.status; return e;
    }
    async list(){
      const res = await fetch(`${this.url}/rest/v1/${this.table}?select=id,data,updated_at`, { headers: this._headers(false) });
      if(!res.ok) throw await this._err(res);
      return (await res.json()).map(r => this._rowToRec(r));
    }
    async create(rec){
      const body = { data: this._recToData(rec) };
      if(rec.id) body.id = rec.id;
      const res = await fetch(`${this.url}/rest/v1/${this.table}`, {
        method: "POST",
        headers: { ...this._headers(true), Prefer: "return=representation" },
        body: JSON.stringify(body)
      });
      if(!res.ok) throw await this._err(res);
      return this._rowToRec((await res.json())[0]);
    }
    async update(rec){
      const body = { data: this._recToData(rec), updated_at: new Date().toISOString() };
      const res = await fetch(`${this.url}/rest/v1/${this.table}?id=eq.${encodeURIComponent(rec.id)}`, {
        method: "PATCH",
        headers: { ...this._headers(true), Prefer: "return=representation" },
        body: JSON.stringify(body)
      });
      if(!res.ok) throw await this._err(res);
      const rows = await res.json();
      if(!rows.length) throw new Error("수정 실패 (권한 또는 대상 없음)");
      return this._rowToRec(rows[0]);
    }
    async remove(id){
      const res = await fetch(`${this.url}/rest/v1/${this.table}?id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { ...this._headers(true), Prefer: "return=representation" }
      });
      if(!res.ok) throw await this._err(res);
    }
    async resetToSeed(){ throw new Error("Supabase 모드에서는 seed.sql 로 초기화하세요"); }
    get needsPassword(){ return true; }
    get mode(){ return "☁ Supabase"; }
  }

  window.makeDataSource = function(){
    const c = window.APP_CONFIG || {};
    if(c.provider === "supabase" && c.supabase && c.supabase.url && c.supabase.anonKey){
      return new SupabaseDataSource(c.supabase);
    }
    return new LocalDataSource();
  };
})();
