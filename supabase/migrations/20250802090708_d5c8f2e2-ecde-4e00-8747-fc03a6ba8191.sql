-- Add columns to track response history and internal notes
ALTER TABLE public.feedback 
ADD COLUMN IF NOT EXISTS admin_response TEXT,
ADD COLUMN IF NOT EXISTS responded_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;

-- Create function to track status changes
CREATE OR REPLACE FUNCTION public.track_feedback_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_history = COALESCE(OLD.status_history, '[]'::jsonb) || 
      jsonb_build_object(
        'status', NEW.status,
        'changed_at', NOW(),
        'changed_by', auth.uid()
      );
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for status tracking
DROP TRIGGER IF EXISTS feedback_status_change_trigger ON public.feedback;
CREATE TRIGGER feedback_status_change_trigger
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.track_feedback_status_change();