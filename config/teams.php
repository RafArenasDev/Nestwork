<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Guest team
    |--------------------------------------------------------------------------
    |
    | Users signing in with an email from a public/free provider (gmail,
    | outlook, etc.) all share this single team instead of getting one
    | of their own or joining a stranger's organization by accident.
    |
    */

    // Slug/identificador técnico en inglés (va en las URLs); el nombre
    // visible al usuario ("Invitados") sí queda en español.
    'guest_team_slug' => 'guest',

    'guest_team_name' => 'Invitados',

    /*
    |--------------------------------------------------------------------------
    | Public email domains
    |--------------------------------------------------------------------------
    |
    | Any of these domains route the user into the guest team. Any other
    | domain is treated as an institution/company and gets (or joins) its
    | own team automatically, matched on the exact full domain.
    |
    */

    /*
    |--------------------------------------------------------------------------
    | Compound public suffixes
    |--------------------------------------------------------------------------
    |
    | Domains ending in one of these two-label suffixes keep 3 labels as
    | their "root" (e.g. estudiantes.areandina.edu.co and
    | profesores.areandina.edu.co both resolve to areandina.edu.co).
    | Anything else keeps the standard last 2 labels (e.g.
    | correo.empresa.com -> empresa.com). Extend as new countries/TLDs
    | come up.
    |
    */

    'compound_suffixes' => [
        'edu.co', 'com.co', 'gov.co', 'org.co', 'net.co',
        'edu.mx', 'com.mx', 'gob.mx',
        'edu.ar', 'com.ar', 'gob.ar',
        'edu.pe', 'com.pe', 'gob.pe',
        'edu.ve', 'com.ve', 'gob.ve',
        'edu.ec', 'com.ec', 'gob.ec',
        'edu.bo', 'com.bo',
        'edu.cl', 'com.cl', 'gob.cl',
        'ac.uk', 'co.uk', 'gov.uk',
    ],

    'guest_domains' => [
        'gmail.com',
        'googlemail.com',
        'hotmail.com',
        'hotmail.es',
        'outlook.com',
        'outlook.es',
        'live.com',
        'msn.com',
        'yahoo.com',
        'yahoo.es',
        'icloud.com',
        'me.com',
        'mac.com',
        'protonmail.com',
        'proton.me',
        'aol.com',
        'gmx.com',
        'zoho.com',
        'mail.com',
        'yandex.com',
    ],

];
