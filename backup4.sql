--
-- PostgreSQL database dump
--

\restrict 3PGuYTJsVelEHAEhv2sQ3yXl4gryxX3IGga7kLXGEXbQAkcmL3INQonct56xYX9

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
                INSERT INTO checklists (zone_id, description, date, status, issue_time, confirmed, important)
                SELECT
                    zone_record.id,
                    description,
                    to_char(CURRENT_DATE, 'YYYY-MM-DD'),
                    false,
                    CURRENT_TIMESTAMP,
                    false,
                    important  -- Добавлено поле important
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
    description text,
    important boolean DEFAULT false NOT NULL
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
-- Name: bonus_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bonus_templates (
    id bigint NOT NULL,
    name text NOT NULL,
    price numeric(10,2) NOT NULL
);


ALTER TABLE public.bonus_templates OWNER TO postgres;

--
-- Name: bonus_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bonus_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bonus_templates_id_seq OWNER TO postgres;

--
-- Name: bonus_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bonus_templates_id_seq OWNED BY public.bonus_templates.id;


--
-- Name: bonuses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bonuses (
    id bigint NOT NULL,
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    user_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.bonuses OWNER TO postgres;

--
-- Name: bonuses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bonuses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bonuses_id_seq OWNER TO postgres;

--
-- Name: bonuses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bonuses_id_seq OWNED BY public.bonuses.id;


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
-- Name: fine_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fine_templates (
    id bigint NOT NULL,
    name text NOT NULL,
    price numeric(10,2) NOT NULL
);


ALTER TABLE public.fine_templates OWNER TO postgres;

--
-- Name: fine_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fine_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fine_templates_id_seq OWNER TO postgres;

--
-- Name: fine_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fine_templates_id_seq OWNED BY public.fine_templates.id;


--
-- Name: fines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fines (
    id bigint NOT NULL,
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    user_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.fines OWNER TO postgres;

--
-- Name: fines_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fines_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fines_id_seq OWNER TO postgres;

--
-- Name: fines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fines_id_seq OWNED BY public.fines.id;


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
-- Name: bonus_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bonus_templates ALTER COLUMN id SET DEFAULT nextval('public.bonus_templates_id_seq'::regclass);


--
-- Name: bonuses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bonuses ALTER COLUMN id SET DEFAULT nextval('public.bonuses_id_seq'::regclass);


--
-- Name: checklists id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checklists ALTER COLUMN id SET DEFAULT nextval('public.checklists_id_seq'::regclass);


--
-- Name: fine_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fine_templates ALTER COLUMN id SET DEFAULT nextval('public.fine_templates_id_seq'::regclass);


--
-- Name: fines id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fines ALTER COLUMN id SET DEFAULT nextval('public.fines_id_seq'::regclass);


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
2	201	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-30 21:00:00.000105+00	2025-11-30 21:00:00.015506+00
1	178	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-29 22:00:00.000985+00	2025-11-29 22:00:00.014573+00
1	160	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-27 21:00:00.000689+00	2025-11-27 21:00:00.065258+00
2	159	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-27 21:00:00.000689+00	2025-11-27 21:00:00.067498+00
2	177	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-29 22:00:00.000985+00	2025-11-29 22:00:00.016886+00
2	161	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-27 22:00:00.000397+00	2025-11-27 22:00:00.059607+00
1	162	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-27 22:00:00.000397+00	2025-11-27 22:00:00.061887+00
2	163	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-27 23:00:00.000023+00	2025-11-27 23:00:00.014973+00
1	164	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-27 23:00:00.000023+00	2025-11-27 23:00:00.017218+00
2	195	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-30 18:00:00.000942+00	2025-11-30 18:00:00.014898+00
1	180	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-29 23:00:00.000953+00	2025-11-29 23:00:00.016417+00
2	165	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-29 16:00:00.00092+00	2025-11-29 16:00:00.023338+00
1	166	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-29 16:00:00.00092+00	2025-11-29 16:00:00.025537+00
2	179	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-29 23:00:00.000953+00	2025-11-29 23:00:00.018668+00
1	168	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-29 17:00:00.000777+00	2025-11-29 17:00:00.059947+00
2	167	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-29 17:00:00.000777+00	2025-11-29 17:00:00.062339+00
2	189	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-30 15:00:00.000544+00	2025-11-30 15:00:00.014868+00
2	169	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-29 18:00:00.000027+00	2025-11-29 18:00:00.014112+00
1	170	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-29 18:00:00.000027+00	2025-11-29 18:00:00.016393+00
1	190	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-30 15:00:00.000544+00	2025-11-30 15:00:00.01713+00
2	181	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-30 00:00:00.000899+00	2025-11-30 00:00:00.013576+00
2	171	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-29 19:00:00.000343+00	2025-11-29 19:00:00.014778+00
1	172	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-29 19:00:00.000343+00	2025-11-29 19:00:00.01713+00
1	182	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-30 00:00:00.000899+00	2025-11-30 00:00:00.015691+00
2	173	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-29 20:00:00.0009+00	2025-11-29 20:00:00.015139+00
1	174	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-29 20:00:00.0009+00	2025-11-29 20:00:00.017408+00
2	175	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-29 21:00:00.000869+00	2025-11-29 21:00:00.013907+00
1	176	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-29 21:00:00.000869+00	2025-11-29 21:00:00.016077+00
1	196	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-30 18:00:00.000942+00	2025-11-30 18:00:00.017047+00
2	183	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-30 01:00:00.000416+00	2025-11-30 01:00:00.015+00
1	184	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-30 01:00:00.000416+00	2025-11-30 01:00:00.017394+00
2	191	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-30 16:00:00.000595+00	2025-11-30 16:00:00.01359+00
1	186	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-30 13:00:00.000302+00	2025-11-30 13:00:00.068591+00
2	185	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-30 13:00:00.000302+00	2025-11-30 13:00:00.070847+00
1	192	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-30 16:00:00.000595+00	2025-11-30 16:00:00.015644+00
2	187	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-30 14:00:00.000282+00	2025-11-30 14:00:00.01688+00
1	188	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-30 14:00:00.000282+00	2025-11-30 14:00:00.019164+00
2	199	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-30 20:00:00.000028+00	2025-11-30 20:00:00.014059+00
2	193	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-30 17:00:00.0002+00	2025-11-30 17:00:00.016281+00
1	194	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-30 17:00:00.0002+00	2025-11-30 17:00:00.018552+00
1	200	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-30 20:00:00.000028+00	2025-11-30 20:00:00.01631+00
2	197	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-30 19:00:00.000955+00	2025-11-30 19:00:00.014323+00
1	198	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-30 19:00:00.000955+00	2025-11-30 19:00:00.016757+00
1	202	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-30 21:00:00.000105+00	2025-11-30 21:00:00.017743+00
2	203	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-30 23:00:00.000302+00	2025-11-30 23:00:00.065362+00
1	204	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-30 23:00:00.000302+00	2025-11-30 23:00:00.063141+00
1	206	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 00:00:00.000454+00	2025-12-01 00:00:00.019191+00
2	205	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 00:00:00.000454+00	2025-12-01 00:00:00.016685+00
1	208	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 07:00:00.000009+00	2025-12-01 07:00:00.065222+00
2	207	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 07:00:00.000009+00	2025-12-01 07:00:00.063094+00
2	209	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 08:00:00.000062+00	2025-12-01 08:00:00.065525+00
1	210	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 08:00:00.000062+00	2025-12-01 08:00:00.067747+00
2	253	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 17:00:00.000798+00	2025-12-02 17:00:00.063749+00
2	229	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 21:00:00.000825+00	2025-12-01 21:00:00.022011+00
2	211	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 09:00:00.000004+00	2025-12-01 09:00:00.069064+00
1	212	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 09:00:00.000004+00	2025-12-01 09:00:00.071325+00
1	230	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 21:00:00.000825+00	2025-12-01 21:00:00.024209+00
2	213	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 10:00:00.000149+00	2025-12-01 10:00:00.062582+00
1	214	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 10:00:00.000149+00	2025-12-01 10:00:00.064771+00
1	216	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 11:00:00.000701+00	2025-12-01 11:00:00.061677+00
2	215	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 11:00:00.000701+00	2025-12-01 11:00:00.064053+00
2	247	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 14:00:00.000406+00	2025-12-02 14:00:00.063179+00
2	231	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 22:00:00.000271+00	2025-12-01 22:00:00.017321+00
2	217	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 12:00:00.000473+00	2025-12-01 12:00:00.063181+00
1	218	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 12:00:00.000473+00	2025-12-01 12:00:00.065417+00
1	232	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 22:00:00.000271+00	2025-12-01 22:00:00.020792+00
1	220	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 13:00:00.000589+00	2025-12-01 13:00:00.062905+00
2	219	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 13:00:00.000589+00	2025-12-01 13:00:00.064955+00
2	241	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 11:00:00.000435+00	2025-12-02 11:00:00.063262+00
1	222	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 14:00:00.000476+00	2025-12-01 14:00:00.015781+00
2	221	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 14:00:00.000476+00	2025-12-01 14:00:00.017981+00
1	242	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 11:00:00.000435+00	2025-12-02 11:00:00.065507+00
2	233	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 07:00:00.000043+00	2025-12-02 07:00:00.063651+00
2	223	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 15:00:00.000501+00	2025-12-01 15:00:00.062608+00
1	224	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 15:00:00.000501+00	2025-12-01 15:00:00.064922+00
1	234	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 07:00:00.000043+00	2025-12-02 07:00:00.065928+00
2	225	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 16:00:00.000305+00	2025-12-01 16:00:00.062952+00
1	226	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 16:00:00.000305+00	2025-12-01 16:00:00.065184+00
1	228	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 17:00:00.000554+00	2025-12-01 17:00:00.061441+00
2	227	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-01 17:00:00.000554+00	2025-12-01 17:00:00.063661+00
1	248	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 14:00:00.000406+00	2025-12-02 14:00:00.065451+00
2	235	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 08:00:00.001046+00	2025-12-02 08:00:00.063848+00
1	236	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 08:00:00.001046+00	2025-12-02 08:00:00.066126+00
2	243	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 12:00:00.000099+00	2025-12-02 12:00:00.059644+00
2	237	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 09:00:00.000167+00	2025-12-02 09:00:00.062812+00
1	238	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 09:00:00.000167+00	2025-12-02 09:00:00.065109+00
1	244	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 12:00:00.000099+00	2025-12-02 12:00:00.06194+00
2	239	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 10:00:00.00058+00	2025-12-02 10:00:00.063376+00
1	240	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 10:00:00.00058+00	2025-12-02 10:00:00.065635+00
2	251	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 16:00:00.000034+00	2025-12-02 16:00:00.059485+00
2	245	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 13:00:00.00083+00	2025-12-02 13:00:00.063581+00
1	246	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 13:00:00.00083+00	2025-12-02 13:00:00.065878+00
1	252	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 16:00:00.000034+00	2025-12-02 16:00:00.061614+00
1	250	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 15:00:00.00006+00	2025-12-02 15:00:00.062591+00
2	249	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 15:00:00.00006+00	2025-12-02 15:00:00.06491+00
1	254	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 17:00:00.000798+00	2025-12-02 17:00:00.066039+00
2	255	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 19:00:00.000189+00	2025-12-02 19:00:00.059638+00
1	256	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 19:00:00.000189+00	2025-12-02 19:00:00.061952+00
2	257	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 20:00:00.000382+00	2025-12-02 20:00:00.016268+00
1	258	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-02 20:00:00.000382+00	2025-12-02 20:00:00.014031+00
1	260	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-03 07:00:00.000027+00	2025-12-03 07:00:00.02594+00
2	259	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-03 07:00:00.000027+00	2025-12-03 07:00:00.02329+00
1	262	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-03 08:00:00.00085+00	2025-12-03 08:00:00.060359+00
2	261	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-03 08:00:00.00085+00	2025-12-03 08:00:00.062759+00
2	305	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 23:00:00.000299+00	2025-12-05 23:00:00.018046+00
2	281	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 08:00:00.000205+00	2025-12-05 08:00:00.066846+00
2	263	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-03 09:00:00.000825+00	2025-12-03 09:00:00.060393+00
1	264	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-03 09:00:00.000825+00	2025-12-03 09:00:00.062776+00
1	282	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 08:00:00.000205+00	2025-12-05 08:00:00.069099+00
1	266	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-03 10:00:00.000704+00	2025-12-03 10:00:00.060044+00
2	265	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-03 10:00:00.000704+00	2025-12-03 10:00:00.062323+00
2	267	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-03 11:00:00.000495+00	2025-12-03 11:00:00.060075+00
1	268	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-03 11:00:00.000495+00	2025-12-03 11:00:00.062372+00
2	299	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 17:00:00.000588+00	2025-12-05 17:00:00.06343+00
2	283	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 09:00:00.000119+00	2025-12-05 09:00:00.062966+00
2	269	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-03 12:00:00.000172+00	2025-12-03 12:00:00.059517+00
1	270	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-03 12:00:00.000172+00	2025-12-03 12:00:00.061804+00
1	284	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 09:00:00.000119+00	2025-12-05 09:00:00.065237+00
1	272	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-03 13:00:00.000318+00	2025-12-03 13:00:00.059761+00
2	271	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-03 13:00:00.000318+00	2025-12-03 13:00:00.061979+00
2	293	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 14:00:00.0006+00	2025-12-05 14:00:00.063244+00
2	273	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-03 14:00:00.000189+00	2025-12-03 14:00:00.059645+00
1	274	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-03 14:00:00.000189+00	2025-12-03 14:00:00.061879+00
1	294	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 14:00:00.0006+00	2025-12-05 14:00:00.065463+00
2	285	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 10:00:00.000127+00	2025-12-05 10:00:00.06207+00
2	275	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-03 15:00:00.000227+00	2025-12-03 15:00:00.059461+00
1	276	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-03 15:00:00.000227+00	2025-12-03 15:00:00.061761+00
1	286	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 10:00:00.000127+00	2025-12-05 10:00:00.064281+00
2	277	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-03 16:00:00.000693+00	2025-12-03 16:00:00.060281+00
1	278	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-03 16:00:00.000693+00	2025-12-03 16:00:00.062511+00
2	279	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-03 17:00:00.000171+00	2025-12-03 17:00:00.059791+00
1	280	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-03 17:00:00.000171+00	2025-12-03 17:00:00.062014+00
1	300	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 17:00:00.000588+00	2025-12-05 17:00:00.065729+00
2	287	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 11:00:00.000906+00	2025-12-05 11:00:00.063297+00
1	288	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 11:00:00.000906+00	2025-12-05 11:00:00.065434+00
2	295	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 15:00:00.000737+00	2025-12-05 15:00:00.062057+00
2	289	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 12:00:00.00063+00	2025-12-05 12:00:00.08862+00
1	290	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 12:00:00.00063+00	2025-12-05 12:00:00.097467+00
1	296	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 15:00:00.000737+00	2025-12-05 15:00:00.064369+00
2	291	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 13:00:00.000726+00	2025-12-05 13:00:00.062533+00
1	292	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 13:00:00.000726+00	2025-12-05 13:00:00.064762+00
1	304	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 19:00:00.000672+00	2025-12-05 19:00:00.014207+00
2	297	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 16:00:00.000616+00	2025-12-05 16:00:00.063601+00
1	298	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 16:00:00.000616+00	2025-12-05 16:00:00.06582+00
2	303	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 19:00:00.000672+00	2025-12-05 19:00:00.016469+00
2	301	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 18:00:00.000017+00	2025-12-05 18:00:00.015701+00
1	302	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 18:00:00.000017+00	2025-12-05 18:00:00.01793+00
1	306	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-05 23:00:00.000299+00	2025-12-05 23:00:00.020252+00
1	310	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 09:00:00.000782+00	2025-12-06 09:00:00.068056+00
2	307	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 00:00:00.00036+00	2025-12-06 00:00:00.014887+00
1	308	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 00:00:00.00036+00	2025-12-06 00:00:00.017175+00
2	309	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 09:00:00.000782+00	2025-12-06 09:00:00.065802+00
2	311	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 10:00:00.000313+00	2025-12-06 10:00:00.017234+00
1	312	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 10:00:00.000313+00	2025-12-06 10:00:00.014995+00
2	313	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 11:00:00.000028+00	2025-12-06 11:00:00.06113+00
1	314	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 11:00:00.000028+00	2025-12-06 11:00:00.063356+00
2	357	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 16:00:00.000216+00	2025-12-07 16:00:00.061168+00
1	334	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 21:00:00.000578+00	2025-12-06 21:00:00.058111+00
2	315	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 12:00:00.00032+00	2025-12-06 12:00:00.06331+00
1	316	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 12:00:00.00032+00	2025-12-06 12:00:00.065625+00
2	333	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 21:00:00.000578+00	2025-12-06 21:00:00.060335+00
2	317	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 13:00:00.000158+00	2025-12-06 13:00:00.062737+00
1	318	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 13:00:00.000158+00	2025-12-06 13:00:00.064946+00
2	319	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 14:00:00.000642+00	2025-12-06 14:00:00.063353+00
1	320	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 14:00:00.000642+00	2025-12-06 14:00:00.065693+00
2	351	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 13:00:00.000442+00	2025-12-07 13:00:00.060114+00
2	335	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 22:00:00.000539+00	2025-12-06 22:00:00.015048+00
2	321	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 15:00:00.000383+00	2025-12-06 15:00:00.06308+00
1	322	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 15:00:00.000383+00	2025-12-06 15:00:00.065343+00
1	336	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 22:00:00.000539+00	2025-12-06 22:00:00.017159+00
2	323	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 16:00:00.000968+00	2025-12-06 16:00:00.017258+00
1	324	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 16:00:00.000968+00	2025-12-06 16:00:00.019698+00
1	346	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 10:00:00.000878+00	2025-12-07 10:00:00.059116+00
2	325	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 17:00:00.000247+00	2025-12-06 17:00:00.062881+00
1	326	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 17:00:00.000247+00	2025-12-06 17:00:00.065081+00
2	345	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 10:00:00.000878+00	2025-12-07 10:00:00.061317+00
2	337	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 23:00:00.000756+00	2025-12-06 23:00:00.060128+00
2	327	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 18:00:00.000955+00	2025-12-06 18:00:00.06025+00
1	328	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 18:00:00.000955+00	2025-12-06 18:00:00.062482+00
1	338	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 23:00:00.000756+00	2025-12-06 23:00:00.062793+00
2	329	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 19:00:00.000825+00	2025-12-06 19:00:00.06034+00
1	330	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 19:00:00.000825+00	2025-12-06 19:00:00.062695+00
2	331	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 20:00:00.00028+00	2025-12-06 20:00:00.060338+00
1	332	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-06 20:00:00.00028+00	2025-12-06 20:00:00.062613+00
1	352	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 13:00:00.000442+00	2025-12-07 13:00:00.062446+00
1	340	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 00:00:00.000555+00	2025-12-07 00:00:00.014119+00
2	339	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 00:00:00.000555+00	2025-12-07 00:00:00.016243+00
2	347	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 11:00:00.000183+00	2025-12-07 11:00:00.01316+00
2	341	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 01:00:00.000952+00	2025-12-07 01:00:00.060306+00
1	342	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 01:00:00.000952+00	2025-12-07 01:00:00.062604+00
1	348	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 11:00:00.000183+00	2025-12-07 11:00:00.015223+00
2	343	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 09:00:00.00043+00	2025-12-07 09:00:00.061205+00
1	344	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 09:00:00.00043+00	2025-12-07 09:00:00.063475+00
2	355	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 15:00:00.00068+00	2025-12-07 15:00:00.015628+00
2	349	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 12:00:00.000031+00	2025-12-07 12:00:00.014086+00
1	350	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 12:00:00.000031+00	2025-12-07 12:00:00.016443+00
1	356	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 15:00:00.00068+00	2025-12-07 15:00:00.017874+00
1	354	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 14:00:00.000458+00	2025-12-07 14:00:00.060077+00
2	353	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 14:00:00.000458+00	2025-12-07 14:00:00.062292+00
1	358	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 16:00:00.000216+00	2025-12-07 16:00:00.063478+00
1	362	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 18:00:00.000018+00	2025-12-07 18:00:00.065149+00
2	359	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 17:00:00.000507+00	2025-12-07 17:00:00.014847+00
1	360	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 17:00:00.000507+00	2025-12-07 17:00:00.01718+00
1	364	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 19:00:00.000253+00	2025-12-07 19:00:00.061921+00
2	361	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 18:00:00.000018+00	2025-12-07 18:00:00.062919+00
2	363	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 19:00:00.000253+00	2025-12-07 19:00:00.059707+00
1	366	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 20:00:00.001048+00	2025-12-07 20:00:00.063892+00
2	365	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 20:00:00.001048+00	2025-12-07 20:00:00.066126+00
1	386	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 13:00:00.000231+00	2025-12-08 13:00:00.061446+00
1	368	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 21:00:00.000511+00	2025-12-07 21:00:00.060931+00
2	367	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 21:00:00.000511+00	2025-12-07 21:00:00.063081+00
2	385	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 13:00:00.000231+00	2025-12-08 13:00:00.063701+00
1	370	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 22:00:00.000457+00	2025-12-07 22:00:00.061475+00
2	369	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 22:00:00.000457+00	2025-12-07 22:00:00.064705+00
1	372	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 23:00:00.000379+00	2025-12-07 23:00:00.013702+00
2	371	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-07 23:00:00.000379+00	2025-12-07 23:00:00.015985+00
2	387	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 14:00:00.000344+00	2025-12-08 14:00:00.059839+00
2	373	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 07:00:00.000213+00	2025-12-08 07:00:00.030523+00
1	374	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 07:00:00.000213+00	2025-12-08 07:00:00.033711+00
1	388	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 14:00:00.000344+00	2025-12-08 14:00:00.062047+00
2	375	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 08:00:00.000241+00	2025-12-08 08:00:00.058863+00
1	376	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 08:00:00.000241+00	2025-12-08 08:00:00.061351+00
2	397	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 19:00:00.00045+00	2025-12-08 19:00:00.014862+00
2	377	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 09:00:00.00096+00	2025-12-08 09:00:00.060515+00
1	378	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 09:00:00.00096+00	2025-12-08 09:00:00.06273+00
1	398	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 19:00:00.00045+00	2025-12-08 19:00:00.017067+00
2	389	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 15:00:00.000214+00	2025-12-08 15:00:00.059752+00
2	379	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 10:00:00.000213+00	2025-12-08 10:00:00.059676+00
1	380	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 10:00:00.000213+00	2025-12-08 10:00:00.061876+00
1	390	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 15:00:00.000214+00	2025-12-08 15:00:00.062069+00
2	381	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 11:00:00.000751+00	2025-12-08 11:00:00.060325+00
1	382	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 11:00:00.000751+00	2025-12-08 11:00:00.062652+00
2	383	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 12:00:00.00041+00	2025-12-08 12:00:00.059707+00
1	384	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 12:00:00.00041+00	2025-12-08 12:00:00.06199+00
2	391	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 16:00:00.000303+00	2025-12-08 16:00:00.058126+00
1	392	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 16:00:00.000303+00	2025-12-08 16:00:00.060377+00
2	399	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 20:00:00.000231+00	2025-12-08 20:00:00.01473+00
2	393	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 17:00:00.000436+00	2025-12-08 17:00:00.061527+00
1	394	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 17:00:00.000436+00	2025-12-08 17:00:00.063742+00
1	400	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 20:00:00.000231+00	2025-12-08 20:00:00.017116+00
2	395	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 18:00:00.000228+00	2025-12-08 18:00:00.014439+00
1	396	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-12-08 18:00:00.000228+00	2025-12-08 18:00:00.016802+00
\.


--
-- Data for Name: auto_cheklst; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auto_cheklst (id, zone_id, description, important) FROM stdin;
6	1	Поставь вариться кукурузу!	f
7	1	Надо помыть аппарат для сахарной ваты!	f
8	1	Расставь напитки в холодильнике!	f
9	1	Надо убрать паутину, помыть полы, протереть поверхности (столы,холодильник, кофемашину, раковину).	f
10	1	Надо помыть кофемашину и пополнить компоненты.	f
11	1	Надо сделать попкорн)	f
12	1	Не забудь помыть попкорницу.	f
13	2	Включи комп, программу Лайм	f
14	2	Открой жалюзи и окно	f
15	2	Открой смену на терминале/кассе	f
16	2	Убери весь мусор со стола, сложи всё по местам	f
17	2	Помыть полы	f
18	2	Выкинуть мусор	f
20	3	Открой ставни	f
21	3	Протри автоматы, подключи к блоку и поставь на подставку  (3 шт)	f
22	3	Включи комп, зайди в тир контроль	f
23	3	Протри мишени и подними их.	f
24	3	Убери рабочее место (стол/под столом)	f
25	3	Убери всю паутину  (стены/потолок)	f
26	3	Развесить призы 	f
27	3	Подмети полы, собери пульки	f
28	3	Собрать мусор на территории тира	f
29	3	Проверить наличие брелков и игрушек, написать в закуп	f
30	3	Проверить исправность автоматов, настроить / написать в задачи, что нужно починить	f
34	10	Помой стекла в кабинках, чтобы наши посетители могли любоваться видом 	f
35	10	Не забудь помыть полы  в каждой кабинке	f
37	11	Включи экстрим Проведи внешний осмотр аттракциона 	f
38	11	Нужно проверить опоры (4 шт)	f
39	11	Проверить ремни безопасности и крепления на каждом посадочном месте.  (16 шт) 	f
40	11	Теперь давай наведём порядок.  Протри все посадочные места	f
41	11	Собери весь мусор в кабинке оператора.	f
42	11	Помой полы, протри пыль, убери всё лишнее по местам	f
43	11	Убери территорию Экстрима от мусора и проверь на наличие гаек, шайб и т. д.	f
44	11	Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. 	f
45	12	Включи музыку для хорошего настроения всей команды!	f
46	12	Протри от пыли все машинки	f
47	12	Подмети пол	f
48	12	Собери паутину по периметру, в каждом уголочке 	f
49	12	Убери территорию автодрома	f
50	12	Проверь аттракцион на исправность, если есть какие-то задачи, пиши в чат	f
51	13	Включи лодку Проведи внешний осмотр аттракциона 	f
52	13	Нужно проверить опоры (4 шт)	f
53	13	Проверить ремни безопасности и крепления на каждом посадочном месте.  (30 шт) 	f
54	13	Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков.	f
55	13	Теперь давай наведём порядок.  Протри все посадочные места	f
56	13	Протри пыль на лодке	f
57	13	Убери входную группу	f
58	13	Убери территорию вокруг аттракциона	f
32	10	Открой кабинку инструктора и включи КО	f
19	2	Собрать мусор на территории парка	f
36	10	Осталось помыть входную зону	f
31	10	Проверь колёса, надо накачать до 5	f
80	14	1. Выключи сигнализацию.\n2. Распредели людей для открытия парка.\n3. Убедись, что все аттракционы работают (музыка на автодроме играет). Игротека вкл (+ без пыли и паутины).	f
81	14	Отлично! \nПроверь тир на чистоту (стоят автоматы (3 шт), нет паутины, подняты все мишени, брелоки и игрушки висят в нужном количестве (нет пустого места)). 	f
82	14	Проверить на чистоту лабиринт (нет воды на крыше, протерли от пыли, все шарики в бассейне).	f
83	14	Проверить Зорбы. \n(Бассейн, Зорбы, входная зона)\nПроверить ДЖЕТ (все посадочные места чистые)	f
84	14	Касса. \nКомп включен, чистые полы, нет мусора, всё лежит аккуратно.  Чек-лента есть (минимум по 2 уп.).	f
85	14	Экстрим. \nГотов к эксплуатации. \nРабочее место, посадочные места и входная зона приведены в порядок.	f
86	14	Автодром. \nИграет музыка. \nМашинки чистые,убрали паутину, подмели пол, выкинули мусор.	f
87	14	Лодка. \nНет скопления воды, чистые посадочные места, выкинули мусор, чистая входная зона.	f
88	14	Кафе.        \nЧистые полы.        \nЧистая раковина.        \nНет паутины.        \nЧистые столы.        \nЧистый аппарат для ваты.        \nКукуруза варится.        \nХолодильник заполнен напитками.        \nПорядок под стойкой.        \nЧистый холодильник.        \nСотрудник кафе делает список закупа.	f
89	14	Прокат. \nВсе машинки заряжаются. Машинки протерли от пыли.	f
90	14	КО\nКабинки КО, кабинка оператора, входная зона приведены в порядок. 	f
91	14	На территории парка нет мусора.	f
92	14	Составить список закупа для кафе.\n\nНапоминалка. \nНапитки — пепси.\nКофе, сливки, шоколад, сахар в инд. уп., \nстаканчики, крышки, ложки.        \nПопкорн, масло, добавки.       \nКукуруза, соль, шпажки, стаканчики.        \nМороженое.        \nШантипак, молоко, лимоны/лайм/мята, сливки кокос., взбитые сливки, газ. вода 2л, сахар,  мусорные пакеты,  чай, салфетки.       \nСиропы, краситель для ваты, трубочки, палочки для ваты.       \nОдн. стаканы для коктейлей + крышки (0,4 + 0,5).        \nМоти.        \nЧековая лента.	f
93	14	Проверить наличие инвентаря и запчасти.\n\nНапоминалка. \nШарики в лабиринте.\nРемни безопасности (джет, экстрим, лодка, автодром).\nТир (пульки, игрушки, брелоки, исправность автоматов).	f
94	15	1. Включить все аттракционы, протереть посадочные места, включить музыку на автодроме. 	f
95	15	2. Экстрим.\n- Проверить опоры и пальцы (4 шт.).\n- Проверить ремни безопасности и крепления на каждом посадочном месте (16 шт.). \n- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. \n\nПрислать минимум 8 фото	t
96	15	3. Автодром.\nПроверь аттракцион на исправность. Токоприемник, подушка (бампер), внешний осмотр каждой машинки. \n	f
97	15	4. Лодка.\n- Нужно проверить опоры (4 шт.).\n- Проверить ремни безопасности и крепления на каждом посадочном месте (30 шт.).\n- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков.\n\nФото опор (4 шт)\n	t
98	15	5. Проверить давление в колёсах на КО, отправить фото в чат «Техничка».	t
99	16	1. Включить все аттракционы, протереть посадочные места, включить музыку на автодроме.	f
100	16	2. Экстрим. \n- Проверить опоры и пальцы (4 шт.). \n- Проверить ремни безопасности и крепления на каждом посадочном месте (16 шт.). \n- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. Прислать минимум 8 фото	t
101	16	3. Автодром. Проверь аттракцион на исправность. Токоприемник, подушка (бампер), внешний осмотр каждой машинки.	f
102	16	4. Лодка. \n- Нужно проверить опоры (4 шт.). \n- Проверить ремни безопасности и крепления на каждом посадочном месте (30 шт.). \n- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. \nФото опор (4 шт)	t
103	16	5. Проверить давление в колёсах на КО, отправить фото в чат «Техничка».	f
\.


--
-- Data for Name: bonus_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bonus_templates (id, name, price) FROM stdin;
3	Доп.час работы	200.00
\.


--
-- Data for Name: bonuses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bonuses (id, name, price, user_id, created_at) FROM stdin;
2	тест	3443.00	124	2025-11-30 15:17:30.094429+00
\.


--
-- Data for Name: checklists; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.checklists (id, date, zone_id, description, photo, status, issue_time, return_time, admin_id, confirmed, important) FROM stdin;
530	2025-12-02	1	Поставь вариться кукурузу!	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
531	2025-12-02	1	Надо помыть аппарат для сахарной ваты!	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
532	2025-12-02	1	Расставь напитки в холодильнике!	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
533	2025-12-02	1	Надо убрать паутину, помыть полы, протереть поверхности (столы,холодильник, кофемашину, раковину).	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
534	2025-12-02	1	Надо помыть кофемашину и пополнить компоненты.	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
535	2025-12-02	1	Надо сделать попкорн)	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
536	2025-12-02	1	Не забудь помыть попкорницу.	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
454	2025-11-30	5	asdcaaaaaaaaaaa	/list/checklist_454_1764521171_0.jpg	t	2025-11-30 16:45:59.266213+00	2025-11-30 16:46:11.818508+00	128	t	t
537	2025-12-02	10	Проверь колёса, надо накачать до 5	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
538	2025-12-02	10	Открой окна в кабинках на 1 круг (нужно проветрить) 	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
539	2025-12-02	10	Помой стекла в кабинках, чтобы наши посетители могли любоваться видом 	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
540	2025-12-02	10	Не забудь помыть полы  в каждой кабинке	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
541	2025-12-02	10	Осталось помыть входную группу на КО 	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
542	2025-12-02	10	Открой кабинку инструктора и включи КО	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
543	2025-12-02	14	1. Выключи сигнализацию.\n2. Распредели людей для открытия парка.\n3. Убедись, что все аттракционы работают (музыка на автодроме играет). Игротека вкл (+ без пыли и паутины).	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
544	2025-12-02	14	Отлично! \nПроверь тир на чистоту (стоят автоматы (3 шт), нет паутины, подняты все мишени, брелоки и игрушки висят в нужном количестве (нет пустого места)). 	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
545	2025-12-02	14	Проверить на чистоту лабиринт (нет воды на крыше, протерли от пыли, все шарики в бассейне).	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
546	2025-12-02	14	Проверить Зорбы. \n(Бассейн, Зорбы, входная зона)\nПроверить ДЖЕТ (все посадочные места чистые)	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
547	2025-12-02	14	Касса. \nКомп включен, чистые полы, нет мусора, всё лежит аккуратно.  Чек-лента есть (минимум по 2 уп.).	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
197	2025-11-9	6	Помыть ко	\N	t	2025-11-12 14:38:53.712944+00	2025-11-12 14:43:23.393598+00	\N	t	t
548	2025-12-02	14	Экстрим. \nГотов к эксплуатации. \nРабочее место, посадочные места и входная зона приведены в порядок.	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
549	2025-12-02	14	Автодром. \nИграет музыка. \nМашинки чистые,убрали паутину, подмели пол, выкинули мусор.	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
550	2025-12-02	14	Лодка. \nНет скопления воды, чистые посадочные места, выкинули мусор, чистая входная зона.	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
551	2025-12-02	14	Кафе.        \nЧистые полы.        \nЧистая раковина.        \nНет паутины.        \nЧистые столы.        \nЧистый аппарат для ваты.        \nКукуруза варится.        \nХолодильник заполнен напитками.        \nПорядок под стойкой.        \nЧистый холодильник.        \nСотрудник кафе делает список закупа.	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
552	2025-12-02	14	Прокат. \nВсе машинки заряжаются. Машинки протерли от пыли.	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
553	2025-12-02	14	КО\nКабинки КО, кабинка оператора, входная зона приведены в порядок. 	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
554	2025-12-02	14	На территории парка нет мусора.	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
555	2025-12-02	14	Составить список закупа для кафе.\n\nНапоминалка. \nНапитки — пепси.\nКофе, сливки, шоколад, сахар в инд. уп., \nстаканчики, крышки, ложки.        \nПопкорн, масло, добавки.       \nКукуруза, соль, шпажки, стаканчики.        \nМороженое.        \nШантипак, молоко, лимоны/лайм/мята, сливки кокос., взбитые сливки, газ. вода 2л, сахар,  мусорные пакеты,  чай, салфетки.       \nСиропы, краситель для ваты, трубочки, палочки для ваты.       \nОдн. стаканы для коктейлей + крышки (0,4 + 0,5).        \nМоти.        \nЧековая лента.	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
556	2025-12-02	14	Проверить наличие инвентаря и запчасти.\n\nНапоминалка. \nШарики в лабиринте.\nРемни безопасности (джет, экстрим, лодка, автодром).\nТир (пульки, игрушки, брелоки, исправность автоматов).	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
557	2025-12-02	2	Включи комп, программу Лайм	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
558	2025-12-02	2	Открой жалюзи и окно	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
559	2025-12-02	2	Открой смену на терминале/кассе	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
560	2025-12-02	2	Убери весь мусор со стола, сложи всё по местам	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
561	2025-12-02	2	Помыть полы	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
562	2025-12-02	2	Выкинуть мусор	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
563	2025-12-02	2	Собрать мусор на территории кассы	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
564	2025-12-02	3	Открой ставни	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
565	2025-12-02	3	Протри автоматы, подключи к блоку и поставь на подставку  (3 шт)	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
566	2025-12-02	3	Включи комп, зайди в тир контроль	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
567	2025-12-02	3	Протри мишени и подними их.	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
568	2025-12-02	3	Убери рабочее место (стол/под столом)	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
569	2025-12-02	3	Убери всю паутину  (стены/потолок)	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
570	2025-12-02	3	Развесить призы 	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
571	2025-12-02	3	Подмети полы, собери пульки	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
572	2025-12-02	3	Собрать мусор на территории тира	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
573	2025-12-02	3	Проверить наличие брелков и игрушек, написать в закуп	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
574	2025-12-02	3	Проверить исправность автоматов, настроить / написать в задачи, что нужно починить	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
575	2025-12-02	11	Включи экстрим Проведи внешний осмотр аттракциона 	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
576	2025-12-02	11	Нужно проверить опоры (4 шт)	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
193	2025-11-18	2	тест-важный	/list/checklist_193_1763473046.jpg	t	2025-11-18 13:36:55.998078+00	2025-11-18 13:37:26.196014+00	128	t	t
577	2025-12-02	11	Проверить ремни безопасности и крепления на каждом посадочном месте.  (16 шт) 	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
578	2025-12-02	11	Теперь давай наведём порядок.  Протри все посадочные места	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
579	2025-12-02	11	Собери весь мусор в кабинке оператора.	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
580	2025-12-02	11	Помой полы, протри пыль, убери всё лишнее по местам	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
581	2025-12-02	11	Убери территорию Экстрима от мусора и проверь на наличие гаек, шайб и т. д.	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
582	2025-12-02	11	Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. 	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
583	2025-12-02	12	Включи музыку для хорошего настроения всей команды!	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
584	2025-12-02	12	Протри от пыли все машинки	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
585	2025-12-02	12	Подмети пол	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
586	2025-12-02	12	Собери паутину по периметру, в каждом уголочке 	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
587	2025-12-02	12	Убери территорию автодрома	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
588	2025-12-02	12	Проверь аттракцион на исправность, если есть какие-то задачи, пиши в чат	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
589	2025-12-02	13	Включи лодку Проведи внешний осмотр аттракциона 	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
590	2025-12-02	13	Нужно проверить опоры (4 шт)	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
591	2025-12-02	13	Проверить ремни безопасности и крепления на каждом посадочном месте.  (30 шт) 	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
592	2025-12-02	13	Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков.	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
593	2025-12-02	13	Теперь давай наведём порядок.  Протри все посадочные места	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
594	2025-12-02	13	Протри пыль на лодке	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
595	2025-12-02	13	Убери входную группу	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
596	2025-12-02	13	Убери территорию вокруг аттракциона	\N	f	2025-12-02 09:05:00.003792+00	\N	\N	f	f
631	2025-12-03	3	Открой ставни	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
632	2025-12-03	3	Протри автоматы, подключи к блоку и поставь на подставку  (3 шт)	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
633	2025-12-03	3	Включи комп, зайди в тир контроль	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
634	2025-12-03	3	Протри мишени и подними их.	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
635	2025-12-03	3	Убери рабочее место (стол/под столом)	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
636	2025-12-03	3	Убери всю паутину  (стены/потолок)	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
637	2025-12-03	3	Развесить призы 	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
638	2025-12-03	3	Подмети полы, собери пульки	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
639	2025-12-03	3	Собрать мусор на территории тира	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
640	2025-12-03	3	Проверить наличие брелков и игрушек, написать в закуп	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
641	2025-12-03	3	Проверить исправность автоматов, настроить / написать в задачи, что нужно починить	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
642	2025-12-03	11	Включи экстрим Проведи внешний осмотр аттракциона 	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
643	2025-12-03	11	Нужно проверить опоры (4 шт)	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
597	2025-12-03	1	Поставь вариться кукурузу!	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
598	2025-12-03	1	Надо помыть аппарат для сахарной ваты!	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
599	2025-12-03	1	Расставь напитки в холодильнике!	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
600	2025-12-03	1	Надо убрать паутину, помыть полы, протереть поверхности (столы,холодильник, кофемашину, раковину).	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
601	2025-12-03	1	Надо помыть кофемашину и пополнить компоненты.	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
602	2025-12-03	1	Надо сделать попкорн)	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
603	2025-12-03	1	Не забудь помыть попкорницу.	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
604	2025-12-03	10	Проверь колёса, надо накачать до 5	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
605	2025-12-03	10	Открой окна в кабинках на 1 круг (нужно проветрить) 	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
606	2025-12-03	10	Помой стекла в кабинках, чтобы наши посетители могли любоваться видом 	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
607	2025-12-03	10	Не забудь помыть полы  в каждой кабинке	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
608	2025-12-03	10	Осталось помыть входную группу на КО 	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
609	2025-12-03	10	Открой кабинку инструктора и включи КО	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
610	2025-12-03	14	1. Выключи сигнализацию.\n2. Распредели людей для открытия парка.\n3. Убедись, что все аттракционы работают (музыка на автодроме играет). Игротека вкл (+ без пыли и паутины).	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
611	2025-12-03	14	Отлично! \nПроверь тир на чистоту (стоят автоматы (3 шт), нет паутины, подняты все мишени, брелоки и игрушки висят в нужном количестве (нет пустого места)). 	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
612	2025-12-03	14	Проверить на чистоту лабиринт (нет воды на крыше, протерли от пыли, все шарики в бассейне).	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
613	2025-12-03	14	Проверить Зорбы. \n(Бассейн, Зорбы, входная зона)\nПроверить ДЖЕТ (все посадочные места чистые)	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
614	2025-12-03	14	Касса. \nКомп включен, чистые полы, нет мусора, всё лежит аккуратно.  Чек-лента есть (минимум по 2 уп.).	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
615	2025-12-03	14	Экстрим. \nГотов к эксплуатации. \nРабочее место, посадочные места и входная зона приведены в порядок.	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
616	2025-12-03	14	Автодром. \nИграет музыка. \nМашинки чистые,убрали паутину, подмели пол, выкинули мусор.	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
617	2025-12-03	14	Лодка. \nНет скопления воды, чистые посадочные места, выкинули мусор, чистая входная зона.	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
618	2025-12-03	14	Кафе.        \nЧистые полы.        \nЧистая раковина.        \nНет паутины.        \nЧистые столы.        \nЧистый аппарат для ваты.        \nКукуруза варится.        \nХолодильник заполнен напитками.        \nПорядок под стойкой.        \nЧистый холодильник.        \nСотрудник кафе делает список закупа.	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
619	2025-12-03	14	Прокат. \nВсе машинки заряжаются. Машинки протерли от пыли.	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
620	2025-12-03	14	КО\nКабинки КО, кабинка оператора, входная зона приведены в порядок. 	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
621	2025-12-03	14	На территории парка нет мусора.	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
622	2025-12-03	14	Составить список закупа для кафе.\n\nНапоминалка. \nНапитки — пепси.\nКофе, сливки, шоколад, сахар в инд. уп., \nстаканчики, крышки, ложки.        \nПопкорн, масло, добавки.       \nКукуруза, соль, шпажки, стаканчики.        \nМороженое.        \nШантипак, молоко, лимоны/лайм/мята, сливки кокос., взбитые сливки, газ. вода 2л, сахар,  мусорные пакеты,  чай, салфетки.       \nСиропы, краситель для ваты, трубочки, палочки для ваты.       \nОдн. стаканы для коктейлей + крышки (0,4 + 0,5).        \nМоти.        \nЧековая лента.	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
623	2025-12-03	14	Проверить наличие инвентаря и запчасти.\n\nНапоминалка. \nШарики в лабиринте.\nРемни безопасности (джет, экстрим, лодка, автодром).\nТир (пульки, игрушки, брелоки, исправность автоматов).	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
624	2025-12-03	2	Включи комп, программу Лайм	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
625	2025-12-03	2	Открой жалюзи и окно	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
626	2025-12-03	2	Открой смену на терминале/кассе	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
627	2025-12-03	2	Убери весь мусор со стола, сложи всё по местам	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
628	2025-12-03	2	Помыть полы	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
629	2025-12-03	2	Выкинуть мусор	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
630	2025-12-03	2	Собрать мусор на территории кассы	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
384	2025-11-24	12	привет	/list/checklist_384_1763989314_0.jpg	t	2025-11-24 13:01:40.552702+00	2025-11-24 13:01:54.007304+00	128	t	t
644	2025-12-03	11	Проверить ремни безопасности и крепления на каждом посадочном месте.  (16 шт) 	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
645	2025-12-03	11	Теперь давай наведём порядок.  Протри все посадочные места	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
646	2025-12-03	11	Собери весь мусор в кабинке оператора.	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
647	2025-12-03	11	Помой полы, протри пыль, убери всё лишнее по местам	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
648	2025-12-03	11	Убери территорию Экстрима от мусора и проверь на наличие гаек, шайб и т. д.	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
649	2025-12-03	11	Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. 	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
650	2025-12-03	12	Включи музыку для хорошего настроения всей команды!	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
651	2025-12-03	12	Протри от пыли все машинки	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
652	2025-12-03	12	Подмети пол	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
653	2025-12-03	12	Собери паутину по периметру, в каждом уголочке 	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
654	2025-12-03	12	Убери территорию автодрома	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
655	2025-12-03	12	Проверь аттракцион на исправность, если есть какие-то задачи, пиши в чат	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
656	2025-12-03	13	Включи лодку Проведи внешний осмотр аттракциона 	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
657	2025-12-03	13	Нужно проверить опоры (4 шт)	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
658	2025-12-03	13	Проверить ремни безопасности и крепления на каждом посадочном месте.  (30 шт) 	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
659	2025-12-03	13	Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков.	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
660	2025-12-03	13	Теперь давай наведём порядок.  Протри все посадочные места	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
661	2025-12-03	13	Протри пыль на лодке	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
662	2025-12-03	13	Убери входную группу	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
663	2025-12-03	13	Убери территорию вокруг аттракциона	\N	f	2025-12-03 09:05:00.001678+00	\N	\N	f	f
895	2025-12-08	10	Проверь колёса, надо накачать до 5	\N	f	2025-12-08 09:05:00.003821+00	\N	\N	f	f
892	2025-12-08	10	Не забудь помыть полы  в каждой кабинке	/list/checklist_892_1765188581_0.jpg	t	2025-12-08 09:05:00.003821+00	2025-12-08 10:09:41.489091+00	\N	f	f
893	2025-12-08	10	Открой кабинку инструктора и включи КО	/list/checklist_893_1765188609_0.jpg	t	2025-12-08 09:05:00.003821+00	2025-12-08 10:10:09.861823+00	\N	f	f
894	2025-12-08	10	Осталось помыть входную зону	/list/checklist_894_1765189113_0.jpg	t	2025-12-08 09:05:00.003821+00	2025-12-08 10:18:33.650381+00	\N	f	f
918	2025-12-08	16	4. Лодка. \n- Нужно проверить опоры (4 шт.). \n- Проверить ремни безопасности и крепления на каждом посадочном месте (30 шт.). \n- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. \nФото опор (4 шт)	\N	f	2025-12-08 09:05:00.003821+00	\N	\N	f	t
919	2025-12-08	16	5. Проверить давление в колёсах на КО, отправить фото в чат «Техничка».	\N	f	2025-12-08 09:05:00.003821+00	\N	\N	f	f
920	2025-12-08	2	Включи комп, программу Лайм	/list/checklist_920_1765188371_0.jpg	t	2025-12-08 09:05:00.003821+00	2025-12-08 10:06:11.412305+00	\N	t	f
922	2025-12-08	2	Открой смену на терминале/кассе	/list/checklist_922_1765188391_0.jpg	t	2025-12-08 09:05:00.003821+00	2025-12-08 10:06:31.817274+00	\N	t	f
921	2025-12-08	2	Открой жалюзи и окно	/list/checklist_921_1765188425_0.jpg	t	2025-12-08 09:05:00.003821+00	2025-12-08 10:07:05.16735+00	\N	t	f
924	2025-12-08	2	Помыть полы	/list/checklist_924_1765188434_0.jpg	t	2025-12-08 09:05:00.003821+00	2025-12-08 10:07:14.712138+00	\N	t	f
925	2025-12-08	2	Выкинуть мусор	/list/checklist_925_1765188448_0.jpg	t	2025-12-08 09:05:00.003821+00	2025-12-08 10:07:28.205223+00	\N	t	f
923	2025-12-08	2	Убери весь мусор со стола, сложи всё по местам	/list/checklist_923_1765188495_0.jpg	t	2025-12-08 09:05:00.003821+00	2025-12-08 10:08:15.200293+00	\N	t	f
915	2025-12-08	16	1. Включить все аттракционы, протереть посадочные места, включить музыку на автодроме.	/list/checklist_915_1765189858_0.jpg	t	2025-12-08 09:05:00.003821+00	2025-12-08 10:30:58.932088+00	\N	t	f
917	2025-12-08	16	3. Автодром. Проверь аттракцион на исправность. Токоприемник, подушка (бампер), внешний осмотр каждой машинки.	/list/checklist_917_1765189874_0.jpg	t	2025-12-08 09:05:00.003821+00	2025-12-08 10:31:14.137125+00	\N	t	f
926	2025-12-08	2	Собрать мусор на территории парка	/list/checklist_926_1765190467_0.jpg,/list/checklist_926_1765190467_1.jpg,/list/checklist_926_1765190467_2.jpg	t	2025-12-08 09:05:00.003821+00	2025-12-08 10:41:07.239657+00	\N	t	f
916	2025-12-08	16	2. Экстрим. \n- Проверить опоры и пальцы (4 шт.). \n- Проверить ремни безопасности и крепления на каждом посадочном месте (16 шт.). \n- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. Прислать минимум 8 фото	/list/checklist_916_1765190878_0.jpg	t	2025-12-08 09:05:00.003821+00	2025-12-08 10:47:58.926745+00	\N	t	t
731	2025-12-06	1	Поставь вариться кукурузу!	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
732	2025-12-06	1	Надо помыть аппарат для сахарной ваты!	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
733	2025-12-06	1	Расставь напитки в холодильнике!	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
734	2025-12-06	1	Надо убрать паутину, помыть полы, протереть поверхности (столы,холодильник, кофемашину, раковину).	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
735	2025-12-06	1	Надо помыть кофемашину и пополнить компоненты.	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
736	2025-12-06	1	Надо сделать попкорн)	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
737	2025-12-06	1	Не забудь помыть попкорницу.	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
742	2025-12-06	10	Проверь колёса, надо накачать до 5	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
743	2025-12-06	14	1. Выключи сигнализацию.\n2. Распредели людей для открытия парка.\n3. Убедись, что все аттракционы работают (музыка на автодроме играет). Игротека вкл (+ без пыли и паутины).	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
744	2025-12-06	14	Отлично! \nПроверь тир на чистоту (стоят автоматы (3 шт), нет паутины, подняты все мишени, брелоки и игрушки висят в нужном количестве (нет пустого места)). 	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
745	2025-12-06	14	Проверить на чистоту лабиринт (нет воды на крыше, протерли от пыли, все шарики в бассейне).	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
746	2025-12-06	14	Проверить Зорбы. \n(Бассейн, Зорбы, входная зона)\nПроверить ДЖЕТ (все посадочные места чистые)	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
747	2025-12-06	14	Касса. \nКомп включен, чистые полы, нет мусора, всё лежит аккуратно.  Чек-лента есть (минимум по 2 уп.).	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
748	2025-12-06	14	Экстрим. \nГотов к эксплуатации. \nРабочее место, посадочные места и входная зона приведены в порядок.	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
749	2025-12-06	14	Автодром. \nИграет музыка. \nМашинки чистые,убрали паутину, подмели пол, выкинули мусор.	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
750	2025-12-06	14	Лодка. \nНет скопления воды, чистые посадочные места, выкинули мусор, чистая входная зона.	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
751	2025-12-06	14	Кафе.        \nЧистые полы.        \nЧистая раковина.        \nНет паутины.        \nЧистые столы.        \nЧистый аппарат для ваты.        \nКукуруза варится.        \nХолодильник заполнен напитками.        \nПорядок под стойкой.        \nЧистый холодильник.        \nСотрудник кафе делает список закупа.	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
752	2025-12-06	14	Прокат. \nВсе машинки заряжаются. Машинки протерли от пыли.	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
753	2025-12-06	14	КО\nКабинки КО, кабинка оператора, входная зона приведены в порядок. 	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
754	2025-12-06	14	На территории парка нет мусора.	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
755	2025-12-06	14	Составить список закупа для кафе.\n\nНапоминалка. \nНапитки — пепси.\nКофе, сливки, шоколад, сахар в инд. уп., \nстаканчики, крышки, ложки.        \nПопкорн, масло, добавки.       \nКукуруза, соль, шпажки, стаканчики.        \nМороженое.        \nШантипак, молоко, лимоны/лайм/мята, сливки кокос., взбитые сливки, газ. вода 2л, сахар,  мусорные пакеты,  чай, салфетки.       \nСиропы, краситель для ваты, трубочки, палочки для ваты.       \nОдн. стаканы для коктейлей + крышки (0,4 + 0,5).        \nМоти.        \nЧековая лента.	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
756	2025-12-06	14	Проверить наличие инвентаря и запчасти.\n\nНапоминалка. \nШарики в лабиринте.\nРемни безопасности (джет, экстрим, лодка, автодром).\nТир (пульки, игрушки, брелоки, исправность автоматов).	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
740	2025-12-06	10	Открой кабинку инструктора и включи КО	/list/checklist_740_1765015133_0.jpg,/list/checklist_740_1765015133_1.jpg	t	2025-12-06 09:05:00.002478+00	2025-12-06 09:58:53.798735+00	\N	f	f
741	2025-12-06	10	Осталось помыть входную зону	/list/checklist_741_1765015444_0.jpg	t	2025-12-06 09:05:00.002478+00	2025-12-06 10:04:04.355829+00	\N	f	f
739	2025-12-06	10	Не забудь помыть полы  в каждой кабинке	/list/checklist_739_1765015453_0.jpg	t	2025-12-06 09:05:00.002478+00	2025-12-06 10:04:13.427219+00	\N	f	f
738	2025-12-06	10	Помой стекла в кабинках, чтобы наши посетители могли любоваться видом 	/list/checklist_738_1765015462_0.jpg	t	2025-12-06 09:05:00.002478+00	2025-12-06 10:04:22.188549+00	\N	f	f
759	2025-12-06	15	3. Автодром.\nПроверь аттракцион на исправность. Токоприемник, подушка (бампер), внешний осмотр каждой машинки. \n	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
760	2025-12-06	15	4. Лодка.\n- Нужно проверить опоры (4 шт.).\n- Проверить ремни безопасности и крепления на каждом посадочном месте (30 шт.).\n- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков.\n\nФото опор (4 шт)\n	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	t
761	2025-12-06	15	5. Проверить давление в колёсах на КО, отправить фото в чат «Техничка».	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	t
762	2025-12-06	16	1. Включить все аттракционы, протереть посадочные места, включить музыку на автодроме.	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
763	2025-12-06	16	2. Экстрим. \n- Проверить опоры и пальцы (4 шт.). \n- Проверить ремни безопасности и крепления на каждом посадочном месте (16 шт.). \n- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. Прислать минимум 8 фото	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	t
764	2025-12-06	16	3. Автодром. Проверь аттракцион на исправность. Токоприемник, подушка (бампер), внешний осмотр каждой машинки.	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
765	2025-12-06	16	4. Лодка. \n- Нужно проверить опоры (4 шт.). \n- Проверить ремни безопасности и крепления на каждом посадочном месте (30 шт.). \n- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. \nФото опор (4 шт)	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	t
766	2025-12-06	16	5. Проверить давление в колёсах на КО, отправить фото в чат «Техничка».	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
774	2025-12-06	3	Открой ставни	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
775	2025-12-06	3	Протри автоматы, подключи к блоку и поставь на подставку  (3 шт)	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
776	2025-12-06	3	Включи комп, зайди в тир контроль	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
777	2025-12-06	3	Протри мишени и подними их.	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
778	2025-12-06	3	Убери рабочее место (стол/под столом)	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
779	2025-12-06	3	Убери всю паутину  (стены/потолок)	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
780	2025-12-06	3	Развесить призы 	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
781	2025-12-06	3	Подмети полы, собери пульки	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
782	2025-12-06	3	Собрать мусор на территории тира	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
783	2025-12-06	3	Проверить наличие брелков и игрушек, написать в закуп	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
784	2025-12-06	3	Проверить исправность автоматов, настроить / написать в задачи, что нужно починить	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
785	2025-12-06	11	Включи экстрим Проведи внешний осмотр аттракциона 	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
786	2025-12-06	11	Нужно проверить опоры (4 шт)	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
787	2025-12-06	11	Проверить ремни безопасности и крепления на каждом посадочном месте.  (16 шт) 	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
788	2025-12-06	11	Теперь давай наведём порядок.  Протри все посадочные места	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
789	2025-12-06	11	Собери весь мусор в кабинке оператора.	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
790	2025-12-06	11	Помой полы, протри пыль, убери всё лишнее по местам	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
791	2025-12-06	11	Убери территорию Экстрима от мусора и проверь на наличие гаек, шайб и т. д.	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
792	2025-12-06	11	Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. 	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
793	2025-12-06	12	Включи музыку для хорошего настроения всей команды!	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
794	2025-12-06	12	Протри от пыли все машинки	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
795	2025-12-06	12	Подмети пол	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
769	2025-12-06	2	Открой смену на терминале/кассе	/list/checklist_769_1765014758_0.jpg	t	2025-12-06 09:05:00.002478+00	2025-12-06 09:52:38.614015+00	\N	f	f
771	2025-12-06	2	Помыть полы	/list/checklist_771_1765015121_0.jpg	t	2025-12-06 09:05:00.002478+00	2025-12-06 09:58:41.276126+00	\N	f	f
772	2025-12-06	2	Выкинуть мусор	/list/checklist_772_1765015134_0.jpg	t	2025-12-06 09:05:00.002478+00	2025-12-06 09:58:54.763136+00	\N	f	f
773	2025-12-06	2	Собрать мусор на территории парка	/list/checklist_773_1765021312_0.jpg,/list/checklist_773_1765021312_1.jpg,/list/checklist_773_1765021312_2.jpg	t	2025-12-06 09:05:00.002478+00	2025-12-06 11:41:52.906939+00	\N	f	f
796	2025-12-06	12	Собери паутину по периметру, в каждом уголочке 	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
797	2025-12-06	12	Убери территорию автодрома	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
798	2025-12-06	12	Проверь аттракцион на исправность, если есть какие-то задачи, пиши в чат	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
799	2025-12-06	13	Включи лодку Проведи внешний осмотр аттракциона 	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
800	2025-12-06	13	Нужно проверить опоры (4 шт)	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
801	2025-12-06	13	Проверить ремни безопасности и крепления на каждом посадочном месте.  (30 шт) 	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
802	2025-12-06	13	Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков.	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
803	2025-12-06	13	Теперь давай наведём порядок.  Протри все посадочные места	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
804	2025-12-06	13	Протри пыль на лодке	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
805	2025-12-06	13	Убери входную группу	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
806	2025-12-06	13	Убери территорию вокруг аттракциона	\N	f	2025-12-06 09:05:00.002478+00	\N	\N	f	f
767	2025-12-06	2	Включи комп, программу Лайм	/list/checklist_767_1765014703_0.jpg	t	2025-12-06 09:05:00.002478+00	2025-12-06 09:51:43.571035+00	\N	f	f
768	2025-12-06	2	Открой жалюзи и окно	/list/checklist_768_1765014739_0.jpg	t	2025-12-06 09:05:00.002478+00	2025-12-06 09:52:19.657519+00	\N	f	f
770	2025-12-06	2	Убери весь мусор со стола, сложи всё по местам	/list/checklist_770_1765014901_0.jpg	t	2025-12-06 09:05:00.002478+00	2025-12-06 09:55:01.364054+00	\N	f	f
757	2025-12-06	15	1. Включить все аттракционы, протереть посадочные места, включить музыку на автодроме. 	/list/checklist_757_1765020761_0.jpg	t	2025-12-06 09:05:00.002478+00	2025-12-06 11:32:41.468212+00	\N	f	f
758	2025-12-06	15	2. Экстрим.\n- Проверить опоры и пальцы (4 шт.).\n- Проверить ремни безопасности и крепления на каждом посадочном месте (16 шт.). \n- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. \n\nПрислать минимум 8 фото	/list/checklist_758_1765020882_0.jpg	t	2025-12-06 09:05:00.002478+00	2025-12-06 11:34:42.674282+00	\N	f	t
818	2025-12-07	10	Проверь колёса, надо накачать до 5	\N	f	2025-12-07 09:05:00.000869+00	\N	\N	f	f
858	2025-12-07	3	Собрать мусор на территории тира	\N	f	2025-12-07 09:05:00.000869+00	\N	\N	f	f
859	2025-12-07	3	Проверить наличие брелков и игрушек, написать в закуп	\N	f	2025-12-07 09:05:00.000869+00	\N	\N	f	f
816	2025-12-07	10	Открой кабинку инструктора и включи КО	/list/checklist_816_1765115512_0.jpg	t	2025-12-07 09:05:00.000869+00	2025-12-07 13:51:52.842704+00	\N	t	f
817	2025-12-07	10	Осталось помыть входную зону	/list/checklist_817_1765115540_0.jpg	t	2025-12-07 09:05:00.000869+00	2025-12-07 13:52:20.989138+00	\N	t	f
844	2025-12-07	2	Открой жалюзи и окно	/list/checklist_844_1765101301_0.jpg	t	2025-12-07 09:05:00.000869+00	2025-12-07 09:55:01.289764+00	\N	t	f
846	2025-12-07	2	Убери весь мусор со стола, сложи всё по местам	/list/checklist_846_1765101347_0.jpg	t	2025-12-07 09:05:00.000869+00	2025-12-07 09:55:47.106074+00	\N	t	f
835	2025-12-07	15	3. Автодром.\nПроверь аттракцион на исправность. Токоприемник, подушка (бампер), внешний осмотр каждой машинки. \n	/list/checklist_835_1765104548_0.jpg,/list/checklist_835_1765104548_1.jpg	t	2025-12-07 09:05:00.000869+00	2025-12-07 10:49:08.062904+00	\N	t	f
848	2025-12-07	2	Выкинуть мусор	/list/checklist_848_1765104768_0.jpg,/list/checklist_848_1765104768_1.jpg	t	2025-12-07 09:05:00.000869+00	2025-12-07 10:52:48.134494+00	\N	t	f
847	2025-12-07	2	Помыть полы	/list/checklist_847_1765104784_0.jpg	t	2025-12-07 09:05:00.000869+00	2025-12-07 10:53:04.425289+00	\N	t	f
849	2025-12-07	2	Собрать мусор на территории парка	/list/checklist_849_1765105342_0.jpg	t	2025-12-07 09:05:00.000869+00	2025-12-07 11:02:22.802085+00	\N	t	f
837	2025-12-07	15	5. Проверить давление в колёсах на КО, отправить фото в чат «Техничка».	/list/checklist_837_1765107807_0.jpg,/list/checklist_837_1765107807_1.jpg,/list/checklist_837_1765107807_2.jpg	t	2025-12-07 09:05:00.000869+00	2025-12-07 11:43:27.449545+00	\N	t	t
838	2025-12-07	16	1. Включить все аттракционы, протереть посадочные места, включить музыку на автодроме.	\N	f	2025-12-07 09:05:00.000869+00	\N	\N	f	f
839	2025-12-07	16	2. Экстрим. \n- Проверить опоры и пальцы (4 шт.). \n- Проверить ремни безопасности и крепления на каждом посадочном месте (16 шт.). \n- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. Прислать минимум 8 фото	\N	f	2025-12-07 09:05:00.000869+00	\N	\N	f	t
840	2025-12-07	16	3. Автодром. Проверь аттракцион на исправность. Токоприемник, подушка (бампер), внешний осмотр каждой машинки.	\N	f	2025-12-07 09:05:00.000869+00	\N	\N	f	f
841	2025-12-07	16	4. Лодка. \n- Нужно проверить опоры (4 шт.). \n- Проверить ремни безопасности и крепления на каждом посадочном месте (30 шт.). \n- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. \nФото опор (4 шт)	\N	f	2025-12-07 09:05:00.000869+00	\N	\N	f	t
842	2025-12-07	16	5. Проверить давление в колёсах на КО, отправить фото в чат «Техничка».	\N	f	2025-12-07 09:05:00.000869+00	\N	\N	f	f
850	2025-12-07	3	Открой ставни	\N	f	2025-12-07 09:05:00.000869+00	\N	\N	f	f
851	2025-12-07	3	Протри автоматы, подключи к блоку и поставь на подставку  (3 шт)	\N	f	2025-12-07 09:05:00.000869+00	\N	\N	f	f
852	2025-12-07	3	Включи комп, зайди в тир контроль	\N	f	2025-12-07 09:05:00.000869+00	\N	\N	f	f
853	2025-12-07	3	Протри мишени и подними их.	\N	f	2025-12-07 09:05:00.000869+00	\N	\N	f	f
854	2025-12-07	3	Убери рабочее место (стол/под столом)	\N	f	2025-12-07 09:05:00.000869+00	\N	\N	f	f
855	2025-12-07	3	Убери всю паутину  (стены/потолок)	\N	f	2025-12-07 09:05:00.000869+00	\N	\N	f	f
856	2025-12-07	3	Развесить призы 	\N	f	2025-12-07 09:05:00.000869+00	\N	\N	f	f
857	2025-12-07	3	Подмети полы, собери пульки	\N	f	2025-12-07 09:05:00.000869+00	\N	\N	f	f
860	2025-12-07	3	Проверить исправность автоматов, настроить / написать в задачи, что нужно починить	\N	f	2025-12-07 09:05:00.000869+00	\N	\N	f	f
843	2025-12-07	2	Включи комп, программу Лайм	/list/checklist_843_1765101278_0.jpg	t	2025-12-07 09:05:00.000869+00	2025-12-07 09:54:38.414832+00	\N	t	f
845	2025-12-07	2	Открой смену на терминале/кассе	/list/checklist_845_1765101291_0.jpg,/list/checklist_845_1765101291_1.jpg	t	2025-12-07 09:05:00.000869+00	2025-12-07 09:54:51.582349+00	\N	t	f
833	2025-12-07	15	1. Включить все аттракционы, протереть посадочные места, включить музыку на автодроме. 	/list/checklist_833_1765104407_0.jpg,/list/checklist_833_1765104407_1.jpg,/list/checklist_833_1765104407_2.jpg	t	2025-12-07 09:05:00.000869+00	2025-12-07 10:46:47.754928+00	\N	t	f
834	2025-12-07	15	2. Экстрим.\n- Проверить опоры и пальцы (4 шт.).\n- Проверить ремни безопасности и крепления на каждом посадочном месте (16 шт.). \n- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. \n\nПрислать минимум 8 фото	/list/checklist_834_1765104500_0.jpg,/list/checklist_834_1765104500_1.jpg	t	2025-12-07 09:05:00.000869+00	2025-12-07 10:48:20.925463+00	\N	t	t
814	2025-12-07	10	Помой стекла в кабинках, чтобы наши посетители могли любоваться видом 	/list/checklist_814_1765115489_0.jpg	t	2025-12-07 09:05:00.000869+00	2025-12-07 13:51:29.379554+00	\N	t	f
\.


