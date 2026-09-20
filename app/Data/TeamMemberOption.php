<?php

namespace App\Data;

readonly class TeamMemberOption
{
    public function __construct(
        public int $id,
        public string $name,
        public string $username,
        public ?string $avatar,
        /** @var 'available'|'away'|'busy'|'offline' */
        public string $presence,
        public ?string $statusEmoji,
        public ?string $statusText,
    ) {
        //
    }
}
