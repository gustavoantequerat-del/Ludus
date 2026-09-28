<?php

/*
 * Mensajes de validacion en espanol. Solo las reglas que usa la API; el
 * frontend muestra el primero de la lista.
 */
return [

    'array' => 'El campo :attribute debe ser una lista.',
    'boolean' => 'El campo :attribute debe ser verdadero o falso.',
    'in' => 'El valor de :attribute no es valido.',
    'integer' => 'El campo :attribute debe ser un numero entero.',
    'list' => 'El campo :attribute debe ser una lista.',
    'present' => 'Falta el campo :attribute.',
    'required' => 'El campo :attribute es obligatorio.',
    'string' => 'El campo :attribute debe ser texto.',
    'uuid' => 'El campo :attribute debe ser un identificador valido.',

    'max' => [
        'array' => 'El campo :attribute no puede tener mas de :max elementos.',
        'numeric' => 'El campo :attribute no puede ser mayor que :max.',
        'string' => 'El campo :attribute no puede tener mas de :max caracteres.',
    ],

    'min' => [
        'array' => 'El campo :attribute debe tener al menos :min elementos.',
        'numeric' => 'El campo :attribute debe ser al menos :min.',
        'string' => 'El campo :attribute debe tener al menos :min caracteres.',
    ],

    'propiedad_no_permitida' => 'La propiedad :attribute no esta permitida.',

    'attributes' => [],

];
