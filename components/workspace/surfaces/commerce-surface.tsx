"use client";
import { useState } from "react";
import { ChevronDown, Heart, Minus, Plus, ShoppingBag } from "lucide-react";
import { Ed, type SurfaceProps } from "./editable";

const sizes = ["S", "M", "L", "XL"];
const colors = ["Clay", "Moss", "Stone"];
const details = [
  { title: "Description", body: "Placeholder product description. Describe materials, fit and care in a few honest sentences." },
  { title: "Shipping and returns", body: "Placeholder shipping copy. Replace with your own policy." },
  { title: "Care", body: "Placeholder care instructions." },
];
const related = ["Object one", "Object two", "Object three", "Object four"];

export function CommerceSurface({ variant }: SurfaceProps) {
  const [size, setSize] = useState("M");
  const [color, setColor] = useState("Clay");
  const [qty, setQty] = useState(1);
  const [liked, setLiked] = useState(false);
  const [open, setOpen] = useState(0);
  const [shot, setShot] = useState(0);
  const [cart, setCart] = useState(0);

  return (
    <div className="sf-shop">
      <header className="sf-shop-bar">
        <span className="sf-shop-logo">Northstar Goods</span>
        <span className="sf-shop-cart">
          <ShoppingBag size={15} /> Cart ({cart})
        </span>
      </header>
      <nav className="sf-shop-crumbs" aria-label="Breadcrumb">
        <a href="#c" onClick={(e) => e.preventDefault()}>Home</a> /{" "}
        <a href="#c" onClick={(e) => e.preventDefault()}>Objects</a> /{" "}
        <span>Sample product</span>
      </nav>

      <section className="sf-shop-product">
        <div className="sf-shop-gallery">
          <div className={`sf-shop-shot shot-${shot}`} role="img" aria-label="Product image placeholder" />
          <div className="sf-shop-thumbs">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                aria-label={`View image ${i + 1}`}
                aria-pressed={shot === i}
                className={`sf-shop-thumb shot-${i}${shot === i ? " is-on" : ""}`}
                onClick={() => setShot(i)}
              />
            ))}
          </div>
        </div>

        <div className="sf-shop-info">
          <Ed as="span" className="sf-chip">
            {variant === "b" ? "Direction 02" : "New arrival"}
          </Ed>
          <Ed as="h1" className="sf-shop-title">Make it worth keeping.</Ed>
          <div className="sf-shop-price">$00.00</div>
          <Ed as="p" className="sf-shop-lede">
            A warmer storefront language for products that deserve attention
            beyond the first scroll.
          </Ed>

          <fieldset className="sf-shop-field">
            <legend>Color: {color}</legend>
            <div className="sf-row">
              {colors.map((c) => (
                <button
                  key={c}
                  aria-label={c}
                  aria-pressed={color === c}
                  className={`sf-shop-swatch swatch-${c.toLowerCase()}${color === c ? " is-on" : ""}`}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="sf-shop-field">
            <legend>Size</legend>
            <div className="sf-row">
              {sizes.map((s) => (
                <button
                  key={s}
                  disabled={s === "XL"}
                  aria-pressed={size === s}
                  className={`sf-shop-size${size === s ? " is-on" : ""}`}
                  onClick={() => setSize(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="sf-row sf-shop-buy">
            <div className="sf-stepper" role="group" aria-label="Quantity">
              <button aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => q - 1)}>
                <Minus size={13} />
              </button>
              <output>{qty}</output>
              <button aria-label="Increase quantity" onClick={() => setQty((q) => q + 1)}>
                <Plus size={13} />
              </button>
            </div>
            <button className="sf-btn sf-btn-primary" onClick={() => setCart((c) => c + qty)}>
              Add to cart
            </button>
            <button
              className="sf-btn sf-btn-secondary"
              aria-pressed={liked}
              onClick={() => setLiked((l) => !l)}
            >
              <Heart size={14} fill={liked ? "currentColor" : "none"} /> Wishlist
            </button>
          </div>

          <div className="sf-shop-acc">
            {details.map((d, i) => (
              <div key={d.title} className="sf-shop-acc-item">
                <button
                  aria-expanded={open === i}
                  onClick={() => setOpen(open === i ? -1 : i)}
                >
                  {d.title}
                  <ChevronDown size={14} className={open === i ? "is-open" : ""} />
                </button>
                {open === i && <Ed as="p">{d.body}</Ed>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sf-shop-related" aria-label="Related products">
        <h3>You may also like</h3>
        <div className="sf-shop-grid">
          {related.map((r, i) => (
            <a key={r} href="#c" className="sf-shop-card" onClick={(e) => e.preventDefault()}>
              <span className={`sf-shop-card-img shot-${i % 3}`} aria-hidden="true" />
              <strong>{r}</strong>
              <small>$00.00</small>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
