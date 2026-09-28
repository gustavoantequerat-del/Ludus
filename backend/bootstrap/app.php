<?php

use App\Excepciones\ErrorHttp;
use App\Http\Middleware\AjustarRespuesta;
use App\Http\Middleware\AutenticarJwt;
use App\Http\Middleware\ExigirRol;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull;
use Illuminate\Foundation\Http\Middleware\TrimStrings;
use Illuminate\Http\Exceptions\PostTooLargeException;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        web: __DIR__.'/../routes/web.php',
        apiPrefix: 'api',
    )
    ->withCommands([__DIR__.'/../app/Consola'])
    ->withMiddleware(function (Middleware $middleware): void {
        // El texto llega tal cual: un "" es un valor valido (una descripcion
        // vacia) y los espacios son del usuario. Laravel por defecto recorta
        // y convierte "" en null; el backend anterior no lo hacia.
        $middleware->remove([ConvertEmptyStringsToNull::class, TrimStrings::class]);

        $middleware->api(prepend: [AjustarRespuesta::class]);

        $middleware->alias([
            'jwt' => AutenticarJwt::class,
            'rol' => ExigirRol::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Todo error sale como JSON { message, error, statusCode }, que es lo
        // que lee el frontend (y lo que devolvia Nest).
        $exceptions->shouldRenderJsonWhen(fn () => true);

        // Lo que es culpa del cliente no se anota en el log de errores.
        $erroresDelCliente = ['22P02', '23505', '23503'];
        $exceptions->dontReport([ErrorHttp::class]);
        $exceptions->dontReportWhen(
            fn (Throwable $error) => $error instanceof QueryException && in_array($error->getCode(), $erroresDelCliente, true)
        );

        $exceptions->render(function (ErrorHttp $error) {
            return response()->json(ErrorHttp::cuerpo($error->codigo, $error->getMessage()), $error->codigo);
        });

        $exceptions->render(function (ValidationException $error) {
            $mensajes = array_values(array_merge(...array_values($error->errors())));

            return response()->json(ErrorHttp::cuerpo(400, $mensajes), 400);
        });

        $exceptions->render(function (NotFoundHttpException|MethodNotAllowedHttpException $error, Request $peticion) {
            // Una ruta que no existe responde con el mismo texto que Nest.
            $mensaje = "Cannot {$peticion->method()} {$peticion->getPathInfo()}";

            return response()->json(ErrorHttp::cuerpo(404, $mensaje), 404);
        });

        $exceptions->render(function (PostTooLargeException $error) {
            return response()->json(ErrorHttp::cuerpo(413, 'request entity too large'), 413);
        });

        $exceptions->render(function (QueryException $error) {
            // Un id que no es un UUID llega hasta PostgreSQL y falla ahi
            // (22P02). Es un error del cliente, no del servidor.
            if ($error->getCode() === '22P02') {
                return response()->json(ErrorHttp::cuerpo(400, 'Identificador invalido'), 400);
            }
            // Un valor unico repetido (el dominio de una institucion, por
            // ejemplo) tampoco es un error del servidor.
            if ($error->getCode() === '23505') {
                return response()->json(ErrorHttp::cuerpo(409, 'Ya existe un registro con esos datos'), 409);
            }
            // Una referencia a algo que no existe (un docente borrado).
            if ($error->getCode() === '23503') {
                return response()->json(ErrorHttp::cuerpo(400, 'Hace referencia a un registro que no existe o que esta en uso'), 400);
            }
        });

        $exceptions->render(function (Throwable $error) {
            if ($error instanceof HttpExceptionInterface) {
                $codigo = $error->getStatusCode();

                return response()->json(ErrorHttp::cuerpo($codigo, $error->getMessage() ?: 'Error'), $codigo);
            }
            if (config('app.debug')) {
                return null;
            }

            return response()->json(ErrorHttp::cuerpo(500, 'Internal server error'), 500);
        });
    })->create();
