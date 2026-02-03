import { useState, useEffect } from "react";
import { Star, Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import {
  useUserSourceFeedback,
  useSubmitSourceFeedback,
  useDeleteSourceFeedback,
} from "~/hooks/useSourceCredibility";
import {
  getSourceCredibilityLabel,
  getSourceCredibilityColor,
} from "~/components/SourceCredibilityBadge";

interface SourceFeedbackDialogProps {
  sourceName: string;
  currentScore?: number | null;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function StarRating({
  rating,
  onRatingChange,
  disabled = false,
}: {
  rating: number;
  onRatingChange: (rating: number) => void;
  disabled?: boolean;
}) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= (hoverRating || rating);
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            className={`p-1 transition-colors ${
              disabled
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer hover:scale-110"
            }`}
            onMouseEnter={() => !disabled && setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => !disabled && onRatingChange(star)}
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                isFilled
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-600"
              }`}
            />
          </button>
        );
      })}
      {rating > 0 && (
        <span className="ml-2 text-sm text-muted-foreground">
          {rating}/5
        </span>
      )}
    </div>
  );
}

function RatingLabel({ rating }: { rating: number }) {
  const labels: Record<number, string> = {
    1: "Very Unreliable",
    2: "Questionable",
    3: "Mixed Reliability",
    4: "Reliable",
    5: "Highly Reliable",
  };

  if (rating === 0) return null;

  return (
    <span className="text-sm font-medium text-muted-foreground">
      {labels[rating]}
    </span>
  );
}

export function SourceFeedbackDialog({
  sourceName,
  currentScore,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: SourceFeedbackDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const onOpenChange = isControlled ? controlledOnOpenChange : setInternalOpen;

  const { data: existingFeedback, isLoading: isLoadingFeedback } =
    useUserSourceFeedback(sourceName);
  const submitFeedback = useSubmitSourceFeedback();
  const deleteFeedback = useDeleteSourceFeedback();

  // Load existing feedback when dialog opens
  useEffect(() => {
    if (open && existingFeedback?.feedback) {
      setRating(existingFeedback.feedback.rating);
      setFeedback(existingFeedback.feedback.feedback || "");
    } else if (!open) {
      // Reset when dialog closes
      setRating(0);
      setFeedback("");
    }
  }, [open, existingFeedback]);

  const handleSubmit = async () => {
    if (rating === 0) return;

    await submitFeedback.mutateAsync({
      sourceName,
      rating,
      feedback: feedback.trim() || undefined,
    });

    onOpenChange?.(false);
  };

  const handleDelete = async () => {
    await deleteFeedback.mutateAsync(sourceName);
    onOpenChange?.(false);
  };

  const hasExistingFeedback = !!existingFeedback?.feedback;
  const isPending = submitFeedback.isPending || deleteFeedback.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Source: {sourceName}</DialogTitle>
          <DialogDescription>
            Share your assessment of this news source's reliability and
            journalistic standards.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current credibility score */}
          {currentScore !== null && currentScore !== undefined && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">
                Current Credibility Score
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`font-semibold ${
                    {
                      green: "text-green-600 dark:text-green-400",
                      blue: "text-blue-600 dark:text-blue-400",
                      yellow: "text-yellow-600 dark:text-yellow-400",
                      orange: "text-orange-600 dark:text-orange-400",
                      red: "text-red-600 dark:text-red-400",
                    }[getSourceCredibilityColor(currentScore)]
                  }`}
                >
                  {currentScore}%
                </span>
                <span className="text-sm text-muted-foreground">
                  ({getSourceCredibilityLabel(currentScore)})
                </span>
              </div>
            </div>
          )}

          {/* Star rating */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Rating</label>
            {isLoadingFeedback ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading your rating...</span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <StarRating
                  rating={rating}
                  onRatingChange={setRating}
                  disabled={isPending}
                />
                <RatingLabel rating={rating} />
              </div>
            )}
          </div>

          {/* Optional feedback text */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Additional Comments (Optional)
            </label>
            <Textarea
              placeholder="Why do you rate this source this way? Consider factors like accuracy, bias, transparency..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={isPending}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {hasExistingFeedback && (
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={isPending}
              className="text-destructive hover:text-destructive"
            >
              {deleteFeedback.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Remove Rating
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || isPending}
            >
              {submitFeedback.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {hasExistingFeedback ? "Update Rating" : "Submit Rating"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
