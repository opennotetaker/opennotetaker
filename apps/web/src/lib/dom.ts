// Just enough DOM helper to write views without a framework.
//
// Three functions and a class. Anything more and this becomes a framework with
// none of the testing, documentation or community of a real one -- which is
// the failure mode of hand-rolled view layers, and the reason this one is
// deliberately too small to grow into that.

type Child = Node | string | number | null | undefined | false;

interface Attributes {
  [key: string]: unknown;
}

/// No `html:` escape hatch. Every string that reaches the DOM here goes
/// through `textContent`, because in this app most strings are transcript --
/// whatever a model produced from whatever somebody said -- and an
/// `innerHTML` convenience is how that becomes an injection.

/// `el("button.primary", { onclick }, "Save")`, or `el("p", "just text")`.
///
/// The tag string carries classes after a dot, because `class:` in an
/// attributes object is the single most repeated line in any view file.
///
/// The overloads exist so the attributes argument can be *omitted*, which it
/// is in most calls. A single signature with an optional attributes parameter
/// would type every `el("p", "text")` as an error and push every view into
/// writing `el("p", {}, "text")`.
export function el<S extends string>(spec: S, ...children: Child[]): Made<S>;
export function el<S extends string>(
  spec: S,
  attributes: Attributes,
  ...children: Child[]
): Made<S>;
export function el(spec: string, ...rest: unknown[]): HTMLElement {
  const [tag, ...classes] = spec.split(".");
  const node = document.createElement(tag || "div");
  if (classes.length) node.className = classes.join(" ");

  // A plain object in first position is attributes; a Node, a string, a
  // number or an array is a child. Distinguishing by prototype rather than by
  // `typeof` is what keeps `el("div", someElement)` from being read as an
  // attributes bag full of DOM properties.
  let children = rest as Child[];
  const first = rest[0];
  if (isAttributes(first)) {
    children = rest.slice(1) as Child[];
    for (const [key, value] of Object.entries(first)) {
      if (value === null || value === undefined || value === false) continue;
      if (key.startsWith("on") && typeof value === "function") {
        node.addEventListener(key.slice(2), value as EventListener);
      } else if (key === "class") {
        node.className = `${node.className} ${String(value)}`.trim();
      } else if (key === "text") {
        node.textContent = String(value);
      } else if (key in node && key !== "list" && key !== "form" && key !== "style") {
        (node as unknown as Record<string, unknown>)[key] = value;
      } else {
        node.setAttribute(key, String(value));
      }
    }
  }

  for (const child of (children as (Child | Child[])[]).flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : String(child));
  }
  return node;
}

/// The element type a tag string produces, so `el("button.primary", …).disabled`
/// type-checks without a cast at every call site.
type Tag<S extends string> = S extends `${infer T}.${string}` ? T : S;
type Made<S extends string> = Tag<S> extends keyof HTMLElementTagNameMap
  ? HTMLElementTagNameMap[Tag<S>]
  : HTMLElement;

function isAttributes(value: unknown): value is Attributes {
  return (
    typeof value === "object" &&
    value !== null &&
    !(value instanceof Node) &&
    !Array.isArray(value)
  );
}

export function clear(node: Element): void {
  node.replaceChildren();
}

export function mount(node: Element, ...children: Child[]): void {
  clear(node);
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : String(child));
  }
}

export function $(selector: string, root: ParentNode = document): HTMLElement | null {
  return root.querySelector(selector);
}

/// Hand the user a file.
///
/// An object URL rather than a data URI: a transcript export can be several
/// megabytes and a data URI of that size is refused outright by some browsers,
/// with no error a page can catch.
export function download(filename: string, content: string | Blob, mime: string): void {
  const blob = typeof content === "string" ? new Blob([content], { type: mime }) : content;
  const url = URL.createObjectURL(blob);
  const anchor = el("a", { href: url, download: filename }) as HTMLAnchorElement;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revoked on the next turn rather than immediately: revoking synchronously
  // races the download starting, and the file arrives empty on some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/// A short, sortable, collision-resistant id.
///
/// Time-prefixed so a library listing sorted by id is also sorted by age,
/// which saves an index. `crypto.randomUUID` is not used because its
/// randomness is the whole string, so ids for one session interleave.
export function newId(): string {
  const time = Date.now().toString(36).padStart(9, "0");
  const random = crypto.getRandomValues(new Uint8Array(8));
  const suffix = Array.from(random, (b) => b.toString(36).padStart(2, "0")).join("");
  return `${time}${suffix}`;
}
