import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { getMigrationConfig } from './common/config/database.config';

dotenv.config();

export default new DataSource(getMigrationConfig());
