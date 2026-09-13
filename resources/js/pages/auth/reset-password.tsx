import { Head, useForm } from '@inertiajs/react';
import NewPasswordController from '@/actions/App/Http/Controllers/Auth/NewPasswordController';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useLocale } from '@/hooks/use-locale';

type Props = {
    email: string;
    token: string;
};

export default function ResetPassword({ email, token }: Props) {
    const { t } = useLocale();
    const form = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
    });

    return (
        <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] p-6 text-[var(--foreground)]">
            <Head title={t.auth.resetPasswordTitle} />

            <div className="w-full max-w-sm">
                <div className="mb-6 flex flex-col items-center gap-2 text-center">
                    <AppLogoIcon className="size-9 fill-current text-[var(--foreground)]" />
                    <h1 className="text-xl font-semibold">
                        {t.auth.resetPasswordTitle}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {t.auth.resetPasswordDescription}
                    </p>
                </div>

                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.post(NewPasswordController.store().url);
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
                        <Label htmlFor="password">{t.auth.passwordLabel}</Label>
                        <Input
                            id="password"
                            className="h-11 rounded-full px-4"
                            type="password"
                            autoComplete="new-password"
                            autoFocus
                            value={form.data.password}
                            onChange={(event) =>
                                form.setData('password', event.target.value)
                            }
                            aria-invalid={Boolean(form.errors.password)}
                        />
                        {form.errors.password && (
                            <p className="text-destructive text-sm">
                                {form.errors.password}
                            </p>
                        )}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password_confirmation">
                            {t.auth.confirmPasswordLabel}
                        </Label>
                        <Input
                            id="password_confirmation"
                            className="h-11 rounded-full px-4"
                            type="password"
                            autoComplete="new-password"
                            value={form.data.password_confirmation}
                            onChange={(event) =>
                                form.setData(
                                    'password_confirmation',
                                    event.target.value,
                                )
                            }
                            aria-invalid={Boolean(
                                form.errors.password_confirmation,
                            )}
                        />
                        {form.errors.password_confirmation && (
                            <p className="text-destructive text-sm">
                                {form.errors.password_confirmation}
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
                            ? t.auth.resettingPassword
                            : t.auth.resetPassword}
                    </Button>
                </form>
            </div>
        </div>
    );
}
