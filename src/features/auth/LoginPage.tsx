import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail, User } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Navigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/application/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "signIn" | "signUp" | "reset";

const schema = z.object({
  fullName: z.string().optional(),
  email: z.string().email("Informe um email valido"),
  password: z.string().optional(),
});

type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  const { status, signIn, signUp, sendPasswordReset } = useAuth();
  const [mode, setMode] = useState<Mode>("signIn");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(schema), defaultValues: { fullName: "", email: "", password: "" } });

  if (status !== "signedOut") return <Navigate to="/app" replace />;

  async function onSubmit(values: LoginForm) {
    const password = values.password ?? "";
    if (mode !== "reset" && password.length < 6) {
      setError("password", { message: "A senha precisa ter pelo menos 6 caracteres" });
      return;
    }
    if (mode === "signUp" && !values.fullName?.trim()) {
      setError("fullName", { message: "Informe seu nome" });
      return;
    }

    setSubmitting(true);
    setNotice("");
    try {
      if (mode === "signIn") {
        await signIn(values.email, password);
      } else if (mode === "signUp") {
        const result = await signUp(values.email, password, values.fullName?.trim() ?? "");
        if (result === "confirmEmail") setNotice("Enviamos um email de confirmacao. Depois de confirmar, um administrador precisa aprovar seu acesso.");
      } else {
        await sendPasswordReset(values.email);
        setNotice("Se o email estiver cadastrado, voce vai receber um link para criar uma nova senha.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel continuar");
    } finally {
      setSubmitting(false);
    }
  }

  const titles: Record<Mode, string> = {
    signIn: "Entrar",
    signUp: "Criar acesso",
    reset: "Enviar link",
  };

  return (
    <AuthShell>
      <form onSubmit={handleSubmit(onSubmit)} className="rounded-lg border border-border bg-card p-4 shadow-soft sm:p-6">
        <div className="space-y-4">
          {mode === "signUp" ? (
            <label className="block text-sm font-medium">
              Nome completo
              <div className="relative mt-2">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" autoComplete="name" {...register("fullName")} />
              </div>
              {errors.fullName ? <span className="mt-1 block text-xs text-red-600">{errors.fullName.message}</span> : null}
            </label>
          ) : null}

          <label className="block text-sm font-medium">
            Email
            <div className="relative mt-2">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" type="email" autoComplete="email" {...register("email")} />
            </div>
            {errors.email ? <span className="mt-1 block text-xs text-red-600">{errors.email.message}</span> : null}
          </label>

          {mode !== "reset" ? (
            <label className="block text-sm font-medium">
              Senha
              <div className="relative mt-2">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" type="password" autoComplete={mode === "signUp" ? "new-password" : "current-password"} {...register("password")} />
              </div>
              {errors.password ? <span className="mt-1 block text-xs text-red-600">{errors.password.message}</span> : null}
            </label>
          ) : null}

          {notice ? <p className="rounded-md bg-surface p-3 text-sm text-muted-foreground">{notice}</p> : null}

          <Button className="w-full" type="submit" disabled={submitting}>
            {submitting ? "Aguarde..." : titles[mode]}
            <ArrowRight className="h-4 w-4" />
          </Button>

          <div className="flex flex-col gap-2 text-sm min-[420px]:flex-row min-[420px]:justify-between">
            {mode === "signIn" ? (
              <>
                <button type="button" className="text-left font-medium text-primary hover:underline" onClick={() => setMode("signUp")}>
                  Pedir acesso
                </button>
                <button type="button" className="text-left font-medium text-primary hover:underline" onClick={() => setMode("reset")}>
                  Esqueci minha senha
                </button>
              </>
            ) : (
              <button type="button" className="text-left font-medium text-primary hover:underline" onClick={() => setMode("signIn")}>
                Voltar para o login
              </button>
            )}
          </div>
        </div>
      </form>
    </AuthShell>
  );
}

/** Layout das telas de acesso (login, aguardando aprovacao, nova senha). */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen overflow-x-hidden bg-background lg:grid-cols-[minmax(420px,0.9fr)_1.1fr]">
      <section className="flex items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="mb-8 text-center">
            <img src="/assets/logo.png" alt="Assembleia de Deus Montese" className="mx-auto h-20 w-20 object-contain sm:h-24 sm:w-24" />
            <h1 className="mt-5 text-2xl font-semibold leading-tight">Assembleia de Deus Montese</h1>
            <p className="mt-2 text-sm text-muted-foreground">Gestao administrativa ministerial</p>
          </div>
          {children}
        </motion.div>
      </section>

      <section className="relative hidden overflow-hidden bg-primary lg:block">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(122,12,16,.98),rgba(163,18,24,.86)),url('/assets/logo.png')] bg-[length:cover,560px] bg-center bg-no-repeat" />
        <div className="relative flex h-full flex-col justify-end p-10 text-white xl:p-12">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">Primeiro passo para um ERP Ministerial</p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight xl:text-5xl">Administracao integrada, clara e preparada para crescer.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/76">
              Comeca lendo as planilhas de hoje e migra, no ritmo do ministerio, para um banco de dados seguro e compartilhado.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
