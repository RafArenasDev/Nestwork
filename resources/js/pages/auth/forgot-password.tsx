import { Head, Link, useForm } from '@inertiajs/react';
import PasswordResetLinkController from '@/actions/App/Http/Controllers/Auth/PasswordResetLinkController';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useLocale } from '@/hooks/use-locale';

export default function ForgotPassword({ status }: { status?: string }) {
    const { t } = useLocale();
    const form = useForm({ email: '' });

    return (
        <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] p-6 text-[var(--foreground)]">
            <Head title={t.auth.forgotPasswordTitle} />

            <div className="w-full max-w-sm">
                <div className="mb-6 flex flex-col items-center gap-2 text-center">
                    <AppLogoIcon className="size-9 fill-current text-[var(--foreground)]" />
                    <h1 className="text-xl font-semibold">
                        {t.auth.forgotPasswordTitle}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {t.auth.forgotPasswordDescription}
                    </p>
                </div>

                {status && (
                    <div className="mb-4 text-center text-sm font-medium text-green-600">
                        {status}
                    </div>
                )}

                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.post(PasswordResetLinkController.store().url);
                    }}
                    className="flex flex-col gap-4"
                >
                    <div className="grid gap-2">
                        <Label htmlFor="email">{t.auth.emailLabel}</Label>
                        <Input
                            id="email"
                            className="h-11 rounded-full px-4"
                            type="email"
                            autoComplete="email"
                            autoFocus
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

                    <Button
                        type="submit"
                        className="btn-elevated h-11 w-full rounded-full"
                        disabled={form.processing}
                    >
                        {form.processing ? <Spinner /> : null}
                        {form.processing
                            ? t.auth.sendingResetLink
                            : t.auth.sendResetLink}
                    </Button>
                </form>

                <p className="text-muted-foreground mt-6 text-center text-sm">
                    <Link
                        href="/login"
                        className="text-foreground font-medium underline underline-offset-2"
                    >
                        {t.auth.backToLogin}
                    </Link>
                </p>
            </div>
        </div>
    );
}
