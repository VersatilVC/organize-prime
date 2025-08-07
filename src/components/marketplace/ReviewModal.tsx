import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { useCreateAppReview, useUpdateAppReview, useUserAppReview } from '@/hooks/database/useAppReviews';

interface ReviewModalProps {
  appId: string;
  appName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReviewModal({ appId, appName, isOpen, onClose }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [pros, setPros] = useState<string[]>(['']);
  const [cons, setCons] = useState<string[]>(['']);

  const { data: existingReview } = useUserAppReview(appId);
  const createReviewMutation = useCreateAppReview();
  const updateReviewMutation = useUpdateAppReview();

  const isEditing = !!existingReview;

  // Pre-fill form if editing existing review
  useEffect(() => {
    if (existingReview && isOpen) {
      setRating(existingReview.rating);
      setReviewTitle(existingReview.review_title || '');
      setReviewText(existingReview.review_text || '');
      setPros(existingReview.pros || ['']);
      setCons(existingReview.cons || ['']);
    } else if (isOpen) {
      // Reset form for new review
      setRating(0);
      setReviewTitle('');
      setReviewText('');
      setPros(['']);
      setCons(['']);
    }
  }, [existingReview, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      return;
    }

    const reviewData = {
      appId,
      rating,
      reviewTitle: reviewTitle.trim() || undefined,
      reviewText: reviewText.trim() || undefined,
      pros: pros.filter(p => p.trim()).length > 0 ? pros.filter(p => p.trim()) : undefined,
      cons: cons.filter(c => c.trim()).length > 0 ? cons.filter(c => c.trim()) : undefined,
    };

    try {
      if (isEditing && existingReview) {
        await updateReviewMutation.mutateAsync({
          reviewId: existingReview.id,
          ...reviewData,
        });
      } else {
        await createReviewMutation.mutateAsync(reviewData);
      }
      onClose();
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  const updateListItem = (
    list: string[], 
    setList: (list: string[]) => void, 
    index: number, 
    value: string
  ) => {
    const newList = [...list];
    newList[index] = value;
    setList(newList);
  };

  const addListItem = (list: string[], setList: (list: string[]) => void) => {
    setList([...list, '']);
  };

  const removeListItem = (list: string[], setList: (list: string[]) => void, index: number) => {
    if (list.length > 1) {
      setList(list.filter((_, i) => i !== index));
    }
  };

  const isLoading = createReviewMutation.isPending || updateReviewMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Review' : 'Write a Review'} for {appName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rating */}
          <div className="space-y-2">
            <Label>Rating *</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1 hover:scale-110 transition-transform"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground">
                {rating > 0 && `${rating} out of 5 stars`}
              </span>
            </div>
          </div>

          {/* Review Title */}
          <div className="space-y-2">
            <Label htmlFor="review-title">Review Title</Label>
            <Input
              id="review-title"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              placeholder="Summarize your experience..."
              maxLength={100}
            />
            <div className="text-xs text-muted-foreground text-right">
              {reviewTitle.length}/100
            </div>
          </div>

          {/* Review Text */}
          <div className="space-y-2">
            <Label htmlFor="review-text">Review</Label>
            <Textarea
              id="review-text"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your thoughts about this app..."
              rows={4}
              maxLength={1000}
            />
            <div className="text-xs text-muted-foreground text-right">
              {reviewText.length}/1000
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Pros */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label>What did you like?</Label>
                    <Badge variant="outline" className="text-green-600">Pros</Badge>
                  </div>
                  {pros.map((pro, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={pro}
                        onChange={(e) => updateListItem(pros, setPros, index, e.target.value)}
                        placeholder="Something good about this app..."
                        className="flex-1"
                      />
                      {pros.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeListItem(pros, setPros, index)}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addListItem(pros, setPros)}
                    className="w-full"
                  >
                    Add another pro
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Cons */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label>What could be improved?</Label>
                    <Badge variant="outline" className="text-red-600">Cons</Badge>
                  </div>
                  {cons.map((con, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={con}
                        onChange={(e) => updateListItem(cons, setCons, index, e.target.value)}
                        placeholder="Something that could be better..."
                        className="flex-1"
                      />
                      {cons.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeListItem(cons, setCons, index)}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addListItem(cons, setCons)}
                    className="w-full"
                  >
                    Add another con
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={rating === 0 || isLoading}
              className="flex-1"
            >
              {isLoading 
                ? (isEditing ? 'Updating...' : 'Submitting...') 
                : (isEditing ? 'Update Review' : 'Submit Review')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}