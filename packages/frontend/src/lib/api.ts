const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:3001/api";

type ApiErrorShape = {
  message?: string;
  errors?: Record<string, string[]>;
};

export class ApiError extends Error {
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.fieldErrors = fieldErrors;
  }
}

export async function apiRequest<TResponse>(
  path: string,
  options: RequestInit = {},
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const data = (await response.json().catch(() => null)) as ApiErrorShape | TResponse | null;

  if (!response.ok) {
    const errorData = data as ApiErrorShape | null;
    throw new ApiError(
      errorData?.message ?? "Request failed. Please try again.",
      errorData?.errors,
    );
  }

  return data as TResponse;
}

export { API_BASE_URL };
