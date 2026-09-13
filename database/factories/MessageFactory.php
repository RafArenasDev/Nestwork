<?php

namespace Database\Factories;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Message>
 */
class MessageFactory extends Factory
{
    /**
     * Frases reales de chat de trabajo/equipo — no lorem ipsum — para
     * que la UI (burbujas, scroll, previews) se pruebe con contenido
     * que de verdad se parece a una conversación.
     *
     * @var list<string>
     */
    public const LINES = [
        'Hola, ¿cómo vas con eso?',
        'Todo bien por acá, ¿y tú?',
        '¿Ya revisaste el correo que te mandé ayer?',
        'Sí, lo vi, dame un momento y te respondo con calma.',
        '¿Nos vemos a las 3 para la reunión?',
        'Dale, ahí te confirmo si puedo.',
        'Perfecto, cualquier cosa me avisas.',
        '¿Tienes el archivo actualizado?',
        'Sí, te lo comparto en un momento.',
        'Gracias, justo lo necesitaba.',
        '¿Cómo va el avance del proyecto?',
        'Vamos bien, ya casi terminamos la primera parte.',
        '¿Alguna novedad de parte de ellos?',
        'Todavía no responden, les vuelvo a escribir.',
        'Listo, quedo pendiente entonces.',
        '¿Puedes revisar esto cuando tengas un momento?',
        'Claro, en un rato lo miro.',
        'Buenísimo, muchas gracias por la ayuda.',
        '¿Nos organizamos para mañana?',
        'Sí, hablamos mañana temprano.',
        'Ya envié la propuesta, quedo atento a comentarios.',
        'Recibido, la reviso hoy en la tarde.',
        '¿Cómo te fue con el cliente?',
        'Bien, quedaron contentos con la entrega.',
        'Qué bueno escuchar eso.',
        '¿Necesitas que te ayude con algo más?',
        'Por ahora no, gracias de todas formas.',
        'Cualquier cosa me cuentas.',
        'Buen día, ¿cómo amaneciste?',
        'Todo tranquilo, arrancando la semana.',
        '¿Ya subiste los cambios?',
        'Sí, ya están en el repositorio.',
        'Genial, los reviso en un rato.',
        '¿Tienes tiempo para una llamada rápida?',
        'Claro, dame 5 minutos y te llamo.',
        'Perfecto, hablamos entonces.',
        'Feliz fin de semana, nos vemos el lunes.',
        'Igualmente, que descanses.',
        '¿Pudiste solucionar el problema de ayer?',
        'Sí, ya quedó resuelto.',
        'Excelente, gracias por la rapidez.',
    ];

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'conversation_id' => Conversation::factory(),
            'user_id' => User::factory(),
            'body' => fake()->randomElement(self::LINES),
            'edited_at' => null,
            'created_at' => fake()->dateTimeBetween('-2 weeks', 'now'),
        ];
    }
}
