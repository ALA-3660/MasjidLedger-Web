/**
 * Deterministic Bangla Number to Words Converter
 * Converts numeric amounts into formal Bengali currency in words.
 * Example: 1010 -> "এক হাজার দশ টাকা মাত্র"
 */

const units = [
  '',
  'এক',
  'দুই',
  'তিন',
  'চার',
  'পাঁচ',
  'ছয়',
  'সাত',
  'আট',
  'নয়',
  'দশ',
  'এগারো',
  'বারো',
  'তেরো',
  'চৌদ্দ',
  'পনেরো',
  'ষোলো',
  'সতেরো',
  'আঠারো',
  'উনিশ',
  'বিশ',
  'একুশ',
  'বাইশ',
  'তেইশ',
  'চব্বিশ',
  'পঁচিশ',
  'ছাব্বিশ',
  'সাতাশ',
  'আঠাশ',
  'উনত্রিশ',
  'ত্রিশ',
  'একত্রিশ',
  'বত্রিশ',
  'তেত্রিশ',
  'চৌত্রিশ',
  'পঁয়ত্রিশ',
  'ছত্রিশ',
  'সাঁইত্রিশ',
  'আটত্রিশ',
  'উনচল্লিশ',
  'চল্লিশ',
  'একচল্লিশ',
  'বয়াল্লিশ',
  'তেতাল্লিশ',
  'চুয়াল্লিশ',
  'পঁয়তাল্লিশ',
  'ছেচল্লিশ',
  'সাতচল্লিশ',
  'আটচল্লিশ',
  'উনপঞ্চাশ',
  'পঞ্চাশ',
  'একান্ন',
  'বায়ান্ন',
  'তিপ্পান্ন',
  'চুয়ান্ন',
  'পঞ্চান্ন',
  'ছাপ্পান্ন',
  'সাতান্ন',
  'আটান্ন',
  'উনষাট',
  'ষাট',
  'একষট্টি',
  'বাষট্টি',
  'তেষট্টি',
  'চৌষট্টি',
  'পঁয়ষট্টি',
  'ছেষট্টি',
  'সাতষট্টি',
  'আটষট্টি',
  'উনসত্তর',
  'সত্তর',
  'একাত্তর',
  'বাহাত্তর',
  'তিয়াত্তর',
  'চুয়াত্তর',
  'পঁচাত্তর',
  'ছিয়াত্তর',
  'সাতাত্তর',
  'আটাত্তর',
  'উনাশি',
  'আশি',
  'একাশি',
  'বিরাশি',
  'তিরাশি',
  'চুরাশি',
  'পঁচাশি',
  'ছিয়াশি',
  'সাতাশি',
  'আটাশি',
  'ঊননব্বই',
  'নব্বই',
  'একানব্বই',
  'বানব্বই',
  'তিরানব্বই',
  'চুরানব্বই',
  'পঁচানব্বই',
  'ছিয়ানব্বই',
  'সাতানব্বই',
  'আটানব্বই',
  'নিরানব্বই',
];

function convertBelowThousand(n: number): string {
  let str = '';
  if (n >= 100) {
    const hundreds = Math.floor(n / 100);
    str += units[hundreds] + ' শত ';
    n %= 100;
  }
  if (n > 0) {
    str += units[n] + ' ';
  }
  return str.trim();
}

export function convertNumberToBanglaWords(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const integerPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - integerPart) * 100);

  if (integerPart === 0 && decimalPart === 0) {
    return 'শূন্য টাকা মাত্র';
  }

  let words = '';

  let crore = Math.floor(integerPart / 10000000);
  let remainder = integerPart % 10000000;

  let lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;

  let thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  let hundred = remainder;

  if (crore > 0) {
    if (crore >= 100) {
      words += convertNumberToBanglaWords(crore).replace(' টাকা মাত্র', '') + ' কোটি ';
    } else {
      words += units[crore] + ' কোটি ';
    }
  }

  if (lakh > 0) {
    words += units[lakh] + ' লক্ষ ';
  }

  if (thousand > 0) {
    words += units[thousand] + ' হাজার ';
  }

  if (hundred > 0) {
    words += convertBelowThousand(hundred) + ' ';
  }

  words = words.trim();

  if (words) {
    words += ' টাকা';
  }

  if (decimalPart > 0) {
    if (words) {
      words += ' ' + units[decimalPart] + ' পয়সা';
    } else {
      words = units[decimalPart] + ' পয়সা';
    }
  }

  words += ' মাত্র';

  if (isNegative) {
    words = 'ঋণাত্মক ' + words;
  }

  return words;
}

export const numberToBanglaWords = convertNumberToBanglaWords;

export function numberToEnglishWords(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '';
  }

  const absAmount = Math.abs(amount);
  const integerPart = Math.floor(absAmount);

  if (integerPart === 0) {
    return 'Zero Taka Only';
  }

  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(num: number): string {
    if (num < 20) return a[num];
    const digit = num % 10;
    return b[Math.floor(num / 10)] + (digit ? '-' + a[digit] : '');
  }

  let words = '';
  let crore = Math.floor(integerPart / 10000000);
  let remainder = integerPart % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  let thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;
  let hundred = Math.floor(remainder / 100);
  let rest = remainder % 100;

  if (crore > 0) words += inWords(crore) + ' Crore ';
  if (lakh > 0) words += inWords(lakh) + ' Lakh ';
  if (thousand > 0) words += inWords(thousand) + ' Thousand ';
  if (hundred > 0) words += a[hundred] + ' Hundred ';
  if (rest > 0) words += (words !== '' ? 'and ' : '') + inWords(rest) + ' ';

  return words.trim() + ' Taka Only';
}

