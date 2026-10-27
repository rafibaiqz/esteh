import { BALANCE } from '../data/balance';

export const WEEKDAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const DAYS_PER_MONTH = 28;

/** 0 = Senin … 6 = Minggu. Day 1 of the game is a Monday. */
export const dayOfWeek = (day: number): number => (day - 1) % 7;
export const dayOfMonth = (day: number): number => ((day - 1) % DAYS_PER_MONTH) + 1;
export const monthOf = (day: number): number => Math.floor((day - 1) / DAYS_PER_MONTH) + 1;
export const isWeekend = (day: number): boolean => BALANCE.weekend.days.includes(dayOfWeek(day));
