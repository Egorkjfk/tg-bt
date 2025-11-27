--
-- PostgreSQL database dump
--

\restrict M6dvIs9skrStMT7KOIIHwf4C9AuiWcup5zlsoiq4APcLsURNyrcmYBfItXQSCVH

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

CREATE FUNCTION public.copy_auto_checklists_hourly() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    zone_record RECORD;
    zone_start_time TIME;
    current_hour INT;
BEGIN
    current_hour := EXTRACT(HOUR FROM CURRENT_TIME);
    
    FOR zone_record IN 
        SELECT id, working_hours FROM zones 
        WHERE working_hours IS NOT NULL 
    LOOP
        zone_start_time := extract_start_time(zone_record.working_hours);
        
        IF zone_start_time IS NOT NULL THEN
            -- Если текущий час = час начала работы минус 1
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
                
                RAISE NOTICE 'Скопированы чеклисты для зоны %', zone_record.id;
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
    confirmed boolean DEFAULT false NOT NULL
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
    hourly_rate numeric(10,2) NOT NULL
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
\.


--
-- Data for Name: job_run_details; Type: TABLE DATA; Schema: cron; Owner: postgres
--

COPY cron.job_run_details (jobid, runid, job_pid, database, username, command, status, return_message, start_time, end_time) FROM stdin;
1	1	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-07 04:00:00.000028+03	2025-11-07 04:00:00.017086+03
1	20	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-11 17:00:00.00006+03	2025-11-11 17:00:00.008457+03
1	2	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-07 15:00:00.000642+03	2025-11-07 15:00:00.011684+03
1	3	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-07 16:00:00.000698+03	2025-11-07 16:00:00.054491+03
1	4	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-07 17:00:00.000904+03	2025-11-07 17:00:00.056948+03
1	21	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-11 18:00:00.00077+03	2025-11-11 18:00:00.056828+03
1	5	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 13:00:00.000036+03	2025-11-10 13:00:00.060416+03
1	6	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 14:00:00.000029+03	2025-11-10 14:00:00.009704+03
1	7	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 15:00:00.000904+03	2025-11-10 15:00:00.00934+03
1	22	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-11 19:00:00.000763+03	2025-11-11 19:00:00.056112+03
1	8	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 16:00:00.000881+03	2025-11-10 16:00:00.010354+03
1	9	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 17:00:00.000885+03	2025-11-10 17:00:00.010518+03
1	10	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 18:00:00.000988+03	2025-11-10 18:00:00.010647+03
1	23	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-12 18:00:00.000052+03	2025-11-12 18:00:00.012631+03
1	11	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 19:00:00.000198+03	2025-11-10 19:00:00.009757+03
1	12	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 20:00:00.000644+03	2025-11-10 20:00:00.010094+03
1	13	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 21:00:00.000297+03	2025-11-10 21:00:00.009754+03
1	14	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 22:00:00.000544+03	2025-11-10 22:00:00.010047+03
1	15	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-10 23:00:00.000984+03	2025-11-10 23:00:00.011402+03
1	16	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-11 00:00:00.00089+03	2025-11-11 00:00:00.009202+03
1	17	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-11 01:00:00.000329+03	2025-11-11 01:00:00.010096+03
1	18	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-11 02:00:00.000536+03	2025-11-11 02:00:00.008848+03
1	19	\N	gorpark	postgres	SELECT copy_auto_checklists_hourly();	failed	connection failed	2025-11-11 16:00:00.000162+03	2025-11-11 16:00:00.015325+03
\.


--
-- Data for Name: auto_cheklst; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auto_cheklst (id, zone_id, description) FROM stdin;
5	4	ываыфваыва
\.


