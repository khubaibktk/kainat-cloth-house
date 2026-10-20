import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  Legend, PieChart, Pie, Cell, BarChart,
} from "recharts";
import { api, pkr, todayKey, imgSrc, productImages } from "../lib/api";
import { compressImage } from "../lib/image";
import "./Admin.css";

const TABS = [["overview", "Overview"], ["sales", "Daily sales"], ["inventory", "Inventory"]];
const COLORS = { revenue: "#a8254f", profit: "#2f8f5b", Women: "#a8254f", Men: "#2a1330" };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [products, setProducts] = useState([]);
  const [notice, setNotice] = useState(null);
  const [version, setVersion] = useState(0); // bump to refresh analytics after changes

  const call = useCallback(
    async (path, options = {}) => {
      try {
        return await api(path, { auth: true, ...options });
      } catch (err) {
        if (err.status === 401 || err.status === 403) {
          sessionStorage.removeItem("adminToken");
          navigate("/admin/login", { replace: true });
        }
        throw err;
      }
    },
    [navigate]
  );

  const notify = useCallback((text, type = "success") => setNotice({ text, type }), []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(t);
  }, [notice]);

  const loadProducts = useCallback(async () => {
    try {
      const data = await api("/products");
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      notify(err.message, "danger");
    }
  }, [notify]);
  useEffect(() => {
    api("/products").then((data) => setProducts(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const changed = useCallback(async () => { await loadProducts(); setVersion((v) => v + 1); }, [loadProducts]);

  function logout() {
    sessionStorage.removeItem("adminToken");
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="ad-shell">
      <header className="ad-top">
        <div className="container-xl d-flex flex-wrap align-items-center justify-content-between gap-3 py-3">
          <Link className="ad-brand" to="/">
            <span lang="ur" dir="rtl">کائنات کلاتھ ہاؤس</span>
            <small>Admin dashboard</small>
          </Link>
          <ul className="nav nav-pills ad-tabs">
            {TABS.map(([id, label]) => (
              <li className="nav-item" key={id}>
                <button className={`nav-link ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
              </li>
            ))}
          </ul>
          <div className="d-flex gap-2">
            <Link className="btn btn-outline-light btn-sm rounded-pill" to="/">View store</Link>
            <button className="btn btn-light btn-sm rounded-pill" onClick={logout}>Log out</button>
          </div>
        </div>
      </header>

      <main className="container-xl py-4">
        {notice && (
          <div className={`alert alert-${notice.type} ad-toast`} role="status">{notice.text}</div>
        )}
        {tab === "overview" && <Overview call={call} version={version} />}
        {tab === "sales" && <Sales call={call} products={products} notify={notify} changed={changed} />}
        {tab === "inventory" && <Inventory call={call} products={products} notify={notify} changed={changed} />}
      </main>
    </div>
  );
}

function Stat({ label, value, hint, tone }) {
  return (
    <div className="col-6 col-lg-3">
      <div className={`ad-stat ${tone || ""}`}>
        <span>{label}</span>
        <strong>{value}</strong>
        {hint && <small>{hint}</small>}
      </div>
    </div>
  );
}

const short = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : n);
const md = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/* ---------------- Overview: stats and graphs ---------------- */
function Overview({ call, version }) {
  const [days, setDays] = useState(14);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    call(`/analytics?days=${days}`)
      .then((d) => { if (live) { setData(d); setError(""); } })
      .catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [call, days, version]);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <p className="text-secondary">Loading dashboard…</p>;

  const { totals, today, inventory } = data;
  const margin = totals.revenue ? Math.round((totals.profit / totals.revenue) * 100) : 0;
  const series = data.series.map((s) => ({ ...s, label: md(s.date) }));
  const pie = data.byCategory.filter((c) => c.revenue > 0);

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 className="h3 m-0">Business overview</h1>
        <select className="form-select form-select-sm w-auto" value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Date range">
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="row g-3 mb-4">
        <Stat label="Today's sales" value={pkr(today.revenue)} hint={`${today.orders} sale${today.orders === 1 ? "" : "s"}, ${today.units} items`} />
        <Stat label="Today's profit" value={pkr(today.profit)} tone="good" />
        <Stat label={`Revenue (${days} days)`} value={pkr(totals.revenue)} hint={`${totals.units} items sold`} />
        <Stat label={`Profit (${days} days)`} value={pkr(totals.profit)} tone="good" hint={`${margin}% margin`} />
        <Stat label="Units in stock" value={inventory.units.toLocaleString("en-PK")} hint={`${inventory.products} products`} />
        <Stat label="Stock value at cost" value={pkr(inventory.costValue)} />
        <Stat label="Stock value at price" value={pkr(inventory.retailValue)} hint={`Potential profit ${pkr(inventory.retailValue - inventory.costValue)}`} />
        <Stat label="Out of stock" value={inventory.outOfStock} tone={inventory.outOfStock ? "warn" : ""} hint={`${inventory.lowStock.length} running low`} />
      </div>

      <div className="row g-3">
        <div className="col-lg-8">
          <div className="ad-card">
            <h2 className="h6">Daily revenue and profit</h2>
            <div className="ad-chart">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                  <YAxis tickFormatter={short} tick={{ fontSize: 12 }} width={44} />
                  <Tooltip formatter={(v) => pkr(v)} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill={COLORS.revenue} radius={[4, 4, 0, 0]} />
                  <Line dataKey="profit" name="Profit" stroke={COLORS.profit} strokeWidth={3} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="ad-card">
            <h2 className="h6">Sales by collection</h2>
            {pie.length === 0 ? (
              <p className="text-secondary small m-0">No sales in this period yet.</p>
            ) : (
              <div className="ad-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pie} dataKey="revenue" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                      {pie.map((c) => <Cell key={c.name} fill={COLORS[c.name]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => pkr(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="col-lg-7">
          <div className="ad-card">
            <h2 className="h6">Best sellers by revenue</h2>
            {data.topProducts.length === 0 ? (
              <p className="text-secondary small m-0">Record a sale to see your best sellers.</p>
            ) : (
              <div className="ad-chart ad-chart-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topProducts} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickFormatter={short} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => pkr(v)} />
                    <Bar dataKey="revenue" name="Revenue" fill={COLORS.Men} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="col-lg-5">
          <div className="ad-card">
            <h2 className="h6">Needs restocking</h2>
            {inventory.lowStock.length === 0 && inventory.outOfStock === 0 ? (
              <p className="text-secondary small m-0">All products have healthy stock.</p>
            ) : (
              <ul className="list-group list-group-flush">
                {inventory.lowStock.map((p) => (
                  <li key={p._id} className="list-group-item d-flex justify-content-between px-0">
                    <span>{p.name}</span><span className="badge text-bg-warning">{p.quantity} left</span>
                  </li>
                ))}
                {inventory.outOfStock > 0 && (
                  <li className="list-group-item px-0 text-danger small">{inventory.outOfStock} product(s) are out of stock.</li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- Daily sales: add and delete ---------------- */
function Sales({ call, products, notify, changed }) {
  const blank = { productId: "", quantity: 1, unitPrice: "", soldAt: todayKey(), note: "" };
  const [form, setForm] = useState(blank);
  const [days, setDays] = useState(1);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);
  const load = () => setReloadKey((k) => k + 1);
  useEffect(() => {
    let live = true;
    call(`/sales?days=${days}`)
      .then((data) => live && setSales(data))
      .catch((e) => live && notify(e.message, "danger"))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [call, days, notify, reloadKey]);

  const selected = products.find((p) => p._id === form.productId);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function choose(e) {
    const p = products.find((x) => x._id === e.target.value);
    setForm((f) => ({ ...f, productId: e.target.value, unitPrice: p ? String(p.price) : "" }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await call("/sales", { method: "POST", body: { ...form, quantity: Number(form.quantity) } });
      notify(`Sale recorded. ${res.remaining} left in stock.`);
      setForm({ ...blank, soldAt: form.soldAt });
      await changed();
      await load();
    } catch (err) {
      notify(err.message, "danger");
    } finally {
      setSaving(false);
    }
  }

  async function remove(s) {
    if (!window.confirm(`Delete this sale of ${s.quantity} × ${s.productName}? The items go back into stock.`)) return;
    try {
      const res = await call(`/sales/${s._id}`, { method: "DELETE" });
      notify(res.message);
      await changed();
      await load();
    } catch (err) {
      notify(err.message, "danger");
    }
  }

  const sum = useMemo(
    () => sales.reduce((a, s) => ({ revenue: a.revenue + s.total, profit: a.profit + s.profit, units: a.units + s.quantity }), { revenue: 0, profit: 0, units: 0 }),
    [sales]
  );
  const available = products.filter((p) => p.quantity > 0);
  const noCost = selected && !selected.costPrice;

  return (
    <>
      <h1 className="h3 mb-3">Daily sales</h1>
      <div className="ad-card mb-4">
        <h2 className="h6 mb-3">Record a sale</h2>
        <form className="row g-3" onSubmit={submit}>
          <div className="col-md-6 col-lg-4">
            <label className="form-label">Product</label>
            <select className="form-select" value={form.productId} onChange={choose} required>
              <option value="">Choose a product…</option>
              {available.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.category}, {p.quantity} in stock)</option>)}
            </select>
          </div>
          <div className="col-6 col-md-3 col-lg-2">
            <label className="form-label">Quantity</label>
            <input className="form-control" type="number" min="1" max={selected?.quantity || undefined} step="1" value={form.quantity} onChange={set("quantity")} required />
          </div>
          <div className="col-6 col-md-3 col-lg-2">
            <label className="form-label">Price each (PKR)</label>
            <input className="form-control" type="number" min="0" step="1" value={form.unitPrice} onChange={set("unitPrice")} required />
          </div>
          <div className="col-6 col-md-4 col-lg-2">
            <label className="form-label">Date</label>
            <input className="form-control" type="date" max={todayKey()} value={form.soldAt} onChange={set("soldAt")} required />
          </div>
          <div className="col-6 col-md-8 col-lg-2 d-flex align-items-end">
            <button className="btn btn-dark w-100" disabled={saving || !form.productId}>{saving ? "Saving…" : "Add sale"}</button>
          </div>
          <div className="col-12">
            <input className="form-control" placeholder="Note (optional), for example customer name" maxLength={300} value={form.note} onChange={set("note")} />
            {selected && (
              <p className="small mt-2 mb-0 text-secondary">
                {noCost
                  ? "This product has no cost price, so its profit is counted as the full sale amount. Add a cost price in Inventory."
                  : `Profit on this sale: ${pkr((Number(form.unitPrice || 0) - selected.costPrice) * Number(form.quantity || 0))}`}
              </p>
            )}
          </div>
        </form>
      </div>

      <div className="ad-card">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h2 className="h6 m-0">Sales history</h2>
          <select className="form-select form-select-sm w-auto" value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Sales period">
            <option value={1}>Today</option><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
          </select>
        </div>
        <div className="d-flex flex-wrap gap-4 mb-3 small">
          <span>Items sold: <strong>{sum.units}</strong></span>
          <span>Revenue: <strong>{pkr(sum.revenue)}</strong></span>
          <span className="text-success">Profit: <strong>{pkr(sum.profit)}</strong></span>
        </div>
        {loading ? <p className="text-secondary">Loading sales…</p> : sales.length === 0 ? (
          <p className="text-secondary m-0">No sales recorded for this period.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle ad-table">
              <thead><tr><th>Date</th><th>Product</th><th className="text-end">Qty</th><th className="text-end">Price</th><th className="text-end">Total</th><th className="text-end">Profit</th><th /></tr></thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s._id}>
                    <td className="text-nowrap">{md(new Date(s.soldAt).toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" }))}</td>
                    <td><strong>{s.productName}</strong> <span className={`badge ${s.category === "Women" ? "text-bg-danger" : "text-bg-dark"}`}>{s.category}</span>{s.note && <div className="small text-secondary">{s.note}</div>}</td>
                    <td className="text-end">{s.quantity}</td>
                    <td className="text-end">{pkr(s.unitPrice)}</td>
                    <td className="text-end">{pkr(s.total)}</td>
                    <td className={`text-end ${s.profit < 0 ? "text-danger" : "text-success"}`}>{pkr(s.profit)}</td>
                    <td className="text-end"><button className="btn btn-sm btn-outline-danger" onClick={() => remove(s)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------------- Inventory: add, edit, restock, delete (phone friendly) ---------------- */
const emptyProduct = { name: "", price: "", costPrice: "", category: "Women", description: "", color: "", quantity: "", images: [] };
const MAX_PHOTOS = 8;

function Inventory({ call, products, notify, changed }) {
  const [form, setForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setColor = (i, v) => setForm((f) => ({ ...f, images: f.images.map((im, j) => (j === i ? { ...im, color: v } : im)) }));
  const removePhoto = (i) => setForm((f) => ({ ...f, images: f.images.filter((_, j) => j !== i) }));
  const makeMain = (i) => setForm((f) => ({ ...f, images: [f.images[i], ...f.images.filter((_, j) => j !== i)] }));

  // Works with the phone camera or gallery. Each photo is resized, then uploaded.
  async function pickFiles(e) {
    const files = [...e.target.files];
    e.target.value = "";
    if (!files.length) return;
    const room = MAX_PHOTOS - form.images.length;
    if (files.length > room) notify(`Only ${room} more photo(s) fit. Extra photos were skipped.`, "warning");
    const batch = files.slice(0, room);
    try {
      for (let i = 0; i < batch.length; i++) {
        setUploading(`Uploading photo ${i + 1} of ${batch.length}…`);
        const blob = await compressImage(batch[i]);
        const { url } = await call("/uploads", { method: "POST", raw: blob });
        setForm((f) => ({ ...f, images: [...f.images, { url, color: "" }] }));
      }
    } catch (err) {
      notify(err.message, "danger");
    } finally {
      setUploading("");
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (uploading) return notify("Please wait for the photos to finish uploading.", "warning");
    const price = Number(form.price), costPrice = Number(form.costPrice || 0), quantity = Number(form.quantity);
    if (!(price >= 0) || !(costPrice >= 0)) return notify("Prices must be zero or more.", "danger");
    if (!Number.isInteger(quantity) || quantity < 0) return notify("Stock must be a whole number of zero or more.", "danger");

    setSaving(true);
    try {
      const res = await call(editingId ? `/products/${editingId}` : "/products", {
        method: editingId ? "PUT" : "POST",
        body: { ...form, price, costPrice, quantity, imageUrl: "" },
      });
      notify(res.message);
      setForm(emptyProduct);
      setEditingId(null);
      await changed();
    } catch (err) {
      notify(err.message, "danger");
    } finally {
      setSaving(false);
    }
  }

  function edit(p) {
    setEditingId(p._id);
    setForm({
      name: p.name, price: String(p.price), costPrice: String(p.costPrice ?? 0), category: p.category,
      description: p.description || "", color: p.color || "", quantity: String(p.quantity),
      images: productImages(p).map((im) => ({ url: im.url, color: im.color || "" })),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function restock(p) {
    const input = window.prompt(`How many units of "${p.name}" are you adding to stock?`, "10");
    if (input === null) return;
    const n = Number(input);
    if (!Number.isInteger(n) || n < 1) return notify("Enter a whole number of 1 or more.", "danger");
    try {
      await call(`/products/${p._id}`, { method: "PUT", body: { quantity: p.quantity + n } });
      notify(`Added ${n} units. ${p.name} now has ${p.quantity + n} in stock.`);
      await changed();
    } catch (err) {
      notify(err.message, "danger");
    }
  }

  async function remove(p) {
    if (!window.confirm(`Delete "${p.name}" permanently? Past sales are kept in your reports.`)) return;
    try {
      const res = await call(`/products/${p._id}`, { method: "DELETE" });
      notify(res.message);
      if (editingId === p._id) { setEditingId(null); setForm(emptyProduct); }
      await changed();
    } catch (err) {
      notify(err.message, "danger");
    }
  }

  const list = products.filter(
    (p) => (filter === "All" || p.category === filter) && (!query || p.name.toLowerCase().includes(query.toLowerCase()))
  );
  const margin = form.price ? Math.round(((Number(form.price) - Number(form.costPrice || 0)) / Number(form.price)) * 100) : null;

  return (
    <>
      <h1 className="h3 mb-3">Inventory</h1>
      <div className="ad-card mb-4">
        <h2 className="h6 mb-3">{editingId ? "Edit product" : "Add a product"}</h2>
        <form className="row g-3" onSubmit={submit}>
          <div className="col-12">
            <label className="form-label">Photos <span className="text-secondary fw-normal">(add one photo for each color)</span></label>
            <div className="ad-photos">
              {form.images.map((im, i) => (
                <div className="ad-photo" key={im.url}>
                  <div className="ad-photo-img">
                    <img src={imgSrc(im.url)} alt={im.color || `Photo ${i + 1}`} />
                    {i === 0 && <span className="badge text-bg-dark ad-main">Main</span>}
                  </div>
                  <input className="form-control form-control-sm" placeholder="Color, e.g. Red" maxLength={50} value={im.color} onChange={(e) => setColor(i, e.target.value)} aria-label={`Color of photo ${i + 1}`} />
                  <div className="d-flex gap-1">
                    {i > 0 && <button type="button" className="btn btn-sm btn-outline-secondary flex-fill" onClick={() => makeMain(i)}>Main</button>}
                    <button type="button" className="btn btn-sm btn-outline-danger flex-fill" onClick={() => removePhoto(i)}>Remove</button>
                  </div>
                </div>
              ))}
              {form.images.length < MAX_PHOTOS && (
                <label className={`ad-add-photo ${uploading ? "busy" : ""}`}>
                  <input type="file" accept="image/*" multiple className="visually-hidden" onChange={pickFiles} disabled={!!uploading} />
                  <span aria-hidden="true">+</span>
                  <small>{uploading || "Add photos"}</small>
                </label>
              )}
            </div>
            <div className="form-text">On a phone you can take a new photo or pick from the gallery. You can choose several at once. Photos are resized automatically.</div>
          </div>

          <div className="col-md-6"><label className="form-label">Name *</label><input className="form-control" value={form.name} onChange={set("name")} maxLength={150} required /></div>
          <div className="col-6 col-md-3"><label className="form-label">Collection *</label>
            <select className="form-select" value={form.category} onChange={set("category")}><option>Women</option><option>Men</option></select></div>
          <div className="col-6 col-md-3"><label className="form-label">Colors available</label><input className="form-control" placeholder="Red, Blue" value={form.color} onChange={set("color")} maxLength={100} /></div>
          <div className="col-6 col-md-3"><label className="form-label">Cost price (PKR) *</label><input className="form-control" type="number" inputMode="numeric" min="0" step="1" value={form.costPrice} onChange={set("costPrice")} required /></div>
          <div className="col-6 col-md-3"><label className="form-label">Selling price (PKR) *</label><input className="form-control" type="number" inputMode="numeric" min="0" step="1" value={form.price} onChange={set("price")} required /></div>
          <div className="col-6 col-md-3"><label className="form-label">Stock quantity *</label><input className="form-control" type="number" inputMode="numeric" min="0" step="1" value={form.quantity} onChange={set("quantity")} required /></div>
          <div className="col-6 col-md-3 d-flex align-items-end"><span className="small text-secondary pb-2">{margin !== null && `Margin: ${margin}%`}</span></div>
          <div className="col-12"><label className="form-label">Description</label><textarea className="form-control" rows="2" maxLength={2000} value={form.description} onChange={set("description")} /></div>
          <div className="col-12 d-flex gap-2">
            <button className="btn btn-dark px-4" disabled={saving || !!uploading}>{saving ? "Saving…" : editingId ? "Save changes" : "Add product"}</button>
            {editingId && <button type="button" className="btn btn-outline-secondary" onClick={() => { setEditingId(null); setForm(emptyProduct); }}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="ad-card">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h2 className="h6 m-0">Products ({list.length})</h2>
          <div className="d-flex gap-2">
            <select className="form-select form-select-sm w-auto" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter collection"><option>All</option><option>Women</option><option>Men</option></select>
            <input className="form-control form-control-sm" type="search" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        {list.length === 0 ? <p className="text-secondary m-0">No products found.</p> : (
          <div className="list-group list-group-flush">
            {list.map((p) => {
              const imgs = productImages(p);
              return (
                <div className="list-group-item px-0" key={p._id}>
                  <div className="d-flex gap-3">
                    {imgs[0] ? <img className="ad-thumb" src={imgSrc(imgs[0].url)} alt="" /> : <div className="ad-thumb ad-thumb-empty">KCH</div>}
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <strong className="d-block text-truncate">{p.name}</strong>
                      <div className="small text-secondary">{p.category}{imgs.length > 1 ? `, ${imgs.length} photos` : ""}</div>
                      <div className="small">Cost {pkr(p.costPrice)}, price {pkr(p.price)}</div>
                    </div>
                    <span className={`badge align-self-start ${p.quantity === 0 ? "text-bg-danger" : p.quantity <= 5 ? "text-bg-warning" : "text-bg-success"}`}>{p.quantity === 0 ? "Out of stock" : `${p.quantity} in stock`}</span>
                  </div>
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    <button className="btn btn-sm btn-outline-success" onClick={() => restock(p)}>Restock</button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => edit(p)}>Edit</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => remove(p)}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
