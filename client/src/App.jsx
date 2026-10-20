import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, pkr, imgSrc, productImages } from "./lib/api";
import "./App.css";

const STORE = {
  name: "Kainat Cloth House",
  urdu: "کائنات کلاتھ ہاؤس",
  phone: "+92 312 6856946",
  whatsapp: "923126856946",
  address: "Alipur, Lehtrar Rd, Islamabad 45600, Pakistan",
  plusCode: "J5WJ+8H Islamabad",
  opens: "9 AM",
  map: "https://www.google.com/maps/search/?api=1&query=Kainat+Cloth+House+Alipur+Lehtrar+Rd+Islamabad",
};
const IMG = {
  hero: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=85",
  Men: "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=1000&q=85",
  Women: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=85",
};
const TABS = ["All", "Women", "Men"];

const keyOf = (id, color) => `${id}|${color || ""}`;
const taken = (cart, id) => cart.filter((i) => i.product._id === id).reduce((s, i) => s + i.quantity, 0);

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem("kch-cart")) || [];
    return saved.map((i) => ({ ...i, color: i.color || "", key: i.key || keyOf(i.product._id, i.color) }));
  } catch {
    return [];
  }
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(loadCart);
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState({}); // chosen photo index for each product
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/products")
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setProducts(list);
        // Keep the saved cart in step with live stock and prices
        setCart((current) => {
          const left = {};
          return current
            .map((i) => {
              const fresh = list.find((p) => p._id === i.product._id);
              if (!fresh || fresh.quantity < 1) return null;
              const avail = left[fresh._id] ?? fresh.quantity;
              const quantity = Math.min(i.quantity, avail);
              if (quantity < 1) return null;
              left[fresh._id] = avail - quantity;
              return { ...i, product: fresh, quantity };
            })
            .filter(Boolean);
        });
      })
      .catch(() => setError("Products could not load. Please try again in a moment."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    try { localStorage.setItem("kch-cart", JSON.stringify(cart)); } catch { /* storage unavailable */ }
  }, [cart]);

  const counts = useMemo(
    () => ({ All: products.length, Women: products.filter((p) => p.category === "Women").length, Men: products.filter((p) => p.category === "Men").length }),
    [products]
  );
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        (tab === "All" || p.category === tab) &&
        (!q || `${p.name} ${p.color} ${p.description}`.toLowerCase().includes(q))
    );
  }, [products, tab, query]);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const total = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);

  function add(product, color = "") {
    setCart((cur) => {
      if (taken(cur, product._id) >= product.quantity) return cur;
      const key = keyOf(product._id, color);
      return cur.some((i) => i.key === key)
        ? cur.map((i) => (i.key === key ? { ...i, quantity: i.quantity + 1 } : i))
        : [...cur, { key, product, color, quantity: 1 }];
    });
  }
  const change = (key, d) =>
    setCart((cur) =>
      cur.map((i) => {
        if (i.key !== key) return i;
        const others = taken(cur, i.product._id) - i.quantity;
        return { ...i, quantity: Math.max(1, Math.min(i.product.quantity - others, i.quantity + d)) };
      })
    );
  const remove = (key) => setCart((cur) => cur.filter((i) => i.key !== key));

  function pickCollection(name) {
    setTab(name);
    document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" });
  }

  function order() {
    const lines = cart.map((i) => `• ${i.product.name} (${i.product.category}${i.color ? `, ${i.color}` : ""}) × ${i.quantity} = ${pkr(i.product.price * i.quantity)}`);
    const text = [`Assalam o Alaikum! I would like to order from ${STORE.name}:`, "", ...lines, "", `Subtotal: ${pkr(total)}`, "Please confirm availability and delivery charges."].join("\n");
    window.open(`https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  return (
    <div className="store">
      <div className="announcement text-center py-2 small">Home delivery available. Visit us in Alipur, Islamabad.</div>

      <nav className="navbar navbar-expand-lg sticky-top bg-white border-bottom">
        <div className="container-xl">
          <a className="navbar-brand brand" href="#home">
            <span className="brand-urdu" lang="ur" dir="rtl">{STORE.urdu}</span>
            <span className="brand-en">{STORE.name}</span>
          </a>
          <a className="btn btn-dark btn-sm rounded-pill ms-auto me-2 d-lg-none" href="#cart">
            Cart <span className="badge text-bg-warning">{cartCount}</span>
          </a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="Toggle menu">
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="mainNav">
            <ul className="navbar-nav mx-auto">
              <li className="nav-item"><a className="nav-link" href="#home">Home</a></li>
              <li className="nav-item"><button className="nav-link btn btn-link" onClick={() => pickCollection("Women")}>Women</button></li>
              <li className="nav-item"><button className="nav-link btn btn-link" onClick={() => pickCollection("Men")}>Men</button></li>
              <li className="nav-item"><a className="nav-link" href="#reviews">Reviews</a></li>
              <li className="nav-item"><a className="nav-link" href="#visit">Visit us</a></li>
            </ul>
            <div className="d-flex gap-2 align-items-center">
              <Link className="btn btn-outline-secondary btn-sm rounded-pill" to="/admin/login">Admin login</Link>
              <a className="btn btn-dark btn-sm rounded-pill d-none d-lg-inline-block" href="#cart">
                Cart <span className="badge text-bg-warning">{cartCount}</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <section className="hero" id="home">
          <div className="container-xl">
            <div className="row align-items-center g-5 py-5">
              <div className="col-lg-6 order-2 order-lg-1">
                <p className="hero-urdu mb-1" lang="ur" dir="rtl">{STORE.urdu}</p>
                <h1 className="display-4 hero-title">Clothing for her. Clothing for him.</h1>
                <p className="lead text-secondary my-4">
                  Suits, dresses, kurtas and shirts for everyday wear and special days, from our shop on Lehtrar Road, Islamabad.
                </p>
                <div className="d-flex flex-wrap gap-2">
                  <button className="btn btn-danger btn-lg rounded-pill px-4" onClick={() => pickCollection("Women")}>Shop women</button>
                  <button className="btn btn-dark btn-lg rounded-pill px-4" onClick={() => pickCollection("Men")}>Shop men</button>
                </div>
                <p className="mt-4 mb-0 text-secondary"><span className="stars">★★★★★</span> <strong>5.0</strong> on Google Maps</p>
              </div>
              <div className="col-lg-6 order-1 order-lg-2">
                <div className="hero-image">
                  <img src={IMG.hero} alt="Clothing collection" className="w-100 h-100" />
                  <div className="hero-card">
                    <strong>Open daily from {STORE.opens}</strong>
                    <span>{STORE.address}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-5">
          <div className="container-xl">
            <div className="row g-4">
              {["Women", "Men"].map((c) => (
                <div className="col-md-6" key={c}>
                  <button className="collection-card" onClick={() => pickCollection(c)}>
                    <img src={IMG[c]} alt={`${c}'s collection`} loading="lazy" />
                    <span className="collection-label">
                      <small>{c === "Women" ? "Elegant and comfortable" : "Sharp and easy to wear"}</small>
                      <strong>{c}'s collection</strong>
                      <span>{counts[c]} items</span>
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-5" id="collection">
          <div className="container-xl">
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-end gap-3 mb-4">
              <div>
                <h2 className="section-title">{tab === "All" ? "Our collection" : `${tab}'s collection`}</h2>
                <p className="text-secondary mb-0">Prices in Pakistani rupees. Stock shows what we have right now.</p>
              </div>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                {TABS.map((c) => (
                  <button key={c} type="button" className={`btn btn-sm rounded-pill ${tab === c ? "btn-danger" : "btn-outline-secondary"}`} onClick={() => setTab(c)}>
                    {c} <span className="opacity-75">({counts[c]})</span>
                  </button>
                ))}
                <input className="form-control form-control-sm rounded-pill search" type="search" placeholder="Search clothes" aria-label="Search clothes" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
            </div>

            {loading && <p className="text-secondary">Loading collection…</p>}
            {error && <div className="alert alert-danger">{error}</div>}
            {!loading && !error && shown.length === 0 && <p className="text-secondary">Nothing matches yet. Try another collection or message us on WhatsApp.</p>}

            <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4 g-4">
              {shown.map((p) => {
                const imgs = productImages(p);
                const sel = Math.min(picked[p._id] || 0, Math.max(imgs.length - 1, 0));
                const current = imgs[sel];
                const color = (current && current.color) || p.color || "";
                const inCart = taken(cart, p._id);
                return (
                  <div className="col" key={p._id}>
                    <article className="card product-card h-100">
                      <div className="product-image">
                        {current ? (
                          <img src={imgSrc(current.url)} alt={`${p.name}${color ? `, ${color}` : ""}`} loading="lazy" />
                        ) : (
                          <div className="image-placeholder" lang="ur" dir="rtl"><span>کائنات</span></div>
                        )}
                        <span className="badge rounded-pill text-bg-light position-absolute top-0 start-0 m-3">{p.category}</span>
                        {p.quantity < 1 ? (
                          <span className="badge rounded-pill text-bg-danger position-absolute top-0 end-0 m-3">Sold out</span>
                        ) : p.quantity <= 3 ? (
                          <span className="badge rounded-pill text-bg-warning position-absolute top-0 end-0 m-3">Only {p.quantity} left</span>
                        ) : null}
                        {imgs.length > 1 && (
                          <div className="thumbs">
                            {imgs.map((im, i) => (
                              <button key={i} type="button" className={i === sel ? "on" : ""} title={im.color || `Photo ${i + 1}`} aria-label={im.color ? `Show ${im.color}` : `Show photo ${i + 1}`} onClick={() => setPicked((s) => ({ ...s, [p._id]: i }))}>
                                <img src={imgSrc(im.url)} alt="" loading="lazy" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="card-body d-flex flex-column">
                        <h3 className="h5 product-name">{p.name}</h3>
                        <p className="text-secondary small flex-grow-1 mb-2">{p.description}</p>
                        {color && <p className="small text-secondary mb-3">Color: <strong>{color}</strong></p>}
                        <div className="d-flex justify-content-between align-items-center border-top pt-3">
                          <strong className="fs-5">{pkr(p.price)}</strong>
                          <button type="button" className="btn btn-dark btn-sm rounded-pill px-3" disabled={p.quantity < 1 || inCart >= p.quantity} onClick={() => add(p, color)}>Add to cart</button>
                        </div>
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-5 cart-section" id="cart">
          <div className="container-xl">
            <h2 className="section-title mb-4">Your shopping bag</h2>
            {cart.length === 0 ? (
              <p className="text-secondary">Your cart is empty. Add something from the collection.</p>
            ) : (
              <div className="row g-4">
                <div className="col-lg-8">
                  {cart.map((item) => (
                    <div className="row align-items-center gy-2 py-3 border-bottom" key={item.key}>
                      <div className="col-12 col-md">
                        <h3 className="h6 mb-1">{item.product.name}</h3>
                        <small className="text-secondary">{item.product.category}{item.color ? `, ${item.color}` : ""}, {pkr(item.product.price)} each</small>
                      </div>
                      <div className="col-auto">
                        <div className="btn-group btn-group-sm">
                          <button type="button" className="btn btn-outline-secondary" aria-label="Decrease quantity" onClick={() => change(item.key, -1)}>−</button>
                          <span className="btn btn-light disabled">{item.quantity}</span>
                          <button type="button" className="btn btn-outline-secondary" aria-label="Increase quantity" disabled={taken(cart, item.product._id) >= item.product.quantity} onClick={() => change(item.key, 1)}>+</button>
                        </div>
                      </div>
                      <div className="col-auto fw-semibold">{pkr(item.product.price * item.quantity)}</div>
                      <div className="col-auto"><button type="button" className="btn btn-link text-danger btn-sm" onClick={() => remove(item.key)}>Remove</button></div>
                    </div>
                  ))}
                </div>
                <div className="col-lg-4">
                  <div className="card p-4">
                    <div className="d-flex justify-content-between fs-5 mb-2"><span>Subtotal</span><strong>{pkr(total)}</strong></div>
                    <p className="small text-secondary">We confirm delivery charges with you on WhatsApp.</p>
                    <button type="button" className="btn btn-success btn-lg rounded-pill" onClick={order}>Send order on WhatsApp</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="py-5" id="reviews">
          <div className="container-xl">
            <div className="row g-5 align-items-start">
              <div className="col-md-4 col-lg-3">
                <div className="score">5.0</div>
                <div className="stars fs-4">★★★★★</div>
                <p className="text-secondary">2 reviews on Google Maps</p>
              </div>
              <div className="col-md-8 col-lg-9">
                <h2 className="section-title mb-4">What customers say</h2>
                <blockquote className="review">
                  <p>It was very good experience. Thanks for your best service.</p>
                  <footer className="text-secondary small">Muhammad Khubaib, 3 years ago</footer>
                </blockquote>
                <a className="fw-semibold link-danger" href={STORE.map} target="_blank" rel="noreferrer">Read all reviews on Google Maps</a>
              </div>
            </div>
          </div>
        </section>

        <section className="visit" id="visit">
          <div className="container-xl">
            <div className="row g-0">
              <div className="col-lg-6 py-5 pe-lg-5">
                <h2 className="section-title text-white mb-4">Visit the shop</h2>
                <dl className="mb-4">
                  <dt>Address</dt><dd>{STORE.address}</dd>
                  <dt>Plus code</dt><dd>{STORE.plusCode}</dd>
                  <dt>Hours</dt><dd>Opens at {STORE.opens}</dd>
                  <dt>Phone and WhatsApp</dt><dd><a href={`tel:${STORE.phone.replace(/\s/g, "")}`}>{STORE.phone}</a></dd>
                  <dt>Delivery</dt><dd>Available. Charges confirmed on WhatsApp.</dd>
                </dl>
                <div className="d-flex flex-wrap gap-2">
                  <a className="btn btn-warning rounded-pill px-4" href={STORE.map} target="_blank" rel="noreferrer">Get directions</a>
                  <a className="btn btn-outline-light rounded-pill px-4" href={`https://wa.me/${STORE.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp us</a>
                </div>
              </div>
              <div className="col-lg-6 visit-panel d-flex align-items-center justify-content-center" lang="ur" dir="rtl"><span>{STORE.urdu}</span></div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer py-4">
        <div className="container-xl d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
          <a className="brand footer-brand text-decoration-none" href="#home">
            <span className="brand-urdu" lang="ur" dir="rtl">{STORE.urdu}</span>
            <span className="brand-en">{STORE.name}</span>
          </a>
          <small>© {new Date().getFullYear()} {STORE.name}</small>
          <Link className="small text-decoration-none" to="/admin/login">Admin login</Link>
        </div>
      </footer>
    </div>
  );
}
