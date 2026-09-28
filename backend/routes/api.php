<?php

/*
 * Todas las rutas de la API, bajo /api. Mismas URLs, mismos metodos y mismos
 * roles que el backend anterior, para que el frontend y los paquetes SCORM
 * ya exportados sigan funcionando sin cambios.
 *
 * 'jwt' exige sesion iniciada; 'rol:a,b' deja pasar solo a esos roles.
 */

use App\Modulos\Autenticacion\AutenticacionControlador;
use App\Modulos\Cursos\CursosControlador;
use App\Modulos\Inscripciones\InscripcionesControlador;
use App\Modulos\Instituciones\InstitucionesControlador;
use App\Modulos\Juegos\JuegosControlador;
use App\Modulos\Juegos\MesaCumplimiento\CasosControlador;
use App\Modulos\Juegos\MesaCumplimiento\Personajes\PersonajesControlador;
use App\Modulos\Panel\PanelControlador;
use App\Modulos\Resultados\ResultadosControlador;
use App\Modulos\Rutas\RutasControlador;
use App\Modulos\Scorm\ScormControlador;
use App\Modulos\Solicitudes\SolicitudesControlador;
use App\Modulos\Usuarios\UsuariosControlador;
use Illuminate\Support\Facades\Route;

$todos = 'rol:superadmin,admin_institucion,docente,estudiante';
$editores = 'rol:superadmin,admin_institucion,docente';
$administradores = 'rol:superadmin,admin_institucion';

/* --- Autenticacion --- */

Route::post('autenticacion/ingresar', [AutenticacionControlador::class, 'ingresar']);

Route::middleware('jwt')->controller(AutenticacionControlador::class)->group(function () {
    Route::get('autenticacion/perfil', 'perfil');
    Route::patch('autenticacion/perfil', 'actualizarPerfil');
    Route::patch('autenticacion/clave', 'cambiarClave');
});

