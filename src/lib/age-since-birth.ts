/** 誕生日（月は 1–12） */
export const PROFILE_BIRTH = { year: 1993, month: 11, day: 13 };

export function getAgeYears(now: Date = new Date()): number {
  const { year, month, day } = PROFILE_BIRTH;
  const birth = new Date(year, month - 1, day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let years = today.getFullYear() - birth.getFullYear();
  const birthdayThisYear = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  if (today < birthdayThisYear) {
    years -= 1;
  }

  return years;
}

export function formatAgeYears(now: Date = new Date()): string {
  return `${getAgeYears(now)} years old 🙋`;
}
