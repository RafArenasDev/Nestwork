<?php

namespace App\Enums;

/**
 * Rol dentro de una conversación `group`/`channel` (distinto de
 * `TeamRole`, que es a nivel de team). Null en `dm`.
 */
enum ConversationParticipantRole: string
{
    case Member = 'member';
    case Admin = 'admin';
}
