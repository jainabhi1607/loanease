'use client';

import Link from 'next/link';
import { Settings as SettingsIcon, FileText, History, ArrowRight } from 'lucide-react';

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
    icon: <SettingsIcon className="h-6 w-6 text-gray-600" />,
    href: '/admin/settings/general',
  },
  {
    title: 'Terms & Conditions',
    description: 'View and edit terms & conditions',
    icon: <FileText className="h-6 w-6 text-gray-600" />,
    href: '/admin/settings/terms',
  },
  {
    title: 'Login History',
    description: 'View login history',
    icon: <History className="h-6 w-6 text-gray-600" />,
    href: '/admin/settings/login-history',
  },
];

export default function SettingsPage() {
  return (
    <div className="max-w-[1290px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#02383B]">Settings</h1>
          <p className="text-gray-500 mt-1">
            Manage system settings and configurations
          </p>
        </div>
      </div>

      {/* Main Settings Section */}
      <div className="bg-[#EDFFD7] rounded-lg border border-gray-200 p-6">
        {/* Settings Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingCards.map((card, index) => (
            <Link
              key={index}
              href={card.href}
              className="block group"
            >
              <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-6 h-full border border-gray-200 hover:border-[#00D37F]">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      {card.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-[#02383B] mb-1">
                        {card.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {card.description}
                      </p>
                    </div>
                  </div>

                  {/* Arrow Icon */}
                  <div className="flex-shrink-0 ml-4">
                    <div className="w-10 h-10 rounded-full border-2 border-gray-300 group-hover:border-[#00D37F] flex items-center justify-center transition-colors duration-200">
                      <ArrowRight className="h-5 w-5 text-gray-600 group-hover:text-[#00D37F] transition-colors duration-200" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
