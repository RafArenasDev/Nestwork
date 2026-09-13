<?php

namespace App\Enums;

enum MessageType: string
{
    case Text = 'text';
    case Image = 'image';
    case Video = 'video';
    case Audio = 'audio';
    case File = 'file';
    case Code = 'code';
    case System = 'system';
    case CallLog = 'call_log';
}
