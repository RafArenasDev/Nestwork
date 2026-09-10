import { Form } from '@inertiajs/react';
import { Wand2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/hooks/use-locale';
import { generateSecurePassword } from '@/lib/generate-password';

interface PasswordModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PasswordModal({ open, onOpenChange }: PasswordModalProps) {
    const { t } = useLocale();
    const currentPasswordInput = useRef<HTMLInputElement>(null);
    const passwordInput = useRef<HTMLInputElement>(null);
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');

    useEffect(() => {
        if (open) {
            setPassword('');
            setPasswordConfirmation('');
        }
    }, [open]);

    const handleGeneratePassword = () => {
        const generated = generateSecurePassword();
        setPassword(generated);
        setPasswordConfirmation(generated);
    };

    const passwordsMatch =
        password.length > 0 && password === passwordConfirmation;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t.passwordModal.title}</DialogTitle>
                    <DialogDescription>
                        {t.passwordModal.description}
                    </DialogDescription>
                </DialogHeader>

                <Form
                    {...SecurityController.update.form()}
                    options={{ preserveScroll: true }}
                    resetOnError={[
                        'password',
                        'password_confirmation',
                        'current_password',
                    ]}
                    resetOnSuccess
                    onSuccess={() => onOpenChange(false)}
                    onError={(errors) => {
                        if (errors.password) {
                            setPassword('');
                            setPasswordConfirmation('');
                            passwordInput.current?.focus();
                        }

                        if (errors.current_password) {
                            currentPasswordInput.current?.focus();
                        }
                    }}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="current_password">
                                    {t.passwordModal.currentPassword}
                                </Label>
                                <PasswordInput
                                    id="current_password"
                                    name="current_password"
                                    ref={currentPasswordInput}
                                    className="w-full"
                                    autoComplete="current-password"
                                />
                                <InputError message={errors.current_password} />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">
                                        {t.passwordModal.newPassword}
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleGeneratePassword}
                                        className="h-auto gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 hover:text-blue-700 dark:text-blue-500 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
                                    >
                                        <Wand2 className="h-3 w-3" />
                                        {t.passwordModal.generate}
                                    </Button>
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    ref={passwordInput}
                                    className="w-full"
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">
                                    {t.passwordModal.confirmPassword}
                                </Label>
                                <PasswordInput
                                    id="password_confirmation"
                                    name="password_confirmation"
                                    className="w-full"
                                    autoComplete="new-password"
                                    value={passwordConfirmation}
                                    onChange={(e) =>
                                        setPasswordConfirmation(e.target.value)
                                    }
                                />
                                <InputError
                                    message={
                                        errors.password_confirmation ||
                                        (passwordConfirmation.length > 0 &&
                                        !passwordsMatch
                                            ? t.passwordModal.mismatch
                                            : undefined)
                                    }
                                />
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    disabled={processing}
                                >
                                    {t.common.cancel}
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing
                                        ? t.common.saving
                                        : t.passwordModal.savePassword}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
