import { redirect } from "next/navigation";

/**
 * Alias do painel principal: mantém o caminho `/dashboard/painel` (usado nos
 * CTAs da Landing Page) apontando para o painel existente em `/dashboard`.
 */
export default function PainelPage() {
  redirect("/dashboard");
}