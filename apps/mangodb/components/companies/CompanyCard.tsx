import React from 'react';
import { Star } from 'lucide-react';

export interface CompanyData {
  id?: string | number;
  isProvider?: boolean;
  isReceiver?: boolean;
  name?: string;
  rating?: number;
  description?: string;
  phone?: string;
}

interface CompanyCardProps {
  data?: CompanyData;
}

export default function CompanyCard({ data }: CompanyCardProps) {
  const {
    isProvider = false,
    isReceiver = false,
    name = 'Company name',
    rating = 0,
    description = '',
    phone = '',
  } = data || {};

  return (
    <div
      style={{ width: '270px', height: '310px' }}
      className="bg-white rounded-lg border border-gray-100 p-4 flex flex-col justify-between shadow-sm shrink-0 box-border"
    >
      <div>
        <div className="flex gap-1.5 mb-3 h-5">
          {isProvider && (
            <span
              style={{ backgroundColor: '#D36B60' }}
              className="text-white text-[10px] px-2.5 py-0.5 rounded-full font-medium inline-block"
            >
              Provider
            </span>
          )}
          {isReceiver && (
            <span
              style={{ backgroundColor: '#66A6C5' }}
              className="text-white text-[10px] px-2.5 py-0.5 rounded-full font-medium inline-block"
            >
              Receiver
            </span>
          )}
        </div>

        <h3 className="text-base font-bold text-gray-900 mb-1.5 truncate">
          {name}
        </h3>

        <div className="flex gap-0.5 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={15}
              className={
                star <= rating
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-gray-200 text-gray-200'
              }
            />
          ))}
        </div>

        {description && (
          <p className="text-gray-600 text-xs leading-relaxed line-clamp-4">
            {description}
          </p>
        )}
      </div>

      {phone && (
        <div className="text-[11px] text-gray-400 font-normal">
          Tel. {phone}
        </div>
      )}
    </div>
  );
}