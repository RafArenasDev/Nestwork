/**
 * Genera una contraseña segura de 12 caracteres garantizando al menos una
 * minúscula, una mayúscula, un número y un símbolo — usada por el botón
 * "Generar contraseña" del modal de contraseña.
 */
export function generateSecurePassword(): string {
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const numbers = '23456789';
    const symbols = '!@#$%^&*-_+=';
    const all = lower + upper + numbers + symbols;

    const pick = (chars: string) =>
        chars[Math.floor(Math.random() * chars.length)];

    const required = [pick(lower), pick(upper), pick(numbers), pick(symbols)];
    const rest = Array.from({ length: 8 }, () => pick(all));

    return [...required, ...rest].sort(() => Math.random() - 0.5).join('');
}
