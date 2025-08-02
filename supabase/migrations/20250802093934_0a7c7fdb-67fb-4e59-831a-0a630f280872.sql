-- Create storage bucket for feedback attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('feedback-attachments', 'feedback-attachments', true);

-- Create storage policies for feedback attachments
CREATE POLICY "Users can upload feedback attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'feedback-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view feedback attachments" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'feedback-attachments' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM memberships 
        WHERE user_id = auth.uid() 
        AND organization_id::text = (storage.foldername(name))[2]
        AND role = 'admin' 
        AND status = 'active'
      )
    )
  )
);

CREATE POLICY "Users can delete their own feedback attachments" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'feedback-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can manage feedback attachments" 
ON storage.objects 
FOR ALL 
USING (
  bucket_id = 'feedback-attachments' 
  AND (
    is_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM memberships 
        WHERE user_id = auth.uid() 
        AND organization_id::text = (storage.foldername(name))[2]
        AND role = 'admin' 
        AND status = 'active'
      )
    )
  )
);