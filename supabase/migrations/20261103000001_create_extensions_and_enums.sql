-- NationX Shared Delivery — Migration 01: Extensions and Enums
-- PostgreSQL 16 compatible

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- User Roles
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'ADMIN',
    'MERCHANT',
    'PARTNER',
    'CUSTOMER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Fulfillment Modes
DO $$ BEGIN
  CREATE TYPE fulfillment_mode AS ENUM (
    'SHARED_DELIVERY',
    'EXPRESS',
    'CUSTOMER_PICKUP'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Parent Order Status
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'CONFIRMED',
    'FULFILLING',
    'PARTIALLY_FULFILLED',
    'COMPLETED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Merchant Suborder Status
DO $$ BEGIN
  CREATE TYPE suborder_status AS ENUM (
    'PLACED',
    'ACCEPTED',
    'REJECTED',
    'PREPARING',
    'READY_FOR_PICKUP',
    'PICKED_UP',
    'DELIVERED',
    'CANCELLED',
    'EXCEPTION'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Delivery Batch Status
DO $$ BEGIN
  CREATE TYPE batch_status AS ENUM (
    'DRAFT',
    'OPEN',
    'ASSIGNED',
    'ACCEPTED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'EXCEPTION'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Partner Assignment Status
DO $$ BEGIN
  CREATE TYPE assignment_status AS ENUM (
    'OFFERED',
    'ACCEPTED',
    'REJECTED',
    'CANCELLED',
    'COMPLETED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Partner Availability Status
DO $$ BEGIN
  CREATE TYPE partner_availability AS ENUM (
    'AVAILABLE',
    'BUSY',
    'OFFLINE',
    'SUSPENDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Route Stop Type
DO $$ BEGIN
  CREATE TYPE stop_type AS ENUM (
    'PICKUP',
    'DROPOFF',
    'CUSTOMER_PICKUP',
    'RETURN'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Route Stop Status
DO $$ BEGIN
  CREATE TYPE stop_status AS ENUM (
    'PENDING',
    'ARRIVED',
    'COMPLETED',
    'FAILED',
    'SKIPPED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Audit & Delivery Event Types
DO $$ BEGIN
  CREATE TYPE delivery_event_type AS ENUM (
    'ORDER_REQUESTED',
    'PARTNER_ASSIGNED',
    'ASSIGNMENT_ACCEPTED',
    'ASSIGNMENT_REJECTED',
    'MERCHANT_ACCEPTED',
    'PREPARATION_STARTED',
    'READY_FOR_PICKUP',
    'PICKUP_CONFIRMED',
    'IN_TRANSIT',
    'DELIVERY_ATTEMPTED',
    'DELIVERED',
    'FAILED',
    'CANCELLED',
    'REASSIGNED',
    'RETURN_REQUESTED',
    'RETURNED',
    'ADMIN_INTERVENTION',
    'NOTE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