--
-- Data for Name: fine_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fine_templates (id, name, price) FROM stdin;
1	Опоздание на 1 час	500.00
2	Без униформы	300.00
6	Опоздание на 15 минут	218.00
7	Опоздание более чем на час	1200.00
8	Беспорядок на рабочем месте	500.00
9	Не отсканированные чеки за прошлый день. (1 чек)	100.00
\.


--
-- Data for Name: fines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fines (id, name, price, user_id, created_at) FROM stdin;
1	Без униформы	300.00	124	2025-11-29 23:00:39.770275+00
2	Опоздание на 1 час	500.00	124	2025-11-30 14:25:23.586652+00
3	Опоздание на 1 час	500.00	124	2025-11-30 17:28:27.863173+00
6	Не отсканированные чеки за прошлый день. (1 чек)	100.00	124	2025-12-08 18:40:38.876215+00
7	Не отсканированные чеки за прошлый день. (1 чек)	100.00	124	2025-12-08 18:48:22.005233+00
8	тест	345.00	128	2025-12-08 18:49:50.975297+00
9	Оставил вкл пушку в тире	500.00	138	2025-12-08 18:50:49.519497+00
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
152	134	2	2025-12-05	10:00:00	21:00:00	15:39:00	15:45:00	218.00	/smena/smena_start_152_1764949227_0.jpg	\N
122	124	5	2025-12-02	09:00:00	18:00:00	03:02:00	16:24:00	170.00	\N	/smena/smena_end_122_1764519848_0.jpg
104	124	1	2025-11-21	09:00:00	18:00:00	\N	\N	232.00	\N	\N
105	124	1	2025-11-23	09:00:00	18:00:00	\N	\N	232.00	\N	\N
131	124	2	2025-12-05	10:00:00	21:00:00	09:42:00	21:00:00	218.00	/smena/smena_start_131_1764927821_0.jpg	\N
115	124	2	2025-11-25	10:00:00	21:00:00	10:03:00	16:37:00	218.00	/smena/smena_start_115_1764068672_0.jpg	/smena/smena_end_115_1764092325_0.jpg
120	124	1	2025-12-04	09:00:00	18:00:00	\N	\N	185.00	\N	\N
121	124	2	2025-11-16	09:00:00	18:00:00	\N	\N	218.00	\N	\N
130	124	11	2025-11-30	10:00:00	21:00:00	16:39:00	16:43:00	218.00	/smena/smena_start_130_1764520765_0.jpg,/smena/smena_start_130_1764520765_1.jpg	/smena/smena_end_130_1764520985_0.jpg
103	124	6	2025-11-18	09:00:00	18:00:00	22:32:00	22:32:00	232.00	/smena/smena_start_103_1763501483_0.jpg	/smena/smena_end_103_1763501511_0.jpg,/smena/smena_end_103_1763501511_1.jpg
106	124	10	2025-11-18	09:00:00	18:00:00	22:28:00	22:30:00	240.00	/smena/smena_start_106_1763501270_0.jpg,/smena/smena_start_106_1763501270_1.jpg	/smena/smena_end_106_1763501391_0.jpg,/smena/smena_end_106_1763501391_1.jpg
107	124	6	2025-11-19	14:00:00	18:00:00	\N	\N	250.00	\N	\N
102	124	2	2025-11-18	09:00:00	18:00:00	23:58:00	00:30:00	276.00	/smena/smena_start_102_1763510234_0.jpg	/smena/smena_end_102_1763517864_0.jpg,/smena/smena_end_102_1763517864_1.jpg
127	124	2	2025-12-02	10:00:00	21:00:00	\N	\N	218.00	\N	\N
137	134	2	2025-12-15	10:00:00	21:00:00	\N	\N	218.00	\N	\N
139	136	2	2025-12-09	10:00:00	21:00:00	\N	\N	218.00	\N	\N
140	136	2	2025-12-10	10:00:00	21:00:00	\N	\N	218.00	\N	\N
145	139	15	2025-12-13	10:00:00	22:00:00	\N	\N	236.00	\N	\N
146	139	15	2025-12-14	10:00:00	22:00:00	\N	\N	236.00	\N	\N
147	139	15	2025-12-10	10:00:00	21:00:00	\N	\N	236.00	\N	\N
148	139	15	2025-12-11	10:00:00	21:00:00	\N	\N	236.00	\N	\N
149	139	15	2025-12-12	10:00:00	21:00:00	\N	\N	236.00	\N	\N
151	128	2	2025-12-05	10:00:00	21:00:00	\N	\N	218.00	\N	\N
169	133	10	2025-12-09	10:00:00	21:00:00	\N	\N	218.00	\N	\N
170	133	10	2025-12-10	10:00:00	21:00:00	\N	\N	218.00	\N	\N
177	140	10	2025-12-07	10:00:00	21:00:00	10:00:00	21:00:00	218.00	/smena/smena_start_177_1765112194_0.jpg	\N
171	133	10	2025-12-11	10:00:00	21:00:00	\N	\N	218.00	\N	\N
150	138	3	2025-12-07	10:00:00	22:00:00	10:00:00	21:00:00	218.00	/smena/smena_start_150_1765101121_0.jpg	\N
164	132	16	2025-12-08	10:00:00	21:00:00	10:07:00	\N	218.00	/smena/smena_start_164_1765188465_0.jpg	\N
165	132	16	2025-12-09	10:00:00	21:00:00	\N	\N	218.00	\N	\N
166	132	16	2025-12-10	10:00:00	21:00:00	\N	\N	218.00	\N	\N
173	135	10	2025-12-12	10:00:00	21:00:00	\N	\N	218.00	\N	\N
174	135	10	2025-12-13	10:00:00	21:00:00	\N	\N	218.00	\N	\N
175	135	10	2025-12-14	10:00:00	21:00:00	\N	\N	218.00	\N	\N
168	133	10	2025-12-08	10:00:00	21:00:00	09:52:00	\N	218.00	/smena/smena_start_168_1765187603_0.jpg	\N
138	136	2	2025-12-06	10:00:00	22:00:00	09:49:00	22:03:00	218.00	/smena/smena_start_138_1765014597_0.jpg	/smena/smena_end_138_1765058674_0.jpg
143	139	15	2025-12-06	10:00:00	22:00:00	09:46:00	22:00:00	236.00	/smena/smena_start_143_1765014404_0.jpg	\N
132	134	10	2025-12-06	10:00:00	22:00:00	09:47:00	22:00:00	218.00	/smena/smena_start_132_1765014513_0.jpg	\N
179	134	2	2025-12-13	10:00:00	21:00:00	\N	\N	218.00	\N	\N
133	134	2	2025-12-07	10:00:00	21:00:00	09:53:00	21:00:00	218.00	/smena/smena_start_133_1765101262_0.jpg	\N
134	134	2	2025-12-08	10:00:00	21:00:00	10:05:00	\N	218.00	/smena/smena_start_134_1765188363_0.jpg	\N
144	139	15	2025-12-07	10:00:00	22:00:00	09:51:00	22:00:00	236.00	/smena/smena_start_144_1765101103_0.jpg	\N
182	134	2	2025-12-14	10:00:00	21:00:00	\N	\N	218.00	\N	\N
183	136	2	2025-12-11	10:00:00	21:00:00	\N	\N	218.00	\N	\N
189	136	2	2025-12-12	10:00:00	21:00:00	\N	\N	218.00	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, telegram_id, username, first_name, last_name, phone_number, confirmed, created_at, is_admin, chat_id) FROM stdin;
127	733190744		D.A.Machin			t	2025-11-12 14:19:46.230532+00	f	733190744
128	1028613614	Foxi_olesia	Олеся	 		t	2025-11-12 14:19:46.233417+00	t	1028613614
136	1071993366	kkk_kkk17S	Кристина			t	2025-12-05 10:42:08.3996+00	f	1071993366
132	755428345	lahma20	Артём 🇦🇲		89962021600	t	2025-12-05 10:41:42.792048+00	f	755428345
133	1120968282	homesetter	Гелька		89063144867	t	2025-12-05 10:41:59.286015+00	f	1120968282
135	973286214	RabDshaeva	Панина		89085427661	t	2025-12-05 10:42:00.284253+00	f	973286214
139	2049221763	ImXxX777	Александр	666		t	2025-12-05 10:50:20.960435+00	f	2049221763
134	914564834	Valeri_lvl	Валерия		89085526376	t	2025-12-05 10:41:59.353796+00	f	914564834
124	1112662763	Egor12sar	Egor			t	2025-11-05 22:21:10.040808+00	f	1112662763
131	615487845	mewpl3	Mew			f	2025-11-25 12:02:05.010752+00	f	615487845
141	883672701	Glosgix	𝖁𝖎𝖙𝖐𝖆 𝖕𝖗𝖔			t	2025-12-05 17:48:08.422228+00	f	883672701
140	830171642		Hartim		+79371477761	t	2025-12-05 12:12:37.221255+00	f	830171642
137	1258028598	Kropeg21	Kropeg			t	2025-12-05 10:42:20.453257+00	f	1258028598
130	1162086240	thenotorius_077777	Maverick			t	2025-11-24 12:24:25.295313+00	f	1162086240
138	1298124079	namnikne	snufflox		89873543880	t	2025-12-05 10:44:23.578267+00	f	1298124079
\.


