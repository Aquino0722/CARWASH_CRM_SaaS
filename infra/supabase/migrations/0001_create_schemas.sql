-- 0001_create_schemas.sql
-- Create core schemas and required extensions for CARWASH

-- Core application schemas
create schema if not exists app;
create schema if not exists internal;

-- Required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";