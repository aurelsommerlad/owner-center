import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import { Card } from "@/components/ui/Card";
import { LoginForm } from "./LoginForm";
import { getPublicLocale } from "@/server/locale";
import { getDictionary, createTranslator } from "@/i18n";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "admin" ? "/admin" : "/");
  }

  const locale = await getPublicLocale();
  const dict = getDictionary(locale);
  const t = createTranslator(dict);

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-sans text-sm font-semibold tracking-[0.05em] text-ink">{t("nav.brand")}</p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-soft">
            {t("nav.brandSubtitleDesktop")}
          </p>
        </div>

        <Card className="p-6 shadow-soft-lg sm:p-8">
          <h1 className="font-display text-xl italic text-ink">{t("login.title")}</h1>
          <p className="mt-1 text-sm text-ink-soft">{t("login.subtitle")}</p>

          <div className="mt-6">
            <LoginForm locale={locale} dict={dict} />
          </div>
        </Card>
      </div>
    </main>
  );
}
