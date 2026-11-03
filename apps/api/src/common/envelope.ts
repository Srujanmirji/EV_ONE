export interface Meta {
  requestId: string;
}

export interface DataEnvelope<T> {
  data: T;
  meta: Meta;
}

export interface ErrorEnvelope {
  error: { code: string; message: string; fields?: Record<string, string> };
  meta: Meta;
}
