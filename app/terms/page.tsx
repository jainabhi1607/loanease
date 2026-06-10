import Link from 'next/link';
import { getDatabase } from '@/lib/mongodb/client';

export const metadata = {
  title: 'Terms & Conditions — Loanease',
  description: 'Loanease referrer agreement and terms of service.',
};

export const dynamic = 'force-dynamic';

async function getTerms(): Promise<string> {
  try {
    const db = await getDatabase();
    const setting = await db.collection('global_settings').findOne({ key: 'terms_and_conditions' });
    return setting?.value || '';
  } catch {
    return '';
  }
}

export default async function TermsPage() {
  const termsHtml = await getTerms();

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-[#02383B] hover:underline">
            ← Loanease
          </Link>
          <span className="text-xs text-gray-500">Terms &amp; Conditions</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-bold text-[#02383B] mb-2">Terms &amp; Conditions</h1>
        <p className="text-sm text-gray-500 mb-8">
          Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        {termsHtml ? (
          <article
            className="prose prose-sm sm:prose-base max-w-none prose-headings:text-[#02383B] prose-a:text-[#1a8cba]"
            dangerouslySetInnerHTML={{ __html: termsHtml }}
          />
        ) : (
          <p className="text-gray-600">
            Terms &amp; Conditions are being prepared. Please contact{' '}
            <a href="mailto:support@loanease.com" className="text-[#1a8cba] underline">
              support@loanease.com
            </a>{' '}
            for the latest version.
          </p>
        )}

        <div className="mt-12 pt-6 border-t border-gray-200 text-xs text-gray-500">
          <p>
            For questions about these terms, contact us at{' '}
            <a href="mailto:support@loanease.com" className="underline">support@loanease.com</a>.
          </p>
          <p className="mt-2">
            <Link href="/privacy" className="underline">Privacy Policy</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
