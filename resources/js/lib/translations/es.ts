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
        loginTitle: 'Bienvenido de nuevo',
        loginDescription: 'Inicia sesión para seguir chateando con tu equipo',
        registerTitle: 'Crea tu cuenta',
        registerDescription: 'Únete a Nestwork para chatear con tu equipo',
        continueWithGoogle: 'Continuar con Google',
        signingIn: 'Iniciando sesión...',
        genericError: 'Algo salió mal al iniciar sesión. Intenta de nuevo.',
        orContinueWithEmail: 'o usa tu correo',
        nameLabel: 'Nombre',
        emailLabel: 'Correo electrónico',
        passwordLabel: 'Contraseña',
        confirmPasswordLabel: 'Confirmar contraseña',
        signIn: 'Iniciar sesión',
        signUp: 'Registrarme',
        creatingAccount: 'Creando cuenta...',
        alreadyHaveAccount: '¿Ya tienes una cuenta?',
        noAccountYet: '¿Todavía no tienes cuenta?',
        createAccount: 'Crear cuenta',
        backToSignIn: 'Ya tengo cuenta',
        brandTaglineSignIn:
            'Chat en tiempo real para todo tu equipo, en un solo lugar.',
        brandTaglineSignUp: 'Únete a tu equipo en Nestwork en segundos.',
        countryLabel: 'País',
        countryPlaceholder: 'Selecciona tu país',
        countrySearch: 'Buscar país...',
        languageLabel: 'Idioma',
        languageFromCountryHint:
            'Configuramos tu idioma según tu país — puedes cambiarlo cuando quieras en Ajustes.',
    },
    profileModal: {
        title: 'Perfil',
        description: 'Actualizá el nombre y correo electrónico de tu cuenta.',
        name: 'Nombre',
        email: 'Correo electrónico',
        updated: 'Perfil actualizado correctamente',
    },
    terms: {
        title: 'Términos y Condiciones de Uso',
        description: 'Nestwork — condiciones de uso del servicio',
        linkLabel: 'Términos y Condiciones',
    },
};

export default es;
