import React from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../components/ui/input-otp";
import { toast } from "../components/ui/toast";
import SkyGradient from "../components/SkyGradient";
import { enrollPin, getInstallationId, getWorkerUrl } from "../lib/auth";

// Pantalla 1 · Acceso único de Lux: PIN de 4–6 dígitos verificado/creado en tu servidor.
// La URL del Worker ya viene fija en DEFAULT_WORKER_URL, no hay que recordarla.
export default function Login(props: { onAuthed: () => void }) {
  const [pin, setPin] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function entrar(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const base = getWorkerUrl().trim().replace(/\/+$/, "");
    if (!/^\d{4,6}$/.test(pin)) {
      toast.add({ title: "Error", description: "PIN de 4 a 6 dígitos." });
      return;
    }
    setBusy(true);
    try {
      await enrollPin(base, getInstallationId(), pin);
      setPin("");
      props.onAuthed();
    } catch (ex) {
      toast.add({ title: "Error", description: ex instanceof Error ? ex.message : "no se pudo entrar" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5">
      <SkyGradient style={{ position: "absolute", inset: 0, height: "100%", aspectRatio: "auto" }} />
      <Card className="relative w-full max-w-[380px] rounded-[28px] border-card/60 bg-card/60 shadow-[0_8px_30px] shadow-black/10 backdrop-blur-2xl">
        <CardHeader className="items-center text-center">
          <CardTitle className="text-[22px] tracking-tight">Ezzy</CardTitle>
          <CardDescription>Acceso privado · PIN de 4 a 6 dígitos</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void entrar(e)} className="grid gap-4">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={pin} onChange={setPin} inputMode="numeric" aria-label="PIN">
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="h-11 w-11 rounded-full border border-card/80 bg-card/50 text-base first:rounded-full last:rounded-full data-[active=true]:border-(--ez-accent) data-[active=true]:bg-card data-[active=true]:ring-0" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button type="submit" size="lg" className="w-full rounded-full bg-(--ez-accent) hover:bg-(--ez-accent)/90" disabled={busy}>
              {busy ? "Verificando…" : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
