
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Database, HardDrive, Clock, Search } from 'lucide-react';

export const MemoryDashboard = () => {
  const memoryStats = {
    stm: {
      usage: 68,
      entries: 1247,
      latency: '0.8ms',
      retention: '7 days'
    },
    ltm: {
      usage: 42,
      entries: 45678,
      latency: '12ms',
      retention: 'Permanent'
    }
  };

  const userContexts = [
    { userId: 'matan', agent: 'scenic', stmEntries: 15, ltmEntries: 234 },
    { userId: 'sarah', agent: 'river', stmEntries: 8, ltmEntries: 156 },
    { userId: 'alex', agent: 'park', stmEntries: 23, ltmEntries: 445 },
    { userId: 'emma', agent: 'search', stmEntries: 5, ltmEntries: 89 }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* STM Dashboard */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <HardDrive className="h-5 w-5 text-cyan-400" />
              <CardTitle className="text-white">Short-Term Memory (Redis)</CardTitle>
              <Badge variant="outline" className="border-cyan-500 text-cyan-400">STM</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Usage</span>
                <span className="text-cyan-400">{memoryStats.stm.usage}%</span>
              </div>
              <Progress value={memoryStats.stm.usage} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-400">Entries</div>
                <div className="text-white font-medium">{memoryStats.stm.entries.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-slate-400">Latency</div>
                <div className="text-cyan-400 font-medium">{memoryStats.stm.latency}</div>
              </div>
            </div>

            <div className="bg-slate-700 p-3 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-medium text-white">Retention Policy</span>
              </div>
              <div className="text-xs text-slate-400">{memoryStats.stm.retention}</div>
            </div>
          </CardContent>
        </Card>

        {/* LTM Dashboard */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-purple-400" />
              <CardTitle className="text-white">Long-Term Memory (MySQL)</CardTitle>
              <Badge variant="outline" className="border-purple-500 text-purple-400">LTM</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Usage</span>
                <span className="text-purple-400">{memoryStats.ltm.usage}%</span>
              </div>
              <Progress value={memoryStats.ltm.usage} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-400">Records</div>
                <div className="text-white font-medium">{memoryStats.ltm.entries.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-slate-400">Latency</div>
                <div className="text-purple-400 font-medium">{memoryStats.ltm.latency}</div>
              </div>
            </div>

            <div className="bg-slate-700 p-3 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Search className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-white">Vector Embeddings</span>
              </div>
              <div className="text-xs text-slate-400">Semantic search enabled</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Context Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">User-Agent Memory Contexts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 text-slate-400">User ID</th>
                  <th className="text-left py-2 text-slate-400">Agent</th>
                  <th className="text-left py-2 text-slate-400">STM Entries</th>
                  <th className="text-left py-2 text-slate-400">LTM Records</th>
                  <th className="text-left py-2 text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {userContexts.map((context, index) => (
                  <tr key={index} className="border-b border-slate-700/50">
                    <td className="py-2 text-white font-mono">{context.userId}</td>
                    <td className="py-2">
                      <Badge 
                        variant="outline" 
                        className={
                          context.agent === 'scenic' ? 'border-blue-500 text-blue-400' :
                          context.agent === 'river' ? 'border-cyan-500 text-cyan-400' :
                          context.agent === 'park' ? 'border-green-500 text-green-400' :
                          'border-purple-500 text-purple-400'
                        }
                      >
                        {context.agent}
                      </Badge>
                    </td>
                    <td className="py-2 text-cyan-400">{context.stmEntries}</td>
                    <td className="py-2 text-purple-400">{context.ltmEntries}</td>
                    <td className="py-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-green-400 text-xs">Active</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
