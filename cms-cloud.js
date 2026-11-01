/* OH SNAP! - klien cloud bersama (Supabase). Dipakai admin.html & semua halaman frontend. */
(function () {
  const SUPABASE_URL = 'https://kbkayevpbeijuuufnrgt.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_AG1wxrYq1moobWYJjC6htQ_TB-Siffl';
  const TABLE = 'cms_settings';
  const BUCKET = 'ohsnap-media';
  const BASE_HEADERS = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };

  let cache = null, cacheAt = 0;

  // Ambil data CMS dari cloud (di-cache 20 detik supaya tidak spam request)
  async function load(force) {
    if (!force && cache && Date.now() - cacheAt < 20000) return cache;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.1&select=data`, {
      headers: BASE_HEADERS, cache: 'no-store'
    });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 120));
    const rows = await res.json();
    cache = (Array.isArray(rows) && rows[0] && rows[0].data) ? rows[0].data : null;
    cacheAt = Date.now();
    return cache;
  }

  // Dipakai halaman frontend: pakai data cloud bila lebih baru dari data lokal browser
  async function pullIfNewer() {
    try {
      const remote = await load();
      if (!remote) return null;
      let local = null;
      try { local = JSON.parse(localStorage.getItem('ohsnap_cms_data')); } catch (e) {}
      if (!local || Number(remote.lastUpdated || 0) > Number(local.lastUpdated || 0)) {
        try { localStorage.setItem('ohsnap_cms_data', JSON.stringify(remote)); } catch (e) {}
        return remote;
      }
    } catch (e) {
      console.warn('[OhSnapCloud] gagal ambil data cloud:', e.message || e);
    }
    return null;
  }

  // Simpan data CMS ke cloud (insert/update baris id=1)
  async function save(data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?on_conflict=id`, {
      method: 'POST',
      headers: Object.assign({}, BASE_HEADERS, {
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      }),
      body: JSON.stringify({ id: 1, data: data, updated_at: new Date().toISOString() })
    });
    if (!res.ok) {
      const err = new Error('HTTP ' + res.status + ': ' + (await res.text()).slice(0, 160));
      err.status = res.status;
      throw err;
    }
    cache = data; cacheAt = Date.now();
  }

  // Upload gambar/video ke Supabase Storage, hasilnya URL publik
  async function upload(fileOrBlob, folder, ext) {
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: Object.assign({}, BASE_HEADERS, {
        'Content-Type': fileOrBlob.type || 'application/octet-stream',
        'x-upsert': 'true'
      }),
      body: fileOrBlob
    });
    if (!res.ok) throw new Error('Upload HTTP ' + res.status + ': ' + (await res.text()).slice(0, 160));
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  }

  // Tes koneksi sederhana (untuk diagnosa)
  async function ping() {
    const t0 = performance.now();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?select=id&limit=1`, { headers: BASE_HEADERS, cache: 'no-store' });
    return { status: res.status, ms: Math.round(performance.now() - t0) };
  }

  window.OhSnapCloud = { load, pullIfNewer, save, upload, ping, URL: SUPABASE_URL };
})();
