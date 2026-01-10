'use client';

import Link, { LinkProps } from 'next/link';
import { useRouter } from 'next/navigation';
import NProgress from 'nprogress';
import { AnchorHTMLAttributes, MouseEvent } from 'react';

type LoadingLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
    children: React.ReactNode;
  };

export function LoadingLink({
  href,
  onClick,
  children,
  ...props
}: LoadingLinkProps) {
  const router = useRouter();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Call original onClick if provided
    if (onClick) {
      onClick(e);
    }

    // If default prevented or it's an external link, don't show loading
    if (e.defaultPrevented || (typeof href === 'string' && href.startsWith('http'))) {
      return;
    }

    // Start loading bar
    NProgress.start();

    // Use router.push for client-side navigation
    e.preventDefault();
    router.push(href.toString());
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
