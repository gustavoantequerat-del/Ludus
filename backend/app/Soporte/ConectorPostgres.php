<?php

namespace App\Soporte;

use Illuminate\Database\Connectors\PostgresConnector;
use PDOException;
use RuntimeException;

/**
 * El conector de PostgreSQL de Laravel con dos agregados que pide un hosting
 * compartido contra Neon:
 *
 * - connect_timeout: si la base no responde, falla en 10 segundos en vez de
 *   dejar colgada la peticion hasta que el hosting la corte.
 *
 * - El "endpoint" de Neon. Neon identifica a que base ir por el nombre del
 *   host (SNI), y las libpq viejas, comunes en cPanel, no lo envian. Neon
 *   entonces rechaza la conexion con "Endpoint ID is not specified". En ese
 *   caso se reintenta una vez pasando el endpoint en `options`, que es la
 *   salida que documenta Neon. Con una libpq moderna nunca se llega a esto.
 */
class ConectorPostgres extends PostgresConnector
{
    public function connect(array $config)
    {
        if (! empty($config['error_ludus'])) {
            throw new RuntimeException($config['error_ludus']);
        }

        try {
            return parent::connect($config);
        } catch (PDOException $error) {
            $endpoint = self::endpointNeon($config['host'] ?? '');
            $faltaEndpoint = stripos($error->getMessage(), 'endpoint id') !== false;
            if ($endpoint === null || ! $faltaEndpoint || isset($config['endpoint_neon'])) {
                throw $error;
            }

            return parent::connect($config + ['endpoint_neon' => $endpoint]);
        }
    }

    protected function getDsn(array $config)
    {
        $dsn = parent::getDsn($config).';connect_timeout=10';

        if (! empty($config['endpoint_neon'])) {
            $dsn .= ";options='endpoint={$config['endpoint_neon']}'";
        }

        return $dsn;
    }

    /**
     * ep-algo-123456-pooler.us-east-2.aws.neon.tech -> ep-algo-123456.
     * Null si el host no es de Neon.
     */
    public static function endpointNeon(string $host): ?string
    {
        if (! str_ends_with(strtolower($host), '.neon.tech')) {
            return null;
        }

        $primeraParte = explode('.', $host)[0];

        return preg_replace('/-pooler$/', '', $primeraParte);
    }
}
