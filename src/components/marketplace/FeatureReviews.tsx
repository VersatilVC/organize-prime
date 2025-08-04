import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star, ThumbsUp, Building2 } from 'lucide-react';
import { format } from 'date-fns';

interface FeatureReview {
  id: string;
  userName: string;
  userTitle: string;
  companySize: string;
  rating: number;
  title: string;
  review: string;
  pros: string[];
  cons: string[];
  helpfulVotes: number;
  createdAt: string;
}

interface FeatureReviewsProps {
  featureId: string;
}

// Mock review data
const mockReviews: FeatureReview[] = [
  {
    id: '1',
    userName: 'Sarah Chen',
    userTitle: 'Product Manager',
    companySize: '50-200',
    rating: 5,
    title: 'Game-changing productivity boost',
    review: 'This feature has completely transformed how our team collaborates. The integration is seamless and the interface is intuitive.',
    pros: ['Easy to set up', 'Great user interface', 'Excellent support'],
    cons: ['Could use more customization options'],
    helpfulVotes: 12,
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    userName: 'Michael Rodriguez',
    userTitle: 'Engineering Lead',
    companySize: '200-1000',
    rating: 4,
    title: 'Solid feature with room for improvement',
    review: 'Overall very satisfied with the functionality. It does exactly what we need it to do, though there are a few minor issues we\'ve encountered.',
    pros: ['Reliable performance', 'Good documentation', 'Regular updates'],
    cons: ['Occasional sync delays', 'Limited mobile support'],
    helpfulVotes: 8,
    createdAt: '2024-01-10T14:22:00Z'
  },
  {
    id: '3',
    userName: 'Emily Watson',
    userTitle: 'Operations Director',
    companySize: '10-50',
    rating: 5,
    title: 'Perfect for small teams',
    review: 'As a small company, we needed something that would scale with us. This feature fits perfectly and the pricing is very reasonable.',
    pros: ['Affordable pricing', 'Scales well', 'Great onboarding'],
    cons: [],
    helpfulVotes: 15,
    createdAt: '2024-01-08T09:15:00Z'
  }
];

export function FeatureReviews({ featureId }: FeatureReviewsProps) {
  const reviews = mockReviews; // In real app, filter by featureId

  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: (reviews.filter(r => r.rating === rating).length / reviews.length) * 100
  }));

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Overall Rating Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Reviews</CardTitle>
          <CardDescription>What users are saying about this feature</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold">{averageRating.toFixed(1)}</span>
                <div className="flex">{renderStars(Math.round(averageRating))}</div>
                <span className="text-muted-foreground">({reviews.length} reviews)</span>
              </div>
            </div>
            
            <div className="space-y-2">
              {ratingDistribution.map(({ rating, count, percentage }) => (
                <div key={rating} className="flex items-center gap-2 text-sm">
                  <span className="w-8">{rating}★</span>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-8 text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Reviews */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {review.userName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{review.userName}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{review.userTitle}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        <span>{review.companySize} employees</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex">{renderStars(review.rating)}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {format(new Date(review.createdAt), 'MMM dd, yyyy')}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">{review.title}</h4>
                <p className="text-muted-foreground text-sm">{review.review}</p>
              </div>
              
              {(review.pros.length > 0 || review.cons.length > 0) && (
                <div className="grid md:grid-cols-2 gap-4">
                  {review.pros.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-green-700 mb-2">Pros</h5>
                      <ul className="space-y-1">
                        {review.pros.map((pro, index) => (
                          <li key={index} className="text-sm text-muted-foreground">
                            + {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {review.cons.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-red-700 mb-2">Cons</h5>
                      <ul className="space-y-1">
                        {review.cons.map((con, index) => (
                          <li key={index} className="text-sm text-muted-foreground">
                            - {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-between pt-2 border-t">
                <Button variant="ghost" size="sm" className="h-8">
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  Helpful ({review.helpfulVotes})
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}