import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import FirebaseSessionController from '@/actions/App/Http/Controllers/Auth/FirebaseSessionController';
import PasswordAuthController from '@/actions/App/Http/Controllers/Auth/PasswordAuthController';
import AppLogoIcon from '@/components/app-logo-icon';
import TeamInvitationAlert from '@/components/team-invitation-alert';
import TermsAndConditionsModal from '@/components/terms-and-conditions-modal';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useLocale } from '@/hooks/use-locale';
import { signInWithGoogle } from '@/lib/firebase';
import type { TeamInvitationContext } from '@/types';

type Panel = 'login' | 'register';

type CountryOption = {
    iso2: string;
    name: string;
    flag_url: string | null;
};

type Props = {
    status?: string;
    teamInvitation?: TeamInvitationContext | null;
    initialPanel?: Panel;
    countries: CountryOption[];
};

export default function AuthPage({
    status,
    teamInvitation,
    initialPanel = 'login',
    countries,
}: Props) {
    const { t } = useLocale();
    const [panel, setPanel] = useState<Panel>(initialPanel);
    const [showTerms, setShowTerms] = useState(false);
    const isRegister = panel === 'register';

    return (
        <div className="bg-[var(--sidebar)]">
            <Head
                title={isRegister ? t.auth.registerTitle : t.auth.loginTitle}
            />

            {teamInvitation && (
                <div className="fixed top-4 left-1/2 z-10 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
                    <TeamInvitationAlert
                        invitation={teamInvitation}
                        action={isRegister ? 'Register' : 'Log in'}
                    />
                </div>
            )}

            <div className="h-dvh w-full overflow-hidden text-[var(--foreground)]">
                {/* Desktop: pista de 3 paneles (login | marca | registro),
                    la ventana sólo muestra 2 a la vez — deslizar un panel
                    de ancho revela el otro lado, con el panel de marca
                    siempre entre los dos formularios. */}
                <div className="hidden h-full lg:block">
                    <div className="relative h-full w-full overflow-hidden">
                        <div
                            className="flex h-full w-[150%] transition-transform duration-500 ease-in-out"
                            style={{
                                transform: isRegister
                                    ? 'translateX(-33.3333%)'
                                    : 'translateX(0%)',
                            }}
                        >
                            <div className="w-1/3 shrink-0">
                                <FormPane
                                    t={t}
                                    onShowTerms={() => setShowTerms(true)}
                                >
                                    <SignInForm status={status} t={t} />
                                    <SwitchPrompt
                                        promptKey="noAccountYet"
                                        actionKey="createAccount"
                                        onClick={() => setPanel('register')}
                                        t={t}
                                    />
                                </FormPane>
                            </div>
                            <div className="w-1/3 shrink-0">
                                <BrandPane
                                    mode={panel}
                                    onSwitch={() =>
                                        setPanel(
                                            isRegister ? 'login' : 'register',
                                        )
                                    }
                                    t={t}
                                />
                            </div>
                            <div className="w-1/3 shrink-0">
                                <FormPane
                                    t={t}
                                    onShowTerms={() => setShowTerms(true)}
                                >
                                    <SignUpForm t={t} countries={countries} />
                                    <SwitchPrompt
                                        promptKey="alreadyHaveAccount"
                                        actionKey="backToSignIn"
                                        onClick={() => setPanel('login')}
                                        t={t}
                                    />
                                </FormPane>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile: una sola columna, cambio con fundido (nunca el
                    slide horizontal — se ve roto en pantallas angostas). */}
                <div className="h-dvh overflow-y-auto bg-[var(--background)] lg:hidden">
                    <div className="mx-auto flex min-h-dvh max-w-sm flex-col p-6 sm:p-10">
                        <div className="mb-6 flex flex-col items-center gap-2 text-center">
                            <AppLogoIcon className="size-9 fill-current text-[var(--foreground)]" />
                            <h1 className="text-xl font-semibold">
                                {isRegister
                                    ? t.auth.registerTitle
                                    : t.auth.loginTitle}
                            </h1>
                            <p className="text-muted-foreground text-sm">
                                {isRegister
                                    ? t.auth.registerDescription
                                    : t.auth.loginDescription}
                            </p>
                        </div>

                        <div
                            key={panel}
                            className="animate-in fade-in duration-300"
                        >
                            {isRegister ? (
                                <SignUpForm t={t} countries={countries} />
                            ) : (
                                <SignInForm status={status} t={t} />
                            )}
                        </div>

                        <SwitchPrompt
                            promptKey={
                                isRegister
                                    ? 'alreadyHaveAccount'
                                    : 'noAccountYet'
                            }
                            actionKey={
                                isRegister ? 'backToSignIn' : 'createAccount'
                            }
                            onClick={() =>
                                setPanel(isRegister ? 'login' : 'register')
                            }
                            t={t}
                        />

                        <p className="text-muted-foreground mt-auto pt-6 text-center text-xs">
                            © 2026–{new Date().getFullYear()} Nestwork ·{' '}
                            <button
                                type="button"
                                onClick={() => setShowTerms(true)}
                                className="hover:text-foreground underline underline-offset-2"
                            >
                                {t.terms.linkLabel}
                            </button>
                        </p>
                    </div>
                </div>
            </div>

            <TermsAndConditionsModal
                open={showTerms}
                onOpenChange={setShowTerms}
            />
        </div>
    );
}

