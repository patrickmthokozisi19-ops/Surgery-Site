# Pweb carousel SVGs

10 static 1280×880 SVG mockups inspired by your Pweb HTML and stylesheet. Navy `#1d3443`, mint `#5fd3b3`, ink `#0e1f2b`, pale surface `#f4f7f6`. All content is fictional demonstration data.

Use in an existing carousel slide:

```html
<figure class="ph" style="--ratio:16 / 11">
  <img src="assets/pweb-carousel/02-appointment-calendar.svg" alt="Pweb appointment calendar interface preview" loading="lazy">
</figure>
```

Suggested CSS (place in `@layer Content1` under `.pw-carousel`):

```css
.pw-carousel {
  & .pw-slide .ph {
    overflow: hidden;
    aspect-ratio: 16 / 11;
    background: #f4f7f6;
    border: 1px solid rgba(14,31,43,.08);
    border-radius: 18px;
  }
  & .pw-slide .ph img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}
```

These are static visuals only; they do not implement booking, messaging, or medical record functions.
