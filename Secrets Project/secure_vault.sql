--
-- PostgreSQL database dump
--

-- Dumped from database version 15.4
-- Dumped by pg_dump version 15.4

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
-- Name: media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media (
    id integer NOT NULL,
    user_id integer,
    file_name character varying(255),
    file_type character varying(20),
    file_url text,
    public_id text,
    file_size bigint,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: media_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.media_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: media_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.media_id_seq OWNED BY public.media.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
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
-- Name: media id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media ALTER COLUMN id SET DEFAULT nextval('public.media_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: media; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.media (id, user_id, file_name, file_type, file_url, public_id, file_size, uploaded_at) FROM stdin;
1	3	family2.jpg	image	https://res.cloudinary.com/u2i3se49/image/upload/v1785670302/secure-vault/qwpgrrmotq3wfqbhwxtg.jpg	secure-vault/qwpgrrmotq3wfqbhwxtg	119675	2026-08-02 17:01:42.482224
3	3	leo.webp	image	https://res.cloudinary.com/u2i3se49/image/upload/v1785670850/secure-vault/wbgnh0vioi7y8aknojwk.webp	secure-vault/wbgnh0vioi7y8aknojwk	42174	2026-08-02 17:10:51.470109
12	3	RESUME (1).pdf	document	https://res.cloudinary.com/u2i3se49/image/upload/v1785740775/secure-vault/llmxjxu3q9ckmmbrfhkj.pdf	secure-vault/llmxjxu3q9ckmmbrfhkj	151788	2026-08-03 12:36:16.05674
13	3	5mb-example-video-file.mp4	video	https://res.cloudinary.com/u2i3se49/video/upload/v1785741213/secure-vault/vyo0v66dqbqlf3mwtblj.mp4	secure-vault/vyo0v66dqbqlf3mwtblj	5717104	2026-08-03 12:43:34.412619
14	3	5mb-example-video-file.mp4	video	https://res.cloudinary.com/u2i3se49/video/upload/v1785741218/secure-vault/d49g3q3acaicjzvojzcq.mp4	secure-vault/d49g3q3acaicjzvojzcq	5717104	2026-08-03 12:43:39.36109
15	3	5mb-examplefile-com.txt	text	https://res.cloudinary.com/u2i3se49/raw/upload/v1785741366/secure-vault/ftgr39g17d4k3eswhkpy.txt	secure-vault/ftgr39g17d4k3eswhkpy.txt	5242887	2026-08-03 12:46:06.721877
16	2	MY IMAGE.png	image	https://res.cloudinary.com/u2i3se49/image/upload/v1785741427/secure-vault/u8f2qiu1sasssdnjhe34.png	secure-vault/u8f2qiu1sasssdnjhe34	1810965	2026-08-03 12:47:08.967041
17	3	MY IMAGE.png	image	https://res.cloudinary.com/u2i3se49/image/upload/v1785757099/secure-vault/n51ssjvg7nc5kga2708k.png	secure-vault/n51ssjvg7nc5kga2708k	1810965	2026-08-03 17:08:20.513506
18	3	video for proj3 deal.mp4	video	https://res.cloudinary.com/u2i3se49/video/upload/v1786888270/secure-vault/yxmqy1snk6mylms3eqav.mp4	secure-vault/yxmqy1snk6mylms3eqav	12180366	2026-08-16 19:21:13.058006
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password, created_at) FROM stdin;
1	one@gmail.com	$2b$10$f8grLBYTupclhuGsHL6SuOJ.zQJ/ay75L.hWA3W7c4xZxhIm0o0TG	2026-07-26 21:21:33.797616
2	divyakumar090606@gmail.com	google	2026-07-26 21:53:23.15018
3	ak@gmail.com	$2b$10$bUN6QuEwPXGRgLnJcZebRe9zpcCxJkOojFyg4980HvcWwFuPSTU6a	2026-07-26 22:19:19.344316
\.


--
-- Name: media_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.media_id_seq', 18, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- Name: media media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: media media_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

