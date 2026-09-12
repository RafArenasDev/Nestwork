import { Form } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { store } from '@/routes/teams';

export default function CreateTeamModal({ children }: PropsWithChildren) {
    const [open, setOpen] = useState(false);
    const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
    const [name, setName] = useState('');
    const [domain, setDomain] = useState('');

    const isDirty = name.trim() !== '' || domain.trim() !== '';
    const canSubmit = name.trim() !== '';

    const resetForm = () => {
        setName('');
        setDomain('');
    };

    // Punto único por el que se intenta cerrar (click afuera, Esc, botón
    // Cancelar) — si hay algo escrito, se pide confirmar antes de perder
    // los datos, igual que en Inventory Manager.
    const requestClose = () => {
        if (isDirty) {
            setConfirmDiscardOpen(true);

            return;
        }

        setOpen(false);
    };

    const confirmDiscard = () => {
        setConfirmDiscardOpen(false);
        resetForm();
        setOpen(false);
    };

    return (
        <>
            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    if (nextOpen) {
                        setOpen(true);

                        return;
                    }

                    requestClose();
                }}
            >
                <DialogTrigger asChild>{children}</DialogTrigger>
                <DialogContent
                    onInteractOutside={(event) => {
                        event.preventDefault();
                        requestClose();
                    }}
                    onEscapeKeyDown={(event) => {
                        event.preventDefault();
                        requestClose();
                    }}
                >
                    <Form
                        key={String(open)}
                        {...store.form()}
                        className="space-y-6"
                        onSuccess={() => {
                            resetForm();
                            setOpen(false);
                        }}
                    >
                        {({ errors, processing }) => (
                            <>
                                <DialogHeader>
                                    <DialogTitle>Create a new team</DialogTitle>
                                    <DialogDescription>
                                        Create a new team to collaborate with
                                        others.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="grid gap-2">
                                    <Label htmlFor="name">Team name</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        data-test="create-team-name"
                                        placeholder="My team"
                                        required
                                        value={name}
                                        onChange={(event) =>
                                            setName(event.target.value)
                                        }
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="domain">
                                        Domain (optional)
                                    </Label>
                                    <Input
                                        id="domain"
                                        name="domain"
                                        data-test="create-team-domain"
                                        placeholder="empresa.com"
                                        value={domain}
                                        onChange={(event) =>
                                            setDomain(event.target.value)
                                        }
                                    />
                                    <InputError message={errors.domain} />
                                </div>

                                <DialogFooter className="gap-2">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={requestClose}
                                    >
                                        Cancel
                                    </Button>

                                    <Button
                                        type="submit"
                                        data-test="create-team-submit"
                                        disabled={processing || !canSubmit}
                                    >
                                        Create team
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={confirmDiscardOpen}
                onOpenChange={setConfirmDiscardOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Discard this team?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You have unsaved changes. If you leave now, they'll
                            be lost.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep editing</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDiscard}>
                            Discard
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
