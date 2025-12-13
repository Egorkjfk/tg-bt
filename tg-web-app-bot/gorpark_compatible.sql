--
-- PostgreSQL database dump
--

\restrict iERrjQRGrnyDWp0ZHn4JpANTLRlypgKsexnBOAQBo9WA2cqL4shOBUtRhdgcbZC

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
-- Name: EXTENSION pg_cron; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL';


--
-- Name: copy_auto_checklists_hourly(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.copy_auto_checklists_hourly() RETURNS TABLE(result_zone_id bigint, action text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    zone_record RECORD;
    zone_start_time TIME;
    current_hour INT;
    has_schedule_today BOOLEAN;
BEGIN
    current_hour := EXTRACT(HOUR FROM CURRENT_TIME);
    
    FOR zone_record IN
        SELECT id, working_hours FROM zones WHERE working_hours IS NOT NULL
    LOOP
        zone_start_time := extract_start_time(zone_record.working_hours);
        
        -- Проверяем, есть ли расписание на сегодня для этой зоны
        SELECT EXISTS (
            SELECT 1 
            FROM schedules 
            WHERE zone_id = zone_record.id 
            AND date = CURRENT_DATE
        ) INTO has_schedule_today;
        
        IF zone_start_time IS NOT NULL AND has_schedule_today THEN
            IF current_hour = (EXTRACT(HOUR FROM zone_start_time) - 1) THEN
                INSERT INTO checklists (zone_id, description, date, status, issue_time, confirmed, important)
                SELECT
                    zone_record.id,
                    description,
                    to_char(CURRENT_DATE, 'YYYY-MM-DD'),
                    false,
                    CURRENT_TIMESTAMP,
                    false,
                    important
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


--
-- Name: extract_start_time(text); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: set_schedule_hourly_rate(); Type: FUNCTION; Schema: public; Owner: -
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


SET default_table_access_method = heap;

--
-- Name: auto_cheklst; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auto_cheklst (
    id bigint NOT NULL,
    zone_id bigint NOT NULL,
    description text,
    important boolean DEFAULT false NOT NULL
);


--
-- Name: auto_cheklst_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auto_cheklst_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auto_cheklst_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auto_cheklst_id_seq OWNED BY public.auto_cheklst.id;


--
-- Name: bonus_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bonus_templates (
    id bigint NOT NULL,
    name text NOT NULL,
    price numeric(10,2) NOT NULL
);


--
-- Name: bonus_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bonus_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bonus_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bonus_templates_id_seq OWNED BY public.bonus_templates.id;


--
-- Name: bonuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bonuses (
    id bigint NOT NULL,
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    user_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: bonuses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bonuses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bonuses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bonuses_id_seq OWNED BY public.bonuses.id;


--
-- Name: checklists; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: checklists_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.checklists_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: checklists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.checklists_id_seq OWNED BY public.checklists.id;


--
-- Name: fine_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fine_templates (
    id bigint NOT NULL,
    name text NOT NULL,
    price numeric(10,2) NOT NULL
);


--
-- Name: fine_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fine_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fine_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fine_templates_id_seq OWNED BY public.fine_templates.id;


--
-- Name: fines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fines (
    id bigint NOT NULL,
    name text NOT NULL,
    price numeric(10,2) NOT NULL,
    user_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: fines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fines_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fines_id_seq OWNED BY public.fines.id;


--
-- Name: schedules; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schedules_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schedules_id_seq OWNED BY public.schedules.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zones (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    working_hours character varying(50) NOT NULL,
    image_path text,
    price numeric(10,2) NOT NULL
);


--
-- Name: zones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.zones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: zones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.zones_id_seq OWNED BY public.zones.id;


--
-- Name: auto_cheklst id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_cheklst ALTER COLUMN id SET DEFAULT nextval('public.auto_cheklst_id_seq'::regclass);


--
-- Name: bonus_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bonus_templates ALTER COLUMN id SET DEFAULT nextval('public.bonus_templates_id_seq'::regclass);


--
-- Name: bonuses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bonuses ALTER COLUMN id SET DEFAULT nextval('public.bonuses_id_seq'::regclass);


--
-- Name: checklists id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists ALTER COLUMN id SET DEFAULT nextval('public.checklists_id_seq'::regclass);


--
-- Name: fine_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fine_templates ALTER COLUMN id SET DEFAULT nextval('public.fine_templates_id_seq'::regclass);


--
-- Name: fines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fines ALTER COLUMN id SET DEFAULT nextval('public.fines_id_seq'::regclass);


--
-- Name: schedules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules ALTER COLUMN id SET DEFAULT nextval('public.schedules_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: zones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zones ALTER COLUMN id SET DEFAULT nextval('public.zones_id_seq'::regclass);


--
-- Data for Name: auto_cheklst; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.auto_cheklst VALUES (6, 1, 'Поставь вариться кукурузу!', false);
INSERT INTO public.auto_cheklst VALUES (7, 1, 'Надо помыть аппарат для сахарной ваты!', false);
INSERT INTO public.auto_cheklst VALUES (8, 1, 'Расставь напитки в холодильнике!', false);
INSERT INTO public.auto_cheklst VALUES (9, 1, 'Надо убрать паутину, помыть полы, протереть поверхности (столы,холодильник, кофемашину, раковину).', false);
INSERT INTO public.auto_cheklst VALUES (10, 1, 'Надо помыть кофемашину и пополнить компоненты.', false);
INSERT INTO public.auto_cheklst VALUES (11, 1, 'Надо сделать попкорн)', false);
INSERT INTO public.auto_cheklst VALUES (12, 1, 'Не забудь помыть попкорницу.', false);
INSERT INTO public.auto_cheklst VALUES (13, 2, 'Включи комп, программу Лайм', false);
INSERT INTO public.auto_cheklst VALUES (14, 2, 'Открой жалюзи и окно', false);
INSERT INTO public.auto_cheklst VALUES (15, 2, 'Открой смену на терминале/кассе', false);
INSERT INTO public.auto_cheklst VALUES (16, 2, 'Убери весь мусор со стола, сложи всё по местам', false);
INSERT INTO public.auto_cheklst VALUES (17, 2, 'Помыть полы', false);
INSERT INTO public.auto_cheklst VALUES (18, 2, 'Выкинуть мусор', false);
INSERT INTO public.auto_cheklst VALUES (20, 3, 'Открой ставни', false);
INSERT INTO public.auto_cheklst VALUES (21, 3, 'Протри автоматы, подключи к блоку и поставь на подставку  (3 шт)', false);
INSERT INTO public.auto_cheklst VALUES (22, 3, 'Включи комп, зайди в тир контроль', false);
INSERT INTO public.auto_cheklst VALUES (23, 3, 'Протри мишени и подними их.', false);
INSERT INTO public.auto_cheklst VALUES (24, 3, 'Убери рабочее место (стол/под столом)', false);
INSERT INTO public.auto_cheklst VALUES (25, 3, 'Убери всю паутину  (стены/потолок)', false);
INSERT INTO public.auto_cheklst VALUES (26, 3, 'Развесить призы ', false);
INSERT INTO public.auto_cheklst VALUES (27, 3, 'Подмети полы, собери пульки', false);
INSERT INTO public.auto_cheklst VALUES (28, 3, 'Собрать мусор на территории тира', false);
INSERT INTO public.auto_cheklst VALUES (29, 3, 'Проверить наличие брелков и игрушек, написать в закуп', false);
INSERT INTO public.auto_cheklst VALUES (30, 3, 'Проверить исправность автоматов, настроить / написать в задачи, что нужно починить', false);
INSERT INTO public.auto_cheklst VALUES (34, 10, 'Помой стекла в кабинках, чтобы наши посетители могли любоваться видом ', false);
INSERT INTO public.auto_cheklst VALUES (35, 10, 'Не забудь помыть полы  в каждой кабинке', false);
INSERT INTO public.auto_cheklst VALUES (37, 11, 'Включи экстрим Проведи внешний осмотр аттракциона ', false);
INSERT INTO public.auto_cheklst VALUES (38, 11, 'Нужно проверить опоры (4 шт)', false);
INSERT INTO public.auto_cheklst VALUES (39, 11, 'Проверить ремни безопасности и крепления на каждом посадочном месте.  (16 шт) ', false);
INSERT INTO public.auto_cheklst VALUES (40, 11, 'Теперь давай наведём порядок.  Протри все посадочные места', false);
INSERT INTO public.auto_cheklst VALUES (41, 11, 'Собери весь мусор в кабинке оператора.', false);
INSERT INTO public.auto_cheklst VALUES (42, 11, 'Помой полы, протри пыль, убери всё лишнее по местам', false);
INSERT INTO public.auto_cheklst VALUES (43, 11, 'Убери территорию Экстрима от мусора и проверь на наличие гаек, шайб и т. д.', false);
INSERT INTO public.auto_cheklst VALUES (44, 11, 'Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. ', false);
INSERT INTO public.auto_cheklst VALUES (45, 12, 'Включи музыку для хорошего настроения всей команды!', false);
INSERT INTO public.auto_cheklst VALUES (46, 12, 'Протри от пыли все машинки', false);
INSERT INTO public.auto_cheklst VALUES (47, 12, 'Подмети пол', false);
INSERT INTO public.auto_cheklst VALUES (48, 12, 'Собери паутину по периметру, в каждом уголочке ', false);
INSERT INTO public.auto_cheklst VALUES (49, 12, 'Убери территорию автодрома', false);
INSERT INTO public.auto_cheklst VALUES (50, 12, 'Проверь аттракцион на исправность, если есть какие-то задачи, пиши в чат', false);
INSERT INTO public.auto_cheklst VALUES (51, 13, 'Включи лодку Проведи внешний осмотр аттракциона ', false);
INSERT INTO public.auto_cheklst VALUES (52, 13, 'Нужно проверить опоры (4 шт)', false);
INSERT INTO public.auto_cheklst VALUES (53, 13, 'Проверить ремни безопасности и крепления на каждом посадочном месте.  (30 шт) ', false);
INSERT INTO public.auto_cheklst VALUES (54, 13, 'Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков.', false);
INSERT INTO public.auto_cheklst VALUES (55, 13, 'Теперь давай наведём порядок.  Протри все посадочные места', false);
INSERT INTO public.auto_cheklst VALUES (56, 13, 'Протри пыль на лодке', false);
INSERT INTO public.auto_cheklst VALUES (57, 13, 'Убери входную группу', false);
INSERT INTO public.auto_cheklst VALUES (58, 13, 'Убери территорию вокруг аттракциона', false);
INSERT INTO public.auto_cheklst VALUES (32, 10, 'Открой кабинку инструктора и включи КО', false);
INSERT INTO public.auto_cheklst VALUES (19, 2, 'Собрать мусор на территории парка', false);
INSERT INTO public.auto_cheklst VALUES (36, 10, 'Осталось помыть входную зону', false);
INSERT INTO public.auto_cheklst VALUES (31, 10, 'Проверь колёса, надо накачать до 5', false);
INSERT INTO public.auto_cheklst VALUES (80, 14, '1. Выключи сигнализацию.
2. Распредели людей для открытия парка.
3. Убедись, что все аттракционы работают (музыка на автодроме играет). Игротека вкл (+ без пыли и паутины).', false);
INSERT INTO public.auto_cheklst VALUES (81, 14, 'Отлично! 
Проверь тир на чистоту (стоят автоматы (3 шт), нет паутины, подняты все мишени, брелоки и игрушки висят в нужном количестве (нет пустого места)). ', false);
INSERT INTO public.auto_cheklst VALUES (82, 14, 'Проверить на чистоту лабиринт (нет воды на крыше, протерли от пыли, все шарики в бассейне).', false);
INSERT INTO public.auto_cheklst VALUES (83, 14, 'Проверить Зорбы. 
(Бассейн, Зорбы, входная зона)
Проверить ДЖЕТ (все посадочные места чистые)', false);
INSERT INTO public.auto_cheklst VALUES (84, 14, 'Касса. 
Комп включен, чистые полы, нет мусора, всё лежит аккуратно.  Чек-лента есть (минимум по 2 уп.).', false);
INSERT INTO public.auto_cheklst VALUES (85, 14, 'Экстрим. 
Готов к эксплуатации. 
Рабочее место, посадочные места и входная зона приведены в порядок.', false);
INSERT INTO public.auto_cheklst VALUES (86, 14, 'Автодром. 
Играет музыка. 
Машинки чистые,убрали паутину, подмели пол, выкинули мусор.', false);
INSERT INTO public.auto_cheklst VALUES (87, 14, 'Лодка. 
Нет скопления воды, чистые посадочные места, выкинули мусор, чистая входная зона.', false);
INSERT INTO public.auto_cheklst VALUES (88, 14, 'Кафе.        
Чистые полы.        
Чистая раковина.        
Нет паутины.        
Чистые столы.        
Чистый аппарат для ваты.        
Кукуруза варится.        
Холодильник заполнен напитками.        
Порядок под стойкой.        
Чистый холодильник.        
Сотрудник кафе делает список закупа.', false);
INSERT INTO public.auto_cheklst VALUES (89, 14, 'Прокат. 
Все машинки заряжаются. Машинки протерли от пыли.', false);
INSERT INTO public.auto_cheklst VALUES (90, 14, 'КО
Кабинки КО, кабинка оператора, входная зона приведены в порядок. ', false);
INSERT INTO public.auto_cheklst VALUES (91, 14, 'На территории парка нет мусора.', false);
INSERT INTO public.auto_cheklst VALUES (92, 14, 'Составить список закупа для кафе.

Напоминалка. 
Напитки — пепси.
Кофе, сливки, шоколад, сахар в инд. уп., 
стаканчики, крышки, ложки.        
Попкорн, масло, добавки.       
Кукуруза, соль, шпажки, стаканчики.        
Мороженое.        
Шантипак, молоко, лимоны/лайм/мята, сливки кокос., взбитые сливки, газ. вода 2л, сахар,  мусорные пакеты,  чай, салфетки.       
Сиропы, краситель для ваты, трубочки, палочки для ваты.       
Одн. стаканы для коктейлей + крышки (0,4 + 0,5).        
Моти.        
Чековая лента.', false);
INSERT INTO public.auto_cheklst VALUES (93, 14, 'Проверить наличие инвентаря и запчасти.

Напоминалка. 
Шарики в лабиринте.
Ремни безопасности (джет, экстрим, лодка, автодром).
Тир (пульки, игрушки, брелоки, исправность автоматов).', false);
INSERT INTO public.auto_cheklst VALUES (94, 15, '1. Включить все аттракционы, протереть посадочные места, включить музыку на автодроме. ', false);
INSERT INTO public.auto_cheklst VALUES (95, 15, '2. Экстрим.
- Проверить опоры и пальцы (4 шт.).
- Проверить ремни безопасности и крепления на каждом посадочном месте (16 шт.). 
- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. 

Прислать минимум 8 фото', true);
INSERT INTO public.auto_cheklst VALUES (96, 15, '3. Автодром.
Проверь аттракцион на исправность. Токоприемник, подушка (бампер), внешний осмотр каждой машинки. 
', false);
INSERT INTO public.auto_cheklst VALUES (97, 15, '4. Лодка.
- Нужно проверить опоры (4 шт.).
- Проверить ремни безопасности и крепления на каждом посадочном месте (30 шт.).
- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков.

Фото опор (4 шт)
', true);
INSERT INTO public.auto_cheklst VALUES (98, 15, '5. Проверить давление в колёсах на КО, отправить фото в чат «Техничка».', true);
INSERT INTO public.auto_cheklst VALUES (99, 16, '1. Включить все аттракционы, протереть посадочные места, включить музыку на автодроме.', false);
INSERT INTO public.auto_cheklst VALUES (100, 16, '2. Экстрим. 
- Проверить опоры и пальцы (4 шт.). 
- Проверить ремни безопасности и крепления на каждом посадочном месте (16 шт.). 
- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. Прислать минимум 8 фото', true);
INSERT INTO public.auto_cheklst VALUES (101, 16, '3. Автодром. Проверь аттракцион на исправность. Токоприемник, подушка (бампер), внешний осмотр каждой машинки.', false);
INSERT INTO public.auto_cheklst VALUES (102, 16, '4. Лодка. 
- Нужно проверить опоры (4 шт.). 
- Проверить ремни безопасности и крепления на каждом посадочном месте (30 шт.). 
- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. 
Фото опор (4 шт)', true);
INSERT INTO public.auto_cheklst VALUES (103, 16, '5. Проверить давление в колёсах на КО, отправить фото в чат «Техничка».', false);


--
-- Data for Name: bonus_templates; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.bonus_templates VALUES (3, 'Доп.час работы', 200.00);


--
-- Data for Name: bonuses; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: checklists; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.checklists VALUES (960, '2025-12-09', 1, 'Поставь вариться кукурузу!', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (961, '2025-12-09', 1, 'Надо помыть аппарат для сахарной ваты!', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (962, '2025-12-09', 1, 'Расставь напитки в холодильнике!', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (963, '2025-12-09', 1, 'Надо убрать паутину, помыть полы, протереть поверхности (столы,холодильник, кофемашину, раковину).', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (964, '2025-12-09', 1, 'Надо помыть кофемашину и пополнить компоненты.', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (965, '2025-12-09', 1, 'Надо сделать попкорн)', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (966, '2025-12-09', 1, 'Не забудь помыть попкорницу.', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (454, '2025-11-30', 5, 'asdcaaaaaaaaaaa', '/list/checklist_454_1764521171_0.jpg', true, '2025-11-30 16:45:59.266213+00', '2025-11-30 16:46:11.818508+00', 128, true, true);
INSERT INTO public.checklists VALUES (968, '2025-12-09', 10, 'Не забудь помыть полы  в каждой кабинке', '/list/checklist_968_1765273920_0.jpg', true, '2025-12-09 09:05:00.002258+00', '2025-12-09 09:52:00.373071+00', NULL, true, false);
INSERT INTO public.checklists VALUES (970, '2025-12-09', 10, 'Осталось помыть входную зону', '/list/checklist_970_1765274286_0.jpg', true, '2025-12-09 09:05:00.002258+00', '2025-12-09 09:58:06.873759+00', NULL, true, false);
INSERT INTO public.checklists VALUES (971, '2025-12-09', 10, 'Проверь колёса, надо накачать до 5', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (972, '2025-12-09', 14, '1. Выключи сигнализацию.
2. Распредели людей для открытия парка.
3. Убедись, что все аттракционы работают (музыка на автодроме играет). Игротека вкл (+ без пыли и паутины).', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (973, '2025-12-09', 14, 'Отлично! 
Проверь тир на чистоту (стоят автоматы (3 шт), нет паутины, подняты все мишени, брелоки и игрушки висят в нужном количестве (нет пустого места)). ', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (974, '2025-12-09', 14, 'Проверить на чистоту лабиринт (нет воды на крыше, протерли от пыли, все шарики в бассейне).', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (975, '2025-12-09', 14, 'Проверить Зорбы. 
(Бассейн, Зорбы, входная зона)
Проверить ДЖЕТ (все посадочные места чистые)', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (976, '2025-12-09', 14, 'Касса. 
Комп включен, чистые полы, нет мусора, всё лежит аккуратно.  Чек-лента есть (минимум по 2 уп.).', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (977, '2025-12-09', 14, 'Экстрим. 
Готов к эксплуатации. 
Рабочее место, посадочные места и входная зона приведены в порядок.', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (197, '2025-11-9', 6, 'Помыть ко', NULL, true, '2025-11-12 14:38:53.712944+00', '2025-11-12 14:43:23.393598+00', NULL, true, true);
INSERT INTO public.checklists VALUES (978, '2025-12-09', 14, 'Автодром. 
Играет музыка. 
Машинки чистые,убрали паутину, подмели пол, выкинули мусор.', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (979, '2025-12-09', 14, 'Лодка. 
Нет скопления воды, чистые посадочные места, выкинули мусор, чистая входная зона.', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (980, '2025-12-09', 14, 'Кафе.        
Чистые полы.        
Чистая раковина.        
Нет паутины.        
Чистые столы.        
Чистый аппарат для ваты.        
Кукуруза варится.        
Холодильник заполнен напитками.        
Порядок под стойкой.        
Чистый холодильник.        
Сотрудник кафе делает список закупа.', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (981, '2025-12-09', 14, 'Прокат. 
Все машинки заряжаются. Машинки протерли от пыли.', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (982, '2025-12-09', 14, 'КО
Кабинки КО, кабинка оператора, входная зона приведены в порядок. ', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (983, '2025-12-09', 14, 'На территории парка нет мусора.', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (984, '2025-12-09', 14, 'Составить список закупа для кафе.

Напоминалка. 
Напитки — пепси.
Кофе, сливки, шоколад, сахар в инд. уп., 
стаканчики, крышки, ложки.        
Попкорн, масло, добавки.       
Кукуруза, соль, шпажки, стаканчики.        
Мороженое.        
Шантипак, молоко, лимоны/лайм/мята, сливки кокос., взбитые сливки, газ. вода 2л, сахар,  мусорные пакеты,  чай, салфетки.       
Сиропы, краситель для ваты, трубочки, палочки для ваты.       
Одн. стаканы для коктейлей + крышки (0,4 + 0,5).        
Моти.        
Чековая лента.', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (985, '2025-12-09', 14, 'Проверить наличие инвентаря и запчасти.

Напоминалка. 
Шарики в лабиринте.
Ремни безопасности (джет, экстрим, лодка, автодром).
Тир (пульки, игрушки, брелоки, исправность автоматов).', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (986, '2025-12-09', 15, '1. Включить все аттракционы, протереть посадочные места, включить музыку на автодроме. ', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (987, '2025-12-09', 15, '2. Экстрим.
- Проверить опоры и пальцы (4 шт.).
- Проверить ремни безопасности и крепления на каждом посадочном месте (16 шт.). 
- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. 

Прислать минимум 8 фото', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, true);
INSERT INTO public.checklists VALUES (988, '2025-12-09', 15, '3. Автодром.
Проверь аттракцион на исправность. Токоприемник, подушка (бампер), внешний осмотр каждой машинки. 
', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (989, '2025-12-09', 15, '4. Лодка.
- Нужно проверить опоры (4 шт.).
- Проверить ремни безопасности и крепления на каждом посадочном месте (30 шт.).
- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков.

Фото опор (4 шт)
', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, true);
INSERT INTO public.checklists VALUES (990, '2025-12-09', 15, '5. Проверить давление в колёсах на КО, отправить фото в чат «Техничка».', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, true);
INSERT INTO public.checklists VALUES (1002, '2025-12-09', 2, 'Собрать мусор на территории парка', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (193, '2025-11-18', 2, 'тест-важный', '/list/checklist_193_1763473046.jpg', true, '2025-11-18 13:36:55.998078+00', '2025-11-18 13:37:26.196014+00', 128, true, true);
INSERT INTO public.checklists VALUES (1003, '2025-12-09', 3, 'Открой ставни', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1004, '2025-12-09', 3, 'Протри автоматы, подключи к блоку и поставь на подставку  (3 шт)', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1005, '2025-12-09', 3, 'Включи комп, зайди в тир контроль', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1006, '2025-12-09', 3, 'Протри мишени и подними их.', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1007, '2025-12-09', 3, 'Убери рабочее место (стол/под столом)', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1008, '2025-12-09', 3, 'Убери всю паутину  (стены/потолок)', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1009, '2025-12-09', 3, 'Развесить призы ', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1010, '2025-12-09', 3, 'Подмети полы, собери пульки', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1011, '2025-12-09', 3, 'Собрать мусор на территории тира', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1012, '2025-12-09', 3, 'Проверить наличие брелков и игрушек, написать в закуп', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1013, '2025-12-09', 3, 'Проверить исправность автоматов, настроить / написать в задачи, что нужно починить', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1014, '2025-12-09', 11, 'Включи экстрим Проведи внешний осмотр аттракциона ', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1015, '2025-12-09', 11, 'Нужно проверить опоры (4 шт)', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1016, '2025-12-09', 11, 'Проверить ремни безопасности и крепления на каждом посадочном месте.  (16 шт) ', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1017, '2025-12-09', 11, 'Теперь давай наведём порядок.  Протри все посадочные места', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (993, '2025-12-09', 16, '3. Автодром. Проверь аттракцион на исправность. Токоприемник, подушка (бампер), внешний осмотр каждой машинки.', '/list/checklist_993_1765273047_0.jpg', true, '2025-12-09 09:05:00.002258+00', '2025-12-09 09:37:27.47544+00', NULL, true, false);
INSERT INTO public.checklists VALUES (991, '2025-12-09', 16, '1. Включить все аттракционы, протереть посадочные места, включить музыку на автодроме.', '/list/checklist_991_1765273069_0.jpg', true, '2025-12-09 09:05:00.002258+00', '2025-12-09 09:37:49.239387+00', NULL, true, false);
INSERT INTO public.checklists VALUES (995, '2025-12-09', 16, '5. Проверить давление в колёсах на КО, отправить фото в чат «Техничка».', '/list/checklist_995_1765273747_0.jpg,/list/checklist_995_1765273747_1.jpg,/list/checklist_995_1765273747_2.jpg', true, '2025-12-09 09:05:00.002258+00', '2025-12-09 09:49:07.086685+00', NULL, true, false);
INSERT INTO public.checklists VALUES (996, '2025-12-09', 2, 'Включи комп, программу Лайм', '/list/checklist_996_1765274114_0.jpg', true, '2025-12-09 09:05:00.002258+00', '2025-12-09 09:55:14.78591+00', NULL, true, false);
INSERT INTO public.checklists VALUES (998, '2025-12-09', 2, 'Открой смену на терминале/кассе', '/list/checklist_998_1765274122_0.jpg', true, '2025-12-09 09:05:00.002258+00', '2025-12-09 09:55:22.732684+00', NULL, true, false);
INSERT INTO public.checklists VALUES (1001, '2025-12-09', 2, 'Выкинуть мусор', '/list/checklist_1001_1765274132_0.jpg', true, '2025-12-09 09:05:00.002258+00', '2025-12-09 09:55:32.208428+00', NULL, true, false);
INSERT INTO public.checklists VALUES (1000, '2025-12-09', 2, 'Помыть полы', '/list/checklist_1000_1765274139_0.jpg', true, '2025-12-09 09:05:00.002258+00', '2025-12-09 09:55:39.38109+00', NULL, true, false);
INSERT INTO public.checklists VALUES (999, '2025-12-09', 2, 'Убери весь мусор со стола, сложи всё по местам', '/list/checklist_999_1765274144_0.jpg', true, '2025-12-09 09:05:00.002258+00', '2025-12-09 09:55:44.488779+00', NULL, true, false);
INSERT INTO public.checklists VALUES (997, '2025-12-09', 2, 'Открой жалюзи и окно', '/list/checklist_997_1765274149_0.jpg', true, '2025-12-09 09:05:00.002258+00', '2025-12-09 09:55:49.076876+00', NULL, true, false);
INSERT INTO public.checklists VALUES (1121, '2025-12-10', 15, '1. Включить все аттракционы, протереть посадочные места, включить музыку на автодроме. ', '/list/checklist_add_1121_1765360457_0.jpg,/list/checklist_add_1121_1765360457_1.jpg,/list/checklist_add_1121_1765360457_2.jpg,/list/checklist_add_1121_1765360457_3.jpg', false, '2025-12-10 09:05:00.001429+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1129, '2025-12-10', 16, '4. Лодка. 
- Нужно проверить опоры (4 шт.). 
- Проверить ремни безопасности и крепления на каждом посадочном месте (30 шт.). 
- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. 
Фото опор (4 шт)', '/list/checklist_add_1129_1765360679_0.jpg,/list/checklist_add_1129_1765360679_1.jpg,/list/checklist_add_1129_1765360679_2.jpg,/list/checklist_add_1129_1765360679_3.jpg', false, '2025-12-10 09:05:00.001429+00', NULL, NULL, false, true);
INSERT INTO public.checklists VALUES (1124, '2025-12-10', 15, '4. Лодка.
- Нужно проверить опоры (4 шт.).
- Проверить ремни безопасности и крепления на каждом посадочном месте (30 шт.).
- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков.

Фото опор (4 шт)
', '/list/checklist_add_1124_1765360862_0.jpg,/list/checklist_add_1124_1765360862_1.jpg,/list/checklist_add_1124_1765360862_2.jpg,/list/checklist_add_1124_1765360892_0.jpg,/list/checklist_add_1124_1765361010_0.jpg', false, '2025-12-10 09:05:00.001429+00', NULL, NULL, false, true);
INSERT INTO public.checklists VALUES (1144, '2025-12-11', 15, '2. Экстрим.
- Проверить опоры и пальцы (4 шт.).
- Проверить ремни безопасности и крепления на каждом посадочном месте (16 шт.). 
- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. 

Прислать минимум 8 фото', NULL, false, '2025-12-11 09:05:00.000839+00', NULL, NULL, false, true);
INSERT INTO public.checklists VALUES (1146, '2025-12-11', 15, '4. Лодка.
- Нужно проверить опоры (4 шт.).
- Проверить ремни безопасности и крепления на каждом посадочном месте (30 шт.).
- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков.

Фото опор (4 шт)
', NULL, false, '2025-12-11 09:05:00.000839+00', NULL, NULL, false, true);
INSERT INTO public.checklists VALUES (1147, '2025-12-11', 15, '5. Проверить давление в колёсах на КО, отправить фото в чат «Техничка».', NULL, false, '2025-12-11 09:05:00.000839+00', NULL, NULL, false, true);
INSERT INTO public.checklists VALUES (1148, '2025-12-11', 2, 'Включи комп, программу Лайм', '/list/checklist_add_1148_1765446764_0.jpg', false, '2025-12-11 09:05:00.000839+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1149, '2025-12-11', 2, 'Открой жалюзи и окно', '/list/checklist_add_1149_1765446782_0.jpg', false, '2025-12-11 09:05:00.000839+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1150, '2025-12-11', 2, 'Открой смену на терминале/кассе', '/list/checklist_add_1150_1765446804_0.jpg', false, '2025-12-11 09:05:00.000839+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1151, '2025-12-11', 2, 'Убери весь мусор со стола, сложи всё по местам', '/list/checklist_add_1151_1765447113_0.jpg', false, '2025-12-11 09:05:00.000839+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1153, '2025-12-11', 2, 'Выкинуть мусор', '/list/checklist_add_1153_1765447122_0.jpg', false, '2025-12-11 09:05:00.000839+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1154, '2025-12-11', 2, 'Собрать мусор на территории парка', '/list/checklist_add_1154_1765447317_0.jpg,/list/checklist_add_1154_1765447317_1.jpg,/list/checklist_add_1154_1765447317_2.jpg,/list/checklist_add_1154_1765447317_3.jpg', false, '2025-12-11 09:05:00.000839+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1152, '2025-12-11', 2, 'Помыть полы', '/list/checklist_add_1152_1765447887_0.jpg,/list/checklist_add_1152_1765447887_1.jpg', false, '2025-12-11 09:05:00.000839+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (384, '2025-11-24', 12, 'привет', '/list/checklist_384_1763989314_0.jpg', true, '2025-11-24 13:01:40.552702+00', '2025-11-24 13:01:54.007304+00', 128, true, true);
INSERT INTO public.checklists VALUES (1145, '2025-12-11', 15, '3. Автодром.
Проверь аттракцион на исправность. Токоприемник, подушка (бампер), внешний осмотр каждой машинки. 
', '/list/checklist_add_1145_1765448480_0.jpg,/list/checklist_add_1145_1765448480_1.jpg,/list/checklist_add_1145_1765448480_2.jpg', false, '2025-12-11 09:05:00.000839+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (893, '2025-12-08', 10, 'Открой кабинку инструктора и включи КО', '/list/checklist_893_1765188609_0.jpg', true, '2025-12-08 09:05:00.003821+00', '2025-12-08 10:10:09.861823+00', NULL, true, false);
INSERT INTO public.checklists VALUES (1018, '2025-12-09', 11, 'Собери весь мусор в кабинке оператора.', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1019, '2025-12-09', 11, 'Помой полы, протри пыль, убери всё лишнее по местам', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1020, '2025-12-09', 11, 'Убери территорию Экстрима от мусора и проверь на наличие гаек, шайб и т. д.', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1021, '2025-12-09', 11, 'Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. ', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1022, '2025-12-09', 12, 'Включи музыку для хорошего настроения всей команды!', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1023, '2025-12-09', 12, 'Протри от пыли все машинки', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1024, '2025-12-09', 12, 'Подмети пол', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1025, '2025-12-09', 12, 'Собери паутину по периметру, в каждом уголочке ', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1026, '2025-12-09', 12, 'Убери территорию автодрома', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1027, '2025-12-09', 12, 'Проверь аттракцион на исправность, если есть какие-то задачи, пиши в чат', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1028, '2025-12-09', 13, 'Включи лодку Проведи внешний осмотр аттракциона ', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1029, '2025-12-09', 13, 'Нужно проверить опоры (4 шт)', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (895, '2025-12-08', 10, 'Проверь колёса, надо накачать до 5', NULL, false, '2025-12-08 09:05:00.003821+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1030, '2025-12-09', 13, 'Проверить ремни безопасности и крепления на каждом посадочном месте.  (30 шт) ', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1031, '2025-12-09', 13, 'Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков.', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1032, '2025-12-09', 13, 'Теперь давай наведём порядок.  Протри все посадочные места', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1033, '2025-12-09', 13, 'Протри пыль на лодке', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1034, '2025-12-09', 13, 'Убери входную группу', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1035, '2025-12-09', 13, 'Убери территорию вокруг аттракциона', NULL, false, '2025-12-09 09:05:00.002258+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (892, '2025-12-08', 10, 'Не забудь помыть полы  в каждой кабинке', '/list/checklist_892_1765188581_0.jpg', true, '2025-12-08 09:05:00.003821+00', '2025-12-08 10:09:41.489091+00', NULL, true, false);
INSERT INTO public.checklists VALUES (894, '2025-12-08', 10, 'Осталось помыть входную зону', '/list/checklist_894_1765189113_0.jpg', true, '2025-12-08 09:05:00.003821+00', '2025-12-08 10:18:33.650381+00', NULL, true, false);
INSERT INTO public.checklists VALUES (1140, '2025-12-11', 10, 'Открой кабинку инструктора и включи КО', '/list/checklist_add_1140_1765447522_0.jpg', false, '2025-12-11 09:05:00.000839+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (994, '2025-12-09', 16, '4. Лодка. 
- Нужно проверить опоры (4 шт.). 
- Проверить ремни безопасности и крепления на каждом посадочном месте (30 шт.). 
- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. 
Фото опор (4 шт)', '/list/checklist_994_1765273005_0.jpg', true, '2025-12-09 09:05:00.002258+00', '2025-12-09 09:36:45.388846+00', NULL, true, true);
INSERT INTO public.checklists VALUES (918, '2025-12-08', 16, '4. Лодка. 
- Нужно проверить опоры (4 шт.). 
- Проверить ремни безопасности и крепления на каждом посадочном месте (30 шт.). 
- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. 
Фото опор (4 шт)', NULL, false, '2025-12-08 09:05:00.003821+00', NULL, NULL, false, true);
INSERT INTO public.checklists VALUES (919, '2025-12-08', 16, '5. Проверить давление в колёсах на КО, отправить фото в чат «Техничка».', NULL, false, '2025-12-08 09:05:00.003821+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (992, '2025-12-09', 16, '2. Экстрим. 
- Проверить опоры и пальцы (4 шт.). 
- Проверить ремни безопасности и крепления на каждом посадочном месте (16 шт.). 
- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. Прислать минимум 8 фото', '/list/checklist_992_1765273184_0.jpg,/list/checklist_992_1765273184_1.jpg,/list/checklist_992_1765273184_2.jpg', true, '2025-12-09 09:05:00.002258+00', '2025-12-09 09:39:44.963042+00', NULL, true, true);
INSERT INTO public.checklists VALUES (1122, '2025-12-10', 15, '2. Экстрим.
- Проверить опоры и пальцы (4 шт.).
- Проверить ремни безопасности и крепления на каждом посадочном месте (16 шт.). 
- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. 

Прислать минимум 8 фото', '/list/checklist_add_1122_1765360996_0.jpg,/list/checklist_add_1122_1765360996_1.jpg,/list/checklist_add_1122_1765360996_2.jpg,/list/checklist_add_1122_1765361069_0.jpg,/list/checklist_add_1122_1765361069_1.jpg,/list/checklist_add_1122_1765361069_2.jpg,/list/checklist_add_1122_1765361092_0.jpg', false, '2025-12-10 09:05:00.001429+00', NULL, NULL, false, true);
INSERT INTO public.checklists VALUES (920, '2025-12-08', 2, 'Включи комп, программу Лайм', '/list/checklist_920_1765188371_0.jpg', true, '2025-12-08 09:05:00.003821+00', '2025-12-08 10:06:11.412305+00', NULL, true, false);
INSERT INTO public.checklists VALUES (922, '2025-12-08', 2, 'Открой смену на терминале/кассе', '/list/checklist_922_1765188391_0.jpg', true, '2025-12-08 09:05:00.003821+00', '2025-12-08 10:06:31.817274+00', NULL, true, false);
INSERT INTO public.checklists VALUES (921, '2025-12-08', 2, 'Открой жалюзи и окно', '/list/checklist_921_1765188425_0.jpg', true, '2025-12-08 09:05:00.003821+00', '2025-12-08 10:07:05.16735+00', NULL, true, false);
INSERT INTO public.checklists VALUES (924, '2025-12-08', 2, 'Помыть полы', '/list/checklist_924_1765188434_0.jpg', true, '2025-12-08 09:05:00.003821+00', '2025-12-08 10:07:14.712138+00', NULL, true, false);
INSERT INTO public.checklists VALUES (925, '2025-12-08', 2, 'Выкинуть мусор', '/list/checklist_925_1765188448_0.jpg', true, '2025-12-08 09:05:00.003821+00', '2025-12-08 10:07:28.205223+00', NULL, true, false);
INSERT INTO public.checklists VALUES (923, '2025-12-08', 2, 'Убери весь мусор со стола, сложи всё по местам', '/list/checklist_923_1765188495_0.jpg', true, '2025-12-08 09:05:00.003821+00', '2025-12-08 10:08:15.200293+00', NULL, true, false);
INSERT INTO public.checklists VALUES (915, '2025-12-08', 16, '1. Включить все аттракционы, протереть посадочные места, включить музыку на автодроме.', '/list/checklist_915_1765189858_0.jpg', true, '2025-12-08 09:05:00.003821+00', '2025-12-08 10:30:58.932088+00', NULL, true, false);
INSERT INTO public.checklists VALUES (917, '2025-12-08', 16, '3. Автодром. Проверь аттракцион на исправность. Токоприемник, подушка (бампер), внешний осмотр каждой машинки.', '/list/checklist_917_1765189874_0.jpg', true, '2025-12-08 09:05:00.003821+00', '2025-12-08 10:31:14.137125+00', NULL, true, false);
INSERT INTO public.checklists VALUES (926, '2025-12-08', 2, 'Собрать мусор на территории парка', '/list/checklist_926_1765190467_0.jpg,/list/checklist_926_1765190467_1.jpg,/list/checklist_926_1765190467_2.jpg', true, '2025-12-08 09:05:00.003821+00', '2025-12-08 10:41:07.239657+00', NULL, true, false);
INSERT INTO public.checklists VALUES (916, '2025-12-08', 16, '2. Экстрим. 
- Проверить опоры и пальцы (4 шт.). 
- Проверить ремни безопасности и крепления на каждом посадочном месте (16 шт.). 
- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. Прислать минимум 8 фото', '/list/checklist_916_1765190878_0.jpg', true, '2025-12-08 09:05:00.003821+00', '2025-12-08 10:47:58.926745+00', NULL, true, true);
INSERT INTO public.checklists VALUES (740, '2025-12-06', 10, 'Открой кабинку инструктора и включи КО', '/list/checklist_740_1765015133_0.jpg,/list/checklist_740_1765015133_1.jpg', true, '2025-12-06 09:05:00.002478+00', '2025-12-06 09:58:53.798735+00', NULL, true, false);
INSERT INTO public.checklists VALUES (741, '2025-12-06', 10, 'Осталось помыть входную зону', '/list/checklist_741_1765015444_0.jpg', true, '2025-12-06 09:05:00.002478+00', '2025-12-06 10:04:04.355829+00', NULL, true, false);
INSERT INTO public.checklists VALUES (739, '2025-12-06', 10, 'Не забудь помыть полы  в каждой кабинке', '/list/checklist_739_1765015453_0.jpg', true, '2025-12-06 09:05:00.002478+00', '2025-12-06 10:04:13.427219+00', NULL, true, false);
INSERT INTO public.checklists VALUES (738, '2025-12-06', 10, 'Помой стекла в кабинках, чтобы наши посетители могли любоваться видом ', '/list/checklist_738_1765015462_0.jpg', true, '2025-12-06 09:05:00.002478+00', '2025-12-06 10:04:22.188549+00', NULL, true, false);
INSERT INTO public.checklists VALUES (732, '2025-12-06', 1, 'Надо помыть аппарат для сахарной ваты!', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (733, '2025-12-06', 1, 'Расставь напитки в холодильнике!', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (734, '2025-12-06', 1, 'Надо убрать паутину, помыть полы, протереть поверхности (столы,холодильник, кофемашину, раковину).', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (735, '2025-12-06', 1, 'Надо помыть кофемашину и пополнить компоненты.', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (736, '2025-12-06', 1, 'Надо сделать попкорн)', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (737, '2025-12-06', 1, 'Не забудь помыть попкорницу.', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (969, '2025-12-09', 10, 'Открой кабинку инструктора и включи КО', '/list/checklist_969_1765273809_0.jpg', true, '2025-12-09 09:05:00.002258+00', '2025-12-09 09:50:09.950183+00', NULL, true, false);
INSERT INTO public.checklists VALUES (967, '2025-12-09', 10, 'Помой стекла в кабинках, чтобы наши посетители могли любоваться видом ', '/list/checklist_967_1765273898_0.jpg', true, '2025-12-09 09:05:00.002258+00', '2025-12-09 09:51:38.397637+00', NULL, true, false);
INSERT INTO public.checklists VALUES (742, '2025-12-06', 10, 'Проверь колёса, надо накачать до 5', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (743, '2025-12-06', 14, '1. Выключи сигнализацию.
2. Распредели людей для открытия парка.
3. Убедись, что все аттракционы работают (музыка на автодроме играет). Игротека вкл (+ без пыли и паутины).', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (744, '2025-12-06', 14, 'Отлично! 
Проверь тир на чистоту (стоят автоматы (3 шт), нет паутины, подняты все мишени, брелоки и игрушки висят в нужном количестве (нет пустого места)). ', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (745, '2025-12-06', 14, 'Проверить на чистоту лабиринт (нет воды на крыше, протерли от пыли, все шарики в бассейне).', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (746, '2025-12-06', 14, 'Проверить Зорбы. 
(Бассейн, Зорбы, входная зона)
Проверить ДЖЕТ (все посадочные места чистые)', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (747, '2025-12-06', 14, 'Касса. 
Комп включен, чистые полы, нет мусора, всё лежит аккуратно.  Чек-лента есть (минимум по 2 уп.).', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (748, '2025-12-06', 14, 'Экстрим. 
Готов к эксплуатации. 
Рабочее место, посадочные места и входная зона приведены в порядок.', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (749, '2025-12-06', 14, 'Автодром. 
Играет музыка. 
Машинки чистые,убрали паутину, подмели пол, выкинули мусор.', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (750, '2025-12-06', 14, 'Лодка. 
Нет скопления воды, чистые посадочные места, выкинули мусор, чистая входная зона.', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (751, '2025-12-06', 14, 'Кафе.        
Чистые полы.        
Чистая раковина.        
Нет паутины.        
Чистые столы.        
Чистый аппарат для ваты.        
Кукуруза варится.        
Холодильник заполнен напитками.        
Порядок под стойкой.        
Чистый холодильник.        
Сотрудник кафе делает список закупа.', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (752, '2025-12-06', 14, 'Прокат. 
Все машинки заряжаются. Машинки протерли от пыли.', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (753, '2025-12-06', 14, 'КО
Кабинки КО, кабинка оператора, входная зона приведены в порядок. ', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (754, '2025-12-06', 14, 'На территории парка нет мусора.', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (755, '2025-12-06', 14, 'Составить список закупа для кафе.

Напоминалка. 
Напитки — пепси.
Кофе, сливки, шоколад, сахар в инд. уп., 
стаканчики, крышки, ложки.        
Попкорн, масло, добавки.       
Кукуруза, соль, шпажки, стаканчики.        
Мороженое.        
Шантипак, молоко, лимоны/лайм/мята, сливки кокос., взбитые сливки, газ. вода 2л, сахар,  мусорные пакеты,  чай, салфетки.       
Сиропы, краситель для ваты, трубочки, палочки для ваты.       
Одн. стаканы для коктейлей + крышки (0,4 + 0,5).        
Моти.        
Чековая лента.', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (756, '2025-12-06', 14, 'Проверить наличие инвентаря и запчасти.

Напоминалка. 
Шарики в лабиринте.
Ремни безопасности (джет, экстрим, лодка, автодром).
Тир (пульки, игрушки, брелоки, исправность автоматов).', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (759, '2025-12-06', 15, '3. Автодром.
Проверь аттракцион на исправность. Токоприемник, подушка (бампер), внешний осмотр каждой машинки. 
', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (760, '2025-12-06', 15, '4. Лодка.
- Нужно проверить опоры (4 шт.).
- Проверить ремни безопасности и крепления на каждом посадочном месте (30 шт.).
- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков.

Фото опор (4 шт)
', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, true);
INSERT INTO public.checklists VALUES (761, '2025-12-06', 15, '5. Проверить давление в колёсах на КО, отправить фото в чат «Техничка».', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, true);
INSERT INTO public.checklists VALUES (762, '2025-12-06', 16, '1. Включить все аттракционы, протереть посадочные места, включить музыку на автодроме.', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (763, '2025-12-06', 16, '2. Экстрим. 
- Проверить опоры и пальцы (4 шт.). 
- Проверить ремни безопасности и крепления на каждом посадочном месте (16 шт.). 
- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. Прислать минимум 8 фото', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, true);
INSERT INTO public.checklists VALUES (764, '2025-12-06', 16, '3. Автодром. Проверь аттракцион на исправность. Токоприемник, подушка (бампер), внешний осмотр каждой машинки.', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (765, '2025-12-06', 16, '4. Лодка. 
- Нужно проверить опоры (4 шт.). 
- Проверить ремни безопасности и крепления на каждом посадочном месте (30 шт.). 
- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. 
Фото опор (4 шт)', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, true);
INSERT INTO public.checklists VALUES (766, '2025-12-06', 16, '5. Проверить давление в колёсах на КО, отправить фото в чат «Техничка».', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (774, '2025-12-06', 3, 'Открой ставни', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (775, '2025-12-06', 3, 'Протри автоматы, подключи к блоку и поставь на подставку  (3 шт)', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (776, '2025-12-06', 3, 'Включи комп, зайди в тир контроль', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (777, '2025-12-06', 3, 'Протри мишени и подними их.', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (778, '2025-12-06', 3, 'Убери рабочее место (стол/под столом)', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (779, '2025-12-06', 3, 'Убери всю паутину  (стены/потолок)', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (780, '2025-12-06', 3, 'Развесить призы ', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (781, '2025-12-06', 3, 'Подмети полы, собери пульки', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (782, '2025-12-06', 3, 'Собрать мусор на территории тира', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (783, '2025-12-06', 3, 'Проверить наличие брелков и игрушек, написать в закуп', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (784, '2025-12-06', 3, 'Проверить исправность автоматов, настроить / написать в задачи, что нужно починить', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (785, '2025-12-06', 11, 'Включи экстрим Проведи внешний осмотр аттракциона ', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (786, '2025-12-06', 11, 'Нужно проверить опоры (4 шт)', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (787, '2025-12-06', 11, 'Проверить ремни безопасности и крепления на каждом посадочном месте.  (16 шт) ', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (788, '2025-12-06', 11, 'Теперь давай наведём порядок.  Протри все посадочные места', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (789, '2025-12-06', 11, 'Собери весь мусор в кабинке оператора.', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (790, '2025-12-06', 11, 'Помой полы, протри пыль, убери всё лишнее по местам', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (791, '2025-12-06', 11, 'Убери территорию Экстрима от мусора и проверь на наличие гаек, шайб и т. д.', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (792, '2025-12-06', 11, 'Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. ', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (793, '2025-12-06', 12, 'Включи музыку для хорошего настроения всей команды!', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (794, '2025-12-06', 12, 'Протри от пыли все машинки', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (795, '2025-12-06', 12, 'Подмети пол', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (769, '2025-12-06', 2, 'Открой смену на терминале/кассе', '/list/checklist_769_1765014758_0.jpg', true, '2025-12-06 09:05:00.002478+00', '2025-12-06 09:52:38.614015+00', NULL, false, false);
INSERT INTO public.checklists VALUES (771, '2025-12-06', 2, 'Помыть полы', '/list/checklist_771_1765015121_0.jpg', true, '2025-12-06 09:05:00.002478+00', '2025-12-06 09:58:41.276126+00', NULL, false, false);
INSERT INTO public.checklists VALUES (772, '2025-12-06', 2, 'Выкинуть мусор', '/list/checklist_772_1765015134_0.jpg', true, '2025-12-06 09:05:00.002478+00', '2025-12-06 09:58:54.763136+00', NULL, false, false);
INSERT INTO public.checklists VALUES (773, '2025-12-06', 2, 'Собрать мусор на территории парка', '/list/checklist_773_1765021312_0.jpg,/list/checklist_773_1765021312_1.jpg,/list/checklist_773_1765021312_2.jpg', true, '2025-12-06 09:05:00.002478+00', '2025-12-06 11:41:52.906939+00', NULL, false, false);
INSERT INTO public.checklists VALUES (796, '2025-12-06', 12, 'Собери паутину по периметру, в каждом уголочке ', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (797, '2025-12-06', 12, 'Убери территорию автодрома', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (798, '2025-12-06', 12, 'Проверь аттракцион на исправность, если есть какие-то задачи, пиши в чат', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (799, '2025-12-06', 13, 'Включи лодку Проведи внешний осмотр аттракциона ', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (800, '2025-12-06', 13, 'Нужно проверить опоры (4 шт)', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (801, '2025-12-06', 13, 'Проверить ремни безопасности и крепления на каждом посадочном месте.  (30 шт) ', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (802, '2025-12-06', 13, 'Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков.', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (803, '2025-12-06', 13, 'Теперь давай наведём порядок.  Протри все посадочные места', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (804, '2025-12-06', 13, 'Протри пыль на лодке', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (805, '2025-12-06', 13, 'Убери входную группу', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (806, '2025-12-06', 13, 'Убери территорию вокруг аттракциона', NULL, false, '2025-12-06 09:05:00.002478+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (767, '2025-12-06', 2, 'Включи комп, программу Лайм', '/list/checklist_767_1765014703_0.jpg', true, '2025-12-06 09:05:00.002478+00', '2025-12-06 09:51:43.571035+00', NULL, false, false);
INSERT INTO public.checklists VALUES (768, '2025-12-06', 2, 'Открой жалюзи и окно', '/list/checklist_768_1765014739_0.jpg', true, '2025-12-06 09:05:00.002478+00', '2025-12-06 09:52:19.657519+00', NULL, false, false);
INSERT INTO public.checklists VALUES (770, '2025-12-06', 2, 'Убери весь мусор со стола, сложи всё по местам', '/list/checklist_770_1765014901_0.jpg', true, '2025-12-06 09:05:00.002478+00', '2025-12-06 09:55:01.364054+00', NULL, false, false);
INSERT INTO public.checklists VALUES (757, '2025-12-06', 15, '1. Включить все аттракционы, протереть посадочные места, включить музыку на автодроме. ', '/list/checklist_757_1765020761_0.jpg', true, '2025-12-06 09:05:00.002478+00', '2025-12-06 11:32:41.468212+00', NULL, false, false);
INSERT INTO public.checklists VALUES (758, '2025-12-06', 15, '2. Экстрим.
- Проверить опоры и пальцы (4 шт.).
- Проверить ремни безопасности и крепления на каждом посадочном месте (16 шт.). 
- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. 

Прислать минимум 8 фото', '/list/checklist_758_1765020882_0.jpg', true, '2025-12-06 09:05:00.002478+00', '2025-12-06 11:34:42.674282+00', NULL, false, true);
INSERT INTO public.checklists VALUES (818, '2025-12-07', 10, 'Проверь колёса, надо накачать до 5', NULL, false, '2025-12-07 09:05:00.000869+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (858, '2025-12-07', 3, 'Собрать мусор на территории тира', NULL, false, '2025-12-07 09:05:00.000869+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (859, '2025-12-07', 3, 'Проверить наличие брелков и игрушек, написать в закуп', NULL, false, '2025-12-07 09:05:00.000869+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (816, '2025-12-07', 10, 'Открой кабинку инструктора и включи КО', '/list/checklist_816_1765115512_0.jpg', true, '2025-12-07 09:05:00.000869+00', '2025-12-07 13:51:52.842704+00', NULL, true, false);
INSERT INTO public.checklists VALUES (817, '2025-12-07', 10, 'Осталось помыть входную зону', '/list/checklist_817_1765115540_0.jpg', true, '2025-12-07 09:05:00.000869+00', '2025-12-07 13:52:20.989138+00', NULL, true, false);
INSERT INTO public.checklists VALUES (844, '2025-12-07', 2, 'Открой жалюзи и окно', '/list/checklist_844_1765101301_0.jpg', true, '2025-12-07 09:05:00.000869+00', '2025-12-07 09:55:01.289764+00', NULL, true, false);
INSERT INTO public.checklists VALUES (846, '2025-12-07', 2, 'Убери весь мусор со стола, сложи всё по местам', '/list/checklist_846_1765101347_0.jpg', true, '2025-12-07 09:05:00.000869+00', '2025-12-07 09:55:47.106074+00', NULL, true, false);
INSERT INTO public.checklists VALUES (835, '2025-12-07', 15, '3. Автодром.
Проверь аттракцион на исправность. Токоприемник, подушка (бампер), внешний осмотр каждой машинки. 
', '/list/checklist_835_1765104548_0.jpg,/list/checklist_835_1765104548_1.jpg', true, '2025-12-07 09:05:00.000869+00', '2025-12-07 10:49:08.062904+00', NULL, true, false);
INSERT INTO public.checklists VALUES (848, '2025-12-07', 2, 'Выкинуть мусор', '/list/checklist_848_1765104768_0.jpg,/list/checklist_848_1765104768_1.jpg', true, '2025-12-07 09:05:00.000869+00', '2025-12-07 10:52:48.134494+00', NULL, true, false);
INSERT INTO public.checklists VALUES (847, '2025-12-07', 2, 'Помыть полы', '/list/checklist_847_1765104784_0.jpg', true, '2025-12-07 09:05:00.000869+00', '2025-12-07 10:53:04.425289+00', NULL, true, false);
INSERT INTO public.checklists VALUES (849, '2025-12-07', 2, 'Собрать мусор на территории парка', '/list/checklist_849_1765105342_0.jpg', true, '2025-12-07 09:05:00.000869+00', '2025-12-07 11:02:22.802085+00', NULL, true, false);
INSERT INTO public.checklists VALUES (837, '2025-12-07', 15, '5. Проверить давление в колёсах на КО, отправить фото в чат «Техничка».', '/list/checklist_837_1765107807_0.jpg,/list/checklist_837_1765107807_1.jpg,/list/checklist_837_1765107807_2.jpg', true, '2025-12-07 09:05:00.000869+00', '2025-12-07 11:43:27.449545+00', NULL, true, true);
INSERT INTO public.checklists VALUES (838, '2025-12-07', 16, '1. Включить все аттракционы, протереть посадочные места, включить музыку на автодроме.', NULL, false, '2025-12-07 09:05:00.000869+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (839, '2025-12-07', 16, '2. Экстрим. 
- Проверить опоры и пальцы (4 шт.). 
- Проверить ремни безопасности и крепления на каждом посадочном месте (16 шт.). 
- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. Прислать минимум 8 фото', NULL, false, '2025-12-07 09:05:00.000869+00', NULL, NULL, false, true);
INSERT INTO public.checklists VALUES (840, '2025-12-07', 16, '3. Автодром. Проверь аттракцион на исправность. Токоприемник, подушка (бампер), внешний осмотр каждой машинки.', NULL, false, '2025-12-07 09:05:00.000869+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (841, '2025-12-07', 16, '4. Лодка. 
- Нужно проверить опоры (4 шт.). 
- Проверить ремни безопасности и крепления на каждом посадочном месте (30 шт.). 
- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. 
Фото опор (4 шт)', NULL, false, '2025-12-07 09:05:00.000869+00', NULL, NULL, false, true);
INSERT INTO public.checklists VALUES (842, '2025-12-07', 16, '5. Проверить давление в колёсах на КО, отправить фото в чат «Техничка».', NULL, false, '2025-12-07 09:05:00.000869+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (850, '2025-12-07', 3, 'Открой ставни', NULL, false, '2025-12-07 09:05:00.000869+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (851, '2025-12-07', 3, 'Протри автоматы, подключи к блоку и поставь на подставку  (3 шт)', NULL, false, '2025-12-07 09:05:00.000869+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (852, '2025-12-07', 3, 'Включи комп, зайди в тир контроль', NULL, false, '2025-12-07 09:05:00.000869+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (853, '2025-12-07', 3, 'Протри мишени и подними их.', NULL, false, '2025-12-07 09:05:00.000869+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (854, '2025-12-07', 3, 'Убери рабочее место (стол/под столом)', NULL, false, '2025-12-07 09:05:00.000869+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (855, '2025-12-07', 3, 'Убери всю паутину  (стены/потолок)', NULL, false, '2025-12-07 09:05:00.000869+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (856, '2025-12-07', 3, 'Развесить призы ', NULL, false, '2025-12-07 09:05:00.000869+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (857, '2025-12-07', 3, 'Подмети полы, собери пульки', NULL, false, '2025-12-07 09:05:00.000869+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (860, '2025-12-07', 3, 'Проверить исправность автоматов, настроить / написать в задачи, что нужно починить', NULL, false, '2025-12-07 09:05:00.000869+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1120, '2025-12-10', 10, 'Проверь колёса, надо накачать до 5', NULL, false, '2025-12-10 09:05:00.001429+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1125, '2025-12-10', 15, '5. Проверить давление в колёсах на КО, отправить фото в чат «Техничка».', NULL, false, '2025-12-10 09:05:00.001429+00', NULL, NULL, false, true);
INSERT INTO public.checklists VALUES (843, '2025-12-07', 2, 'Включи комп, программу Лайм', '/list/checklist_843_1765101278_0.jpg', true, '2025-12-07 09:05:00.000869+00', '2025-12-07 09:54:38.414832+00', NULL, true, false);
INSERT INTO public.checklists VALUES (845, '2025-12-07', 2, 'Открой смену на терминале/кассе', '/list/checklist_845_1765101291_0.jpg,/list/checklist_845_1765101291_1.jpg', true, '2025-12-07 09:05:00.000869+00', '2025-12-07 09:54:51.582349+00', NULL, true, false);
INSERT INTO public.checklists VALUES (833, '2025-12-07', 15, '1. Включить все аттракционы, протереть посадочные места, включить музыку на автодроме. ', '/list/checklist_833_1765104407_0.jpg,/list/checklist_833_1765104407_1.jpg,/list/checklist_833_1765104407_2.jpg', true, '2025-12-07 09:05:00.000869+00', '2025-12-07 10:46:47.754928+00', NULL, true, false);
INSERT INTO public.checklists VALUES (834, '2025-12-07', 15, '2. Экстрим.
- Проверить опоры и пальцы (4 шт.).
- Проверить ремни безопасности и крепления на каждом посадочном месте (16 шт.). 
- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. 

Прислать минимум 8 фото', '/list/checklist_834_1765104500_0.jpg,/list/checklist_834_1765104500_1.jpg', true, '2025-12-07 09:05:00.000869+00', '2025-12-07 10:48:20.925463+00', NULL, true, true);
INSERT INTO public.checklists VALUES (814, '2025-12-07', 10, 'Помой стекла в кабинках, чтобы наши посетители могли любоваться видом ', '/list/checklist_814_1765115489_0.jpg', true, '2025-12-07 09:05:00.000869+00', '2025-12-07 13:51:29.379554+00', NULL, true, false);
INSERT INTO public.checklists VALUES (1131, '2025-12-10', 2, 'Включи комп, программу Лайм', '/list/checklist_add_1131_1765360044_0.jpg', false, '2025-12-10 09:05:00.001429+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1133, '2025-12-10', 2, 'Открой смену на терминале/кассе', '/list/checklist_add_1133_1765360102_0.jpg', false, '2025-12-10 09:05:00.001429+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1134, '2025-12-10', 2, 'Убери весь мусор со стола, сложи всё по местам', '/list/checklist_add_1134_1765360140_0.jpg', false, '2025-12-10 09:05:00.001429+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1135, '2025-12-10', 2, 'Помыть полы', '/list/checklist_add_1135_1765360205_0.jpg', false, '2025-12-10 09:05:00.001429+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1136, '2025-12-10', 2, 'Выкинуть мусор', '/list/checklist_add_1136_1765360214_0.jpg', false, '2025-12-10 09:05:00.001429+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1137, '2025-12-10', 2, 'Собрать мусор на территории парка', '/list/checklist_add_1137_1765360412_0.jpg,/list/checklist_add_1137_1765360412_1.jpg,/list/checklist_add_1137_1765360412_2.jpg', false, '2025-12-10 09:05:00.001429+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1132, '2025-12-10', 2, 'Открой жалюзи и окно', '/list/checklist_add_1132_1765360381_0.jpg', false, '2025-12-10 09:05:00.001429+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1118, '2025-12-10', 10, 'Открой кабинку инструктора и включи КО', '/list/checklist_add_1118_1765360371_0.jpg,/list/checklist_add_1118_1765360392_0.jpg', false, '2025-12-10 09:05:00.001429+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1116, '2025-12-10', 10, 'Помой стекла в кабинках, чтобы наши посетители могли любоваться видом ', '/list/checklist_add_1116_1765360433_0.jpg', false, '2025-12-10 09:05:00.001429+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1117, '2025-12-10', 10, 'Не забудь помыть полы  в каждой кабинке', '/list/checklist_add_1117_1765360443_0.jpg', false, '2025-12-10 09:05:00.001429+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1126, '2025-12-10', 16, '1. Включить все аттракционы, протереть посадочные места, включить музыку на автодроме.', '/list/checklist_add_1126_1765360454_0.jpg,/list/checklist_add_1126_1765360454_1.jpg,/list/checklist_add_1126_1765360454_2.jpg', false, '2025-12-10 09:05:00.001429+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1123, '2025-12-10', 15, '3. Автодром.
Проверь аттракцион на исправность. Токоприемник, подушка (бампер), внешний осмотр каждой машинки. 
', '/list/checklist_add_1123_1765360662_0.jpg,/list/checklist_add_1123_1765360662_1.jpg', false, '2025-12-10 09:05:00.001429+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1128, '2025-12-10', 16, '3. Автодром. Проверь аттракцион на исправность. Токоприемник, подушка (бампер), внешний осмотр каждой машинки.', '/list/checklist_add_1128_1765360768_0.jpg,/list/checklist_add_1128_1765360768_1.jpg', false, '2025-12-10 09:05:00.001429+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1119, '2025-12-10', 10, 'Осталось помыть входную зону', '/list/checklist_add_1119_1765361099_0.jpg', false, '2025-12-10 09:05:00.001429+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1127, '2025-12-10', 16, '2. Экстрим. 
- Проверить опоры и пальцы (4 шт.). 
- Проверить ремни безопасности и крепления на каждом посадочном месте (16 шт.). 
- Откатай аттракцион тестовый раз, проверь на наличие посторонних звуков. Прислать минимум 8 фото', '/list/checklist_add_1127_1765361042_0.jpg,/list/checklist_add_1127_1765361042_1.jpg,/list/checklist_add_1127_1765361042_2.jpg,/list/checklist_add_1127_1765361058_0.jpg,/list/checklist_add_1127_1765361086_0.jpg,/list/checklist_add_1127_1765361086_1.jpg,/list/checklist_add_1127_1765361086_2.jpg,/list/checklist_add_1127_1765361107_0.jpg', false, '2025-12-10 09:05:00.001429+00', NULL, NULL, false, true);
INSERT INTO public.checklists VALUES (1130, '2025-12-10', 16, '5. Проверить давление в колёсах на КО, отправить фото в чат «Техничка».', '/list/checklist_add_1130_1765365062_0.jpg,/list/checklist_add_1130_1765365137_0.jpg,/list/checklist_add_1130_1765365253_0.jpg', false, '2025-12-10 09:05:00.001429+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1142, '2025-12-11', 10, 'Проверь колёса, надо накачать до 5', NULL, false, '2025-12-11 09:05:00.000839+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1143, '2025-12-11', 15, '1. Включить все аттракционы, протереть посадочные места, включить музыку на автодроме. ', NULL, false, '2025-12-11 09:05:00.000839+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1139, '2025-12-11', 10, 'Не забудь помыть полы  в каждой кабинке', '/list/checklist_add_1139_1765448270_0.jpg', false, '2025-12-11 09:05:00.000839+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1138, '2025-12-11', 10, 'Помой стекла в кабинках, чтобы наши посетители могли любоваться видом ', '/list/checklist_add_1138_1765451208_0.jpg', false, '2025-12-11 09:05:00.000839+00', NULL, NULL, false, false);
INSERT INTO public.checklists VALUES (1141, '2025-12-11', 10, 'Осталось помыть входную зону', '/list/checklist_add_1141_1765451235_0.jpg', false, '2025-12-11 09:05:00.000839+00', NULL, NULL, false, false);


--
-- Data for Name: fine_templates; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.fine_templates VALUES (1, 'Опоздание на 1 час', 500.00);
INSERT INTO public.fine_templates VALUES (2, 'Без униформы', 300.00);
INSERT INTO public.fine_templates VALUES (6, 'Опоздание на 15 минут', 218.00);
INSERT INTO public.fine_templates VALUES (7, 'Опоздание более чем на час', 1200.00);
INSERT INTO public.fine_templates VALUES (8, 'Беспорядок на рабочем месте', 500.00);
INSERT INTO public.fine_templates VALUES (9, 'Не отсканированные чеки за прошлый день. (1 чек)', 100.00);


--
-- Data for Name: fines; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.fines VALUES (8, 'тест', 345.00, 128, '2025-12-08 18:49:50.975297+00');
INSERT INTO public.fines VALUES (9, 'Оставил вкл пушку в тире', 500.00, 138, '2025-12-08 18:50:49.519497+00');


--
-- Data for Name: schedules; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.schedules VALUES (100, 127, 6, '2025-11-12', '09:00:00', '18:00:00', '15:38:00', '15:43:00', 232.00, NULL, NULL);
INSERT INTO public.schedules VALUES (225, 132, 16, '2025-12-16', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (226, 132, 16, '2025-12-17', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (227, 137, 16, '2025-12-18', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (228, 139, 15, '2025-12-20', '10:00:00', '21:00:00', NULL, NULL, 236.00, NULL, NULL);
INSERT INTO public.schedules VALUES (152, 134, 2, '2025-12-05', '10:00:00', '21:00:00', '15:39:00', '15:45:00', 218.00, '/smena/smena_start_152_1764949227_0.jpg', NULL);
INSERT INTO public.schedules VALUES (166, 132, 16, '2025-12-10', '10:00:00', '21:00:00', '09:45:00', '21:00:00', 218.00, '/smena/smena_start_166_1765359962_0.jpg', NULL);
INSERT INTO public.schedules VALUES (140, 136, 2, '2025-12-10', '10:00:00', '21:00:00', '09:46:00', '21:00:00', 218.00, '/smena/smena_start_140_1765360025_0.jpg', NULL);
INSERT INTO public.schedules VALUES (229, 139, 15, '2025-12-21', '10:00:00', '21:00:00', NULL, NULL, 236.00, NULL, NULL);
INSERT INTO public.schedules VALUES (170, 133, 10, '2025-12-10', '10:00:00', '21:00:00', '09:47:00', '21:00:00', 218.00, '/smena/smena_start_170_1765360031_0.jpg', NULL);
INSERT INTO public.schedules VALUES (147, 139, 15, '2025-12-10', '10:00:00', '21:00:00', '09:51:00', '21:00:00', 236.00, '/smena/smena_start_147_1765360264_0.jpg', NULL);
INSERT INTO public.schedules VALUES (232, 137, 16, '2025-12-11', '10:00:00', '21:00:00', '09:42:00', NULL, 218.00, '/smena/smena_start_232_1765446131_0.jpg', NULL);
INSERT INTO public.schedules VALUES (148, 139, 15, '2025-12-11', '10:00:00', '21:00:00', '09:50:00', NULL, 236.00, '/smena/smena_start_148_1765446594_0.jpg', NULL);
INSERT INTO public.schedules VALUES (183, 136, 2, '2025-12-11', '10:00:00', '21:00:00', '09:52:00', NULL, 218.00, '/smena/smena_start_183_1765446750_0.jpg', NULL);
INSERT INTO public.schedules VALUES (137, 134, 2, '2025-12-15', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (145, 139, 15, '2025-12-13', '10:00:00', '22:00:00', NULL, NULL, 236.00, NULL, NULL);
INSERT INTO public.schedules VALUES (146, 139, 15, '2025-12-14', '10:00:00', '22:00:00', NULL, NULL, 236.00, NULL, NULL);
INSERT INTO public.schedules VALUES (149, 139, 15, '2025-12-12', '10:00:00', '21:00:00', NULL, NULL, 236.00, NULL, NULL);
INSERT INTO public.schedules VALUES (151, 128, 2, '2025-12-05', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (177, 140, 10, '2025-12-07', '10:00:00', '21:00:00', '10:00:00', '21:00:00', 218.00, '/smena/smena_start_177_1765112194_0.jpg', NULL);
INSERT INTO public.schedules VALUES (150, 138, 3, '2025-12-07', '10:00:00', '22:00:00', '10:00:00', '21:00:00', 218.00, '/smena/smena_start_150_1765101121_0.jpg', NULL);
INSERT INTO public.schedules VALUES (173, 135, 10, '2025-12-12', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (174, 135, 10, '2025-12-13', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (175, 135, 10, '2025-12-14', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (138, 136, 2, '2025-12-06', '10:00:00', '22:00:00', '09:49:00', '22:03:00', 218.00, '/smena/smena_start_138_1765014597_0.jpg', '/smena/smena_end_138_1765058674_0.jpg');
INSERT INTO public.schedules VALUES (143, 139, 15, '2025-12-06', '10:00:00', '22:00:00', '09:46:00', '22:00:00', 236.00, '/smena/smena_start_143_1765014404_0.jpg', NULL);
INSERT INTO public.schedules VALUES (132, 134, 10, '2025-12-06', '10:00:00', '22:00:00', '09:47:00', '22:00:00', 218.00, '/smena/smena_start_132_1765014513_0.jpg', NULL);
INSERT INTO public.schedules VALUES (179, 134, 2, '2025-12-13', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (133, 134, 2, '2025-12-07', '10:00:00', '21:00:00', '09:53:00', '21:00:00', 218.00, '/smena/smena_start_133_1765101262_0.jpg', NULL);
INSERT INTO public.schedules VALUES (134, 134, 2, '2025-12-08', '10:00:00', '21:00:00', '10:05:00', '21:00:00', 218.00, '/smena/smena_start_134_1765188363_0.jpg', NULL);
INSERT INTO public.schedules VALUES (144, 139, 15, '2025-12-07', '10:00:00', '22:00:00', '09:51:00', '22:00:00', 236.00, '/smena/smena_start_144_1765101103_0.jpg', NULL);
INSERT INTO public.schedules VALUES (182, 134, 2, '2025-12-14', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (189, 136, 2, '2025-12-12', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (164, 132, 16, '2025-12-08', '10:00:00', '21:00:00', '10:07:00', '21:00:00', 218.00, '/smena/smena_start_164_1765188465_0.jpg', NULL);
INSERT INTO public.schedules VALUES (168, 133, 10, '2025-12-08', '10:00:00', '21:00:00', '09:52:00', '21:00:00', 218.00, '/smena/smena_start_168_1765187603_0.jpg', NULL);
INSERT INTO public.schedules VALUES (169, 133, 10, '2025-12-09', '10:00:00', '21:00:00', '09:47:00', '21:00:00', 218.00, '/smena/smena_start_169_1765273720_0.jpg', NULL);
INSERT INTO public.schedules VALUES (165, 132, 16, '2025-12-09', '10:00:00', '21:00:00', '09:34:00', '21:00:00', 218.00, '/smena/smena_start_165_1765272929_0.jpg', NULL);
INSERT INTO public.schedules VALUES (192, 134, 2, '2025-12-09', '10:00:00', '21:00:00', '09:53:00', '21:00:00', 218.00, '/smena/smena_start_192_1765274077_0.jpg', NULL);
INSERT INTO public.schedules VALUES (230, 143, 4, '2025-12-10', '10:00:00', '23:00:00', '21:32:00', '21:32:00', 170.00, '/smena/smena_start_230_1765402287_0.jpg,/smena/smena_start_230_1765402287_1.jpg', '/smena/smena_end_230_1765402301_0.jpg,/smena/smena_end_230_1765402301_1.jpg');
INSERT INTO public.schedules VALUES (194, 136, 2, '2025-12-16', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (195, 136, 2, '2025-12-17', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (196, 134, 2, '2025-12-18', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (197, 134, 2, '2025-12-19', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (198, 136, 2, '2025-12-20', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (199, 136, 2, '2025-12-21', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (200, 133, 10, '2025-12-15', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (202, 133, 10, '2025-12-16', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (231, 135, 10, '2025-12-11', '10:00:00', '21:00:00', '09:41:00', NULL, 218.00, '/smena/smena_start_231_1765446091_0.jpg', NULL);
INSERT INTO public.schedules VALUES (233, 137, 3, '2025-12-13', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (205, 133, 10, '2025-12-17', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (206, 133, 10, '2025-12-18', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (207, 135, 10, '2025-12-19', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (208, 135, 10, '2025-12-20', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (209, 135, 10, '2025-12-21', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (234, 137, 3, '2025-12-14', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (214, 137, 3, '2025-12-20', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (215, 137, 3, '2025-12-21', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);
INSERT INTO public.schedules VALUES (218, 139, 15, '2025-12-17', '10:00:00', '21:00:00', NULL, NULL, 236.00, NULL, NULL);
INSERT INTO public.schedules VALUES (219, 139, 15, '2025-12-18', '10:00:00', '21:00:00', NULL, NULL, 236.00, NULL, NULL);
INSERT INTO public.schedules VALUES (220, 139, 15, '2025-12-19', '10:00:00', '21:00:00', NULL, NULL, 236.00, NULL, NULL);
INSERT INTO public.schedules VALUES (224, 132, 16, '2025-12-15', '10:00:00', '21:00:00', NULL, NULL, 218.00, NULL, NULL);


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users VALUES (137, 1258028598, 'Kropeg21', 'Kropeg', '', '', true, '2025-12-05 10:42:20.453257+00', false, 1258028598);
INSERT INTO public.users VALUES (127, 733190744, '', 'D.A.Machin', '', '', true, '2025-11-12 14:19:46.230532+00', false, 733190744);
INSERT INTO public.users VALUES (128, 1028613614, 'Foxi_olesia', 'Олеся', ' ', '', true, '2025-11-12 14:19:46.233417+00', true, 1028613614);
INSERT INTO public.users VALUES (136, 1071993366, 'kkk_kkk17S', 'Кристина', '', '', true, '2025-12-05 10:42:08.3996+00', false, 1071993366);
INSERT INTO public.users VALUES (132, 755428345, 'lahma20', 'Артём 🇦🇲', '', '89962021600', true, '2025-12-05 10:41:42.792048+00', false, 755428345);
INSERT INTO public.users VALUES (133, 1120968282, 'homesetter', 'Гелька', '', '89063144867', true, '2025-12-05 10:41:59.286015+00', false, 1120968282);
INSERT INTO public.users VALUES (135, 973286214, 'RabDshaeva', 'Панина', '', '89085427661', true, '2025-12-05 10:42:00.284253+00', false, 973286214);
INSERT INTO public.users VALUES (139, 2049221763, 'ImXxX777', 'Александр', '666', '', true, '2025-12-05 10:50:20.960435+00', false, 2049221763);
INSERT INTO public.users VALUES (134, 914564834, 'Valeri_lvl', 'Валерия', '', '89085526376', true, '2025-12-05 10:41:59.353796+00', false, 914564834);
INSERT INTO public.users VALUES (141, 883672701, 'Glosgix', '𝖁𝖎𝖙𝖐𝖆 𝖕𝖗𝖔', '', '', true, '2025-12-05 17:48:08.422228+00', false, 883672701);
INSERT INTO public.users VALUES (140, 830171642, '', 'Hartim', '', '+79371477761', true, '2025-12-05 12:12:37.221255+00', false, 830171642);
INSERT INTO public.users VALUES (130, 1162086240, 'thenotorius_077777', 'Maverick', '', '', true, '2025-11-24 12:24:25.295313+00', false, 1162086240);
INSERT INTO public.users VALUES (138, 1298124079, 'namnikne', 'snufflox', '', '89873543880', true, '2025-12-05 10:44:23.578267+00', false, 1298124079);
INSERT INTO public.users VALUES (143, 1112662763, 'Egor12sar', 'Egor', '', '', true, '2025-12-10 21:30:22.24377+00', false, 1112662763);


--
-- Data for Name: zones; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.zones VALUES (1, 'Кафе', '', '10:00 - 23:00', '/zones/1_1763509592.png', 185.00);
INSERT INTO public.zones VALUES (6, 'Зорбы, ДЖЕТ', '', '10:00 - 22:00', '', 170.00);
INSERT INTO public.zones VALUES (10, 'Колесо обозрения', '', '10:00 - 21:00', '/zones/10_1763988259.jpg', 218.00);
INSERT INTO public.zones VALUES (14, 'Старший смены', '', '10:00 - 21:00', '/zones/14_1764600553.jpg', 236.00);
INSERT INTO public.zones VALUES (15, 'Старший смены (Зима)', '', '10:00 - 21:00', '', 236.00);
INSERT INTO public.zones VALUES (16, 'Оператор (Зима)', '', '10:00 - 21:00', '', 218.00);
INSERT INTO public.zones VALUES (2, 'Касса', 'Описание Касса', '10:00 - 21:00', '', 218.00);
INSERT INTO public.zones VALUES (3, 'Тир', '', '10:00 - 21:00', '', 218.00);
INSERT INTO public.zones VALUES (4, 'Лабиринт', '', '10:00 - 23:00', '', 170.00);
INSERT INTO public.zones VALUES (5, 'Прокат', '', '10:00 - 22:00', '', 170.00);
INSERT INTO public.zones VALUES (11, 'Экстрим', '', '10:00 - 21:00', '', 218.00);
INSERT INTO public.zones VALUES (12, 'Автодром', '', '10:00 - 21:00', '', 218.00);
INSERT INTO public.zones VALUES (13, 'Лодка', '', '10:00 - 21:00', '', 218.00);


--
-- Name: auto_cheklst_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auto_cheklst_id_seq', 103, true);


--
-- Name: bonus_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bonus_templates_id_seq', 3, true);


--
-- Name: bonuses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bonuses_id_seq', 3, true);


--
-- Name: checklists_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.checklists_id_seq', 1154, true);


--
-- Name: fine_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fine_templates_id_seq', 9, true);


--
-- Name: fines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fines_id_seq', 9, true);


--
-- Name: schedules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.schedules_id_seq', 234, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 143, true);


--
-- Name: zones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.zones_id_seq', 16, true);


--
-- Name: auto_cheklst auto_cheklst_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_cheklst
    ADD CONSTRAINT auto_cheklst_pkey PRIMARY KEY (id);


--
-- Name: bonus_templates bonus_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bonus_templates
    ADD CONSTRAINT bonus_templates_pkey PRIMARY KEY (id);


--
-- Name: bonuses bonuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bonuses
    ADD CONSTRAINT bonuses_pkey PRIMARY KEY (id);


--
-- Name: checklists checklists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT checklists_pkey PRIMARY KEY (id);


--
-- Name: fine_templates fine_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fine_templates
    ADD CONSTRAINT fine_templates_pkey PRIMARY KEY (id);


--
-- Name: fines fines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fines
    ADD CONSTRAINT fines_pkey PRIMARY KEY (id);


--
-- Name: schedules schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT schedules_pkey PRIMARY KEY (id);


--
-- Name: users unique_telegram_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT unique_telegram_id UNIQUE (telegram_id);


--
-- Name: schedules unique_worker_zone_date; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT unique_worker_zone_date UNIQUE (worker_id, zone_id, date);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: zones zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_pkey PRIMARY KEY (id);


--
-- Name: idx_bonuses_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bonuses_user_id ON public.bonuses USING btree (user_id);


--
-- Name: idx_checklists_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checklists_admin_id ON public.checklists USING btree (admin_id);


--
-- Name: idx_checklists_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checklists_date ON public.checklists USING btree (date);


--
-- Name: idx_checklists_issue_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checklists_issue_time ON public.checklists USING btree (issue_time);


--
-- Name: idx_checklists_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checklists_status ON public.checklists USING btree (status);


--
-- Name: idx_checklists_zone_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_checklists_zone_id ON public.checklists USING btree (zone_id);


--
-- Name: idx_fines_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fines_user_id ON public.fines USING btree (user_id);


--
-- Name: idx_users_confirmed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_confirmed ON public.users USING btree (confirmed);


--
-- Name: idx_users_telegram_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_telegram_id ON public.users USING btree (telegram_id);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: schedules tr_set_schedule_hourly_rate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_set_schedule_hourly_rate BEFORE INSERT OR UPDATE ON public.schedules FOR EACH ROW EXECUTE FUNCTION public.set_schedule_hourly_rate();


--
-- Name: checklists checklists_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT checklists_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: auto_cheklst checklists_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auto_cheklst
    ADD CONSTRAINT checklists_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE CASCADE;


--
-- Name: checklists checklists_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklists
    ADD CONSTRAINT checklists_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE CASCADE;


--
-- Name: bonuses fk_bonuses_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bonuses
    ADD CONSTRAINT fk_bonuses_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: fines fk_fines_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fines
    ADD CONSTRAINT fk_fines_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: schedules fk_schedules_worker; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT fk_schedules_worker FOREIGN KEY (worker_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: schedules fk_schedules_zone; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedules
    ADD CONSTRAINT fk_schedules_zone FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict iERrjQRGrnyDWp0ZHn4JpANTLRlypgKsexnBOAQBo9WA2cqL4shOBUtRhdgcbZC

