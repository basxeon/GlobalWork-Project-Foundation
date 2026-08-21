CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id),
  title varchar(255) NOT NULL,
  description text NULL,
  assignee_id uuid NULL REFERENCES users(id),
  due_date date NULL,
  priority varchar(16) NOT NULL DEFAULT 'MEDIUM',
  status varchar(16) NOT NULL DEFAULT 'OPEN',
  completed_at timestamptz NULL,
  created_by_id uuid NOT NULL REFERENCES users(id),
  deleted_at timestamptz NULL,
  deleted_by uuid NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_case_id ON tasks(case_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id) WHERE deleted_at IS NULL;

CREATE TABLE task_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id),
  label varchar(255) NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_checklist_items_task_id ON task_checklist_items(task_id);
