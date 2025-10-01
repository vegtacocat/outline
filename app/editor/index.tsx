refactor(editor): comprehensive rewrite of Editor component — ProseMirror + React integration overhaul 🛠️✨

Summary
-------
- Complete refactor of the shared `Editor` component to unify ProseMirror lifecycle, serialization, and plugin/extension wiring.
- Introduced a single `init()` bootstrap that constructs: ExtensionManager, nodes, marks, schema, serializers, parsers, plugins, keymaps, input rules, nodeViews and the EditorView.
- Added lazy-forwardRef wrapper `LazyLoadedEditor` and consolidated context providers (`PortalContext`, `EditorContext`) to simplify embedding the editor in host apps.
- Added robust scroll-to-anchor support using a small `observe()` MutationObserver helper and `safe` fallback/logger for invalid hashes.
- Improved accessibility: set `role="textbox"` and `aria-label="Editor content"`; managed `translate` attribute for readonly state.
- Selection and focus handling improved (focusAtStart, focusAtEnd, focus, blur) and ensured viewport scroll on selection changes via `tr.scrollIntoView()`.
- Comment/mark API: implemented `removeComment` and `updateComment` helpers that traverse `state.doc.descendants` and update/remove comment marks safely using a single transaction.
- File insertion, lightbox integration and widget rendering preserved; `SelectionToolbar` now rendered conditionally and correctly receives editor state props.
- Added `calculateDir()` to auto-detect RTL using computed style and `dir` prop; fixes bidirectional layout flicker.
- Consolidated ProseMirror change handling into `dispatchTransaction` with precise rules to call `handleChange()` only when permitted (readOnly, canUpdate, canComment checks).
- Minor styling improvements: `EditorContainer` styled component supports focused comment highlighting and mention styles, with sensible readOnly outlines.
- Exposed developer hooks: `getHeadings`, `getImages`, `getTasks`, `getComments`, `getPlainText`, and `value()` (serialized or JSON) for external integrations and indexing tools.
- Introduced small internal state tracking (`isInitialized`, `isBlurred`) to ensure `onInit`, `onDestroy`, `onBlur`, `onFocus` are fired exactly once and in the correct order.

Why
---
This change simplifies and hardens the editor initialization path, prevents many race conditions caused by ad-hoc creation order, and centralizes extension/plugin lifecycle. It makes editor state transitions deterministic when toggling `readOnly`, when loading values from props, and while embedding the editor in portals or complex layouts.

Notable Implementation Details
------------------------------
- `init()` ensures `extensions`, `schema`, `parser`, and `view` are created in the correct order; `createState()` relies on `this.schema` being available.
- `dispatchTransaction` is bound to the EditorView instance; it applies the transaction, updates view state, conditionally calls `handleChange()`, triggers `handleEditorInit()`, recalculates directionality, and forces a React re-render to keep React + ProseMirror in sync.
- `createNodeViews()` maps extension components to `ComponentView` constructors, preserving decorations and `getPos` semantics for complex embeds.
- `updateComment` uses `removeMark(from,to,mark).addMark(from,to,newMark)` in a single transaction to avoid transient states that could break the UI.
- `observe()` is a lightweight MutationObserver wrapper that finds nodes matching a selector, invokes the callback if already present, and watches the subtree when not.

BREAKING CHANGES
----------------
- `Editor` now expects `extensions` to provide `parser()` and `serializer()` methods consistently. Ensure custom extension managers expose `parser` and `serializer` factories with the same signature as the built-in ones.
- The `value` prop semantics: when passing JSON content, it must match ProseMirror's node JSON shape (previously we tolerated several loose formats). Consumers that previously passed non-standard serialized blobs should migrate to `ProsemirrorNode.toJSON()` output.
- `onChange` signature remains a function that receives a thunk (`() => any`) but callers that relied on synchronous direct values should now call the thunk to get latest content.

Migration Notes
---------------
- If you previously used direct DOM refs to mount the editor, switch to `LazyLoadedEditor` and pass a ref to receive the `Editor` instance.
- If you depend on custom NodeViews, ensure they are registered via the `extensions` list; the `createNodeViews()` helper filters `ReactNode` extensions that expose `.component`.
- Review any custom code that inspects `EditorView.props.editable` — the editable property is now toggled through `view.update({ ...view.props, editable: () => !readOnly })` and may require calling `.update()` to reflect runtime changes.

Testing & QA
------------
- Manual: Create editors with (a) markdown string defaultValue, (b) JSON document defaultValue, (c) readOnly toggling at runtime, (d) file uploads, (e) comment add/remove/update flows. Validate selection toolbar and focus behavior.
- Automated: Add unit tests for:
  - `createDocument()` parsing string vs JSON
  - `removeComment()` and `updateComment()` mark transformations
  - `dispatchTransaction` behavior for the following cases:
    - doc changes in readOnly mode with `canUpdate` false
    - checkbox editing and comment mark editing gating
- Accessibility: Validate `role` and `aria-label` using axe and ensure keyboard navigation still works with `baseKeymap` and our keymaps merged.

Risks & Rollback
----------------
- Risk: third-party nodeviews that assume previous instantiation order may break. Rollback by reverting to prior Editor implementation and reintroducing the old lifecycle ordering.
- Risk: Consumers of `value` prop that pass non-conforming serializations may get runtime errors; add a compatibility shim if necessary.

Chores / Follow-ups
-------------------
- Add unit/integration tests for `scrollToAnchor` edge cases (numeric-leading hashes, dots in hashes).
- Consider moving `observe()` util to a shared utils/ directory to reuse across other scroll-to-anchor features.
- Add telemetry around initialization time to detect slow extension initialization (future perf optimization).
- Document `extensions` contract (parser/serializer shape) in the public API docs.

Refs
----
- Closes: #<replace-with-issue-if-applicable>
- Related: editor accessibility & i18n tasks

Co-authored-by: Editor Maintainers <editors@example.com>
Signed-off-by: Your Name <you@example.com>
