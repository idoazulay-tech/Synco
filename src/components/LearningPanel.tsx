import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Brain, Pause, Play, Check, X, TrendingUp, Clock, Lightbulb } from 'lucide-react';

interface PreferenceRule {
  id: string;
  ruleType: string;
  situationKey: string;
  confidence: number;
  status: 'active' | 'paused';
  createdAtIso: string;
}

interface PendingProposal {
  id: string;
  situationKey: string;
  suggestedRule: {
    ruleType: string;
    payload: Record<string, unknown>;
  };
  evidenceCount: number;
  confidence: number;
  question: {
    questionId: string;
    textHebrew: string;
    options: string[];
  };
}

interface RecentDecision {
  id: string;
  tsIso: string;
  situationKey: string;
  userChoice: string;
}

interface LearningData {
  activeRules: PreferenceRule[];
  pausedRules: PreferenceRule[];
  pendingProposal: PendingProposal | null;
  recentDecisions: RecentDecision[];
  stats: {
    totalDecisions: number;
    totalRules: number;
    totalPatterns: number;
  };
}

const API_BASE = '/api';

export default function LearningPanel() {
  const [data, setData] = useState<LearningData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: string } | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/learning`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        if (json.data.pendingProposal) {
          setShowProposalModal(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch learning data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConfirmProposal = async () => {
    try {
      const res = await fetch(`${API_BASE}/learning/rule/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ text: 'הכלל נוצר בהצלחה!', type: 'success' });
        setShowProposalModal(false);
        fetchData();
      }
    } catch (err) {
      setMessage({ text: 'שגיאה ביצירת הכלל', type: 'error' });
    }
  };

  const handleDeclineProposal = async () => {
    try {
      await fetch(`${API_BASE}/learning/rule/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      setShowProposalModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to decline proposal:', err);
    }
  };

  const handleToggleRule = async (ruleId: string, newStatus: 'active' | 'paused') => {
    try {
      const res = await fetch(`${API_BASE}/learning/rule/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId, status: newStatus })
      });
      const json = await res.json();
      if (json.success) {
        setMessage({
          text: newStatus === 'paused' ? 'הכלל הושהה' : 'הכלל הופעל מחדש',
          type: 'info'
        });
        fetchData();
      }
    } catch (err) {
      setMessage({ text: 'שגיאה בשינוי סטטוס הכלל', type: 'error' });
    }
  };

  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`;
  };

  const getRuleTypeLabel = (ruleType: string) => {
    const labels: Record<string, string> = {
      priority: 'עדיפות',
      schedule: 'תזמון',
      reshuffle: 'סידור מחדש',
      mustLock: 'נעילה'
    };
    return labels[ruleType] || ruleType;
  };

  if (isLoading && !data) {
    return (
      <Card data-testid="card-learning-panel">
        <CardContent className="py-8 text-center text-muted-foreground">
          טוען נתוני למידה...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card data-testid="card-learning-panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5" />
            מנוע למידה
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div
              className={`p-2 rounded text-sm ${
                message.type === 'success' ? 'bg-green-100 text-green-800' :
                message.type === 'error' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}
              data-testid="text-learning-message"
            >
              {message.text}
            </div>
          )}

          {data?.stats && (
            <div className="grid grid-cols-3 gap-2 text-center text-sm" data-testid="stats-section">
              <div className="p-2 bg-muted/50 rounded">
                <div className="text-xl font-bold">{data.stats.totalDecisions}</div>
                <div className="text-muted-foreground">החלטות</div>
              </div>
              <div className="p-2 bg-muted/50 rounded">
                <div className="text-xl font-bold">{data.stats.totalPatterns}</div>
                <div className="text-muted-foreground">דפוסים</div>
              </div>
              <div className="p-2 bg-muted/50 rounded">
                <div className="text-xl font-bold">{data.stats.totalRules}</div>
                <div className="text-muted-foreground">כללים</div>
              </div>
            </div>
          )}

          <div>
            <h4 className="font-medium mb-2 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              כללים פעילים
            </h4>
            {data?.activeRules && data.activeRules.length > 0 ? (
              <div className="space-y-2">
                {data.activeRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-2 bg-card border rounded"
                    data-testid={`rule-${rule.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{getRuleTypeLabel(rule.ruleType)}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatConfidence(rule.confidence)}
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleToggleRule(rule.id, 'paused')}
                      data-testid={`button-pause-${rule.id}`}
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-2" data-testid="text-no-rules">
                אין כללים פעילים עדיין
              </div>
            )}
          </div>

          {data?.pausedRules && data.pausedRules.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-muted-foreground">כללים מושהים</h4>
              <div className="space-y-2">
                {data.pausedRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-2 bg-muted/30 border rounded opacity-60"
                    data-testid={`rule-paused-${rule.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{getRuleTypeLabel(rule.ruleType)}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatConfidence(rule.confidence)}
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleToggleRule(rule.id, 'active')}
                      data-testid={`button-resume-${rule.id}`}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data?.recentDecisions && data.recentDecisions.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-1">
                <Clock className="h-4 w-4" />
                החלטות אחרונות
              </h4>
              <div className="space-y-1">
                {data.recentDecisions.slice(0, 3).map((decision) => (
                  <div
                    key={decision.id}
                    className="text-sm p-2 bg-muted/30 rounded flex items-center gap-2"
                    data-testid={`decision-${decision.id}`}
                  >
                    <Badge variant="outline" className="text-xs">
                      {decision.userChoice}
                    </Badge>
                    <span className="text-muted-foreground text-xs truncate">
                      {decision.situationKey}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={fetchData}
            disabled={isLoading}
            data-testid="button-refresh-learning"
          >
            רענן נתונים
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showProposalModal} onOpenChange={setShowProposalModal}>
        <DialogContent data-testid="modal-rule-proposal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              הצעה לכלל חדש
            </DialogTitle>
            <DialogDescription>
              המערכת זיהתה דפוס חוזר בהתנהגות שלך
            </DialogDescription>
          </DialogHeader>
          
          {data?.pendingProposal && (
            <div className="py-4 space-y-4">
              <p className="text-lg" data-testid="text-proposal-question">
                {data.pendingProposal.question.textHebrew}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">
                  {getRuleTypeLabel(data.pendingProposal.suggestedRule.ruleType)}
                </Badge>
                <span>
                  {data.pendingProposal.evidenceCount} תצפיות
                </span>
                <span>
                  {formatConfidence(data.pendingProposal.confidence)} ביטחון
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleDeclineProposal}
              data-testid="button-decline-proposal"
            >
              <X className="h-4 w-4 ml-1" />
              לא
            </Button>
            <Button
              onClick={handleConfirmProposal}
              data-testid="button-confirm-proposal"
            >
              <Check className="h-4 w-4 ml-1" />
              כן, צור כלל
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
