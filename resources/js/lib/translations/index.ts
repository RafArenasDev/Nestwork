import en, { type Dictionary } from './en';
import es from './es';

export type { Dictionary };

export const translations: Record<'en' | 'es', Dictionary> = { en, es };

export type Locale = keyof typeof translations;

export const SUPPORTED_LOCALES: Locale[] = ['en', 'es'];

export const isSupportedLocale = (value: string): value is Locale =>
    (SUPPORTED_LOCALES as string[]).includes(value);
