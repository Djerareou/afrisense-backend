--
-- PostgreSQL database dump
--

\restrict Z1i08m8VApXGHPTuTSmTfg2bHosl48FJlYIubn9bBPFDwBczu3qTF21rl2vYpu9

-- Dumped from database version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.10 (Ubuntu 16.10-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
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
-- Name: Alert; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Alert" (
    id text NOT NULL,
    "trackerId" text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    severity text NOT NULL,
    "timestamp" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Alert" OWNER TO postgres;

--
-- Name: Geofence; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Geofence" (
    id text NOT NULL,
    "userId" text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    coordinates text NOT NULL
);


ALTER TABLE public."Geofence" OWNER TO postgres;

--
-- Name: Payment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Payment" (
    id text NOT NULL,
    "userId" text NOT NULL,
    amount double precision NOT NULL,
    currency text NOT NULL,
    method text NOT NULL,
    "timestamp" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Payment" OWNER TO postgres;

--
-- Name: Position; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Position" (
    id text NOT NULL,
    "trackerId" text NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    speed double precision,
    direction double precision,
    "eventType" text NOT NULL,
    "timestamp" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Position" OWNER TO postgres;

--
-- Name: Subscription; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Subscription" (
    id text NOT NULL,
    "userId" text NOT NULL,
    plan text NOT NULL,
    expiry timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Subscription" OWNER TO postgres;

--
-- Name: Tracker; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Tracker" (
    id text NOT NULL,
    imei text NOT NULL,
    model text NOT NULL,
    "simNumber" text,
    status text NOT NULL,
    "batteryLevel" double precision,
    "lastCommunication" timestamp(3) without time zone,
    "userId" text NOT NULL,
    apn text,
    iccid text,
    "ipServer" text,
    "isDeleted" boolean DEFAULT false NOT NULL,
    port integer,
    protocol text NOT NULL,
    label text
);


ALTER TABLE public."Tracker" OWNER TO postgres;

--
-- Name: TrackerAssignment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TrackerAssignment" (
    id text NOT NULL,
    "trackerId" text NOT NULL,
    "vehicleId" text NOT NULL,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "removedAt" timestamp(3) without time zone
);


ALTER TABLE public."TrackerAssignment" OWNER TO postgres;

--
-- Name: TrackerConfigLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TrackerConfigLog" (
    id text NOT NULL,
    "trackerId" text NOT NULL,
    command text NOT NULL,
    status text NOT NULL,
    response text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TrackerConfigLog" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "fullName" text NOT NULL,
    email text NOT NULL,
    phone text,
    role text NOT NULL,
    "passwordHash" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: Vehicle; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Vehicle" (
    id text NOT NULL,
    "userId" text NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    brand text,
    model text,
    plate text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Vehicle" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Data for Name: Alert; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Alert" (id, "trackerId", "userId", type, severity, "timestamp") FROM stdin;
\.


--
-- Data for Name: Geofence; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Geofence" (id, "userId", name, type, coordinates) FROM stdin;
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Payment" (id, "userId", amount, currency, method, "timestamp") FROM stdin;
\.


--
-- Data for Name: Position; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Position" (id, "trackerId", latitude, longitude, speed, direction, "eventType", "timestamp") FROM stdin;
\.


--
-- Data for Name: Subscription; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Subscription" (id, "userId", plan, expiry) FROM stdin;
\.


--
-- Data for Name: Tracker; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Tracker" (id, imei, model, "simNumber", status, "batteryLevel", "lastCommunication", "userId", apn, iccid, "ipServer", "isDeleted", port, protocol, label) FROM stdin;
b7fff305-5493-4689-ac67-4368cdb909e3	999888777666	generic	\N	inactive	\N	\N	c294181f-f8cb-498a-98bd-044ee1293e5b	\N	\N	\N	f	\N	GT06	Updated Label
\.


--
-- Data for Name: TrackerAssignment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TrackerAssignment" (id, "trackerId", "vehicleId", "assignedAt", "removedAt") FROM stdin;
\.


