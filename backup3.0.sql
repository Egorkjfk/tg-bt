--
-- PostgreSQL database dump
--

\restrict 2MxSDSAREX9cKJ2oExAtk06bQsRJmmqIeLqVnAJzTDmRflBiDv9hIvG6D97ajXl

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

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

--
-- Name: pg_cron; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION pg_cron; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL';


--
-- Name: copy_auto_checklists_hourly(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.copy_auto_checklists_hourly() RETURNS TABLE(result_zone_id bigint, action text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    zone_record RECORD;
    zone_start_time TIME;
    current_hour INT;
BEGIN
    current_hour := EXTRACT(HOUR FROM CURRENT_TIME);
    
    FOR zone_record IN
        SELECT id, working_hours FROM zones WHERE working_hours IS NOT NULL
    LOOP
        zone_start_time := extract_start_time(zone_record.working_hours);
        
        IF zone_start_time IS NOT NULL THEN
            IF current_hour = (EXTRACT(HOUR FROM zone_start_time) - 1) THEN
                INSERT INTO checklists (zone_id, description, date, status, issue_time, confirmed)
                SELECT 
                    zone_record.id,
                    description,
                    to_char(CURRENT_DATE, 'YYYY-MM-DD'),
                    false,
                    CURRENT_TIMESTAMP,
                    false
                FROM auto_cheklst
                WHERE zone_id = zone_record.id;
                
                -- Возвращаем информацию вместо NOTICE
                result_zone_id := zone_record.id;
                action := 'copied';
                RETURN NEXT;
            END IF;
        END IF;
    END LOOP;
END;
$$;


ALTER FUNCTION public.copy_auto_checklists_hourly() OWNER TO postgres;

--
-- Name: extract_start_time(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.extract_start_time(working_hours text) RETURNS time without time zone
    LANGUAGE plpgsql
    AS $$
DECLARE
    start_part TEXT;
    start_time TIME;
BEGIN
    -- Извлекаем часть до " - " (время начала)
    start_part := split_part(working_hours, ' - ', 1);
    
    -- Преобразуем в тип TIME
    start_time := start_part::TIME;
    
    RETURN start_time;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;


ALTER FUNCTION public.extract_start_time(working_hours text) OWNER TO postgres;

--
-- Name: set_schedule_hourly_rate(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_schedule_hourly_rate() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Если zone_id указан и hourly_rate не задан явно, берем цену из зоны
    IF NEW.zone_id IS NOT NULL AND NEW.hourly_rate IS NULL THEN
        SELECT price INTO NEW.hourly_rate FROM zones WHERE id = NEW.zone_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_schedule_hourly_rate() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: auto_cheklst; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auto_cheklst (
    id bigint NOT NULL,
    zone_id bigint NOT NULL,
    description text
);


ALTER TABLE public.auto_cheklst OWNER TO postgres;

--
-- Name: auto_cheklst_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.auto_cheklst_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.auto_cheklst_id_seq OWNER TO postgres;

--
-- Name: auto_cheklst_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.auto_cheklst_id_seq OWNED BY public.auto_cheklst.id;


--
-- Name: checklists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.checklists (
    id bigint NOT NULL,
    date character varying(10) DEFAULT to_char((CURRENT_DATE)::timestamp with time zone, 'YYYY-MM-DD'::text) NOT NULL,
    zone_id bigint NOT NULL,
    description text,
    photo text,
    status boolean DEFAULT false NOT NULL,
    issue_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    return_time timestamp with time zone,
    admin_id bigint,
    confirmed boolean DEFAULT false NOT NULL,
    important boolean DEFAULT false NOT NULL
);


ALTER TABLE public.checklists OWNER TO postgres;

--
-- Name: checklists_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.checklists_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.checklists_id_seq OWNER TO postgres;

--
-- Name: checklists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.checklists_id_seq OWNED BY public.checklists.id;


--
-- Name: schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schedules (
    id bigint NOT NULL,
    worker_id bigint NOT NULL,
    zone_id bigint,
    date date NOT NULL,
    planned_start_time time without time zone NOT NULL,
    planned_end_time time without time zone NOT NULL,
    actual_start_time time without time zone,
    actual_end_time time without time zone,
    hourly_rate numeric(10,2) NOT NULL,
    photo_start text,
    photo_end text
);


ALTER TABLE public.schedules OWNER TO postgres;

--
-- Name: schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.schedules_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.schedules_id_seq OWNER TO postgres;

--
-- Name: schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.schedules_id_seq OWNED BY public.schedules.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    telegram_id bigint NOT NULL,
    username character varying(255),
    first_name character varying(255),
    last_name character varying(255),
    phone_number character varying(20),
    confirmed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_admin boolean DEFAULT false NOT NULL,
    chat_id bigint
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: zones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.zones (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    working_hours character varying(50) NOT NULL,
    image_path text,
    price numeric(10,2) NOT NULL
);


ALTER TABLE public.zones OWNER TO postgres;

--
-- Name: zones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.zones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.zones_id_seq OWNER TO postgres;

--
-- Name: zones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.zones_id_seq OWNED BY public.zones.id;


--
-- Name: auto_cheklst id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auto_cheklst ALTER COLUMN id SET DEFAULT nextval('public.auto_cheklst_id_seq'::regclass);


--
-- Name: checklists id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checklists ALTER COLUMN id SET DEFAULT nextval('public.checklists_id_seq'::regclass);


--
-- Name: schedules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedules ALTER COLUMN id SET DEFAULT nextval('public.schedules_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: zones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zones ALTER COLUMN id SET DEFAULT nextval('public.zones_id_seq'::regclass);


--
-- Data for Name: job; Type: TABLE DATA; Schema: cron; Owner: postgres
--

COPY cron.job (jobid, schedule, command, nodename, nodeport, database, username, active, jobname) FROM stdin;
1	0 * * * *	SELECT copy_auto_checklists_hourly();	localhost	5432	gorpark	postgres	t	check-zones-hourly
2	0 * * * *	SELECT copy_auto_checklists_hourly();	localhost	5432	gorpark	postgres	t	hourly-auto-checklists
\.


--
-- Data for Name: job_run_details; Type: TABLE DATA; Schema: cron; Owner: postgres
--

COPY cron.job_run_details (jobid, runid, job_pid, database, username, command, status, return_message, start_time, end_time) FROM stdin;
1	1	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-07 01:00:00.000028+00	2025-11-07 01:00:00.017086+00
1	20	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-11 14:00:00.00006+00	2025-11-11 14:00:00.008457+00
1	2	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-07 12:00:00.000642+00	2025-11-07 12:00:00.011684+00
1	3	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-07 13:00:00.000698+00	2025-11-07 13:00:00.054491+00
1	4	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-07 14:00:00.000904+00	2025-11-07 14:00:00.056948+00
1	21	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-11 15:00:00.00077+00	2025-11-11 15:00:00.056828+00
1	5	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 10:00:00.000036+00	2025-11-10 10:00:00.060416+00
1	6	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 11:00:00.000029+00	2025-11-10 11:00:00.009704+00
1	7	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 12:00:00.000904+00	2025-11-10 12:00:00.00934+00
1	22	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-11 16:00:00.000763+00	2025-11-11 16:00:00.056112+00
1	8	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 13:00:00.000881+00	2025-11-10 13:00:00.010354+00
1	9	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 14:00:00.000885+00	2025-11-10 14:00:00.010518+00
1	10	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 15:00:00.000988+00	2025-11-10 15:00:00.010647+00
1	23	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-12 15:00:00.000052+00	2025-11-12 15:00:00.012631+00
1	11	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 16:00:00.000198+00	2025-11-10 16:00:00.009757+00
1	12	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 17:00:00.000644+00	2025-11-10 17:00:00.010094+00
1	13	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 18:00:00.000297+00	2025-11-10 18:00:00.009754+00
1	14	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 19:00:00.000544+00	2025-11-10 19:00:00.010047+00
1	15	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 20:00:00.000984+00	2025-11-10 20:00:00.011402+00
1	16	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 21:00:00.00089+00	2025-11-10 21:00:00.009202+00
1	17	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 22:00:00.000329+00	2025-11-10 22:00:00.010096+00
1	18	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 23:00:00.000536+00	2025-11-10 23:00:00.008848+00
1	19	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-11 13:00:00.000162+00	2025-11-11 13:00:00.015325+00
1	40	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-19 11:00:00.000124+00	2025-11-19 11:00:00.063122+00
1	24	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-18 13:00:00.00059+00	2025-11-18 13:00:00.014385+00
1	34	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-19 00:00:00.000427+00	2025-11-19 00:00:00.012959+00
1	25	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-18 14:00:00.000502+00	2025-11-18 14:00:00.010754+00
1	26	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-18 15:00:00.000536+00	2025-11-18 15:00:00.008742+00
1	27	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-18 16:00:00.000551+00	2025-11-18 16:00:00.012754+00
1	28	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-18 17:00:00.00049+00	2025-11-18 17:00:00.012375+00
2	43	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-19 13:00:00.00057+00	2025-11-19 13:00:00.062452+00
1	29	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-18 18:00:00.000487+00	2025-11-18 18:00:00.011224+00
2	35	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-19 09:00:00.000593+00	2025-11-19 09:00:00.065421+00
1	30	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-18 19:00:00.000031+00	2025-11-18 19:00:00.008257+00
1	36	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-19 09:00:00.000593+00	2025-11-19 09:00:00.067701+00
1	31	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-18 20:00:00.000712+00	2025-11-18 20:00:00.010161+00
1	32	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-18 21:00:00.000559+00	2025-11-18 21:00:00.010615+00
1	33	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-18 22:00:00.000489+00	2025-11-18 22:00:00.008756+00
1	44	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-19 13:00:00.00057+00	2025-11-19 13:00:00.064531+00
2	37	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-19 10:00:00.000064+00	2025-11-19 10:00:00.062271+00
1	38	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-19 10:00:00.000064+00	2025-11-19 10:00:00.064321+00
2	41	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-19 12:00:00.000254+00	2025-11-19 12:00:00.062143+00
2	39	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-19 11:00:00.000124+00	2025-11-19 11:00:00.060885+00
1	42	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-19 12:00:00.000254+00	2025-11-19 12:00:00.064218+00
1	46	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-19 14:00:00.000117+00	2025-11-19 14:00:00.064048+00
1	48	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-19 15:00:00.0006+00	2025-11-19 15:00:00.065061+00
1	50	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-19 16:00:00.000022+00	2025-11-19 16:00:00.06465+00
2	45	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-19 14:00:00.000117+00	2025-11-19 14:00:00.061976+00
2	47	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-19 15:00:00.0006+00	2025-11-19 15:00:00.062885+00
1	52	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-19 17:00:00.000018+00	2025-11-19 17:00:00.015648+00
2	49	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-19 16:00:00.000022+00	2025-11-19 16:00:00.062415+00
2	51	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-19 17:00:00.000018+00	2025-11-19 17:00:00.013482+00
2	53	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-19 18:00:00.000801+00	2025-11-19 18:00:00.06143+00
1	54	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-19 18:00:00.000801+00	2025-11-19 18:00:00.063767+00
2	83	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-21 23:00:00.000616+00	2025-11-21 23:00:00.061465+00
2	55	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-19 19:00:00.000387+00	2025-11-19 19:00:00.017537+00
1	56	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-19 19:00:00.000387+00	2025-11-19 19:00:00.019985+00
2	73	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-21 02:00:00.000214+00	2025-11-21 02:00:00.059273+00
1	58	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-20 02:00:00.000189+00	2025-11-20 02:00:00.018874+00
2	57	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-20 02:00:00.000189+00	2025-11-20 02:00:00.021128+00
1	74	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-21 02:00:00.000214+00	2025-11-21 02:00:00.061579+00
2	59	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-20 03:00:00.000216+00	2025-11-20 03:00:00.015461+00
1	60	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-20 03:00:00.000216+00	2025-11-20 03:00:00.017791+00
1	98	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-23 18:00:00.000682+00	2025-11-23 18:00:00.063103+00
2	61	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-20 14:00:00.000899+00	2025-11-20 14:00:00.022619+00
1	62	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-20 14:00:00.000899+00	2025-11-20 14:00:00.024932+00
1	76	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-21 17:00:00.000048+00	2025-11-21 17:00:00.022981+00
1	64	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-20 15:00:00.000094+00	2025-11-20 15:00:00.016272+00
2	63	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-20 15:00:00.000094+00	2025-11-20 15:00:00.018395+00
2	75	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-21 17:00:00.000048+00	2025-11-21 17:00:00.025245+00
2	65	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-20 22:00:00.000055+00	2025-11-20 22:00:00.023833+00
1	66	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-20 22:00:00.000055+00	2025-11-20 22:00:00.026085+00
1	92	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-23 14:00:00.000163+00	2025-11-23 14:00:00.02139+00
1	68	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-20 23:00:00.000517+00	2025-11-20 23:00:00.01603+00
2	67	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-20 23:00:00.000517+00	2025-11-20 23:00:00.018135+00
2	85	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-22 00:00:00.000806+00	2025-11-22 00:00:00.060973+00
1	78	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-21 18:00:00.000198+00	2025-11-21 18:00:00.060567+00
1	70	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-21 00:00:00.00048+00	2025-11-21 00:00:00.014828+00
2	69	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-21 00:00:00.00048+00	2025-11-21 00:00:00.017074+00
2	77	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-21 18:00:00.000198+00	2025-11-21 18:00:00.062934+00
2	71	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-21 01:00:00.000373+00	2025-11-21 01:00:00.014906+00
1	72	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-21 01:00:00.000373+00	2025-11-21 01:00:00.017244+00
1	86	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-22 00:00:00.000806+00	2025-11-22 00:00:00.063194+00
1	80	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-21 21:00:00.000025+00	2025-11-21 21:00:00.025211+00
2	79	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-21 21:00:00.000025+00	2025-11-21 21:00:00.027462+00
2	91	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-23 14:00:00.000163+00	2025-11-23 14:00:00.023418+00
2	81	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-21 22:00:00.000744+00	2025-11-21 22:00:00.063972+00
1	82	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-21 22:00:00.000744+00	2025-11-21 22:00:00.066236+00
1	96	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-23 16:00:00.000802+00	2025-11-23 16:00:00.014946+00
1	84	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-21 23:00:00.000616+00	2025-11-21 23:00:00.059243+00
2	87	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-22 01:00:00.000395+00	2025-11-22 01:00:00.061106+00
1	88	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-22 01:00:00.000395+00	2025-11-22 01:00:00.063252+00
2	95	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-23 16:00:00.000802+00	2025-11-23 16:00:00.017284+00
1	90	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-22 02:00:00.000226+00	2025-11-22 02:00:00.013523+00
2	89	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-22 02:00:00.000226+00	2025-11-22 02:00:00.015694+00
2	93	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-23 15:00:00.000292+00	2025-11-23 15:00:00.059168+00
1	94	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-23 15:00:00.000292+00	2025-11-23 15:00:00.061383+00
2	97	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-23 18:00:00.000682+00	2025-11-23 18:00:00.065285+00
1	102	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-23 20:00:00.000062+00	2025-11-23 20:00:00.06196+00
2	99	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-23 19:00:00.000076+00	2025-11-23 19:00:00.014949+00
1	100	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-23 19:00:00.000076+00	2025-11-23 19:00:00.017183+00
1	104	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-23 21:00:00.000507+00	2025-11-23 21:00:00.017202+00
2	101	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-23 20:00:00.000062+00	2025-11-23 20:00:00.059698+00
2	103	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-23 21:00:00.000507+00	2025-11-23 21:00:00.014937+00
2	105	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-23 22:00:00.000322+00	2025-11-23 22:00:00.012532+00
1	106	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-23 22:00:00.000322+00	2025-11-23 22:00:00.014789+00
2	149	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 20:00:00.00092+00	2025-11-25 20:00:00.016102+00
2	125	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 08:00:00.000174+00	2025-11-25 08:00:00.115381+00
1	108	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-23 23:00:00.000053+00	2025-11-23 23:00:00.015231+00
2	107	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-23 23:00:00.000053+00	2025-11-23 23:00:00.017704+00
1	126	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 08:00:00.000174+00	2025-11-25 08:00:00.123124+00
1	110	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-24 00:00:00.000714+00	2025-11-24 00:00:00.059061+00
2	109	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-24 00:00:00.000714+00	2025-11-24 00:00:00.061218+00
1	112	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-24 12:00:00.000351+00	2025-11-24 12:00:00.063538+00
2	111	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-24 12:00:00.000351+00	2025-11-24 12:00:00.065677+00
2	143	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 17:00:00.000962+00	2025-11-25 17:00:00.06205+00
1	128	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 09:00:00.000727+00	2025-11-25 09:00:00.063483+00
2	113	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-24 13:00:00.000142+00	2025-11-24 13:00:00.013942+00
1	114	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-24 13:00:00.000142+00	2025-11-24 13:00:00.016137+00
2	127	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 09:00:00.000727+00	2025-11-25 09:00:00.065767+00
2	115	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-24 14:00:00.000205+00	2025-11-24 14:00:00.014014+00
1	116	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-24 14:00:00.000205+00	2025-11-24 14:00:00.016361+00
2	137	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 14:00:00.000083+00	2025-11-25 14:00:00.062996+00
1	118	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-24 19:00:00.0008+00	2025-11-24 19:00:00.015673+00
2	117	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-24 19:00:00.0008+00	2025-11-24 19:00:00.017891+00
1	138	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 14:00:00.000083+00	2025-11-25 14:00:00.065298+00
2	129	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 10:00:00.000043+00	2025-11-25 10:00:00.014865+00
1	120	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-24 20:00:00.000245+00	2025-11-24 20:00:00.016479+00
2	119	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-24 20:00:00.000245+00	2025-11-24 20:00:00.018744+00
1	130	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 10:00:00.000043+00	2025-11-25 10:00:00.017224+00
2	121	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-24 21:00:00.000246+00	2025-11-24 21:00:00.016088+00
1	122	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-24 21:00:00.000246+00	2025-11-24 21:00:00.018257+00
1	124	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-24 22:00:00.000254+00	2025-11-24 22:00:00.013839+00
2	123	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-24 22:00:00.000254+00	2025-11-24 22:00:00.0161+00
1	144	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 17:00:00.000962+00	2025-11-25 17:00:00.064294+00
1	132	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 11:00:00.000421+00	2025-11-25 11:00:00.060132+00
2	131	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 11:00:00.000421+00	2025-11-25 11:00:00.062409+00
2	139	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 15:00:00.000401+00	2025-11-25 15:00:00.061655+00
2	133	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 12:00:00.000687+00	2025-11-25 12:00:00.063718+00
1	134	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 12:00:00.000687+00	2025-11-25 12:00:00.066003+00
1	140	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 15:00:00.000401+00	2025-11-25 15:00:00.063879+00
2	135	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 13:00:00.000037+00	2025-11-25 13:00:00.062772+00
1	136	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 13:00:00.000037+00	2025-11-25 13:00:00.065008+00
2	147	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 19:00:00.00072+00	2025-11-25 19:00:00.015661+00
2	141	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 16:00:00.000088+00	2025-11-25 16:00:00.062899+00
1	142	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 16:00:00.000088+00	2025-11-25 16:00:00.065223+00
1	148	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 19:00:00.00072+00	2025-11-25 19:00:00.018098+00
2	145	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 18:00:00.000724+00	2025-11-25 18:00:00.061782+00
1	146	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 18:00:00.000724+00	2025-11-25 18:00:00.064071+00
1	150	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 20:00:00.00092+00	2025-11-25 20:00:00.0184+00
2	151	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 21:00:00.00063+00	2025-11-25 21:00:00.059694+00
1	152	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 21:00:00.00063+00	2025-11-25 21:00:00.061945+00
2	153	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 22:00:00.000241+00	2025-11-25 22:00:00.060958+00
1	154	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 22:00:00.000241+00	2025-11-25 22:00:00.058832+00
2	155	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 23:00:00.00017+00	2025-11-25 23:00:00.062145+00
1	156	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-25 23:00:00.00017+00	2025-11-25 23:00:00.059852+00
2	157	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-26 00:00:00.000433+00	2025-11-26 00:00:00.014807+00
1	158	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-26 00:00:00.000433+00	2025-11-26 00:00:00.01699+00
1	160	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-27 21:00:00.000689+00	2025-11-27 21:00:00.065258+00
2	159	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-27 21:00:00.000689+00	2025-11-27 21:00:00.067498+00
2	161	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-27 22:00:00.000397+00	2025-11-27 22:00:00.059607+00
1	162	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-27 22:00:00.000397+00	2025-11-27 22:00:00.061887+00
2	163	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-27 23:00:00.000023+00	2025-11-27 23:00:00.014973+00
1	164	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-27 23:00:00.000023+00	2025-11-27 23:00:00.017218+00
2	165	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-29 16:00:00.00092+00	2025-11-29 16:00:00.023338+00
1	166	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-29 16:00:00.00092+00	2025-11-29 16:00:00.025537+00
1	168	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-29 17:00:00.000777+00	2025-11-29 17:00:00.059947+00
2	167	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-29 17:00:00.000777+00	2025-11-29 17:00:00.062339+00
2	169	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-29 18:00:00.000027+00	2025-11-29 18:00:00.014112+00
1	170	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-29 18:00:00.000027+00	2025-11-29 18:00:00.016393+00
2	171	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-29 19:00:00.000343+00	2025-11-29 19:00:00.014778+00
1	172	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-29 19:00:00.000343+00	2025-11-29 19:00:00.01713+00
\.


--
-- Data for Name: auto_cheklst; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auto_cheklst (id, zone_id, description) FROM stdin;
6	1	Поставь вариться кукурузу!
7	1	Надо помыть аппарат для сахарной ваты!
8	1	Расставь напитки в холодильнике!
9	1	Надо убрать паутину, помыть полы, протереть поверхности (столы,холодильник, кофемашину, раковину).
10	1	Надо помыть кофемашину и пополнить компоненты.
11	1	Надо сделать попкорн)
12	1	Не забудь помыть попкорницу.
13	2	Включи комп, программу Лайм
14	2	Открой жалюзи и окно
15	2	Открой смену на терминале/кассе
16	2	Убери весь мусор со стола, сложи всё по местам
17	2	Помыть полы
18	2	Выкинуть мусор
19	2	Собрать мусор на территории кассы
20	3	Открой ставни
21	3	Протри автоматы, подключи к блоку и поставь на подставку  (3 шт)
22	3	Включи комп, зайди в тир контроль
23	3	Протри мишени и подними их.
24	3	Убери рабочее место (стол/под столом)
25	3	Убери всю паутину  (стены/потолок)
26	3	Развесить призы 
27	3	Подмети полы, собери пульки
28	3	Собрать мусор на территории тира
29	3	Проверить наличие брелков и игрушек, написать в закуп
30	3	Проверить исправность автоматов, настроить / написать в задачи, что нужно починить
31	10	Открой кабинку инструктора и включи КО
32	10	Проверь колёса, надо накачать до 5
33	10	Открой окна в кабинках на 1 круг (нужно проветрить) 
34	10	Помой стекла в кабинках, чтобы наши посетители могли любоваться видом 
35	10	Не забудь помыть полы  в каждой кабинке
36	10	Осталось помыть входную группу на КО 
37	11	Включи экстрим Проведи внешний осмотр аттракциона 
38	11	Нужно проверить опоры (4 шт)
39	11	Проверить ремни безопасности и крепления на каждом посадочном месте.  (16 шт) 
40	11	Теперь давай наведём порядок.  Протри все посадочные места
41	11	Собери весь мусор в кабинке оператора.
42	11	Помой полы, протри пыль, убери всё лишнее по местам
43	11	Убери территорию Экстрима от мусора и проверь на наличие гаек, шайб и т. д.
44	11	Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. 
45	12	Включи музыку для хорошего настроения всей команды!
46	12	Протри от пыли все машинки
47	12	Подмети пол
48	12	Собери паутину по периметру, в каждом уголочке 
49	12	Убери территорию автодрома
50	12	Проверь аттракцион на исправность, если есть какие-то задачи, пиши в чат
51	13	Включи лодку Проведи внешний осмотр аттракциона 
52	13	Нужно проверить опоры (4 шт)
53	13	Проверить ремни безопасности и крепления на каждом посадочном месте.  (30 шт) 
54	13	Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков.
55	13	Теперь давай наведём порядок.  Протри все посадочные места
56	13	Протри пыль на лодке
57	13	Убери входную группу
58	13	Убери территорию вокруг аттракциона
59	14	1. Выкл сигнализацию\n2. Распределить   людей для открытия парка. \n3. Убедись,   что все аттракционы работают (Музыка на автодроме играет). Игротека вкл(+ без   пыли и паутины)
61	14	Проверить   на чистоту лабиринт (нет воды на крыше, протерли от пыли, все шарики в   бассейне)
62	14	Проверить   Зорбы. (Бассейн чистый, Зорбы чистые, входная площадка чистая)
63	14	Проверить   джет (все посадочные места чистые)
64	14	Касса. Комп вкл, чистые полы, нет мусора, всё лежит аккуратно. Чек лента есть (мин по 2 пачки)
65	14	Экстрим.   Чистое рабочее место, посадочные места чистые
66	14	Автодром.   Машинки чистые, убрали паутину, подмели пол, выкинули мусор.
67	14	Лодка.   Нет скопления воды, чистые посадочные места, выкинули мусор
68	14	Кафе.         \nЧистые полы     \nЧистая раковина\nНет паутины \nЧистые столы\nЧистый аппарат для ваты\nКукуруза варится  \nХолодильник заполнен напитками\nПорядок под стойкой \nЧистый холодильник  \nСотрудник кафе делает список закупа 
69	14	Прокат. Все машинки стоят на зарядке. Машинки протерли от пыли.
70	14	Кабинки в КО чистые, рабочее место чистое, входная группа чистая
71	14	Убрать территорию парка. 
72	14	В ПН и ЧТ Составить список закупа для кафе\nНапоминалка.  \nНапитки — пепси.\nКофе, сливки, шоколад, сахар в инд. уп., стаканчики, крышки, ложки.        Попкорн, масло, добавки.\nКукуруза, соль, шпажки, стаканчики.\nМороженое.\nШантипак, молоко, лимоны/лайм/мята, сливки кокос., взбитые сливки, газ. вода 2 л, сахар,  мус. пакеты,  чай, салфетки.\nСиропы, краситель для ваты, трубочки, палочки для ваты.        \nОдноразовые стаканы для коктейлей + крышки (0,4 + 0,5).        \nМоти.        \nЧековая лента.
73	14	Проверить наличие инвентаря и запчасти.\nНапоминалка.  Шарики в лабиринте.       \nРемни безопасности (джет, экстрим, лодка, автодром).       \nТир (пульки, игрушки, брелоки, исправность автоматов).
74	14	Выявить неполадки работы оборудования и техники (машинки (прокат), двери в КО, Зорбы, мишени, машинки, автодром и т. д.). 
75	14	Проверить тир на чистоту (стоят автоматы, нет паутины, подняты все мишени, брелоки и игрушки висят в нужном количестве (нет пустого места)) 
76	14	пппп
77	14	ооо
\.


--
-- Data for Name: checklists; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.checklists (id, date, zone_id, description, photo, status, issue_time, return_time, admin_id, confirmed, important) FROM stdin;
197	2025-11-9	6	Помыть ко	\N	t	2025-11-12 14:38:53.712944+00	2025-11-12 14:43:23.393598+00	\N	t	t
193	2025-11-18	2	тест-важный	/list/checklist_193_1763473046.jpg	t	2025-11-18 13:36:55.998078+00	2025-11-18 13:37:26.196014+00	128	t	t
384	2025-11-24	12	привет	/list/checklist_384_1763989314_0.jpg	t	2025-11-24 13:01:40.552702+00	2025-11-24 13:01:54.007304+00	128	t	t
385	2025-11-25	1	Поставь вариться кукурузу!	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
386	2025-11-25	1	Надо помыть аппарат для сахарной ваты!	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
387	2025-11-25	1	Расставь напитки в холодильнике!	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
388	2025-11-25	1	Надо убрать паутину, помыть полы, протереть поверхности (столы,холодильник, кофемашину, раковину).	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
389	2025-11-25	1	Надо помыть кофемашину и пополнить компоненты.	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
390	2025-11-25	1	Надо сделать попкорн)	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
391	2025-11-25	1	Не забудь помыть попкорницу.	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
392	2025-11-25	14	1. Выкл сигнализацию\n2. Распределить   людей для открытия парка. \n3. Убедись,   что все аттракционы работают (Музыка на автодроме играет). Игротека вкл(+ без   пыли и паутины)	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
393	2025-11-25	14	Проверить   тир на чистоту (стоят автоматы, нет паутины, подняты все мишени, брелоки и   игрушки весят в нужном количестве (нет пустого места)) 	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
394	2025-11-25	14	Проверить   на чистоту лабиринт (нет воды на крыше, протерли от пыли, все шарики в   бассейне)	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
395	2025-11-25	14	Проверить   Зорбы. (Бассейн чистый, Зорбы чистые, входная площадка чистая)	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
396	2025-11-25	14	Проверить   джет (все посадочные места чистые)	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
397	2025-11-25	14	Касса. Комп вкл, чистые полы, нет мусора, всё лежит аккуратно. Чек лента есть (мин по 2 пачки)	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
398	2025-11-25	14	Экстрим.   Чистое рабочее место, посадочные места чистые	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
399	2025-11-25	14	Автодром.   Машинки чистые, убрали паутину, подмели пол, выкинули мусор.	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
400	2025-11-25	14	Лодка.   Нет скопления воды, чистые посадочные места, выкинули мусор	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
401	2025-11-25	14	Кафе.         \nЧистые полы     \nЧистая раковина\nНет паутины \nЧистые столы\nЧистый аппарат для ваты\nКукуруза варится  \nХолодильник заполнен напитками\nПорядок под стойкой \nЧистый холодильник  \nСотрудник кафе делает список закупа 	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
402	2025-11-25	14	Прокат. Все машинки стоят на зарядке. Машинки протерли от пыли.	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
403	2025-11-25	14	Кабинки в КО чистые, рабочее место чистое, входная группа чистая	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
404	2025-11-25	14	Убрать территорию парка. 	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
405	2025-11-25	14	В ПН и ЧТ Составить список закупа для кафе\nНапоминалка.  \nНапитки — пепси.\nКофе, сливки, шоколад, сахар в инд. уп., стаканчики, крышки, ложки.        Попкорн, масло, добавки.\nКукуруза, соль, шпажки, стаканчики.\nМороженое.\nШантипак, молоко, лимоны/лайм/мята, сливки кокос., взбитые сливки, газ. вода 2 л, сахар,  мус. пакеты,  чай, салфетки.\nСиропы, краситель для ваты, трубочки, палочки для ваты.        \nОдноразовые стаканы для коктейлей + крышки (0,4 + 0,5).        \nМоти.        \nЧековая лента.	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
406	2025-11-25	14	Проверить наличие инвентаря и запчасти.\nНапоминалка.  Шарики в лабиринте.       \nРемни безопасности (джет, экстрим, лодка, автодром).       \nТир (пульки, игрушки, брелоки, исправность автоматов).	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
407	2025-11-25	14	Выявить неполадки работы оборудования и техники (машинки (прокат), двери в КО, Зорбы, мишени, машинки, автодром и т. д.). 	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
408	2025-11-25	10	Открой кабинку инструктора и включи КО	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
409	2025-11-25	10	Проверь колёса, надо накачать до 5	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
410	2025-11-25	10	Открой окна в кабинках на 1 круг (нужно проветрить) 	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
411	2025-11-25	10	Помой стекла в кабинках, чтобы наши посетители могли любоваться видом 	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
412	2025-11-25	10	Не забудь помыть полы  в каждой кабинке	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
413	2025-11-25	10	Осталось помыть входную группу на КО 	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
420	2025-11-25	2	Собрать мусор на территории кассы	/list/checklist_420_1764095502_0.jpg,/list/checklist_420_1764095502_1.jpg	t	2025-11-25 09:05:00.002158+00	2025-11-25 18:31:42.894121+00	\N	f	f
416	2025-11-25	2	Открой смену на терминале/кассе	/list/checklist_416_1764095520_0.jpg	t	2025-11-25 09:05:00.002158+00	2025-11-25 18:32:00.342432+00	\N	f	f
417	2025-11-25	2	Убери весь мусор со стола, сложи всё по местам	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
418	2025-11-25	2	Помыть полы	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
419	2025-11-25	2	Выкинуть мусор	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
421	2025-11-25	3	Открой ставни	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
422	2025-11-25	3	Протри автоматы, подключи к блоку и поставь на подставку  (3 шт)	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
423	2025-11-25	3	Включи комп, зайди в тир контроль	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
424	2025-11-25	3	Протри мишени и подними их.	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
425	2025-11-25	3	Убери рабочее место (стол/под столом)	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
426	2025-11-25	3	Убери всю паутину  (стены/потолок)	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
427	2025-11-25	3	Развесить призы 	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
428	2025-11-25	3	Подмети полы, собери пульки	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
429	2025-11-25	3	Собрать мусор на территории тира	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
430	2025-11-25	3	Проверить наличие брелков и игрушек, написать в закуп	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
431	2025-11-25	3	Проверить исправность автоматов, настроить / написать в задачи, что нужно починить	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
432	2025-11-25	11	Включи экстрим Проведи внешний осмотр аттракциона 	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
433	2025-11-25	11	Нужно проверить опоры (4 шт)	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
434	2025-11-25	11	Проверить ремни безопасности и крепления на каждом посадочном месте.  (16 шт) 	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
435	2025-11-25	11	Теперь давай наведём порядок.  Протри все посадочные места	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
436	2025-11-25	11	Собери весь мусор в кабинке оператора.	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
437	2025-11-25	11	Помой полы, протри пыль, убери всё лишнее по местам	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
438	2025-11-25	11	Убери территорию Экстрима от мусора и проверь на наличие гаек, шайб и т. д.	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
439	2025-11-25	11	Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. 	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
440	2025-11-25	12	Включи музыку для хорошего настроения всей команды!	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
441	2025-11-25	12	Протри от пыли все машинки	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
442	2025-11-25	12	Подмети пол	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
443	2025-11-25	12	Собери паутину по периметру, в каждом уголочке 	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
444	2025-11-25	12	Убери территорию автодрома	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
445	2025-11-25	12	Проверь аттракцион на исправность, если есть какие-то задачи, пиши в чат	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
446	2025-11-25	13	Включи лодку Проведи внешний осмотр аттракциона 	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
447	2025-11-25	13	Нужно проверить опоры (4 шт)	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
448	2025-11-25	13	Проверить ремни безопасности и крепления на каждом посадочном месте.  (30 шт) 	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
449	2025-11-25	13	Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков.	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
450	2025-11-25	13	Теперь давай наведём порядок.  Протри все посадочные места	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
451	2025-11-25	13	Протри пыль на лодке	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
452	2025-11-25	13	Убери входную группу	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
453	2025-11-25	13	Убери территорию вокруг аттракциона	\N	f	2025-11-25 09:05:00.002158+00	\N	\N	f	f
414	2025-11-25	2	Включи комп, программу Лайм	/list/checklist_414_1764068741_0.jpg	t	2025-11-25 09:05:00.002158+00	2025-11-25 11:05:41.688804+00	\N	f	f
415	2025-11-25	2	Открой жалюзи и окно	/list/checklist_415_1764068800_0.jpg	t	2025-11-25 09:05:00.002158+00	2025-11-25 11:06:40.625444+00	\N	f	f
\.


--
-- Data for Name: schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schedules (id, worker_id, zone_id, date, planned_start_time, planned_end_time, actual_start_time, actual_end_time, hourly_rate, photo_start, photo_end) FROM stdin;
95	124	6	2025-11-10	09:00:00	18:00:00	08:00:00	20:00:00	350.00	\N	\N
49	124	4	2025-11-09	09:00:00	18:00:00	\N	\N	150.00	\N	\N
98	124	6	2025-11-11	09:00:00	18:00:00	13:23:00	16:23:00	232.00	\N	\N
89	124	\N	2025-11-07	09:00:00	18:00:00	\N	\N	3434.00	\N	\N
86	124	\N	2025-11-03	09:00:00	18:00:00	16:29:00	16:29:00	3434.00	\N	\N
100	127	6	2025-11-12	09:00:00	18:00:00	15:38:00	15:43:00	232.00	\N	\N
81	124	4	2025-11-08	09:00:00	18:00:00	\N	\N	150.00	\N	\N
37	124	3	2025-11-05	09:00:00	18:00:00	16:29:00	16:29:00	999.00	\N	\N
47	124	5	2025-11-06	09:00:00	18:00:00	16:29:00	16:29:00	220.00	\N	\N
48	124	\N	2025-11-15	09:00:00	18:00:00	08:00:00	16:55:00	123.00	\N	\N
101	124	2	2025-11-19	09:00:00	18:00:00	\N	\N	276.00	\N	\N
104	124	1	2025-11-21	09:00:00	18:00:00	\N	\N	232.00	\N	\N
105	124	1	2025-11-23	09:00:00	18:00:00	\N	\N	232.00	\N	\N
115	124	2	2025-11-25	10:00:00	21:00:00	10:03:00	16:37:00	218.00	/smena/smena_start_115_1764068672_0.jpg	/smena/smena_end_115_1764092325_0.jpg
103	124	6	2025-11-18	09:00:00	18:00:00	22:32:00	22:32:00	232.00	/smena/smena_start_103_1763501483_0.jpg	/smena/smena_end_103_1763501511_0.jpg,/smena/smena_end_103_1763501511_1.jpg
106	124	10	2025-11-18	09:00:00	18:00:00	22:28:00	22:30:00	240.00	/smena/smena_start_106_1763501270_0.jpg,/smena/smena_start_106_1763501270_1.jpg	/smena/smena_end_106_1763501391_0.jpg,/smena/smena_end_106_1763501391_1.jpg
107	124	6	2025-11-19	14:00:00	18:00:00	\N	\N	250.00	\N	\N
102	124	2	2025-11-18	09:00:00	18:00:00	23:58:00	00:30:00	276.00	/smena/smena_start_102_1763510234_0.jpg	/smena/smena_end_102_1763517864_0.jpg,/smena/smena_end_102_1763517864_1.jpg
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, telegram_id, username, first_name, last_name, phone_number, confirmed, created_at, is_admin, chat_id) FROM stdin;
127	733190744		D.A.Machin			t	2025-11-12 14:19:46.230532+00	f	733190744
128	1028613614	Foxi_olesia	Олеся	 		t	2025-11-12 14:19:46.233417+00	t	1028613614
130	1162086240	thenotorius_077777	Maverick			t	2025-11-24 12:24:25.295313+00	f	1162086240
131	615487845	mewpl3	Mew			f	2025-11-25 12:02:05.010752+00	f	615487845
124	1112662763	Egor12sar	Egor			t	2025-11-05 22:21:10.040808+00	f	1112662763
\.


--
-- Data for Name: zones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.zones (id, name, description, working_hours, image_path, price) FROM stdin;
1	Кафе		10:00 - 23:00	/zones/1_1763509592.png	185.00
6	Зорбы, ДЖЕТ		10:00 - 22:00		170.00
14	Старший смены		10:00 - 21:00		236.00
10	Колесо обозрения		10:00 - 21:00	/zones/10_1763988259.jpg	218.00
2	Касса	Описание Касса	10:00 - 21:00		218.00
3	Тир		10:00 - 21:00		218.00
4	Лабиринт		10:00 - 23:00		170.00
5	Прокат		10:00 - 22:00		170.00
11	Экстрим		10:00 - 21:00		218.00
12	Автодром		10:00 - 21:00		218.00
13	Лодка		10:00 - 21:00		218.00
\.


--
-- Name: jobid_seq; Type: SEQUENCE SET; Schema: cron; Owner: postgres
--

SELECT pg_catalog.setval('cron.jobid_seq', 2, true);


--
-- Name: runid_seq; Type: SEQUENCE SET; Schema: cron; Owner: postgres
--

SELECT pg_catalog.setval('cron.runid_seq', 172, true);


--
-- Name: auto_cheklst_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auto_cheklst_id_seq', 77, true);


--
-- Name: checklists_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.checklists_id_seq', 453, true);


--
-- Name: schedules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.schedules_id_seq', 115, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 131, true);


--
-- Name: zones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.zones_id_seq', 14, true);


--
-- Name: auto_cheklst auto_cheklst_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auto_cheklst
    ADD CONSTRAINT auto_cheklst_pkey PRIMARY KEY (id);


--
-- Name: checklists checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT checklists_pkey PRIMARY KEY (id);


--
-- Name: schedules schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_pkey PRIMARY KEY (id);


--
-- Name: users unique_telegram_id; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT unique_telegram_id UNIQUE (telegram_id);


--
-- Name: schedules unique_worker_zone_date; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT unique_worker_zone_date UNIQUE (worker_id, zone_id, date);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: zones zones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_pkey PRIMARY KEY (id);


--
-- Name: idx_checklists_admin_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_checklists_admin_id ON public.checklists USING btree (admin_id);


--
-- Name: idx_checklists_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_checklists_date ON public.checklists USING btree (date);


--
-- Name: idx_checklists_issue_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_checklists_issue_time ON public.checklists USING btree (issue_time);


--
-- Name: idx_checklists_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_checklists_status ON public.checklists USING btree (status);


--
-- Name: idx_checklists_zone_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_checklists_zone_id ON public.checklists USING btree (zone_id);


--
-- Name: idx_users_confirmed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_confirmed ON public.users USING btree (confirmed);


--
-- Name: idx_users_telegram_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_telegram_id ON public.users USING btree (telegram_id);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: schedules tr_set_schedule_hourly_rate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tr_set_schedule_hourly_rate BEFORE INSERT OR UPDATE ON public.schedules FOR EACH ROW EXECUTE FUNCTION public.set_schedule_hourly_rate();


--
-- Name: checklists checklists_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT checklists_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: auto_cheklst checklists_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auto_cheklst
    ADD CONSTRAINT checklists_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE CASCADE;


--
-- Name: checklists checklists_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT checklists_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE CASCADE;


--
-- Name: schedules fk_schedules_worker; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT fk_schedules_worker FOREIGN KEY (worker_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: schedules fk_schedules_zone; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT fk_schedules_zone FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict 2MxSDSAREX9cKJ2oExAtk06bQsRJmmqIeLqVnAJzTDmRflBiDv9hIvG6D97ajXl

