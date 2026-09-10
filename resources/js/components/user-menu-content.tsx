import { Link, router } from '@inertiajs/react';
import { KeyRound, LogOut, SunMoon, UserRound } from 'lucide-react';
import { useState } from 'react';
import { LanguageToggle } from '@/components/language-toggle';
import { PasswordModal } from '@/components/password-modal';
import { ProfileModal } from '@/components/profile-modal';
import { ThemeToggle } from '@/components/theme-toggle';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useLocale } from '@/hooks/use-locale';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { logout } from '@/routes';
import type { User } from '@/types';

type Props = {
    user: User;
};

export function UserMenuContent({ user }: Props) {
    const cleanup = useMobileNavigation();
    const { t } = useLocale();
    const [showProfile, setShowProfile] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setShowProfile(true)}>
                    <UserRound className="mr-2" />
                    {t.userMenu.profile}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowPassword(true)}>
                    <KeyRound className="mr-2" />
                    {t.userMenu.password}
                </DropdownMenuItem>
                {/* preventDefault en onSelect: sin esto Radix cierra el menú
                    apenas se hace click en el switch, antes de que se alcance
                    a ver el cambio aplicado. */}
                <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="justify-between"
                >
                    <span className="flex items-center gap-2">
                        <SunMoon className="mr-0" />
                        {t.userMenu.theme}
                    </span>
                    <ThemeToggle />
                </DropdownMenuItem>
                <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="justify-between"
                >
                    <span className="flex items-center gap-2">
                        {t.userMenu.language}
                    </span>
                    <LanguageToggle />
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link
                    className="block w-full cursor-pointer"
                    href={logout()}
                    as="button"
                    onClick={handleLogout}
                    data-test="logout-button"
                >
                    <LogOut className="mr-2" />
                    {t.common.logOut}
                </Link>
            </DropdownMenuItem>

            <ProfileModal open={showProfile} onOpenChange={setShowProfile} />
            <PasswordModal open={showPassword} onOpenChange={setShowPassword} />
        </>
    );
}
