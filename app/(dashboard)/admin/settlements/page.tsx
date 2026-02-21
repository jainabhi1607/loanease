import { redirect } from 'next/navigation';

export default function SettlementsPage() {
  redirect('/admin/settlements/upcoming');
}
