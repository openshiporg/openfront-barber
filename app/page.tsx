import Link from "next/link";
import { Logo } from "@/features/dashboard/components/Logo";

export default function Home() {
  return (
    <main className="mx-auto grid min-h-screen max-w-xl content-center gap-6 px-4 py-12">
      <Logo className="text-2xl" />
      <h1 className="text-3xl font-semibold tracking-tight">Run your own chair.</h1>
      <p className="text-muted-foreground">Bookings, deposits, tips, products and what you actually keep, for the barber who works for themselves.</p>
      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard" className="inline-flex h-11 items-center rounded-md bg-foreground px-4 text-sm font-medium text-background">Barber sign in</Link>
        <Link href="/dashboard/signup" className="inline-flex h-11 items-center rounded-md border px-4 text-sm font-medium">Create your account</Link>
      </div>
    </main>
  );
}
