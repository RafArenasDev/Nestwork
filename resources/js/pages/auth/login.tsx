import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import FirebaseSessionController from '@/actions/App/Http/Controllers/Auth/FirebaseSessionController';
import TeamInvitationAlert from '@/components/team-invitation-alert';
import TermsAndConditionsModal from '@/components/terms-and-conditions-modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useLocale } from '@/hooks/use-locale';
import { signInWithGoogle } from '@/lib/firebase';
import type { TeamInvitationContext } from '@/types';

type Props = {
    status?: string;
    teamInvitation?: TeamInvitationContext | null;
};

export default function Login({ status, teamInvitation }: Props) {
    const { t } = useLocale();
    const [showTerms, setShowTerms] = useState(false);
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGoogleSignIn = async () => {
        setError(null);
        setIsSigningIn(true);

        try {
            const idToken = await signInWithGoogle();

            router.post(
                FirebaseSessionController.store().url,
                { id_token: idToken },
                {
                    onError: () => setError(t.auth.genericError),
                    onFinish: () => setIsSigningIn(false),
                },
            );
        } catch {
            setError(t.auth.genericError);
            setIsSigningIn(false);
        }
    };

    return (
        <>
            <Head title="Log in" />

            {teamInvitation && (
                <TeamInvitationAlert
                    invitation={teamInvitation}
                    action="Log in"
                />
            )}

            <div className="flex flex-col gap-6">
                <Button
                    type="button"
                    className="w-full gap-2"
                    disabled={isSigningIn}
                    onClick={handleGoogleSignIn}
                    data-test="google-login-button"
                >
                    {isSigningIn ? (
                        <Spinner />
                    ) : (
                        <GoogleIcon className="size-4" />
                    )}
                    {isSigningIn ? t.auth.signingIn : t.auth.continueWithGoogle}
                </Button>

                {error && (
                    <p className="text-destructive text-center text-sm">
                        {error}
                    </p>
                )}
            </div>

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}

            <p className="text-muted-foreground mt-8 text-center text-xs">
                © 2026–{new Date().getFullYear()} Nestwork ·{' '}
                <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    className="hover:text-foreground underline underline-offset-2"
                >
                    {t.terms.linkLabel}
                </button>
            </p>

            <TermsAndConditionsModal
                open={showTerms}
                onOpenChange={setShowTerms}
            />
        </>
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

Login.layout = {
    title: 'Log in to your account',
    description: 'Sign in with your Google account to continue',
};
