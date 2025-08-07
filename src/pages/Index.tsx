
import { useState, useEffect } from 'react';
import { SystemOverview } from '@/components/SystemOverview';
import { AgentFlow } from '@/components/AgentFlow';
import { MemoryDashboard } from '@/components/MemoryDashboard';
import { QuerySimulator } from '@/components/QuerySimulator';
import { EdgeMap } from '@/components/EdgeMap';
import { MultiAgentQueryInterface } from '@/components/MultiAgentQueryInterface';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  const [activeQuery, setActiveQuery] = useState<string>('');
  const [systemStatus, setSystemStatus] = useState<'idle' | 'processing' | 'complete'>('idle');

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mb-2">
            LangGraph Agent Orchestrator
          </h1>
          <p className="text-slate-400 text-lg">
            Multi-Agent Conversational AI System with Memory Management
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-slate-800 border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              System Overview
            </TabsTrigger>
            <TabsTrigger value="agents" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              Agent Flow
            </TabsTrigger>
            <TabsTrigger value="memory" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              Memory Manager
            </TabsTrigger>
            <TabsTrigger value="simulator" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              Query Simulator
            </TabsTrigger>
            <TabsTrigger value="edgemap" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              Edge Map
            </TabsTrigger>
            <TabsTrigger value="multiagent" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              Multi-Agent Query
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <SystemOverview />
          </TabsContent>

          <TabsContent value="agents">
            <AgentFlow />
          </TabsContent>

          <TabsContent value="memory">
            <MemoryDashboard />
          </TabsContent>

          <TabsContent value="simulator">
            <QuerySimulator 
              onQuerySubmit={setActiveQuery}
              onStatusChange={setSystemStatus}
            />
          </TabsContent>

          <TabsContent value="edgemap">
            <EdgeMap />
          </TabsContent>

          <TabsContent value="multiagent">
            <MultiAgentQueryInterface />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