--
-- Data for Name: checklists; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.checklists (id, date, zone_id, description, photo, status, issue_time, return_time, admin_id, confirmed) FROM stdin;
104	2025-11-01	1	сс	/list/checklist_104_1761951926.jpg	t	2025-11-01 02:05:08.258958+03	2025-11-01 02:05:26.619205+03	\N	f
166	2025-11-06	2	xz	\N	f	2025-11-06 19:12:12.347197+03	\N	124	f
167	2025-11-06	1	qwdqwd	\N	f	2025-11-06 19:38:28.988946+03	\N	124	f
191	2025-11-12	6	Помыть ко	/list/checklist_191_1762958603.jpg	t	2025-11-12 17:38:53.712944+03	2025-11-12 17:43:23.393598+03	\N	t
188	2025-11-10	6	тест\n	/list/checklist_188_1762807624.jpg	t	2025-11-10 23:46:46.999116+03	2025-11-10 23:47:04.772239+03	\N	t
184	2025-11-07	5	15 тыщ забрать и домой	\N	f	2025-11-07 14:56:23.386072+03	\N	\N	f
183	2025-11-07	6	тест\n	/list/checklist_183_1762516994.jpg	t	2025-11-07 14:51:30.773581+03	2025-11-07 15:03:14.863928+03	\N	f
189	2025-11-11	6	протереть столики\n	/list/checklist_189_1762867233.jpg	t	2025-11-11 16:20:13.611932+03	2025-11-11 16:20:33.693854+03	\N	t
190	2025-11-11	6	апиапиапиапи	/list/checklist_190_1762867394.jpg	t	2025-11-11 16:20:51.979464+03	2025-11-11 16:23:14.094189+03	\N	f
186	2025-11-10	6	jjj	/list/checklist_186_1762774733.jpg	t	2025-11-10 14:37:51.27423+03	2025-11-10 14:38:53.437281+03	\N	t
185	2025-11-10	6	fqwef	/list/checklist_185_1762774653.jpg	t	2025-11-10 14:32:16.446995+03	2025-11-10 14:37:33.660405+03	\N	t
187	2025-11-10	4	Тест	\N	f	2025-11-10 23:28:34.93322+03	\N	\N	f
168	2025-11-06	5	xxxxxxxxxxxxx	/list/checklist_168_1762449287.jpg	t	2025-11-06 19:46:28.447126+03	2025-11-06 20:14:47.111301+03	\N	t
169	2025-11-06	5	fwefwefwef	/list/checklist_169_1762449183.jpg	t	2025-11-06 19:51:24.880665+03	2025-11-06 20:13:03.339769+03	\N	f
174	2025-11-06	5	dddddd	\N	f	2025-11-06 22:13:14.807183+03	\N	\N	f
105	2025-11-01	1	ывс	/list/checklist_105_1761951969.jpg	t	2025-11-01 02:05:38.912584+03	2025-11-01 02:06:09.162899+03	\N	f
106	2025-11-01	1	сыв	/list/checklist_106_1761952053.jpg	t	2025-11-01 02:06:14.429208+03	2025-11-01 02:07:33.940721+03	\N	f
108	2025-11-01	1	few	/list/checklist_108_1761953989.jpg	t	2025-11-01 02:30:25.341646+03	2025-11-01 02:39:49.980515+03	\N	f
115	2025-11-01	1	счс	/list/checklist_115_1761954412.jpg	t	2025-11-01 02:45:32.498132+03	2025-11-01 02:46:52.844613+03	\N	t
110	2025-11-01	1	мвам	/list/checklist_110_1761954227.jpg	t	2025-11-01 02:43:27.387583+03	2025-11-01 02:43:47.532999+03	\N	t
112	2025-11-01	1	ооо	\N	f	2025-11-01 02:44:21.785433+03	\N	\N	f
109	2025-11-01	1	ъ0-	/list/checklist_109_1761954220.jpg	t	2025-11-01 02:39:41.530996+03	2025-11-01 02:43:40.103581+03	\N	t
113	2025-11-01	1	вы	/list/checklist_113_1761955174.jpg	t	2025-11-01 02:45:02.85136+03	2025-11-01 02:59:34.54241+03	\N	t
114	2025-11-01	1	сччс	/list/checklist_114_1761954494.jpg	t	2025-11-01 02:45:12.617176+03	2025-11-01 02:48:14.260407+03	\N	f
116	2025-11-01	1	ацуа	/list/checklist_116_1761954431.jpg	t	2025-11-01 02:47:04.761867+03	2025-11-01 02:47:11.603326+03	\N	t
103	2025-11-01	1	сывсыс	/list/checklist_103_1761951896.jpg	t	2025-11-01 02:04:43.467461+03	2025-11-01 02:04:56.024729+03	\N	f
136	2025-11-03	2	s	\N	f	2025-11-03 18:24:09.207626+03	\N	\N	f
111	2025-11-01	1	мвам	/list/checklist_111_1761954326.jpg	t	2025-11-01 02:43:58.735848+03	2025-11-01 02:45:26.557387+03	\N	t
107	2025-11-01	1	нг	/list/checklist_107_1761953627.jpg	t	2025-11-01 02:07:20.172815+03	2025-11-01 02:33:47.874901+03	\N	t
119	2025-11-01	1	ауц	/list/checklist_119_1761954551.jpg	t	2025-11-01 02:48:53.114704+03	2025-11-01 02:49:11.717915+03	\N	t
118	2025-11-01	1	ацуац	/list/checklist_118_1761954525.jpg	t	2025-11-01 02:48:35.805245+03	2025-11-01 02:48:45.510952+03	\N	t
135	2025-11-03	2	wd	/list/checklist_135_1762183453.jpg	t	2025-11-03 18:24:03.749571+03	2025-11-03 18:24:13.977581+03	\N	f
117	2025-11-01	1	ацу	/list/checklist_117_1761954462.jpg	t	2025-11-01 02:47:35.113656+03	2025-11-01 02:47:42.905606+03	\N	t
137	2025-11-03	2	sw	/list/checklist_137_1762183467.jpg	t	2025-11-03 18:24:23.135889+03	2025-11-03 18:24:27.148162+03	\N	t
121	2025-11-01	1	dfg	/list/checklist_121_1761959593.jpg	t	2025-11-01 04:10:02.023195+03	2025-11-01 04:13:13.924403+03	\N	t
123	2025-11-03	2	s	/list/checklist_123_1762125903.jpg	t	2025-11-03 02:24:15.479026+03	2025-11-03 02:25:03.107258+03	\N	f
130	2025-11-03	2	gf	/list/checklist_130_1762178806.jpg	t	2025-11-03 17:05:40.919678+03	2025-11-03 17:06:46.560646+03	\N	f
120	2025-11-01	1	brtbr	/list/checklist_120_1761959741.jpg	t	2025-11-01 04:09:31.638603+03	2025-11-01 04:15:41.687514+03	\N	t
128	2025-11-03	2	vv	/list/checklist_128_1762129686.jpg	t	2025-11-03 03:27:24.844147+03	2025-11-03 03:28:06.636476+03	\N	t
170	2025-11-06	5	g	/list/checklist_170_1762449210.jpg	t	2025-11-06 20:11:57.347481+03	2025-11-06 20:13:30.075497+03	\N	f
140	2025-11-03	5	99	/list/checklist_140_1762197380.jpg	t	2025-11-03 18:28:50.567275+03	2025-11-03 22:16:20.717707+03	\N	t
124	2025-11-03	2	ff	/list/checklist_124_1762126941.jpg	t	2025-11-03 02:40:18.738721+03	2025-11-03 02:42:21.808591+03	\N	t
122	2025-11-03	2	авава	/list/checklist_122_1762126066.jpg	t	2025-11-03 02:13:41.466405+03	2025-11-03 02:27:46.991427+03	\N	t
125	2025-11-03	2	c	/list/checklist_125_1762127532.jpg	t	2025-11-03 02:51:28.817349+03	2025-11-03 02:52:12.061057+03	\N	t
129	2025-11-03	2	vsf	/list/checklist_129_1762183529.jpg	t	2025-11-03 17:04:42.975781+03	2025-11-03 18:25:29.398173+03	\N	f
126	2025-11-03	2	sd	/list/checklist_126_1762128287.jpg	t	2025-11-03 03:04:06.214359+03	2025-11-03 03:04:47.137746+03	\N	f
127	2025-11-03	2	sd	/list/checklist_127_1762129036.jpg	t	2025-11-03 03:16:51.224675+03	2025-11-03 03:17:16.572823+03	\N	f
139	2025-11-03	2	9	\N	f	2025-11-03 18:28:24.179199+03	\N	\N	f
145	2025-11-03	1	c	\N	f	2025-11-03 20:01:57.992675+03	\N	\N	f
138	2025-11-03	2	'	/list/checklist_138_1762183689.jpg	t	2025-11-03 18:25:16.80651+03	2025-11-03 18:28:09.357961+03	\N	t
131	2025-11-03	2	wd	\N	f	2025-11-03 17:26:47.961884+03	\N	\N	f
132	2025-11-03	2	sw	\N	f	2025-11-03 17:27:22.327062+03	\N	\N	f
134	2025-11-03	2	sw	/list/checklist_134_1762180639.jpg	t	2025-11-03 17:29:04.367037+03	2025-11-03 17:37:19.648916+03	\N	f
133	2025-11-03	2	sw	/list/checklist_133_1762182327.jpg	t	2025-11-03 17:28:09.49585+03	2025-11-03 18:05:27.05312+03	\N	f
146	2025-11-03	2	c	/list/checklist_146_1762190044.jpg	t	2025-11-03 20:02:08.747359+03	2025-11-03 20:14:04.224719+03	\N	f
147	2025-11-03	2	vd	/list/checklist_147_1762189465.jpg	t	2025-11-03 20:02:37.552643+03	2025-11-03 20:04:25.276107+03	\N	f
148	2025-11-03	5	ghwegegerg	/list/checklist_148_1762197432.jpg	t	2025-11-03 22:17:01.185966+03	2025-11-03 22:17:12.431273+03	\N	t
149	2025-11-04	5	вцув	\N	f	2025-11-04 01:50:53.17532+03	\N	\N	f
151	2025-11-04	4	csdc	/list/checklist_151_1762216958.jpg	t	2025-11-04 03:41:18.04121+03	2025-11-04 03:42:38.838239+03	\N	f
150	2025-11-04	5	ввввввввввввввввв	\N	f	2025-11-04 01:51:15.342072+03	\N	\N	f
152	2025-11-04	4	csdc	/list/checklist_152_1762216939.jpg	t	2025-11-04 03:41:56.084154+03	2025-11-04 03:42:19.837107+03	\N	f
153	2025-11-04	4	ацуа	/list/checklist_153_1762217663.jpg	t	2025-11-04 03:54:12.375574+03	2025-11-04 03:54:23.524017+03	\N	f
156	2025-11-05	6	ааааа	/list/checklist_156_1762355027.jpg	t	2025-11-05 18:03:40.170318+03	2025-11-05 18:03:47.413815+03	\N	t
155	2025-11-05	4	цуа	\N	f	2025-11-05 18:03:30.816476+03	\N	\N	f
154	2025-11-05	6	вйцвйв	/list/checklist_154_1762354998.jpg	t	2025-11-05 18:02:38.706272+03	2025-11-05 18:03:18.35159+03	\N	f
162	2025-11-05	6	ццццццц2	/list/checklist_162_1762381041.jpg	t	2025-11-06 01:17:14.301671+03	2025-11-06 01:17:21.625265+03	\N	f
163	2025-11-05	3	аааавввв	\N	f	2025-11-06 01:24:47.195243+03	\N	\N	f
171	2025-11-06	5	wwww	/list/checklist_171_1762456427.jpg	t	2025-11-06 22:08:03.779778+03	2025-11-06 22:13:47.411402+03	\N	f
143	2025-11-03	3	dsv	\N	f	2025-11-03 19:05:52.573173+03	\N	\N	f
141	2025-11-03	5	sad	/list/checklist_141_1762197337.jpg	t	2025-11-03 18:31:22.811157+03	2025-11-03 22:15:37.80114+03	\N	t
142	2025-11-03	2	tfgjh	/list/checklist_142_1762183965.jpg	t	2025-11-03 18:32:25.84807+03	2025-11-03 18:32:45.863211+03	\N	t
144	2025-11-03	2	dwe	/list/checklist_144_1762190063.jpg	t	2025-11-03 19:56:51.734243+03	2025-11-03 20:14:23.678671+03	\N	f
\.


