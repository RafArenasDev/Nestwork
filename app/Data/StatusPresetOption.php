<?php

namespace App\Data;

readonly class StatusPresetOption
{
    public function __construct(
        public string $key,
        public string $emoji,
        public string $label,
        public ?int $defaultDurationMinutes,
    ) {
        //
    }
}
