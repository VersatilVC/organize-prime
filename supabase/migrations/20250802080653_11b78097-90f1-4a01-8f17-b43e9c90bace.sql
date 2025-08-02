-- Create storage bucket for system assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('system-assets', 'system-assets', true);

-- Create storage policy for system assets - allow public read access
CREATE POLICY "Public read access for system assets" ON storage.objects
FOR SELECT 
USING (bucket_id = 'system-assets');

-- Create storage policy for system assets - only super admins can upload/update
CREATE POLICY "Super admins can upload system assets" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'system-assets' AND 
  is_super_admin()
);

CREATE POLICY "Super admins can update system assets" ON storage.objects
FOR UPDATE 
USING (
  bucket_id = 'system-assets' AND 
  is_super_admin()
);

CREATE POLICY "Super admins can delete system assets" ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'system-assets' AND 
  is_super_admin()
);