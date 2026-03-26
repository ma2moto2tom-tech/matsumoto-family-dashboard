import { Transaction } from '../types';

interface Props {
  onUpload: (newTransactions: Transaction[]) => void;
}

export default function CsvUploader({ onUpload }: Props) {
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      if (lines.length < 2) return;

      const transactions: Transaction[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current);

        if (values.length >= 10) {
          transactions.push({
            calculationTarget: parseInt(values[0]) || 0,
            date: values[1],
            description: values[2],
            amount: parseInt(values[3]) || 0,
            institution: values[4],
            category: values[5],
            subcategory: values[6],
            memo: values[7],
            transfer: parseInt(values[8]) || 0,
            id: values[9] || `uploaded-${i}`,
          });
        }
      }

      if (transactions.length > 0) {
        onUpload(transactions);
      }
    };

    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  return (
    <label className="cursor-pointer text-[13px] text-[#007AFF] hover:text-[#0056b3] font-medium transition-colors">
      CSVを追加
      <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
    </label>
  );
}
