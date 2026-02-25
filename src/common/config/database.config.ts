import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';

/**
 * Shared database configuration
 * Used by both TypeORM module and migration CLI
 */
export const getDatabaseConfig = (): DataSourceOptions => {
  return {
    type: (process.env.DATABASE_TYPE as 'postgres' | 'mysql' | 'sqlite') || 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT) || 5432,
    username: process.env.DATABASE_USER || 'myuser',
    password: process.env.DATABASE_PASSWORD || 'mypassword',
    database: process.env.DATABASE_NAME || 'authdb',
    synchronize: false,
  };
};

/**
 * TypeORM configuration for NestJS module
 */
export const getTypeOrmConfig = (): TypeOrmModuleOptions => {
  return {
    ...getDatabaseConfig(),
    entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../../../migrations/*{.ts,.js}'],
  };
};

/**
 * TypeORM configuration for migration CLI
 */
export const getMigrationConfig = (): DataSourceOptions => {
  return {
    ...getDatabaseConfig(),
    entities: ['src/**/*.entity.ts'],
    migrations: ['migrations/*.ts'],
  };
};