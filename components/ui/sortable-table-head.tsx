import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';

export type SortDirection = 'asc' | 'desc' | null;

interface SortableTableHeadProps {
  label: string;
  sortKey: string;
  currentSortKey: string | null;
  currentSortDirection: SortDirection;
  onSort: (key: string) => void;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

export function SortableTableHead({
  label,
  sortKey,
  currentSortKey,
  currentSortDirection,
  onSort,
  className = '',
  align = 'left'
}: SortableTableHeadProps) {
  const isActive = currentSortKey === sortKey;
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : '';

  return (
    <TableHead
      className={`font-normal text-gray-700 cursor-pointer hover:bg-gray-100 select-none ${alignClass} ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        <span>{label}</span>
        {isActive && currentSortDirection === 'asc' && (
          <ArrowUp className="h-4 w-4 text-gray-600" />
        )}
        {isActive && currentSortDirection === 'desc' && (
          <ArrowDown className="h-4 w-4 text-gray-600" />
        )}
        {!isActive && (
          <ArrowUpDown className="h-4 w-4 text-gray-400" />
        )}
      </div>
    </TableHead>
  );
}
