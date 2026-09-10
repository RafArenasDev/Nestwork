import type { Dictionary } from './en';

const es: Dictionary = {
    common: {
        cancel: 'Cancelar',
        save: 'Guardar',
        saving: 'Guardando...',
        close: 'Cerrar',
        logOut: 'Cerrar sesión',
    },
    nav: {
        dashboard: 'Panel',
    },
    userMenu: {
        profile: 'Perfil',
        password: 'Contraseña',
        theme: 'Tema',
        language: 'Idioma',
    },
    theme: {
        light: 'Claro',
        dark: 'Oscuro',
        system: 'Sistema',
        switchToDark: 'Cambiar a tema oscuro',
        switchToLight: 'Cambiar a tema claro',
    },
    auth: {
        loginTitle: 'Inicia sesión en tu cuenta',
        loginDescription:
            'Ingresá tu correo electrónico y contraseña para iniciar sesión',
        email: 'Correo electrónico',
        password: 'Contraseña',
        rememberMe: 'Recordar sesión',
        forgotPassword: '¿Olvidaste tu contraseña?',
        logIn: 'Iniciar sesión',
        noAccount: '¿No tenés una cuenta?',
        signUp: 'Registrarse',
    },
    profileModal: {
        title: 'Perfil',
        description: 'Actualizá el nombre y correo electrónico de tu cuenta.',
        name: 'Nombre',
        email: 'Correo electrónico',
        updated: 'Perfil actualizado correctamente',
    },
    passwordModal: {
        title: 'Contraseña',
        description:
            'Usá una contraseña larga y aleatoria para mantener tu cuenta segura.',
        currentPassword: 'Contraseña actual',
        newPassword: 'Nueva contraseña',
        confirmPassword: 'Confirmar contraseña',
        generate: 'Generar contraseña',
        mismatch: 'Las contraseñas no coinciden.',
        savePassword: 'Guardar contraseña',
    },
    terms: {
        title: 'Términos y Condiciones de Uso',
        description: 'Nestwork — condiciones de uso del servicio',
        linkLabel: 'Términos y Condiciones',
    },
};

export default es;
