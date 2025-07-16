
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Database, GitBranch, Users, Zap } from 'lucide-react';

export const SystemOverview = () => {
  const components = [
    {
      name: 'LangGraph Orchestrator',
      status: 'active',
      description: 'Central coordination hub for agent workflows',
      icon: GitBranch,
      color: 'text-cyan-400'
    },
    {
      name: 'Memory Manager',
      status: 'active',
      description: 'STM (Redis) + LTM (MySQL) with vector embeddings',
      icon: Database,
      color: 'text-purple-400'
    },
    {
      name: 'Agent Registry',
      status: 'active',
      description: 'Scenic, River, Park, and Search agents',
      icon: Users,
      color: 'text-green-400'
    },
    {
      name: 'Edge Communication',
      status: 'active',
      description: 'Inter-agent routing and data flow',
      icon: Zap,
      color: 'text-orange-400'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {components.map((component, index) => (
        <Card key={index} className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <component.icon className={`h-8 w-8 ${component.color}`} />
              <Badge variant="outline" className="border-green-500 text-green-400">
                {component.status}
              </Badge>
            </div>
            <CardTitle className="text-white text-lg">{component.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400 text-sm">{component.description}</p>
            <div className="mt-3 flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-400">Online</span>
            </div>
          </CardContent>
        </Card>
      ))}
      
      <Card className="md:col-span-2 lg:col-span-4 bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-400" />
            System Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">127</div>
              <div className="text-xs text-slate-400">Active Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">1.2K</div>
              <div className="text-xs text-slate-400">STM Entries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">45K</div>
              <div className="text-xs text-slate-400">LTM Records</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">98.5%</div>
              <div className="text-xs text-slate-400">Uptime</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
