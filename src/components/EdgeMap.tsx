
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, GitBranch, Zap } from 'lucide-react';

export const EdgeMap = () => {
  const edgeRules = [
    {
      id: 1,
      from: 'Scenic Agent',
      to: 'River Agent',
      condition: 'location.type === "water-adjacent"',
      priority: 'high',
      status: 'active'
    },
    {
      id: 2,
      from: 'River Agent',
      to: 'Park Agent',
      condition: 'recreational.features.includes("park")',
      priority: 'medium',
      status: 'active'
    },
    {
      id: 3,
      from: 'Search Agent',
      to: 'Any Agent',
      condition: 'query.type === "historical"',
      priority: 'high',
      status: 'active'
    },
    {
      id: 4,
      from: 'Park Agent',
      to: 'Search Agent',
      condition: 'context.needsHistory === true',
      priority: 'low',
      status: 'idle'
    }
  ];

  const communicationFlow = [
    {
      path: 'Client → LangGraph → Agent',
      description: 'Initial request routing',
      latency: '15ms'
    },
    {
      path: 'Agent → Memory Manager',
      description: 'Context retrieval and storage',
      latency: '8ms'
    },
    {
      path: 'Agent → Agent (via Edge Map)',
      description: 'Inter-agent communication',
      latency: '23ms'
    },
    {
      path: 'Agent → LangGraph → Client',
      description: 'Response delivery',
      latency: '12ms'
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <GitBranch className="h-5 w-5 text-cyan-400" />
            <CardTitle className="text-white">Edge Communication Rules</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {edgeRules.map((rule) => (
              <div key={rule.id} className="bg-slate-700 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Badge 
                      variant="outline" 
                      className="border-blue-500 text-blue-400"
                    >
                      {rule.from}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-slate-500" />
                    <Badge 
                      variant="outline" 
                      className="border-green-500 text-green-400"
                    >
                      {rule.to}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="outline" 
                      className={
                        rule.priority === 'high' ? 'border-red-500 text-red-400' :
                        rule.priority === 'medium' ? 'border-orange-500 text-orange-400' :
                        'border-yellow-500 text-yellow-400'
                      }
                    >
                      {rule.priority}
                    </Badge>
                    <div className={`w-2 h-2 rounded-full ${
                      rule.status === 'active' ? 'bg-green-400' : 'bg-slate-500'
                    }`}></div>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="text-slate-400">Condition:</span>
                  <code className="ml-2 text-cyan-400 bg-slate-800 px-2 py-1 rounded">
                    {rule.condition}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-orange-400" />
            <CardTitle className="text-white">Communication Flow Metrics</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {communicationFlow.map((flow, index) => (
              <div key={index} className="bg-slate-700 p-4 rounded-lg">
                <div className="text-white font-medium text-sm mb-2">{flow.path}</div>
                <div className="text-slate-400 text-xs mb-2">{flow.description}</div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Avg Latency</span>
                  <span className="text-orange-400 font-medium">{flow.latency}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">System Architecture Diagram</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-700 p-6 rounded-lg">
            <div className="text-center space-y-4">
              <div className="text-cyan-400 font-medium">POST /run_graph</div>
              <ArrowRight className="h-4 w-4 text-slate-500 mx-auto" />
              <div className="text-purple-400 font-medium">LangGraph Orchestrator</div>
              <div className="flex justify-center space-x-8 my-4">
                <ArrowRight className="h-4 w-4 text-slate-500" />
                <ArrowRight className="h-4 w-4 text-slate-500" />
                <ArrowRight className="h-4 w-4 text-slate-500" />
                <ArrowRight className="h-4 w-4 text-slate-500" />
              </div>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="text-blue-400">Scenic</div>
                <div className="text-cyan-400">River</div>
                <div className="text-green-400">Park</div>
                <div className="text-orange-400">Search</div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-500 mx-auto" />
              <div className="text-yellow-400 font-medium">Memory Manager</div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-800 p-2 rounded">
                  <div className="text-cyan-400">STM (Redis)</div>
                  <div className="text-slate-400">Short-term context</div>
                </div>
                <div className="bg-slate-800 p-2 rounded">
                  <div className="text-purple-400">LTM (MySQL)</div>
                  <div className="text-slate-400">Long-term storage</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
