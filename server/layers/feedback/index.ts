// Layer 7: Feedback & Review Layer
// Reflection, review, and user feedback (placeholder)

export interface DayReview {
  date: string;
  tasksPlanned: number;
  tasksCompleted: number;
  totalPlannedMinutes: number;
  totalActualMinutes: number;
  highlights: string[];
  improvements: string[];
}

export interface UserFeedback {
  timestamp: Date;
  type: 'positive' | 'negative' | 'suggestion';
  context: string;
  message: string;
}

export class FeedbackLayer {
  private reviews: DayReview[] = [];
  private feedback: UserFeedback[] = [];

  async generateDayReview(date: string, tasks: any[]): Promise<DayReview> {
    const planned = tasks.length;
    const completed = tasks.filter((t: any) => t.status === 'completed').length;
    
    return {
      date,
      tasksPlanned: planned,
      tasksCompleted: completed,
      totalPlannedMinutes: 0, // Would calculate from tasks
      totalActualMinutes: 0,
      highlights: completed > 0 ? [`השלמת ${completed} משימות!`] : [],
      improvements: planned > completed ? ['נסה לתכנן פחות משימות'] : []
    };
  }

  async recordFeedback(feedback: UserFeedback): Promise<void> {
    this.feedback.push(feedback);
  }

  getReviews(limit: number = 7): DayReview[] {
    return this.reviews.slice(-limit);
  }
}

// ALL LAYERS SCAFFOLDED - READY FOR INTEGRATION
