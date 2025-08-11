import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Star, StarIcon } from 'lucide-react';

interface ReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appId: string;
  appName: string;
  existingReview?: {
    id: string;
    rating: number;
    review_text: string;
  } | null;
}

export function ReviewModal({ open, onOpenChange, appId, appName, existingReview }: ReviewModalProps) {
  const { toast } = useToast();
  const [rating, setRating] = useState(existingReview?.rating || 5);
  const [reviewText, setReviewText] = useState(existingReview?.review_text || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Mock review submission - marketplace functionality removed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (existingReview) {
        toast({
          title: "Review Updated",
          description: "Your review has been updated successfully.",
        });
      } else {
        toast({
          title: "Review Submitted",
          description: "Thank you for your review!",
        });
      }
      
      onOpenChange(false);
      setRating(5);
      setReviewText('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange }: { value: number; onChange: (value: number) => void }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="text-2xl focus:outline-none hover:scale-110 transition-transform"
          >
            {star <= value ? (
              <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
            ) : (
              <StarIcon className="w-6 h-6 text-gray-300" />
            )}
          </button>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existingReview ? 'Update Review' : 'Write Review'} for {appName}
          </DialogTitle>
          <DialogDescription>
            Share your experience with this app to help other users.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Rating</Label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="review">Review (Optional)</Label>
            <Textarea
              id="review"
              placeholder="Share your thoughts about this app..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting 
                ? 'Submitting...' 
                : existingReview 
                  ? 'Update Review' 
                  : 'Submit Review'
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}