function FormPane({
    children,
    t,
    onShowTerms,
}: {
    children: React.ReactNode;
    t: ReturnType<typeof useLocale>['t'];
    onShowTerms: () => void;
}) {
    return (
        <div className="flex h-full flex-col bg-[var(--background)] p-10 sm:p-12">
            <div className="m-auto w-full max-w-sm">{children}</div>
            <p className="text-muted-foreground text-center text-xs">
                © 2026–{new Date().getFullYear()} Nestwork ·{' '}
                <button
                    type="button"
                    onClick={onShowTerms}
                    className="hover:text-foreground underline underline-offset-2"
                >
                    {t.terms.linkLabel}
                </button>
            </p>
        </div>
    );
}

/** Panel de marca: siempre lleva logo + descripción editorial + CTA — el
 *  contenido cambia según a qué lado te está por llevar el CTA, nunca
 *  se queda vacío ni duplica el formulario. */
function BrandPane({
    mode,
    onSwitch,
    t,
}: {
    mode: Panel;
    onSwitch: () => void;
    t: ReturnType<typeof useLocale>['t'];
}) {
    const isRegister = mode === 'register';

    return (
        <div className="bg-sidebar text-sidebar-foreground flex h-full flex-col items-center justify-center gap-6 p-10 text-center">
            <AppLogoIcon className="size-12 fill-current text-white" />
            <div className="space-y-2">
                <p className="text-lg font-semibold">Nestwork</p>
                <p className="text-sm text-white/70">
                    {isRegister
                        ? t.auth.brandTaglineSignIn
                        : t.auth.brandTaglineSignUp}
                </p>
            </div>
            <Button
                type="button"
                variant="outline"
                className="h-11 rounded-full border-white/30 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
                onClick={onSwitch}
            >
                {isRegister ? t.auth.backToSignIn : t.auth.createAccount}
            </Button>
        </div>
    );
}

function SwitchPrompt({
    promptKey,
    actionKey,
    onClick,
    t,
}: {
    promptKey: 'noAccountYet' | 'alreadyHaveAccount';
    actionKey: 'createAccount' | 'backToSignIn';
    onClick: () => void;
    t: ReturnType<typeof useLocale>['t'];
}) {
    return (
        <p className="text-muted-foreground mt-6 text-center text-sm lg:hidden">
            {t.auth[promptKey]}{' '}
            <button
                type="button"
                onClick={onClick}
                className="text-foreground font-medium underline underline-offset-2"
            >
                {t.auth[actionKey]}
            </button>
        </p>
    );
}