--
-- Data for Name: schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schedules (id, worker_id, zone_id, date, planned_start_time, planned_end_time, actual_start_time, actual_end_time, hourly_rate) FROM stdin;
95	124	6	2025-11-10	09:00:00	18:00:00	08:00:00	20:00:00	350.00
49	124	4	2025-11-09	09:00:00	18:00:00	\N	\N	150.00
98	124	6	2025-11-11	09:00:00	18:00:00	13:23:00	16:23:00	232.00
89	124	\N	2025-11-07	09:00:00	18:00:00	\N	\N	3434.00
86	124	\N	2025-11-03	09:00:00	18:00:00	16:29:00	16:29:00	3434.00
100	127	6	2025-11-12	09:00:00	18:00:00	15:38:00	15:43:00	232.00
81	124	4	2025-11-08	09:00:00	18:00:00	\N	\N	150.00
37	124	3	2025-11-05	09:00:00	18:00:00	16:29:00	16:29:00	999.00
47	124	5	2025-11-06	09:00:00	18:00:00	16:29:00	16:29:00	220.00
48	124	\N	2025-11-15	09:00:00	18:00:00	08:00:00	16:55:00	123.00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, telegram_id, username, first_name, last_name, phone_number, confirmed, created_at, is_admin, chat_id) FROM stdin;
124	1112662763	Egor12sar	Egor			t	2025-11-06 01:21:10.040808+03	f	1112662763
127	733190744		D.A.Machin			t	2025-11-12 17:19:46.230532+03	f	733190744
128	1028613614	Foxi_olesia	Олеся			t	2025-11-12 17:19:46.233417+03	t	1028613614
\.


