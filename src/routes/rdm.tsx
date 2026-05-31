import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { Header } from "@/components/tamv/Header";
import { Footer } from "@/components/tamv/Footer";

export const Route = createFileRoute("/rdm")({
  head: () => ({
    meta: [
      { title: "RDM-TOS — Sistema Operativo Territorial" },
      {
        name: "description",
        content:
          "Nodo territorial Real del Monte con identidad, economía, comercio, IA contextual, pagos y audit trail BookPI.",
      },
    ],
  }),
  component: RdmTosPage,
});

function RdmTosPage() {
  const [email, setEmail] = useState("ciudadano@rdm.local");
  const [message, setMessage] = useState(
    "¿Qué ruta territorial recomiendas para visitantes nuevos?",
  );
  const [result, setResult] = useState("Listo para operar el Nodo Cero RDM-TOS.");

  async function post(path: string, body: unknown) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    setResult(JSON.stringify(data, null, 2));
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-zinc-100">
      <Header />
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-6xl space-y-8">
          <section className="rounded-2xl border border-emerald-400/20 bg-zinc-950/90 p-8 shadow-2xl shadow-emerald-950/20">
            <div className="font-mono text-[11px] uppercase tracking-[0.35em] text-emerald-300">
              RDM Digital · Sistema Operativo Territorial
            </div>
            <h1 className="mt-3 font-display text-4xl md:text-5xl">
              Nodo Cero territorial con CQRS, BookPI e IA contextual
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
              Esta consola activa el contrato funcional base de RDM-TOS dentro del kernel TAMV:
              identidad ciudadana, wallet, recompensas, comercio local, pagos Stripe/simulado y
              respuestas de IA con guardianes de privacidad, consentimiento, no extracción y
              auditoría.
            </p>
          </section>

          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <section className="space-y-4 rounded-xl border border-white/10 bg-zinc-950 p-5">
              <h2 className="font-display text-xl">Operaciones rápidas</h2>
              <label className="block text-xs uppercase tracking-[0.2em] text-zinc-500">
                Correo ciudadano
              </label>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-md border border-white/10 bg-black px-3 py-2 font-mono text-sm text-emerald-100 outline-none focus:border-emerald-400/60"
              />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <button
                  onClick={() => post("/api/rdm/auth/register", { email })}
                  className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-500/20"
                >
                  Registrar + wallet
                </button>
                <button
                  onClick={() =>
                    post("/api/rdm/commerce/create", {
                      name: "Comercio Nodo Cero",
                      category: "turismo",
                    })
                  }
                  className="rounded-md border border-amber-300/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100 hover:bg-amber-500/20"
                >
                  Alta comercio
                </button>
                <button
                  onClick={() => post("/api/rdm/payments/create", { amount: 199, currency: "mxn" })}
                  className="rounded-md border border-sky-300/30 bg-sky-500/10 px-4 py-2 text-sm text-sky-100 hover:bg-sky-500/20"
                >
                  Crear pago
                </button>
              </div>

              <label className="block pt-3 text-xs uppercase tracking-[0.2em] text-zinc-500">
                Consulta IA territorial
              </label>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-28 w-full rounded-md border border-white/10 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-400/60"
              />
              <button
                onClick={() => post("/api/rdm/ai/ask", { message })}
                className="w-full rounded-md border border-fuchsia-300/30 bg-fuchsia-500/10 px-4 py-2 text-sm text-fuchsia-100 hover:bg-fuchsia-500/20"
              >
                Preguntar a IA
              </button>
            </section>

            <section className="rounded-xl border border-white/10 bg-zinc-950 p-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="font-display text-xl">Respuesta operativa</h2>
                <a
                  className="font-mono text-xs text-emerald-300 hover:text-emerald-200"
                  href="/api/rdm/manifest"
                >
                  manifest ↗
                </a>
              </div>
              <pre className="mt-4 max-h-[620px] overflow-auto whitespace-pre-wrap rounded-lg bg-black p-4 font-mono text-xs leading-6 text-zinc-300">
                {result}
              </pre>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
