import { Form, usePage } from '@inertiajs/react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/hooks/use-locale';
import type { Auth } from '@/types';

interface ProfileModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type PageProps = { auth: Auth };

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
    const { auth } = usePage<PageProps>().props;
    const { t } = useLocale();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t.profileModal.title}</DialogTitle>
                    <DialogDescription>
                        {t.profileModal.description}
                    </DialogDescription>
                </DialogHeader>

                <Form
                    {...ProfileController.update.form()}
                    options={{ preserveScroll: true }}
                    onSuccess={() => onOpenChange(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="profile-name">
                                    {t.profileModal.name}
                                </Label>
                                <Input
                                    id="profile-name"
                                    name="name"
                                    className="w-full"
                                    defaultValue={auth.user.name}
                                    required
                                    autoComplete="name"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="profile-email">
                                    {t.profileModal.email}
                                </Label>
                                <Input
                                    id="profile-email"
                                    type="email"
                                    name="email"
                                    className="w-full"
                                    defaultValue={auth.user.email}
                                    required
                                    autoComplete="username"
                                />
                                <InputError message={errors.email} />
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
                                        : t.common.save}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
