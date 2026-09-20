import { router, useForm, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useInitials } from '@/hooks/use-initials';
import { useLocale } from '@/hooks/use-locale';
import { update as updateProfile } from '@/routes/profile';
import type { Auth } from '@/types';

interface ProfileModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type PageProps = { auth: Auth };

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
    const { auth } = usePage<PageProps>().props;
    const { t } = useLocale();
    const getInitials = useInitials();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const { data, setData, patch, processing, errors, recentlySuccessful } =
        useForm({ name: auth.user.name });

    const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setUploading(true);
        router.post(
            '/settings/profile/avatar',
            { avatar: file },
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => setUploading(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-md"
                onInteractOutside={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>{t.profileModal.title}</DialogTitle>
                    <DialogDescription>
                        {t.profileModal.description}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center gap-4">
                    <Avatar className="size-16">
                        {auth.user.avatar && (
                            <AvatarImage
                                src={auth.user.avatar}
                                alt={auth.user.name}
                            />
                        )}
                        <AvatarFallback className="text-lg">
                            {getInitials(auth.user.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-1.5">
                        <button
                            type="button"
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                            className="border-border/60 hover:bg-foreground/5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                            {uploading ? 'Subiendo…' : 'Cambiar foto'}
                        </button>
                        <span className="text-muted-foreground text-[11px]">
                            JPG, PNG o WEBP · máx. 2 MB
                        </span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarChange}
                        />
                    </div>
                </div>

                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        patch(updateProfile().url, { preserveScroll: true });
                    }}
                    className="space-y-4"
                >
                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="profile-name"
                            className="text-muted-foreground text-xs font-medium"
                        >
                            {t.profileModal.name}
                        </label>
                        <input
                            id="profile-name"
                            type="text"
                            value={data.name}
                            onChange={(event) =>
                                setData('name', event.target.value)
                            }
                            className="border-border/60 h-10 w-full rounded-xl border bg-transparent px-3 text-sm outline-none focus:border-[var(--accent-1)]"
                        />
                        {errors.name && (
                            <span className="text-xs text-red-500">
                                {errors.name}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-muted-foreground text-xs font-medium">
                            {t.profileModal.email}
                        </label>
                        <div className="border-border/40 bg-foreground/5 text-muted-foreground flex h-10 items-center rounded-xl border px-3 text-sm">
                            {auth.user.email}
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
                        >
                            {t.common.cancel}
                        </button>
                        <div className="flex items-center gap-2">
                            {recentlySuccessful && (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                                    Guardado
                                </span>
                            )}
                            <button
                                type="submit"
                                disabled={processing}
                                className="bg-foreground text-background h-9 rounded-full px-5 text-xs font-semibold transition-transform active:scale-95 disabled:opacity-40"
                            >
                                {processing ? t.common.saving : t.common.save}
                            </button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
