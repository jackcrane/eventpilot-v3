--
-- PostgreSQL database dump
--

\restrict rFnPD45HMY0agIah9oBSwznO1yF2faFJSNKMImmdxd2DD6U31TG9LFoTA06u6gr

-- Dumped from database version 17.6 (Postgres.app)
-- Dumped by pg_dump version 17.6 (Postgres.app)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: stripe_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_locations (
    id text NOT NULL,
    event_id text NOT NULL,
    nickname text,
    address_line1 text NOT NULL,
    address_line2 text,
    city text NOT NULL,
    state text NOT NULL,
    postal_code text NOT NULL,
    country text DEFAULT 'US'::text NOT NULL,
    stripe_location_id text NOT NULL,
    deleted boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: stripe_locations stripe_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_locations
    ADD CONSTRAINT stripe_locations_pkey PRIMARY KEY (id);


--
-- Name: stripe_locations_event_id_deleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stripe_locations_event_id_deleted_idx ON public.stripe_locations USING btree (event_id, deleted);


--
-- Name: stripe_locations_stripe_location_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX stripe_locations_stripe_location_id_key ON public.stripe_locations USING btree (stripe_location_id);


--
-- Name: stripe_locations stripe_locations_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_locations
    ADD CONSTRAINT stripe_locations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public."Event"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict rFnPD45HMY0agIah9oBSwznO1yF2faFJSNKMImmdxd2DD6U31TG9LFoTA06u6gr

