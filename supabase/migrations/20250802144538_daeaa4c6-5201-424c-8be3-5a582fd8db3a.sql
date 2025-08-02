-- Add DELETE policy for feedback table
CREATE POLICY "Admins can delete feedback" 
ON public.feedback 
FOR DELETE 
USING (is_org_admin(organization_id) OR is_super_admin());

-- Create a function to handle cascading feedback deletion
CREATE OR REPLACE FUNCTION public.delete_feedback_with_files(
  feedback_id UUID
) 
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, storage
LANGUAGE plpgsql
AS $$
DECLARE
  feedback_record RECORD;
  attachment_path TEXT;
BEGIN
  -- Get the feedback record with attachments
  SELECT * FROM public.feedback 
  WHERE id = feedback_id 
  INTO feedback_record;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Delete attached files from storage
  IF feedback_record.attachments IS NOT NULL THEN
    FOREACH attachment_path IN ARRAY feedback_record.attachments
    LOOP
      -- Delete from storage.objects
      DELETE FROM storage.objects 
      WHERE name = attachment_path;
      
      -- Also delete from files table if it exists there
      DELETE FROM public.files 
      WHERE file_path = attachment_path;
    END LOOP;
  END IF;
  
  -- Delete the feedback record
  DELETE FROM public.feedback 
  WHERE id = feedback_id;
  
  RETURN TRUE;
END;
$$;