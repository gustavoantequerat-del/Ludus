/*
 * Punto de entrada para Vercel.
 *
 * Es JavaScript a proposito: Vercel compila lo que hay en api/ con esbuild, y
 * esbuild no emite los metadatos de decoradores que NestJS necesita. Asi que
 * el TypeScript se compila antes con `nest build` (emitDecoratorMetadata) y
 * aqui solo se reexporta lo ya compilado.
 */
module.exports = require('../dist/servidor-serverless').default;