--
-- Data for Name: zones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.zones (id, name, description, working_hours, image_path, price) FROM stdin;
1	Центральный парк	Главная зона отдыха в центре города с фонтанами и аллеями	6:00 - 23:00	/zones/1_1762806892.png	232.00
5	Восточный рынок	Торговая зона с магазинами и кафе	8:00 - 20:00	\N	220.00
2	Северный район	Жилой район с современной инфраструктурой и парковками	0:00 - 23:59	/zones/2_1762351675.png	276.00
3	Южная набережная	Зона вдоль реки с велодорожками и местами для пикников	5:00 - 22:00	/zones/3_1762381435.jpg	350.00
6	Колесо обозрения	Колесо обозрения — это аттракцион, состоящий из вертикального вращающегося колеса со множеством пассажирских кабин, прикрепленных к ободу. Оно имеет стальную конструкцию, напоминающую велосипедное колесо, с множеством спиц, поддерживающих обод и обеспечивающих устойчивость. По мере вращения колеса пассажиры могут наблюдать панорамный вид на город. 	6:00 - 22:00	/zones/6_1762355087.png	232.00
4	Западный бизнес-центр54упукпукпукп	Деловой район с офисными зданиями и коворкингамийупйуп	12:22 - 21:22	/zones/4_1762867127.png	150.00
\.


--
-- Name: jobid_seq; Type: SEQUENCE SET; Schema: cron; Owner: postgres
--

SELECT pg_catalog.setval('cron.jobid_seq', 1, true);


--
-- Name: runid_seq; Type: SEQUENCE SET; Schema: cron; Owner: postgres
--

SELECT pg_catalog.setval('cron.runid_seq', 23, true);


--
-- Name: auto_cheklst_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auto_cheklst_id_seq', 5, true);


--
-- Name: checklists_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.checklists_id_seq', 191, true);


--
-- Name: schedules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.schedules_id_seq', 100, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 128, true);


--
-- Name: zones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.zones_id_seq', 9, true);


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

\unrestrict M6dvIs9skrStMT7KOIIHwf4C9AuiWcup5zlsoiq4APcLsURNyrcmYBfItXQSCVH

