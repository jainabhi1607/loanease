'use client';

import Link from 'next/link';
import { Settings as SettingsIcon, FileText, Clock, ArrowRight } from 'lucide-react';

interface SettingCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}

const settingCards: SettingCard[] = [
  {
    title: 'General Settings',
    description: 'View and edit general settings',
    icon: <SettingsIcon className="h-5 w-5 text-[#02383B]" />,
    href: '/admin/settings/general',
  },
  {
    title: 'Terms & Conditions',
    description: 'View and edit terms & conditions',
    icon: <FileText className="h-5 w-5 text-[#02383B]" />,
    href: '/admin/settings/terms',
  },
  {
    title: 'Login History',
    description: 'View application login history',
    icon: <Clock className="h-5 w-5 text-[#02383B]" />,
    href: '/admin/settings/login-history',
  },
];

export default function SettingsPage() {
  return (
    <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#02383B]">Settings</h1>
        <p className="text-gray-500 mt-1">
          Manage your Loanease admin settings
        </p>
      </div>

      {/* Settings Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingCards.map((card, index) => (
          <Link
            key={index}
            href={card.href}
            className="block group"
          >
            <div className="bg-white rounded-lg hover:shadow-md transition-shadow duration-200 p-6 h-full border border-gray-200 hover:border-[#00D37F]">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {card.icon}
                  </div>

                  {/* Content */}
                  <div>
                    <h3 className="text-base font-semibold text-[#02383B]">
                      {card.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {card.description}
                    </p>
                  </div>
                </div>

                {/* Arrow Icon */}
                <div className="flex-shrink-0 ml-4">
                  <div className="w-9 h-9 rounded-full border border-gray-300 group-hover:border-[#00D37F] flex items-center justify-center transition-colors duration-200">
                    <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-[#00D37F] transition-colors duration-200" />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