Route::middleware('jwt')->group(function () use ($todos, $editores, $administradores) {

    /* --- Instituciones (solo superadmin) --- */

    Route::middleware('rol:superadmin')->controller(InstitucionesControlador::class)->group(function () {
        Route::get('instituciones', 'listar');
        Route::get('instituciones/{id}', 'obtener');
        Route::post('instituciones', 'crear');
        Route::patch('instituciones/{id}', 'actualizar');
        Route::delete('instituciones/{id}', 'eliminar');
    });

    /* --- Usuarios --- */

    Route::controller(UsuariosControlador::class)->group(function () use ($editores, $administradores) {
        Route::get('usuarios', 'listar')->middleware($editores);
        Route::get('usuarios/{id}', 'obtener')->middleware($editores);
        Route::post('usuarios', 'crear')->middleware($administradores);
        Route::patch('usuarios/{id}', 'actualizar')->middleware($administradores);
        Route::delete('usuarios/{id}', 'eliminar')->middleware($administradores);
    });

    /* --- Cursos y sus modulos --- */

    Route::controller(CursosControlador::class)->group(function () use ($todos, $editores) {
        Route::get('cursos', 'listar')->middleware($todos);
        Route::get('cursos/explorar', 'explorar')->middleware('rol:estudiante');
        Route::get('cursos/{id}', 'obtener')->middleware($todos);
        Route::post('cursos', 'crear')->middleware($editores);
        Route::patch('cursos/{id}', 'actualizar')->middleware($editores);
        Route::delete('cursos/{id}', 'eliminar')->middleware($editores);
        Route::post('cursos/{id}/modulos', 'crearModulo')->middleware($editores);
        Route::patch('cursos/{id}/modulos/{moduloId}', 'actualizarModulo')->middleware($editores);
        Route::delete('cursos/{id}/modulos/{moduloId}', 'eliminarModulo')->middleware($editores);
        Route::patch('cursos/{id}/modulos/{moduloId}/mover', 'moverModulo')->middleware($editores);
    });

    /* --- Rutas de aprendizaje --- */

    Route::controller(RutasControlador::class)->group(function () use ($todos, $editores) {
        Route::get('rutas', 'listar')->middleware($todos);
        Route::get('rutas/{id}', 'obtener')->middleware($todos);
        Route::post('rutas', 'crear')->middleware($editores);
        Route::patch('rutas/{id}', 'actualizar')->middleware($editores);
        Route::delete('rutas/{id}', 'eliminar')->middleware($editores);
        Route::post('rutas/{id}/cursos', 'agregarCurso')->middleware($editores);
        Route::delete('rutas/{id}/cursos/{cursoId}', 'quitarCurso')->middleware($editores);
    });

    /* --- Inscripciones --- */

    Route::middleware($editores)->controller(InscripcionesControlador::class)->group(function () {
        Route::get('cursos/{cursoId}/inscripciones', 'listarDeCurso');
        Route::put('cursos/{cursoId}/inscripciones', 'asignarACurso');
        Route::get('rutas/{rutaId}/inscripciones', 'listarDeRuta');
        Route::put('rutas/{rutaId}/inscripciones', 'asignarARuta');
    });

    /* --- Solicitudes --- */

    Route::controller(SolicitudesControlador::class)->group(function () use ($administradores) {
        Route::get('solicitudes', 'listar')->middleware('rol:superadmin,admin_institucion,estudiante');
        Route::post('solicitudes', 'crear')->middleware('rol:estudiante');
        Route::patch('solicitudes/{id}', 'resolver')->middleware($administradores);
    });

    /* --- Resultados --- */

    Route::controller(ResultadosControlador::class)->group(function () use ($todos) {
        Route::get('resultados', 'listar')->middleware($todos);
        Route::post('resultados', 'crear')->middleware('rol:estudiante');
    });

    /* --- Panel --- */

    Route::get('panel/resumen', [PanelControlador::class, 'resumen']);
    Route::get('panel/actividad', [PanelControlador::class, 'actividad'])->middleware('rol:superadmin');

    /* --- Juegos: catalogo, partida y configuracion por modulo --- */

    Route::middleware($todos)->controller(JuegosControlador::class)->group(function () use ($editores) {
        Route::get('juegos', 'listarCatalogo');
        Route::get('juegos/partida/{moduloId}', 'armarPartida');
        Route::post('juegos/partida/verificar', 'verificarCaso');
        Route::post('juegos/partida/{moduloId}/terminar', 'terminarPartida')->middleware('rol:estudiante');
        Route::get('juegos/modulos/{moduloId}/configuracion', 'obtenerConfiguracion');
        Route::put('juegos/modulos/{moduloId}/configuracion', 'configurar')->middleware($editores);
    });

    /* --- Contenido de la Mesa de Cumplimiento: casos y personajes --- */

    Route::middleware($editores)->prefix('juegos/mesa-cumplimiento')->group(function () {
        Route::controller(CasosControlador::class)->group(function () {
            Route::get('casos', 'listar');
            Route::post('casos', 'crear');
            Route::post('casos/duplicar-base', 'duplicarBase');
            Route::patch('casos/{id}', 'actualizar');
            Route::delete('casos/{id}', 'eliminar');
        });
        Route::controller(PersonajesControlador::class)->group(function () {
            Route::get('personajes', 'listar');
            Route::get('personajes/disponibles', 'disponibles');
            Route::post('personajes', 'crear');
            Route::patch('personajes/{id}', 'actualizar');
            Route::delete('personajes/{id}', 'eliminar');
        });
    });

    /* --- SCORM: paquetes --- */

    Route::middleware($editores)->controller(ScormControlador::class)->group(function () {
        Route::get('scorm/paquetes', 'listar');
        Route::get('scorm/diagnostico', 'diagnostico');
        Route::post('scorm/paquetes', 'crear');
        Route::get('scorm/paquetes/{id}/descargar', 'descargar');
        Route::patch('scorm/paquetes/{id}', 'cambiarEstado');
        Route::delete('scorm/paquetes/{id}', 'eliminar');
    });
});

/* --- SCORM: lo que llama el paquete desde el LMS --- */

Route::controller(ScormControlador::class)->prefix('scorm/publico/{token}')->group(function () {
    Route::get('/', 'informacionPublica');
    Route::post('ingresar', 'ingresar');
    Route::middleware('jwt')->group(function () {
        Route::get('partida', 'armarPartida');
        Route::post('verificar', 'verificarCaso');
        Route::post('partida', 'terminarPartida');
        Route::post('resultado', 'registrarResultado');
    });
});
