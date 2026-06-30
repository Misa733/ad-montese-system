import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  email: z.string().email("Informe um email valido"),
  password: z.string().min(4, "Informe sua senha"),
  remember: z.boolean().optional(),
});

type LoginForm = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: "admin@admontese.org", password: "admin", remember: true },
  });

  return (
    <main className="grid min-h-screen overflow-x-hidden bg-background lg:grid-cols-[minmax(420px,0.9fr)_1.1fr]">
      <section className="flex items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="mb-8 text-center">
            <img src="/assets/logo.png" alt="Assembleia de Deus Montese" className="mx-auto h-20 w-20 object-contain sm:h-24 sm:w-24" />
            <h1 className="mt-5 text-2xl font-semibold leading-tight">Assembleia de Deus Montese</h1>
            <p className="mt-2 text-sm text-muted-foreground">Gestao administrativa ministerial</p>
          </div>

          <form onSubmit={handleSubmit(() => navigate("/app"))} className="rounded-lg border border-border bg-card p-4 shadow-soft sm:p-6">
            <div className="space-y-4">
              <label className="block text-sm font-medium">
                Email
                <div className="relative mt-2">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" {...register("email")} />
                </div>
                {errors.email ? <span className="mt-1 block text-xs text-red-600">{errors.email.message}</span> : null}
              </label>

              <label className="block text-sm font-medium">
                Senha
                <div className="relative mt-2">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" type="password" {...register("password")} />
                </div>
                {errors.password ? <span className="mt-1 block text-xs text-red-600">{errors.password.message}</span> : null}
              </label>

              <div className="flex flex-col gap-3 text-sm min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input type="checkbox" className="h-4 w-4 rounded border-border accent-primary" {...register("remember")} />
                  Lembrar-me
                </label>
                <Link to="/" className="font-medium text-primary hover:underline">
                  Esqueci minha senha
                </Link>
              </div>

              <Button className="w-full" type="submit">
                Entrar
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </motion.div>
      </section>

      <section className="relative hidden overflow-hidden bg-primary lg:block">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(122,12,16,.98),rgba(163,18,24,.86)),url('/assets/logo.png')] bg-[length:cover,560px] bg-center bg-no-repeat" />
        <div className="relative flex h-full flex-col justify-end p-10 text-white xl:p-12">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">Primeiro passo para um ERP Ministerial</p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight xl:text-5xl">Administracao integrada, clara e preparada para crescer.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/76">
              Sincronize planilhas, organize modulos e evolua gradualmente para cadastros nativos com arquitetura multi-igrejas.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
