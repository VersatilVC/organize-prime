-- Add DELETE policy for notifications so users can delete their own notifications
CREATE POLICY "Users can delete their own notifications" 
ON notifications 
FOR DELETE 
USING (user_id = auth.uid());