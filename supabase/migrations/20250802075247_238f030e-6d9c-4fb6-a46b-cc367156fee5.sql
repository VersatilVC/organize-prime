-- Update helper function to extract organization ID from both avatar and logo paths
CREATE OR REPLACE FUNCTION public.extract_org_id_from_path(file_path text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE 
    -- Handle logo path: logos/[org_id]/logo.ext
    WHEN file_path ~ '^logos/' 
    THEN (regexp_split_to_array(file_path, '/'))[2]::uuid
    -- Handle avatar path: [org_id]/[user_id]/avatar.ext
    WHEN file_path ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/' 
    THEN (regexp_split_to_array(file_path, '/'))[1]::uuid
    ELSE NULL
  END;
$$;