-- Create "sessions" table
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  date date NOT NULL,
  room text NOT NULL,
  "startTime" time NOT NULL, -- Note: quotes needed for camelCase in postgres, but better to just use snake_case or double quotes. Let's use double quotes to match TS code, or convert it.
  "timeLimit" integer NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'upcoming',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for "sessions"
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for "sessions"
CREATE POLICY "Users can manage their own sessions"
  ON sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create "alerts" table
CREATE TABLE alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  session_id uuid REFERENCES sessions ON DELETE CASCADE NOT NULL,
  "studentId" text NOT NULL,
  "studentName" text NOT NULL,
  "behaviorType" text NOT NULL, -- maps to event_type
  "riskScore" numeric NOT NULL, -- maps to risk_score
  "headStatus" text,            -- new: from head_status
  "alertThreshold" numeric,     -- new: from alert_threshold
  "frameIndex" integer,         -- new: from frame_index
  "details" text,               -- new: from details
  timestamp timestamptz DEFAULT now(),
  "frameUrl" text
);

-- Enable RLS for "alerts"
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for "alerts"
CREATE POLICY "Users can manage their own alerts"
  ON alerts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
