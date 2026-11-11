import { useEffect, useState } from "react";
import {
  createCatalogItem,
  deleteCatalogItem,
  listCatalog,
  updateCatalogItem,
  type CatalogKind,
  type CatalogNode,
} from "./api";
import { FormEditor } from "./FormEditor";

type EditorState = {
  mode: "create" | "edit";
  id?: string;
  parentId: string | null;
  parentName?: string;
  name: string;
  slug: string;
  icon: string;
  sortOrder: string;
};

const copy: Record<CatalogKind, { title: string; lede: string; noun: string }> = {
  categories: {
    title: "Sell categories",
    lede: "Add a category, then a subcategory. The sell screen opens the form you attach to that subcategory.",
    noun: "category",
  },
  services: {
    title: "Services",
    lede: "Add a service, then a subcategory. The sell screen opens the form you attach to that subcategory.",
    noun: "service",
  },
};

export function CatalogPage({ kind }: { kind: CatalogKind }) {
  const text = copy[kind];
  const [items, setItems] = useState<CatalogNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CatalogNode | null>(null);
  const [formNode, setFormNode] = useState<CatalogNode | null>(null);

  async function reload(quiet = false) {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      setItems(await listCatalog(kind));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load catalog");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [kind]);

  function openCreate(parent?: CatalogNode) {
    const siblings = parent ? parent.subcategories : items;
    const nextOrder = (siblings.at(-1)?.sortOrder ?? 0) + 1;
    setEditor({
      mode: "create",
      parentId: parent?.id ?? null,
      parentName: parent?.name,
      name: "",
      slug: "",
      icon: parent?.icon ?? "",
      sortOrder: String(nextOrder),
    });
  }

  function openEdit(node: CatalogNode, parent?: CatalogNode) {
    setEditor({
      mode: "edit",
      id: node.id,
      parentId: parent?.id ?? null,
      parentName: parent?.name,
      name: node.name,
      slug: node.slug,
      icon: node.icon ?? "",
      sortOrder: String(node.sortOrder),
    });
  }

  async function saveEditor() {
    if (!editor) return;
    const name = editor.name.trim();
    if (!name) {
      setError("Name is required");
      return;
    }
    const sortOrder = Number(editor.sortOrder);
    if (!Number.isInteger(sortOrder)) {
      setError("Sort order must be a whole number");
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      name,
      slug: editor.slug.trim() || undefined,
      icon: editor.icon.trim() || null,
      sortOrder,
      parentId: editor.parentId,
    };
    try {
      if (editor.mode === "create") {
        await createCatalogItem(kind, body);
      } else if (editor.id) {
        await updateCatalogItem(kind, editor.id, body);
      }
      setEditor(null);
      await reload(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setSaving(true);
    setError(null);
    try {
      await deleteCatalogItem(kind, pendingDelete.id);
      setPendingDelete(null);
      await reload(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="canvas">
      <header className="page-head">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>{text.title}</h1>
          <p className="lede">{text.lede}</p>
        </div>
        <button type="button" className="primary" onClick={() => openCreate()}>
          Add {text.noun}
        </button>
      </header>

      {error && (
        <p className="banner" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="muted">Loading {text.title.toLowerCase()}…</p>
      ) : error ? null : items.length === 0 ? (
        <p className="empty">No {text.title.toLowerCase()} yet. Add the first one.</p>
      ) : (
        <div className="stack">
          {items.map((item) => (
            <article key={item.id} className="card">
              <div className="card-head">
                <div>
                  <h2>{item.name}</h2>
                  <p className="meta">
                    <code>{item.slug}</code>
                    <span>Order {item.sortOrder}</span>
                    {item.icon && <span>{item.icon}</span>}
                  </p>
                </div>
                <div className="actions">
                  <button type="button" onClick={() => openCreate(item)}>
                    Add subcategory
                  </button>
                  <button type="button" onClick={() => openEdit(item)}>
                    Edit
                  </button>
                  <button type="button" className="danger" onClick={() => setPendingDelete(item)}>
                    Remove
                  </button>
                </div>
              </div>
              {item.subcategories.length === 0 ? (
                <p className="muted inset">No subcategories. Add one, then create its sell form.</p>
              ) : (
                <ul className="children">
                  {item.subcategories.map((child) => (
                    <li key={child.id}>
                      <div>
                        <strong>{child.name}</strong>
                        <p className="meta">
                          <code>{child.slug}</code>
                          <span>Order {child.sortOrder}</span>
                          {child.icon && <span>{child.icon}</span>}
                        </p>
                      </div>
                      <div className="actions">
                        <button type="button" onClick={() => setFormNode(child)}>
                          Form
                        </button>
                        <button type="button" onClick={() => openEdit(child, item)}>
                          Edit
                        </button>
                        <button type="button" className="danger" onClick={() => setPendingDelete(child)}>
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}

      {editor && (
        <div className="overlay" role="presentation" onClick={() => !saving && setEditor(null)}>
          <form
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="editor-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              void saveEditor();
            }}
          >
            <h2 id="editor-title">
              {editor.mode === "create" ? "Add" : "Edit"}{" "}
              {editor.parentId ? "subcategory" : text.noun}
            </h2>
            {editor.parentName && <p className="muted">Under {editor.parentName}</p>}
            <label>
              Name
              <input
                value={editor.name}
                onChange={(event) => setEditor({ ...editor, name: event.target.value })}
                required
                autoFocus
              />
            </label>
            <label>
              Slug
              <input
                value={editor.slug}
                onChange={(event) => setEditor({ ...editor, slug: event.target.value })}
                placeholder="Generated from the name if left blank"
              />
            </label>
            <label>
              Icon
              <input
                value={editor.icon}
                onChange={(event) => setEditor({ ...editor, icon: event.target.value })}
                placeholder="Material icon name, such as home"
              />
            </label>
            <label>
              Sort order
              <input
                value={editor.sortOrder}
                onChange={(event) => setEditor({ ...editor, sortOrder: event.target.value })}
                inputMode="numeric"
              />
            </label>
            <div className="actions">
              <button type="button" onClick={() => setEditor(null)} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {formNode && <FormEditor kind={kind} node={formNode} onClose={() => setFormNode(null)} />}

      {pendingDelete && (
        <div className="overlay" role="presentation">
          <div className="drawer confirm" role="alertdialog" aria-labelledby="delete-title">
            <h2 id="delete-title">Remove {pendingDelete.name}?</h2>
            <p>
              This hides it from the app.
              {pendingDelete.subcategories.length > 0
                ? " Its subcategories are removed with it."
                : ""}
            </p>
            <div className="actions">
              <button type="button" onClick={() => setPendingDelete(null)} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="danger solid" onClick={() => void confirmDelete()} disabled={saving}>
                {saving ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
