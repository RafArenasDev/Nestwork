<?php

namespace App\Enums;

enum AuthProvider: string
{
    case Google = 'google';
    case Password = 'password';
    case Both = 'both';
}
