export type CatalogNode = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  parentId: string | null;
  subcategories: CatalogNode[];
};

export type CatalogKind = "categories" | "services";

export type CatalogWrite = {
  name: string;
  slug?: string;
  icon?: string | null;
  sortOrder?: number;
  parentId?: string | null;
};

const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const detail =
      (payload && (payload.detail || payload.title)) ||
      `Request failed (${response.status})`;
    throw new Error(detail);
  }
  return payload as T;
}

export function listCatalog(kind: CatalogKind): Promise<CatalogNode[]> {
  return request(`/api/${kind}`);
}

export function createCatalogItem(kind: CatalogKind, body: CatalogWrite): Promise<CatalogNode> {
  return request(`/api/${kind}`, { method: "POST", body: JSON.stringify(body) });
}

export function updateCatalogItem(
  kind: CatalogKind,
  id: string,
  body: CatalogWrite,
): Promise<CatalogNode> {
  return request(`/api/${kind}/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

export function deleteCatalogItem(kind: CatalogKind, id: string): Promise<void> {
  return request(`/api/${kind}/${id}`, { method: "DELETE" });
}

export type FormFieldInput = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  maxLength?: number | null;
  min?: number | null;
  max?: number | null;
  options?: string[] | null;
};

export type SellForm = {
  id: string;
  code: string;
  type: string;
  title: string;
  categoryId: string | null;
  serviceId: string | null;
  version: number;
  schema: { fields: FormFieldInput[] };
};

export function listForms(kind: CatalogKind, ownerId: string): Promise<SellForm[]> {
  const param = kind === "categories" ? "categoryId" : "serviceId";
  return request(`/api/forms?${param}=${encodeURIComponent(ownerId)}`);
}

export function createForm(body: {
  title: string;
  type: string;
  categoryId?: string;
  serviceId?: string;
  fields: FormFieldInput[];
}): Promise<SellForm> {
  return request("/api/forms", { method: "POST", body: JSON.stringify(body) });
}

export function updateForm(
  id: string,
  body: { title: string; type: string; fields: FormFieldInput[] },
): Promise<SellForm> {
  return request(`/api/forms/${id}`, { method: "PUT", body: JSON.stringify(body) });
}
