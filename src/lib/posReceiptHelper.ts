import { IncomeEntry, ExpenseEntry, Donation } from '../types';

export type IncomeReceiptCategory = 'DONATION' | 'RENT' | 'SALES' | 'OTHER';

/**
 * Categorize income/receipt into one of the 4 standard types for POS footer messages:
 * 1. DONATION (দান, অনুদান, সদকা, যাকাত, ফিতরা, নির্মাণ তহবিল, উন্নয়ন, জুমা, দানবাক্স)
 * 2. RENT (ওয়াকফ সম্পত্তি, দোকান ভাড়া, জমির ভাড়া, মার্কেট/ফ্ল্যাট ভাড়া, লিজ)
 * 3. SALES (পণ্য বিক্রয়, ডাব বিক্রয়, পুরাতন সামগ্রী বিক্রয়, ফল/গাছ/মাছ বিক্রয়)
 * 4. OTHER (অন্যান্য সকল আয় ও প্রাপ্তি)
 */
export function determineIncomeReceiptCategory(
  item: IncomeEntry | ExpenseEntry | Donation | null | undefined,
  type: 'INCOME' | 'EXPENSE' | 'DONATION'
): IncomeReceiptCategory {
  if (!item) return 'OTHER';
  if (type === 'DONATION') return 'DONATION';
  if (type === 'EXPENSE') return 'OTHER';

  // Gather text tokens from all relevant fields
  const tokens: string[] = [];

  if ('category' in item && item.category) {
    tokens.push(String(item.category));
  }
  if ('mainHeadNameBn' in item && item.mainHeadNameBn) {
    tokens.push(String(item.mainHeadNameBn));
  }
  if ('subHeadNameBn' in item && (item as IncomeEntry).subHeadNameBn) {
    tokens.push(String((item as IncomeEntry).subHeadNameBn));
  }
  if ('description' in item && item.description) {
    tokens.push(String(item.description));
  }
  if ('reference' in item && item.reference) {
    tokens.push(String(item.reference));
  }

  const combinedText = tokens.join(' ').toLowerCase();

  // 1. RENT CHECK (ভাড়া / লিজ / মার্কেট / দোকান / ওয়াকফ ভাড়া / ফ্ল্যাট ইত্যাদি)
  const rentKeywords = [
    'ভাড়া',
    'ভাড়া',
    'দোকান',
    'মার্কেট',
    'মার্কেট ভাড়া',
    'দোকান ভাড়া',
    'ওয়াকফ',
    'ওয়াকফ',
    'জমি ভাড়া',
    'জমির ভাড়া',
    'ফ্ল্যাট',
    'বাসা',
    'রেন্ট',
    'লিজ',
    'ইজারা',
    'rent',
    'lease',
    'shop',
    'market',
    'flat',
    'tenant',
  ];
  if (rentKeywords.some((kw) => combinedText.includes(kw))) {
    return 'RENT';
  }

  // 2. SALES CHECK (বিক্রয় / বিক্রি / পণ্য / ডাব / পুরাতন সামগ্রী ইত্যাদি)
  const salesKeywords = [
    'বিক্রয়',
    'বিক্রি',
    'পণ্য',
    'ডাব',
    'পুরাতন',
    'সামগ্রী বিক্রয়',
    'গাছ বিক্রয়',
    'ফল বিক্রয়',
    'মাছ বিক্রয়',
    'নিলাম',
    'স্ক্র্যাপ',
    'sale',
    'sales',
    'sell',
    'sold',
    'auction',
  ];
  if (salesKeywords.some((kw) => combinedText.includes(kw))) {
    return 'SALES';
  }

  // 3. DONATION CHECK (দান, অনুদান, সদকা, যাকাত, ফিতরা, উন্নয়ন, নির্মাণ, জুমা, বাক্স ইত্যাদি)
  const donationKeywords = [
    'দান',
    'অনুদান',
    'সদকা',
    'সাদাকাহ',
    'সাদকা',
    'যাকাত',
    'জাকাত',
    'ফিতরা',
    'ফিৎরা',
    'উন্নয়ন',
    'উন্নয়ন',
    'নির্মাণ',
    'তহবিল',
    'জুমা',
    'জুমুআ',
    'জুমু\'আ',
    'বাক্স',
    'বক্স',
    'কালেকশন',
    'donation',
    'sadakah',
    'sadaqah',
    'zakat',
    'fitra',
    'juma',
    'jummah',
    'collection',
    'box',
  ];
  if (donationKeywords.some((kw) => combinedText.includes(kw))) {
    return 'DONATION';
  }

  // 4. Fallback to OTHER
  return 'OTHER';
}

/**
 * Returns the exact context-aware Islamic du'a or acknowledgement message for POS print receipts.
 */
export function getSmartPosReceiptFooter(
  item: IncomeEntry | ExpenseEntry | Donation | null | undefined,
  type: 'INCOME' | 'EXPENSE' | 'DONATION'
): string {
  if (type === 'EXPENSE') {
    return 'ব্যয় যথাযথভাবে হিসাবভুক্ত ও অনুমোদিত হয়েছে।';
  }

  const category = determineIncomeReceiptCategory(item, type);

  switch (category) {
    case 'DONATION':
      return 'আল্লাহ তাআলা আপনার দান কবুল করুন ও উত্তম প্রতিদান দিন করুন। (আমিন)';
    case 'RENT':
      return 'আপনার ভাড়া পরিশোধের জন্য ধন্যবাদ। আল্লাহ তাআলা আপনার রিজিকে বরকত দিন। (আমিন)';
    case 'SALES':
      return 'আপনার ক্রয়ের জন্য ধন্যবাদ। আল্লাহ তাআলা আপনার রিজিকে বরকত দিন। (আমিন)';
    case 'OTHER':
    default:
      return 'আপনার সহযোগিতার জন্য আন্তরিক ধন্যবাদ। আল্লাহ তাআলা আপনার রিজিকে বরকত দিন। (আমিন)';
  }
}