--
-- Data for Name: TrackerConfigLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TrackerConfigLog" (id, "trackerId", command, status, response, "createdAt") FROM stdin;
ae9a5f0c-2722-46cf-b443-c2401a3980ef	b7fff305-5493-4689-ac67-4368cdb909e3	CREATE_TRACKER	success	{"createdBy":"c294181f-f8cb-498a-98bd-044ee1293e5b"}	2025-12-03 14:27:00.951
37a36a28-85ed-44f7-937f-8d901a30b800	b7fff305-5493-4689-ac67-4368cdb909e3	UPDATE_TRACKER	success	{"label":"Updated Label"}	2025-12-03 14:27:01.033
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, "fullName", email, phone, role, "passwordHash", "createdAt") FROM stdin;
62bf0427-5e02-4c40-aa5b-6fc167286315	Test User	test@example.com	12345678	owner	$2b$10$aJ44nCA64KM84bfjcYLCoOK3xkL8rpYvruPEzQs7xG5kHuhTWrQ2i	2025-12-02 23:07:44.045
c5c5cd40-cd2f-4b94-85ab-a61b28d56f4f	Test User	test+1764717476258@example.com	12345678	owner	$2b$10$b/j487t5dMYKXuyQV1xus.CwPDsARiO/yo3CjOYVbYVwNXpzowQPG	2025-12-02 23:17:56.529
722ced21-a557-4f4c-a932-84662916d5dd	Test User	test+1764717578965@example.com	12345678	owner	$2b$10$gehFkW4IRU.IEOXuscm4cOKl23fJzCpH41ZZTWF2ZCg.Lo9QTue5i	2025-12-02 23:19:39.2
74a13f09-e182-4f8b-bd12-66d2f170cc31	U	u@example.com	\N	user	$2b$10$eRCAXhtFpaCmXqsIPg5HvurMfDSQ/5GgaFBD5ooj5UauulUnXdfO6	2025-12-03 11:36:21.075
c294181f-f8cb-498a-98bd-044ee1293e5b	TI User	ti+1764772020163@example.com	12345678	owner	$2b$10$R90m.T2jTlpDOGLNMYr4cek18cIMBsxImtdD7PbdpAR/Cj/RsS/L.	2025-12-03 14:27:00.44
\.


--
-- Data for Name: Vehicle; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Vehicle" (id, "userId", name, type, brand, model, plate, "createdAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
2a322229-e193-4ecb-8056-0ec3582d01f0	80c9a7d3513d9ef344370a921c06c866ae8d94d69e9a734d39ceff4de986da79	2025-12-02 02:37:01.813754+01	20251202013659_init_mvp	\N	\N	2025-12-02 02:36:59.769286+01	1
7c23af3a-0ee0-4bb3-8e4f-28c4a9756317	1b6f9398d76a3f9f5c0c14966a562e29a5c4605de78672e4b101ef0240848118	2025-12-03 13:35:49.401944+01	20251203123548_add_trackers_vehicles	\N	\N	2025-12-03 13:35:48.872511+01	1
\.


--
-- Name: Alert Alert_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Alert"
    ADD CONSTRAINT "Alert_pkey" PRIMARY KEY (id);


--
-- Name: Geofence Geofence_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Geofence"
    ADD CONSTRAINT "Geofence_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: Position Position_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Position"
    ADD CONSTRAINT "Position_pkey" PRIMARY KEY (id);


--
-- Name: Subscription Subscription_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_pkey" PRIMARY KEY (id);


--
-- Name: TrackerAssignment TrackerAssignment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TrackerAssignment"
    ADD CONSTRAINT "TrackerAssignment_pkey" PRIMARY KEY (id);


--
-- Name: TrackerConfigLog TrackerConfigLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TrackerConfigLog"
    ADD CONSTRAINT "TrackerConfigLog_pkey" PRIMARY KEY (id);


--
-- Name: Tracker Tracker_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Tracker"
    ADD CONSTRAINT "Tracker_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Vehicle Vehicle_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Vehicle"
    ADD CONSTRAINT "Vehicle_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: Subscription_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Subscription_userId_key" ON public."Subscription" USING btree ("userId");


--
-- Name: Tracker_imei_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Tracker_imei_key" ON public."Tracker" USING btree (imei);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Vehicle_plate_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Vehicle_plate_key" ON public."Vehicle" USING btree (plate);


--
-- Name: Alert Alert_trackerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Alert"
    ADD CONSTRAINT "Alert_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES public."Tracker"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Alert Alert_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Alert"
    ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Geofence Geofence_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Geofence"
    ADD CONSTRAINT "Geofence_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Payment Payment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Position Position_trackerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Position"
    ADD CONSTRAINT "Position_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES public."Tracker"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Subscription Subscription_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TrackerAssignment TrackerAssignment_trackerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TrackerAssignment"
    ADD CONSTRAINT "TrackerAssignment_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES public."Tracker"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TrackerAssignment TrackerAssignment_vehicleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TrackerAssignment"
    ADD CONSTRAINT "TrackerAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES public."Vehicle"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TrackerConfigLog TrackerConfigLog_trackerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TrackerConfigLog"
    ADD CONSTRAINT "TrackerConfigLog_trackerId_fkey" FOREIGN KEY ("trackerId") REFERENCES public."Tracker"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Tracker Tracker_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Tracker"
    ADD CONSTRAINT "Tracker_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Vehicle Vehicle_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Vehicle"
    ADD CONSTRAINT "Vehicle_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict Z1i08m8VApXGHPTuTSmTfg2bHosl48FJlYIubn9bBPFDwBczu3qTF21rl2vYpu9

