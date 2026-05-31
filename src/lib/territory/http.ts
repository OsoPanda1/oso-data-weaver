import { ZodError, type ZodTypeAny } from "zod";

export const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Stripe-Signature",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), { status, headers: jsonHeaders });
}

export function optionsResponse(): Response {
  return new Response(null, { status: 204, headers: jsonHeaders });
}

export async function parseJsonBody<TSchema extends ZodTypeAny>(req: Request, schema: TSchema) {
  try {
    return schema.parse(await req.json()) as ReturnType<TSchema["parse"]>;
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse({ error: "invalid_request", issues: error.issues }, 400);
    }
    return jsonResponse(
      { error: "invalid_json", message: error instanceof Error ? error.message : String(error) },
      400,
    );
  }
}

export function errorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : String(error);
  const status = message.includes("not_found") ? 404 : 500;
  return jsonResponse({ error: message }, status);
}
