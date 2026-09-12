export interface Dictionary {
    common: {
        cancel: string;
        save: string;
        saving: string;
        close: string;
        logOut: string;
    };
    nav: {
        dashboard: string;
    };
    userMenu: {
        profile: string;
        theme: string;
        language: string;
    };
    theme: {
        light: string;
        dark: string;
        system: string;
        switchToDark: string;
        switchToLight: string;
    };
    auth: {
        loginTitle: string;
        loginDescription: string;
        registerTitle: string;
        registerDescription: string;
        continueWithGoogle: string;
        signingIn: string;
        genericError: string;
        orContinueWithEmail: string;
        nameLabel: string;
        emailLabel: string;
        passwordLabel: string;
        confirmPasswordLabel: string;
        signIn: string;
        signUp: string;
        creatingAccount: string;
        alreadyHaveAccount: string;
        noAccountYet: string;
        createAccount: string;
        backToSignIn: string;
        brandTaglineSignIn: string;
        brandTaglineSignUp: string;
        countryLabel: string;
        countryPlaceholder: string;
        countrySearch: string;
        languageLabel: string;
        passwordRules: {
            length: string;
            uppercase: string;
            lowercase: string;
            number: string;
            symbol: string;
        };
    };
    profileModal: {
        title: string;
        description: string;
        name: string;
        email: string;
        updated: string;
    };
    terms: {
        title: string;
        description: string;
        linkLabel: string;
    };
}

const en: Dictionary = {
    common: {
        cancel: 'Cancel',
        save: 'Save',
        saving: 'Saving...',
        close: 'Close',
        logOut: 'Log out',
    },
    nav: {
        dashboard: 'Dashboard',
    },
    userMenu: {
        profile: 'Profile',
        theme: 'Theme',
        language: 'Language',
    },
    theme: {
        light: 'Light',
        dark: 'Dark',
        system: 'System',
        switchToDark: 'Switch to dark theme',
        switchToLight: 'Switch to light theme',
    },
    auth: {
        loginTitle: 'Welcome back',
        loginDescription: 'Sign in to keep chatting with your team',
        registerTitle: 'Create your account',
        registerDescription: 'Join Nestwork to start chatting with your team',
        continueWithGoogle: 'Continue with Google',
        signingIn: 'Signing in...',
        genericError: 'Something went wrong signing you in. Please try again.',
        orContinueWithEmail: 'or use your email',
        nameLabel: 'Name',
        emailLabel: 'Email address',
        passwordLabel: 'Password',
        confirmPasswordLabel: 'Confirm password',
        signIn: 'Sign in',
        signUp: 'Sign up',
        creatingAccount: 'Creating account...',
        alreadyHaveAccount: 'Already have an account?',
        noAccountYet: "Don't have an account yet?",
        createAccount: 'Create account',
        backToSignIn: 'I already have an account',
        brandTaglineSignIn: 'Real-time chat for your whole team, in one place.',
        brandTaglineSignUp: 'Join your team on Nestwork in seconds.',
        countryLabel: 'Country',
        countryPlaceholder: 'Select your country',
        countrySearch: 'Search country...',
        languageLabel: 'Language',
        passwordRules: {
            length: 'At least 12 characters',
            uppercase: 'One uppercase letter',
            lowercase: 'One lowercase letter',
            number: 'One number',
            symbol: 'One symbol',
        },
    },
    profileModal: {
        title: 'Profile',
        description: 'Update your name and email address.',
        name: 'Name',
        email: 'Email address',
        updated: 'Profile updated successfully',
    },
    terms: {
        title: 'Terms and Conditions of Use',
        description: 'Nestwork — terms of use for the service',
        linkLabel: 'Terms and Conditions',
    },
};

export default en;
