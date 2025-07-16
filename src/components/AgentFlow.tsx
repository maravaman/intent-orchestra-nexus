
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Waves, Trees, Search, ArrowRight } from 'lucide-react';

export const AgentFlow = () => {
  const [activeAgent, setActiveAgent] = useState<string | null>(null);

  const agents = [
    {
      id: 'scenic',
      name: 'Scenic Agent',
      icon: MapPin,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      description: 'Handles scenic location queries and recommendations',
      status: 'active',
      lastQuery: 'scenic places in Chennai',
      executionTime: '142ms'
    },
    {
      id: 'river',
      name: 'River Agent',
      icon: Waves,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/30',
      description: 'Manages river and water-body related queries',
      status: 'idle',
      lastQuery: 'rivers near mountains',
      executionTime: '89ms'
    },
    {
      id: 'park',
      name: 'Park Agent',
      icon: Trees,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      description: 'Processes park and recreational area information',
      status: 'idle',
      lastQuery: 'parks with playgrounds',
      executionTime: '201ms'
    },
    {
      id: 'search',
      name: 'Search Agent',
      icon: Search,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      description: 'Vector similarity search across STM and LTM',
      status: 'processing',
      lastQuery: 'past scenic conversations',
      executionTime: '1.2s'
    }
  ];

  const flowConnections = [
    { from: 'scenic', to: 'river' },
    { from: 'river', to: 'park' },
    { from: 'search', to: 'scenic' }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {agents.map((agent) => (
          <Card 
            key={agent.id}
            className={`bg-slate-800 border-slate-700 hover:border-slate-600 transition-all cursor-pointer ${
              activeAgent === agent.id ? agent.borderColor : ''
            }`}
            onClick={() => setActiveAgent(activeAgent === agent.id ? null : agent.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${agent.bgColor}`}>
                  <agent.icon className={`h-6 w-6 ${agent.color}`} />
                </div>
                <Badge 
                  variant="outline" 
                  className={
                    agent.status === 'active' 
                      ? 'border-green-500 text-green-400' 
                      : agent.status === 'processing'
                      ? 'border-orange-500 text-orange-400'
                      : 'border-slate-500 text-slate-400'
                  }
                >
                  {agent.status}
                </Badge>
              </div>
              <CardTitle className="text-white text-sm">{agent.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 text-xs mb-2">{agent.description}</p>
              <div className="space-y-1">
                <div className="text-xs">
                  <span className="text-slate-500">Last Query:</span>
                  <span className="text-slate-300 ml-1">"{agent.lastQuery}"</span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-500">Execution:</span>
                  <span className={`ml-1 ${agent.color}`}>{agent.executionTime}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {activeAgent && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Agent Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Memory Context</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-700 p-3 rounded-lg">
                    <div className="text-cyan-400 font-medium">STM Entries</div>
                    <div className="text-white">12 recent interactions</div>
                  </div>
                  <div className="bg-slate-700 p-3 rounded-lg">
                    <div className="text-purple-400 font-medium">LTM Records</div>
                    <div className="text-white">1,247 historical entries</div>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Recent Activity</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between bg-slate-700 p-2 rounded">
                    <span className="text-slate-300">Query processed</span>
                    <span className="text-green-400">2m ago</span>
                  </div>
                  <div className="flex justify-between bg-slate-700 p-2 rounded">
                    <span className="text-slate-300">Memory updated</span>
                    <span className="text-cyan-400">2m ago</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Agent Communication Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center space-x-4 text-sm">
            <div className="text-blue-400">Scenic Agent</div>
            <ArrowRight className="h-4 w-4 text-slate-500" />
            <div className="text-cyan-400">River Agent</div>
            <ArrowRight className="h-4 w-4 text-slate-500" />
            <div className="text-green-400">Park Agent</div>
          </div>
          <div className="mt-4 text-center">
            <div className="inline-flex items-center space-x-2 text-sm">
              <div className="text-purple-400">Search Agent</div>
              <ArrowRight className="h-4 w-4 text-slate-500" />
              <div className="text-slate-400">All Agents (Vector Search)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
