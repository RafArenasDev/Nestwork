<?php

namespace App\Data;

readonly class TeamMemberOption
{
    public function __construct(
        public int $id,
        public string $name,
        public string $username,
        public ?string $avatar,
    ) {
        //
    }
}