function PasswordInput({
    id,
    autoComplete,
    value,
    onChange,
    invalid = false,
}: {
    id: string;
    autoComplete: string;
    value: string;
    onChange: (value: string) => void;
    invalid?: boolean;
}) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="relative">
            <Input
                id={id}
                type={visible ? 'text' : 'password'}
                autoComplete={autoComplete}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                aria-invalid={invalid}
                className={`h-11 rounded-full px-4 pr-11 ${invalid ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
            />
            <button
                type="button"
                onClick={() => setVisible((prev) => !prev)}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3.5 -translate-y-1/2"
                aria-label={visible ? 'Hide password' : 'Show password'}
                tabIndex={-1}
            >
                {visible ? (
                    <EyeOff className="size-4" />
                ) : (
                    <Eye className="size-4" />
                )}
            </button>
        </div>
    );
}

/** Reglas de contraseña visibles en vivo — deben calzar con
 *  Password::min(12)->mixedCase()->numbers()->symbols() en
 *  RegisterRequest (backend), no son sólo cosméticas acá. */
function passwordRuleChecks(password: string) {
    return [
        { key: 'length', met: password.length >= 12 },
        { key: 'uppercase', met: /[A-Z]/.test(password) },
        { key: 'lowercase', met: /[a-z]/.test(password) },
        { key: 'number', met: /[0-9]/.test(password) },
        { key: 'symbol', met: /[^A-Za-z0-9]/.test(password) },
    ] as const;
}

function PasswordStrengthHint({
    password,
    t,
}: {
    password: string;
    t: ReturnType<typeof useLocale>['t'];
}) {
    if (!password) {
        return null;
    }

    const unmet = passwordRuleChecks(password).filter((rule) => !rule.met);

    if (unmet.length === 0) {
        return null;
    }

    return (
        <ul className="text-destructive space-y-0.5 text-xs">
            {unmet.map((rule) => (
                <li key={rule.key}>• {t.auth.passwordRules[rule.key]}</li>
            ))}
        </ul>
    );
}

function GoogleButton({
    onClick,
    isSigningIn,
    t,
}: {
    onClick: () => void;
    isSigningIn: boolean;
    t: ReturnType<typeof useLocale>['t'];
}) {
    return (
        <Button
            type="button"
            variant="outline"
            className="h-11 w-full gap-2 rounded-full"
            disabled={isSigningIn}
            onClick={onClick}
            data-test="google-login-button"
        >
            {isSigningIn ? <Spinner /> : <GoogleIcon className="size-4" />}
            {isSigningIn ? t.auth.signingIn : t.auth.continueWithGoogle}
        </Button>
    );
}

function Divider({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-3 text-xs">
            <span className="bg-border h-px flex-1" />
            <span className="text-muted-foreground">{label}</span>
            <span className="bg-border h-px flex-1" />
        </div>
    );
}

function SignInForm({
    status,
    t,
}: {
    status?: string;
    t: ReturnType<typeof useLocale>['t'];
}) {
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [googleError, setGoogleError] = useState<string | null>(null);
    const form = useForm({ email: '', password: '' });

    const handleGoogleSignIn = async () => {
        setGoogleError(null);
        setIsSigningIn(true);

        try {
            const idToken = await signInWithGoogle();

            form.transform(() => ({ id_token: idToken }));
            form.post(FirebaseSessionController.store().url, {
                onError: () => setGoogleError(t.auth.genericError),
                onFinish: () => setIsSigningIn(false),
            });
        } catch {
            setGoogleError(t.auth.genericError);
            setIsSigningIn(false);
        }
    };

    return (
        <div className="flex flex-col gap-5">
            <div className="hidden text-left lg:block">
                <h1 className="text-xl font-semibold">{t.auth.loginTitle}</h1>
                <p className="text-muted-foreground text-sm">
                    {t.auth.loginDescription}
                </p>
            </div>

            <GoogleButton
                onClick={handleGoogleSignIn}
                isSigningIn={isSigningIn}
                t={t}
            />
            {googleError && (
                <p className="text-destructive text-center text-sm">
                    {googleError}
                </p>
            )}

            <Divider label={t.auth.orContinueWithEmail} />

            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post(PasswordAuthController.login().url);
                }}
                className="flex flex-col gap-4"
            >
                <div className="grid gap-2">
                    <Label htmlFor="login-email">{t.auth.emailLabel}</Label>
                    <Input
                        id="login-email"
                        className="h-11 rounded-full px-4"
                        type="email"
                        autoComplete="email"
                        value={form.data.email}
                        onChange={(event) =>
                            form.setData('email', event.target.value)
                        }
                    />
                    {form.errors.email && (
                        <p className="text-destructive text-sm">
                            {form.errors.email}
                        </p>
                    )}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="login-password">
                        {t.auth.passwordLabel}
                    </Label>
                    <PasswordInput
                        id="login-password"
                        autoComplete="current-password"
                        value={form.data.password}
                        onChange={(value) => form.setData('password', value)}
                        invalid={Boolean(form.errors.password)}
                    />
                    {form.errors.password && (
                        <p className="text-destructive text-sm">
                            {form.errors.password}
                        </p>
                    )}
                </div>
                <Button
                    type="submit"
                    className="h-11 w-full rounded-full"
                    disabled={form.processing}
                >
                    {form.processing ? <Spinner /> : null}
                    {t.auth.signIn}
                </Button>
            </form>

            {status && (
                <div className="text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}
        </div>
    );
}

function SignUpForm({
    t,
    countries,
}: {
    t: ReturnType<typeof useLocale>['t'];
    countries: CountryOption[];
}) {
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [googleError, setGoogleError] = useState<string | null>(null);
    const form = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        country: '',
    });

    const handleGoogleSignUp = async () => {
        setGoogleError(null);
        setIsSigningIn(true);

        try {
            const idToken = await signInWithGoogle();

            form.transform(() => ({ id_token: idToken }));
            form.post(FirebaseSessionController.store().url, {
                onError: () => setGoogleError(t.auth.genericError),
                onFinish: () => setIsSigningIn(false),
            });
        } catch {
            setGoogleError(t.auth.genericError);
            setIsSigningIn(false);
        }
    };

    return (
        <div className="flex flex-col gap-5">
            <div className="hidden text-left lg:block">
                <h1 className="text-xl font-semibold">
                    {t.auth.registerTitle}
                </h1>
                <p className="text-muted-foreground text-sm">
                    {t.auth.registerDescription}
                </p>
            </div>

            <GoogleButton
                onClick={handleGoogleSignUp}
                isSigningIn={isSigningIn}
                t={t}
            />
            {googleError && (
                <p className="text-destructive text-center text-sm">
                    {googleError}
                </p>
            )}

            <Divider label={t.auth.orContinueWithEmail} />

            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    form.post(PasswordAuthController.store().url);
                }}
                className="flex flex-col gap-4"
            >
                <div className="grid gap-2">
                    <Label htmlFor="register-name">{t.auth.nameLabel}</Label>
                    <Input
                        id="register-name"
                        className="h-11 rounded-full px-4"
                        autoComplete="name"
                        value={form.data.name}
                        onChange={(event) =>
                            form.setData('name', event.target.value)
                        }
                    />
                    {form.errors.name && (
                        <p className="text-destructive text-sm">
                            {form.errors.name}
                        </p>
                    )}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="register-email">{t.auth.emailLabel}</Label>
                    <Input
                        id="register-email"
                        className="h-11 rounded-full px-4"
                        type="email"
                        autoComplete="email"
                        value={form.data.email}
                        onChange={(event) =>
                            form.setData('email', event.target.value)
                        }
                    />
                    {form.errors.email && (
                        <p className="text-destructive text-sm">
                            {form.errors.email}
                        </p>
                    )}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="register-password">
                        {t.auth.passwordLabel}
                    </Label>
                    <PasswordInput
                        id="register-password"
                        autoComplete="new-password"
                        value={form.data.password}
                        onChange={(value) => form.setData('password', value)}
                        invalid={
                            Boolean(form.errors.password) ||
                            (form.data.password !== '' &&
                                passwordRuleChecks(form.data.password).some(
                                    (rule) => !rule.met,
                                ))
                        }
                    />
                    <PasswordStrengthHint password={form.data.password} t={t} />
                    {form.errors.password && (
                        <p className="text-destructive text-sm">
                            {form.errors.password}
                        </p>
                    )}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="register-password-confirmation">
                        {t.auth.confirmPasswordLabel}
                    </Label>
                    <PasswordInput
                        id="register-password-confirmation"
                        autoComplete="new-password"
                        value={form.data.password_confirmation}
                        onChange={(value) =>
                            form.setData('password_confirmation', value)
                        }
                        invalid={
                            form.data.password_confirmation !== '' &&
                            form.data.password_confirmation !==
                                form.data.password
                        }
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="register-country">
                        {t.auth.countryLabel}
                    </Label>
                    <Combobox
                        triggerId="register-country"
                        value={form.data.country || null}
                        onChange={(value) => form.setData('country', value)}
                        options={countries.map((country) => ({
                            value: country.iso2,
                            label: country.name,
                            iconUrl: country.flag_url ?? undefined,
                        }))}
                        placeholder={t.auth.countryPlaceholder}
                        searchPlaceholder={t.auth.countrySearch}
                    />
                    {form.errors.country && (
                        <p className="text-destructive text-sm">
                            {form.errors.country}
                        </p>
                    )}
                </div>
                <Button
                    type="submit"
                    className="h-11 w-full rounded-full"
                    disabled={form.processing}
                >
                    {form.processing ? <Spinner /> : null}
                    {form.processing ? t.auth.creatingAccount : t.auth.signUp}
                </Button>
            </form>
        </div>
    );
}

function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
            <path
                fill="#4285F4"
                d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.8Z"
            />
            <path
                fill="#34A853"
                d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.1C3.24 21.3 7.28 24 12 24Z"
            />
            <path
                fill="#FBBC05"
                d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.26a12 12 0 0 0 0 10.78l4.01-3.1Z"
            />
            <path
                fill="#EA4335"
                d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.28 0 3.24 2.7 1.26 6.61l4.01 3.1C6.22 6.88 8.87 4.77 12 4.77Z"
            />
        </svg>
    );
}
