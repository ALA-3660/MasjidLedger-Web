import { formatDate, Language } from './i18n';

export interface JumaDisplayInfo {
  isJuma: boolean;
  title: string;
  countingTeam: string;
  witness: string;
  rawCountingTeam: string;
  rawWitness: string;
  description: string;
}

export function getJumaDisplayDetails(item: any, language?: Language | string): JumaDisplayInfo {
  const reference = String(item?.reference || '');
  const description = String(item?.description || '');
  const donorName = String(item?.donorName || '');
  const date = String(item?.date || '');
  const lang: Language = language === 'en' ? 'en' : 'bn';

  const isJuma =
    reference.includes('জুমা') ||
    description.includes('জুমা') ||
    donorName.includes('জুমা') ||
    item?.category === 'JUMA';

  const dateFormatted = date ? formatDate(date, lang) : '';
  const title = `জুমার কালেকশন — ${dateFormatted}`;

  let team = '';
  if (item?.countingTeam) {
    team = Array.isArray(item.countingTeam) ? item.countingTeam.join(', ') : String(item.countingTeam);
  } else if (description.includes('গণনা টিম:')) {
    const afterTeam = description.split('গণনা টিম:')[1] || '';
    team = afterTeam.split(/[।.|;]|সাক্ষী:/)[0].trim();
  }

  let witness = '';
  if (item?.witness) {
    witness = String(item.witness);
  } else if (description.includes('সাক্ষী:')) {
    const afterWitness = description.split('সাক্ষী:')[1] || '';
    witness = afterWitness.split(/[।.|;]/)[0].trim();
  }

  return {
    isJuma,
    title,
    countingTeam: team || 'উল্লেখ করা হয়নি',
    witness: witness || 'উল্লেখ করা হয়নি',
    rawCountingTeam: team,
    rawWitness: witness,
    description: description.replace(/^(পবিত্র )?জুমার সাধারণ কালেকশন[\s.]*/i, '').trim(),
  };
}
