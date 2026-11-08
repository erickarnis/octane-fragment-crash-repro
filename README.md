# Octane: a Fragment with an empty slot crashes the commit

A minimal reproduction for [Octane](https://github.com/octanejs/octane). An update throws `TypeError: Cannot read properties of null (reading 'ownerDocument')` and is lost when a host element is kept between two renders and its children become a Fragment holding an empty value (`cond && …`, `cond ? … : null`) or text where the old element had a child.

- Reproduces on **`octane` 0.16.7** (npm), the version this repository pins.
- Also reproduces on **`main` at `063aaabf`** (2026-11-07), with the regression test in [`octane-patches/regression-test.patch`](octane-patches/regression-test.patch).
- It is a runtime bug: it reproduces with plain `createElement`, without the compiler.

Found in a real app ([Nature By Name](https://naturebyname.com), built with `@octanejs/astro`): a data-loading wrapper swapped its loading content for a Fragment as the query data arrived.

## Run it

```bash
npm ci
npm test
```

On 0.16.7, all six cases in `repro.test.ts` fail with the error above, and `stale.test.ts` (a related, quieter bug, below) fails its assertion. The tests assert the correct behaviour, so they pass once Octane is fixed. The GitHub Actions workflow runs the same on every push.

## The smallest component

[`minimal-repro.tsx`](minimal-repro.tsx):

```tsx
/** @jsxImportSource octane */
export function Panel({ data }: { data: { note?: string } | null }) {
  return data === null ? (
    <div>
      <span>Loading…</span>
    </div>
  ) : (
    <div>
      <>
        {data.note && <p>{data.note}</p>}
        <p>body</p>
      </>
    </div>
  )
}
```

```ts
const root = createRoot(container)
flushSync(() => root.render(Panel, { data: null }))
flushSync(() => root.render(Panel, { data: {} })) // throws
```

Without the compiler, the second render replaces `createElement('div', null, createElement('span', null, 'Loading…'))` with `createElement('div', null, createElement(Fragment, { children: [undefined, createElement('p', null, 'body')] }))`.

[`app-shape.tsx`](app-shape.tsx) is the same thing in the shape the app had: a `QueryResult`-style wrapper and a render prop.

## What has to be true

1. Both renders have the same host tag at the same position, so the element is kept.
2. The new children are a Fragment, so the element switches from its plain host children to block rendering and adopts the old children by position.
3. Where the old children had a node, the Fragment has an empty value or text.

Routers, queries, keys, components, render props and `&&` versus `? : null` do not matter.

Focus does not cause it either; it only decides the message. With any element other than `<body>` focused (in the app, the router's `<h1 tabindex="-1">`, outside the root), it fails reading `ownerDocument`. With nothing focused, it fails one line later reading `isConnected`.

## Expected and actual

- **Expected** (as in React): the `<div>` stays, the `<span>` is removed, and `<p>body</p>` is shown.
- **Actual:** the commit throws and the update is lost.

```
TypeError: Cannot read properties of null (reading 'ownerDocument')
  at captureFocusedMovement (runtime/engine.ts:2750)
  at moveBlockBefore       (runtime/lists.ts:2180)
  at placeUpgradedList     (runtime/deopt.ts:2391)
  at commitRootRenders     (runtime/engine.ts:1528)
```

## Cause, as far as we can tell

All in `packages/octane/src/runtime/`, at `063aaabf`:

1. **Building the reuse list.** `renderPreparedChildList` (`deopt.ts:2533`) lists the old children by position for reuse. The empty Fragment entry at index 0 is handed the old `<span>`. Since the entry is not a host element, `mountItem` creates its pair of boundary comments without inserting them ("its pair wraps it at commit") and records `[block, span]` (`lists.ts:1100`).
2. **Rendering the empty entry.** `deoptItemBody` (`deopt.ts:1664–1722`) reconciles the `<span>` against `undefined` and queues the `<span>` for deletion (`deopt.ts:1701`). For a text value it puts a new text node where the `<span>` was instead.
3. **Commit.** The deletion runs first. `placeUpgradedList` then skips the entry, because its adopted node has left the element (`if (node.parentNode !== host) continue;`, `deopt.ts:2384`), so the pair is never inserted. Its reverse loop then calls `moveBlockBefore` (`deopt.ts:2391`) on a block whose start comment has no parent.

## A possible fix

[`octane-patches/candidate-fix.patch`](octane-patches/candidate-fix.patch), about ten lines in `placeUpgradedList`:
- skip an entry only if its pair is already in the element;
- otherwise wrap the entry's current node (`block.deoptNode`);
- or, for an empty entry, insert the pair and let the reverse loop move it into place.

With it, the regression test and the whole `octane` Vitest project pass (871 files, 26,249 tests), and both cases come out correctly bracketed (`<!--it-->text<!--/it-->`). A maintainer may prefer to fix it where the adopted node is retired.

## Related, quieter bug

A Fragment with no children at all, `createElement('div', null, createElement(Fragment, null))`, replacing the same loading `<div>`, does not throw, but leaves the old `<span>Loading…</span>` on screen. The update takes the empty-list early return in `renderPreparedChildList` (`deopt.ts:2428`) while the upgrade is under way, and that return does not remove the old children. [`stale.test.ts`](stale.test.ts) reproduces it on 0.16.7; it also happens on `main`.

## For the Octane repository

- [`octane-patches/regression-test.patch`](octane-patches/regression-test.patch) adds a case to `packages/octane/tests/deopt-pure-host-upgrade.test.ts`, "drops an adopted child where the new Fragment renders nothing". It fails on `main` with the same TypeError in both the `octane` and `octane-prod` projects:
  ```bash
  ./node_modules/.bin/vitest run packages/octane/tests/deopt-pure-host-upgrade.test.ts --project octane
  ```
- [`octane-patches/candidate-fix.patch`](octane-patches/candidate-fix.patch): the possible fix above.

Apply them to an Octane checkout with `git apply`.

## Environment

- **Packages:** `octane` 0.16.7, Vitest 4.1.10, jsdom 30.0.1, Node 22.
- **The app:** Astro 7.4.7 with `@octanejs/astro` 0.0.46, built through `octane/compiler/vite`.

## Working around it until a fix ships

Return an element instead of a Fragment from the changing branch: `<div>…</div>`, not `<>…</>`.
