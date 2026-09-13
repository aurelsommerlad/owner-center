import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import { Card } from "@/components/ui/Card";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "admin" ? "/admin" : "/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-sans text-sm font-semibold tracking-[0.05em] text-ink">UNIQUE PLACES</p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-soft">
            Owner Center
          </p>
        </div>

        <Card className="p-6 shadow-soft-lg sm:p-8">
          <h1 className="font-display text-xl italic text-ink">Anmelden</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Mit Ihren Zugangsdaten für das Owner Center oder den internen Bereich.
          </p>

          <div className="mt-6">
            <LoginForm />
          </div>
        </Card>
      </div>
    </main>
  );
}
