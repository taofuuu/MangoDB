import CompanyCard, { CompanyData } from '../../components/companies/CompanyCard';
import { ChevronDown, LayoutGrid, Menu } from 'lucide-react';

export default function CompaniesPage() {
  const sampleCardData: CompanyData = {
    id: 1,
    isProvider: true,
    isReceiver: false,
    name: 'Uwira Company',
    rating: 3,
    description: 'Company Description',
    phone: '081-เปิดไก่-ไก่เปิด',
  };

  const emptyCards: CompanyData[] = [
    { isReceiver: true, name: 'Company name', rating: 4 },
    { isProvider: true, isReceiver: true, name: 'Company name', rating: 2 },
    { isProvider: true, isReceiver: true, name: 'Company name', rating: 5 },
    { isProvider: true, name: 'Pornpanit Ubuntu', rating: 3 },
    { isReceiver: true, name: 'Company name', rating: 4 },
    { isProvider: true, isReceiver: true, name: 'Company name', rating: 2 },
    { isProvider: true, isReceiver: true, name: 'Company name', rating: 5 },
  ];

  return (
    <main className="min-h-screen p-8 bg-[#FBFBFB]">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1
              style={{ fontSize: '32px' }}
              className="font-bold text-gray-900 leading-tight"
            >
              Companies
            </h1>
            <h2
              style={{ fontSize: '20px' }}
              className="font-normal text-gray-600 leading-tight mt-1"
            >
              List of companies on the platform
            </h2>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <button className="flex items-center gap-1.5 text-xs text-gray-600 font-medium px-2.5 py-1 rounded hover:bg-gray-100">
              ALL <ChevronDown size={14} />
            </button>
            <div className="flex gap-1 bg-gray-200 p-0.5 rounded">
              <button className="p-1 bg-white rounded shadow-sm text-gray-800">
                <LayoutGrid size={16} />
              </button>
              <button className="p-1 text-gray-500 hover:text-gray-800">
                <Menu size={16} />
              </button>
            </div>
          </div>
        </div>

        <div
          style={{ gap: '32px' }}
          className="flex flex-wrap justify-center items-start"
        >
          <CompanyCard data={sampleCardData} />
          {emptyCards.map((data, index) => (
            <CompanyCard key={index} data={data} />
          ))}
        </div>
      </div>
    </main>
  );
}