--
-- Data for Name: zones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.zones (id, name, description, working_hours, image_path, price) FROM stdin;
1	Кафе		10:00 - 23:00	/zones/1_1763509592.png	185.00
6	Зорбы, ДЖЕТ		10:00 - 22:00		170.00
10	Колесо обозрения		10:00 - 21:00	/zones/10_1763988259.jpg	218.00
14	Старший смены		10:00 - 21:00	/zones/14_1764600553.jpg	236.00
15	Старший смены (Зима)		10:00 - 21:00		236.00
16	Оператор (Зима)		10:00 - 21:00		218.00
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

SELECT pg_catalog.setval('cron.runid_seq', 400, true);


--
-- Name: auto_cheklst_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auto_cheklst_id_seq', 103, true);


--
-- Name: bonus_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bonus_templates_id_seq', 3, true);


--
-- Name: bonuses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bonuses_id_seq', 2, true);


--
-- Name: checklists_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.checklists_id_seq', 959, true);


--
-- Name: fine_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fine_templates_id_seq', 9, true);


--
-- Name: fines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fines_id_seq', 9, true);


--
-- Name: schedules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.schedules_id_seq', 191, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 142, true);


--
-- Name: zones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.zones_id_seq', 16, true);


--
-- Name: auto_cheklst auto_cheklst_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auto_cheklst
    ADD CONSTRAINT auto_cheklst_pkey PRIMARY KEY (id);


--
-- Name: bonus_templates bonus_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bonus_templates
    ADD CONSTRAINT bonus_templates_pkey PRIMARY KEY (id);


--
-- Name: bonuses bonuses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bonuses
    ADD CONSTRAINT bonuses_pkey PRIMARY KEY (id);


--
-- Name: checklists checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT checklists_pkey PRIMARY KEY (id);


--
-- Name: fine_templates fine_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fine_templates
    ADD CONSTRAINT fine_templates_pkey PRIMARY KEY (id);


--
-- Name: fines fines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fines
    ADD CONSTRAINT fines_pkey PRIMARY KEY (id);


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
-- Name: idx_bonuses_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bonuses_user_id ON public.bonuses USING btree (user_id);


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
-- Name: idx_fines_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_fines_user_id ON public.fines USING btree (user_id);


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
-- Name: bonuses fk_bonuses_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bonuses
    ADD CONSTRAINT fk_bonuses_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: fines fk_fines_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fines
    ADD CONSTRAINT fk_fines_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


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

\unrestrict 3PGuYTJsVelEHAEhv2sQ3yXl4gryxX3IGga7kLXGEXbQAkcmL3INQonct56xYX9

