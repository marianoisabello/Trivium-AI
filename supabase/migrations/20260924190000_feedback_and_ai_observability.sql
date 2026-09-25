
CREATE TABLE public.proposal_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decision text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.scenario_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE SET NULL,
  scenario_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decision text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ai_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  flow text NOT NULL,
  provider text NOT NULL,
  model text,
  status text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 1,
  duration_ms integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_feedback, public.scenario_feedback, public.ai_call_logs TO authenticated;
GRANT ALL ON public.proposal_feedback, public.scenario_feedback, public.ai_call_logs TO service_role;

ALTER TABLE public.proposal_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposal_feedback all" ON public.proposal_feedback FOR ALL TO authenticated USING (organization_id = public.current_org_id()) WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "scenario_feedback all" ON public.scenario_feedback FOR ALL TO authenticated USING (organization_id = public.current_org_id()) WITH CHECK (organization_id = public.current_org_id());
CREATE POLICY "ai_call_logs all" ON public.ai_call_logs FOR ALL TO authenticated USING (organization_id = public.current_org_id()) WITH CHECK (organization_id = public.current_org_id());

CREATE INDEX ai_call_logs_org_created_idx ON public.ai_call_logs (organization_id, created_at DESC);
CREATE INDEX proposal_feedback_org_created_idx ON public.proposal_feedback (organization_id, created_at DESC);
CREATE INDEX scenario_feedback_org_created_idx ON public.scenario_feedback (organization_id, created_at DESC);
