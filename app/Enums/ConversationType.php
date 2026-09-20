<?php

namespace App\Enums;

enum ConversationType: string
{
    /** 1:1 — sólo mensajes bidireccionales, sin hilos. */
    case Dm = 'dm';

    /** "Minichat": grupo informal de varios integrantes dentro de
     *  Chats, junto a los DM — todos los participantes tienen los
     *  mismos permisos (nadie administra nada), mensajería plana igual
     *  que un DM, sin hilos. */
    case GroupChat = 'group_chat';

    /** "Grupo" formal — módulo propio, distinto de un minichat: quien
     *  lo crea (rol admin en `conversation_participants`) puede
     *  configurar ajustes (nombre/descripción/miembros) que el resto
     *  no. Mensajería libre igual que un chat normal, más la
     *  posibilidad de responder en hilos sobre un mensaje puntual. */
    case Group = 'group';

    /** "Canal" — módulo propio: sólo el admin/creador publica mensajes
     *  de nivel raíz; el resto de participantes sólo puede responder
     *  dentro de un hilo de esa publicación, nunca publicar libremente. */
    case Channel = 'channel';

    /** Chats (1:1 + minichat) — sin hilos, todos con los mismos
     *  permisos. */
    public function isFlatChat(): bool
    {
        return $this === self::Dm || $this === self::GroupChat;
    }

    /** Grupo o Canal — soportan hilos y tienen un admin/creador con
     *  permisos que el resto no tiene. */
    public function supportsThreads(): bool
    {
        return $this === self::Group || $this === self::Channel;
    }

    /** Sólo en Canal: publicar en la línea principal (sin
     *  `reply_to_message_id`) está restringido al admin/creador. */
    public function restrictsTopLevelPostingToAdmin(): bool
    {
        return $this === self::Channel;
    }
}
