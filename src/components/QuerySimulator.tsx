
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, CheckCircle, Zap } from 'lucide-react';

interface QuerySimulatorProps {
  onQuerySubmit: (query: string) => void;
  onStatusChange: (status: 'idle' | 'processing' | 'complete') => void;
}

export const QuerySimulator = ({ onQuerySubmit, onStatusChange }: QuerySimulatorProps) => {
  const [query, setQuery] = useState('');
  const [userId, setUserId] = useState('matan');
  const [isProcessing, setIsProcessing] = useState(false);
  const [executionLog, setExecutionLog] = useState<Array<{
    step: string;
    agent: string;
    status: 'pending' | 'processing' | 'complete';
    duration?: number;
  }>>([]);

  const sampleQueries = [
    'Show me scenic places around Chennai',
    'Find rivers near mountain regions',
    'Parks with playgrounds for children',
    'Search my past scenic conversations'
  ];

  const simulateQuery = async () => {
    if (!query.trim()) return;

    setIsProcessing(true);
    onStatusChange('processing');
    onQuerySubmit(query);

    // Simulate agent execution flow
    const steps = [
      { step: 'LangGraph receives request', agent: 'orchestrator', duration: 15 },
      { step: 'Route to Scenic Agent', agent: 'scenic', duration: 142 },
      { step: 'Check STM/LTM for context', agent: 'memory', duration: 23 },
      { step: 'Execute scenic logic', agent: 'scenic', duration: 89 },
      { step: 'Update memory context', agent: 'memory', duration: 31 },
      { step: 'Return response', agent: 'orchestrator', duration: 12 }
    ];

    setExecutionLog(steps.map(step => ({ ...step, status: 'pending' as const })));

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setExecutionLog(prev => prev.map((step, index) => 
        index === i 
          ? { ...step, status: 'processing' as const }
          : index < i 
          ? { ...step, status: 'complete' as const }
          : step
      ));

      await new Promise(resolve => setTimeout(resolve, steps[i].duration * 2));
      
      setExecutionLog(prev => prev.map((step, index) => 
        index === i ? { ...step, status: 'complete' as const } : step
      ));
    }

    setIsProcessing(false);
    onStatusChange('complete');
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Query Simulator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">User ID</label>
              <Input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter user ID"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-slate-400 mb-2 block">Query</label>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your query..."
                className="bg-slate-700 border-slate-600 text-white"
                onKeyPress={(e) => e.key === 'Enter' && !isProcessing && simulateQuery()}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {sampleQueries.map((sampleQuery, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs border-slate-600 text-slate-400 hover:text-white hover:border-slate-500"
                onClick={() => setQuery(sampleQuery)}
              >
                {sampleQuery}
              </Button>
            ))}
          </div>

          <Button 
            onClick={simulateQuery} 
            disabled={isProcessing || !query.trim()}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            <Play className="h-4 w-4 mr-2" />
            {isProcessing ? 'Processing...' : 'Execute Query'}
          </Button>
        </CardContent>
      </Card>

      {executionLog.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Execution Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {executionLog.map((log, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 bg-slate-700 rounded-lg">
                  <div className="flex-shrink-0">
                    {log.status === 'complete' ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : log.status === 'processing' ? (
                      <Zap className="h-5 w-5 text-orange-400 animate-pulse" />
                    ) : (
                      <Clock className="h-5 w-5 text-slate-500" />
                    )}
                  </div>
                  
                  <div className="flex-grow">
                    <div className="text-white text-sm">{log.step}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge 
                        variant="outline" 
                        className={
                          log.agent === 'scenic' ? 'border-blue-500 text-blue-400' :
                          log.agent === 'memory' ? 'border-purple-500 text-purple-400' :
                          log.agent === 'orchestrator' ? 'border-cyan-500 text-cyan-400' :
                          'border-slate-500 text-slate-400'
                        }
                      >
                        {log.agent}
                      </Badge>
                      {log.duration && log.status === 'complete' && (
                        <span className="text-xs text-slate-400">{log.duration}ms</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
