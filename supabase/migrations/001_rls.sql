-- Enable Row Level Security on all application tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_activities ENABLE ROW LEVEL SECURITY;

-- users: each user can only see and modify their own row
CREATE POLICY "users: own row only"
  ON users
  FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- categories: scoped to user_id
CREATE POLICY "categories: own rows only"
  ON categories
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- activities: scoped to user_id
CREATE POLICY "activities: own rows only"
  ON activities
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- weekly_templates: scoped to user_id
CREATE POLICY "weekly_templates: own rows only"
  ON weekly_templates
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- template_activities: accessible via template ownership
CREATE POLICY "template_activities: via template ownership"
  ON template_activities
  FOR ALL
  USING (
    template_id IN (
      SELECT id FROM weekly_templates WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT id FROM weekly_templates WHERE user_id = auth.uid()
    )
  );
