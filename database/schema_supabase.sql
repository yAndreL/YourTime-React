
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;


CREATE TABLE IF NOT EXISTS public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar(200) NOT NULL,
  cnpj varchar(18) UNIQUE,
  endereco text,
  telefone varchar(20),
  email varchar(255),
  logo_url text,
  configuracoes jsonb NOT NULL DEFAULT '{}'::jsonb,
  superior_empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email varchar(255) NOT NULL,
  nome varchar(255),
  telefone varchar(20),
  cargo varchar(155),
  departamento varchar(155),
  data_admissao date,
  carga_horaria integer NOT NULL DEFAULT 40,
  role varchar(45) NOT NULL DEFAULT 'user',
  is_active boolean NOT NULL DEFAULT true,
  superior_empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_email_key UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS public.user_empresas (
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, empresa_id)
);

CREATE TABLE IF NOT EXISTS public.projetos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar(255) NOT NULL,
  descricao text,
  empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  responsavel_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  data_inicio date,
  data_fim date,
  orcamento numeric(14, 2),
  status varchar(20) NOT NULL DEFAULT 'ativo',
  cor_identificacao varchar(20),
  horas_estimadas integer,
  prioridade varchar(20) NOT NULL DEFAULT 'media',
  superior_empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agendamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  data date NOT NULL,
  entrada1 time without time zone,
  saida1 time without time zone,
  entrada2 time without time zone,
  saida2 time without time zone,
  observacao text,
  pausa_almoco integer NOT NULL DEFAULT 0,
  pausas_extras integer NOT NULL DEFAULT 0,
  status char(1) NOT NULL DEFAULT 'P',
  projeto_id uuid REFERENCES public.projetos (id) ON DELETE SET NULL,
  empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  superior_empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.configuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles (id) ON DELETE CASCADE,
  superior_empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  email_relatorios boolean NOT NULL DEFAULT true,
  lembrete_registro boolean NOT NULL DEFAULT true,
  hora_entrada_padrao time without time zone NOT NULL DEFAULT time '09:00:00',
  hora_saida_padrao time without time zone NOT NULL DEFAULT time '18:00:00',
  horas_semanais integer NOT NULL DEFAULT 40,
  fuso_horario varchar(100) NOT NULL DEFAULT 'America/Sao_Paulo',
  formato_exportacao varchar(10) NOT NULL DEFAULT 'PDF',
  incluir_graficos_pdf boolean NOT NULL DEFAULT true,
  language varchar(10) NOT NULL DEFAULT 'pt-BR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  titulo varchar(255) NOT NULL,
  mensagem text,
  tipo varchar(50) NOT NULL,
  lida boolean NOT NULL DEFAULT false,
  lida_em timestamptz,
  agendamento_id uuid REFERENCES public.agendamento (id) ON DELETE SET NULL,
  superior_empresa_id uuid REFERENCES public.empresas (id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agendamento_user_id_data ON public.agendamento (user_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_agendamento_superior_status ON public.agendamento (superior_empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_notificacoes_user_lida ON public.notificacoes (user_id, lida, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_superior ON public.profiles (superior_empresa_id);
CREATE INDEX IF NOT EXISTS idx_projetos_superior ON public.projetos (superior_empresa_id);


CREATE OR REPLACE FUNCTION public.handle_new_user ()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role, is_active)
    VALUES (NEW.id, COALESCE(NEW.email, ''), COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(COALESCE(NEW.email, 'user@local'), '@', 1), 'Usuário'), 'user', TRUE)
  ON CONFLICT (id)
    DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user ();


CREATE OR REPLACE FUNCTION public.reset_user_password (user_email text, new_password text)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, auth, extensions
  AS $$
DECLARE
  user_uuid uuid;
BEGIN
  IF new_password IS NULL OR length(trim(new_password)) < 6 THEN
    RETURN json_build_object('success', FALSE, 'message', 'Senha inválida');
  END IF;
  SELECT
    id INTO user_uuid
  FROM
    auth.users
  WHERE
    lower(trim(email)) = lower(trim(user_email));
  IF user_uuid IS NULL THEN
    RETURN json_build_object('success', FALSE, 'message', 'Usuário não encontrado');
  END IF;
  UPDATE
    auth.users
  SET
    encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE
    id = user_uuid;
  RETURN json_build_object('success', TRUE);
END;
$$;

REVOKE ALL ON FUNCTION public.reset_user_password (text, text)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.reset_user_password (text, text) TO anon;

GRANT EXECUTE ON FUNCTION public.reset_user_password (text, text) TO authenticated;


ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_empresas ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.agendamento ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_policies
    WHERE
      schemaname = 'public'
      AND tablename = 'empresas'
      AND policyname = 'yt_authenticated_empresas_all') THEN
    CREATE POLICY yt_authenticated_empresas_all ON public.empresas
      FOR ALL TO authenticated
      USING (TRUE)
      WITH CHECK (TRUE);
  END IF;
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_policies
    WHERE
      schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'yt_authenticated_profiles_all') THEN
    CREATE POLICY yt_authenticated_profiles_all ON public.profiles
      FOR ALL TO authenticated
      USING (TRUE)
      WITH CHECK (TRUE);
  END IF;
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_policies
    WHERE
      schemaname = 'public'
      AND tablename = 'user_empresas'
      AND policyname = 'yt_authenticated_user_empresas_all') THEN
    CREATE POLICY yt_authenticated_user_empresas_all ON public.user_empresas
      FOR ALL TO authenticated
      USING (TRUE)
      WITH CHECK (TRUE);
  END IF;
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_policies
    WHERE
      schemaname = 'public'
      AND tablename = 'projetos'
      AND policyname = 'yt_authenticated_projetos_all') THEN
    CREATE POLICY yt_authenticated_projetos_all ON public.projetos
      FOR ALL TO authenticated
      USING (TRUE)
      WITH CHECK (TRUE);
  END IF;
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_policies
    WHERE
      schemaname = 'public'
      AND tablename = 'agendamento'
      AND policyname = 'yt_authenticated_agendamento_all') THEN
    CREATE POLICY yt_authenticated_agendamento_all ON public.agendamento
      FOR ALL TO authenticated
      USING (TRUE)
      WITH CHECK (TRUE);
  END IF;
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_policies
    WHERE
      schemaname = 'public'
      AND tablename = 'configuracoes'
      AND policyname = 'yt_authenticated_configuracoes_all') THEN
    CREATE POLICY yt_authenticated_configuracoes_all ON public.configuracoes
      FOR ALL TO authenticated
      USING (TRUE)
      WITH CHECK (TRUE);
  END IF;
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_policies
    WHERE
      schemaname = 'public'
      AND tablename = 'notificacoes'
      AND policyname = 'yt_authenticated_notificacoes_all') THEN
    CREATE POLICY yt_authenticated_notificacoes_all ON public.notificacoes
      FOR ALL TO authenticated
      USING (TRUE)
      WITH CHECK (TRUE);
  END IF;
END
$$;


INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id)
  DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_policies
    WHERE
      schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'yt_avatars_public_read') THEN
    CREATE POLICY yt_avatars_public_read ON storage.objects
      FOR SELECT
        USING (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_policies
    WHERE
      schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'yt_avatars_authenticated_insert') THEN
    CREATE POLICY yt_avatars_authenticated_insert ON storage.objects
      FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_policies
    WHERE
      schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'yt_avatars_authenticated_update') THEN
    CREATE POLICY yt_avatars_authenticated_update ON storage.objects
      FOR UPDATE TO authenticated
        USING (bucket_id = 'avatars')
        WITH CHECK (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (
    SELECT
      1
    FROM
      pg_policies
    WHERE
      schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'yt_avatars_authenticated_delete') THEN
    CREATE POLICY yt_avatars_authenticated_delete ON storage.objects
      FOR DELETE TO authenticated
        USING (bucket_id = 'avatars');
  END IF;
END
$$;
