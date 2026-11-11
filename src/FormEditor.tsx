import { useEffect, useState } from "react";
import {
  createForm,
  listForms,
  updateForm,
  type CatalogKind,
  type CatalogNode,
  type FormFieldInput,
} from "./api";

const fieldTypes = ["text", "textarea", "number", "select", "boolean", "date"];

type FieldDraft = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  maxLength: string;
  min: string;
  max: string;
  options: string;
};

function blankField(): FieldDraft {
  return {
    key: "",
    label: "",
    type: "text",
    required: false,
    maxLength: "",
    min: "",
    max: "",
    options: "",
  };
}

function fromField(field: FormFieldInput): FieldDraft {
  return {
    key: field.key,
    label: field.label,
    type: field.type,
    required: field.required,
    maxLength: field.maxLength == null ? "" : String(field.maxLength),
    min: field.min == null ? "" : String(field.min),
    max: field.max == null ? "" : String(field.max),
    options: field.options?.join(", ") ?? "",
  };
}

function starterFields(kind: CatalogKind): FieldDraft[] {
  if (kind === "services") {
    return [
      { ...blankField(), key: "title", label: "Request title", required: true, maxLength: "80" },
      { ...blankField(), key: "preferredDate", label: "Preferred date", type: "date", required: true },
      { ...blankField(), key: "address", label: "Address", type: "textarea", required: true, maxLength: "300" },
      { ...blankField(), key: "notes", label: "Notes", type: "textarea", maxLength: "1000" },
    ];
  }
  return [
    { ...blankField(), key: "title", label: "Ad title", required: true, maxLength: "80" },
    { ...blankField(), key: "price", label: "Price", type: "number", required: true, min: "0" },
    { ...blankField(), key: "description", label: "Description", type: "textarea", maxLength: "2000" },
  ];
}

export function FormEditor({
  kind,
  node,
  onClose,
}: {
  kind: CatalogKind;
  node: CatalogNode;
  onClose: () => void;
}) {
  const [formId, setFormId] = useState<string | null>(null);
  const [title, setTitle] = useState(kind === "services" ? `Book ${node.name}` : `Sell ${node.name}`);
  const [type, setType] = useState(kind === "services" ? "SERVICE_REQUEST" : "SELL");
  const [fields, setFields] = useState<FieldDraft[]>(starterFields(kind));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listForms(kind, node.id)
      .then((forms) => {
        if (cancelled) return;
        const own = forms.find((form) =>
          kind === "categories" ? form.categoryId === node.id : form.serviceId === node.id,
        );
        if (!own) return;
        setFormId(own.id);
        setTitle(own.title);
        setType(own.type);
        setFields(own.schema.fields.map(fromField));
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Could not load the form");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, node.id]);

  function updateField(index: number, patch: Partial<FieldDraft>) {
    setFields((current) => current.map((field, i) => (i === index ? { ...field, ...patch } : field)));
  }

  async function save() {
    const parsed: FormFieldInput[] = [];
    for (const field of fields) {
      const key = field.key.trim();
      const label = field.label.trim();
      if (!key || !label) {
        setError("Every field needs a key and a label");
        return;
      }
      const options = field.options
        .split(",")
        .map((option) => option.trim())
        .filter(Boolean);
      if (field.type === "select" && options.length === 0) {
        setError(`Add options for ${label}, separated by commas`);
        return;
      }
      parsed.push({
        key,
        label,
        type: field.type,
        required: field.required,
        maxLength: field.maxLength.trim() === "" ? null : Number(field.maxLength),
        min: field.min.trim() === "" ? null : Number(field.min),
        max: field.max.trim() === "" ? null : Number(field.max),
        options: field.type === "select" ? options : null,
      });
    }
    setSaving(true);
    setError(null);
    try {
      if (formId) {
        await updateForm(formId, { title: title.trim(), type, fields: parsed });
      } else {
        const created = await createForm({
          title: title.trim(),
          type,
          categoryId: kind === "categories" ? node.id : undefined,
          serviceId: kind === "services" ? node.id : undefined,
          fields: parsed,
        });
        setFormId(created.id);
      }
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the form");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overlay" role="presentation" onClick={() => !saving && onClose()}>
      <form
        className="drawer form-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-editor-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <p className="eyebrow">Sell form</p>
        <h2 id="form-editor-title">{node.name}</h2>
        <p className="muted">
          This is the form the app opens when someone chooses {node.name} on the sell screen.
        </p>
        {error && (
          <p className="banner" role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <p className="muted">Loading form…</p>
        ) : (
          <>
            <label>
              Form title
              <input value={title} onChange={(event) => setTitle(event.target.value)} required />
            </label>
            <label>
              Form type
              <select value={type} onChange={(event) => setType(event.target.value)}>
                <option value="SELL">Sell</option>
                <option value="JOB">Job</option>
                <option value="SERVICE_REQUEST">Service request</option>
              </select>
            </label>
            <div className="field-list">
              {fields.map((field, index) => (
                <fieldset key={index} className="field-card">
                  <legend>Field {index + 1}</legend>
                  <label>
                    Label
                    <input
                      value={field.label}
                      onChange={(event) => updateField(index, { label: event.target.value })}
                    />
                  </label>
                  <label>
                    Key
                    <input
                      value={field.key}
                      onChange={(event) => updateField(index, { key: event.target.value })}
                      placeholder="price"
                    />
                  </label>
                  <label>
                    Type
                    <select
                      value={field.type}
                      onChange={(event) => updateField(index, { type: event.target.value })}
                    >
                      {fieldTypes.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  {field.type === "select" && (
                    <label>
                      Options
                      <input
                        value={field.options}
                        onChange={(event) => updateField(index, { options: event.target.value })}
                        placeholder="Petrol, Diesel, CNG"
                      />
                    </label>
                  )}
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(event) => updateField(index, { required: event.target.checked })}
                    />
                    Required
                  </label>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => setFields((current) => current.filter((_, i) => i !== index))}
                  >
                    Remove field
                  </button>
                </fieldset>
              ))}
            </div>
            <button type="button" onClick={() => setFields((current) => [...current, blankField()])}>
              Add field
            </button>
            <div className="actions">
              <button type="button" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={saving || fields.length === 0}>
                {saving ? "Saving…" : formId ? "Update form" : "Create form"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
