// Feriados nacionais brasileiros (considerando apenas dias fixos, não móveis como Carnaval)
const FIXED_HOLIDAYS = [
  { month: 0, day: 1 },   // Confraternização Universal
  { month: 3, day: 21 },  // Tiradentes
  { month: 4, day: 1 },   // Dia do Trabalhador
  { month: 6, day: 9 },   // Independência do Brasil (7 de set? Corrigir) 
  // Vamos usar formato ISO: MM-DD
];

// Melhor usar uma lista mais precisa
const HOLIDAYS = [
  '01-01', // Ano Novo
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalho
  '09-07', // Independência
  '10-12', // Nossa Sra. Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '12-25'  // Natal
];

export function isHoliday(date) {
  const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return HOLIDAYS.includes(monthDay);
}

export function isWorkingDay(date) {
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  return !isWeekend && !isHoliday(date);
}

export function countWorkingDays(startDate, endDate) {
  let count = 0;
  let current = new Date(startDate);
  while (current <= endDate) {
    if (isWorkingDay(current)) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}