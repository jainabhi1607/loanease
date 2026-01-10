import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <main className="flex flex-col items-center gap-8">
        <h1 className="text-4xl font-bold">Loanease</h1>
        <p className="text-xl text-muted-foreground">
          Commercial Loan Referral Platform
        </p>
        <div className="flex gap-4">
          <Link href="/login">
            <Button>
              Login
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="outline">
              Register as Referrer
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}