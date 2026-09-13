<?php

namespace App\Enums;

enum ConversationType: string
{
    case Dm = 'dm';
    case Group = 'group';
    case Channel = 'channel';
}
