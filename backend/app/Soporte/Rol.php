<?php

namespace App\Soporte;

/** Los cuatro roles del sistema, con el mismo texto que guarda la base. */
final class Rol
{
    public const SUPERADMIN = 'superadmin';

    public const ADMIN_INSTITUCION = 'admin_institucion';

    public const DOCENTE = 'docente';

    public const ESTUDIANTE = 'estudiante';

    public const TODOS = [self::SUPERADMIN, self::ADMIN_INSTITUCION, self::DOCENTE, self::ESTUDIANTE];
}
