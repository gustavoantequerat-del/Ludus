<?php

/*
 * La API es sin estado (JWT): no hay sesiones. "array" las deja en memoria y
 * evita que Laravel busque una tabla "sessions".
 */
return [

    'driver' => 'array',

];
