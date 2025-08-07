import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Bot, Clock, Zap, Users } from 'lucide-react';
import { agentService } from '@/services/agentService';
import { userService } from '@/services/userService';
import { QueryResult, User as UserType } from '@/types/agent';

export const MultiAgentQueryInterface = () => {
  const [query, setQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Create a default user on component mount
    const user = userService.createUser('Demo User');
    setCurrentUser(user);
  }, []);

  const handleCreateUser = () => {
    const user = userService.createUser(userName || undefined);
    setCurrentUser(user);
    setUserName('');
  };

  const handleQuerySubmit = async () => {
    if (!query.trim() || !currentUser || isProcessing) return;

    setIsProcessing(true);
    
    try {
      const result = await agentService.processQuery(query, currentUser.id);
      userService.addQueryToHistory(currentUser.id, result);
      setQueryResults(prev => [result, ...prev.slice(0, 4)]); // Keep last 5 results
      setQuery('');
    } catch (error) {
      console.error('Error processing query:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getAgentBadgeColor = (agentName: string) => {
    switch (agentName) {
      case 'Scenic Agent': return 'border-blue-500 text-blue-400';
      case 'River Agent': return 'border-cyan-500 text-cyan-400';
      case 'Park Agent': return 'border-green-500 text-green-400';
      case 'Search Agent': return 'border-purple-500 text-purple-400';
      default: return 'border-gray-500 text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* User Management */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-cyan-400" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentUser ? (
            <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
              <div className="flex items-center gap-3">
                <User className="h-8 w-8 text-cyan-400" />
                <div>
                  <div className="text-white font-medium">{currentUser.name}</div>
                  <div className="text-slate-400 text-sm">ID: {currentUser.id}</div>
                </div>
              </div>
              <Badge variant="outline" className="border-green-500 text-green-400">
                Active
              </Badge>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name (optional)"
                className="bg-slate-700 border-slate-600 text-white"
              />
              <Button onClick={handleCreateUser} className="bg-cyan-600 hover:bg-cyan-500">
                Create User
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Query Interface */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bot className="h-5 w-5 text-cyan-400" />
            Multi-Agent Query System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about scenic places, rivers, parks, or search your history..."
              className="bg-slate-700 border-slate-600 text-white"
              onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handleQuerySubmit()}
              disabled={!currentUser || isProcessing}
            />
            <Button 
              onClick={handleQuerySubmit} 
              disabled={!currentUser || isProcessing || !query.trim()}
              className="bg-cyan-600 hover:bg-cyan-500"
            >
              {isProcessing ? 'Processing...' : 'Query'}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-slate-600 text-slate-400 hover:text-white hover:border-slate-500"
              onClick={() => setQuery('Show me scenic places in Chennai')}
            >
              Scenic places in Chennai
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-slate-600 text-slate-400 hover:text-white hover:border-slate-500"
              onClick={() => setQuery('Find rivers near mountains')}
            >
              Rivers near mountains
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-slate-600 text-slate-400 hover:text-white hover:border-slate-500"
              onClick={() => setQuery('Parks with playgrounds for children')}
            >
              Parks with playgrounds
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Query Results */}
      {queryResults.map((result, index) => (
        <Card key={result.queryId} className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg">
                Query: "{result.query}"
              </CardTitle>
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Clock className="h-4 w-4" />
                {result.totalExecutionTime}ms
              </div>
            </div>
            <div className="text-slate-400 text-sm">
              {result.timestamp.toLocaleString()} • {result.responses.length} agents responded
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.responses.map((response, responseIndex) => (
              <div key={`${response.agentId}-${responseIndex}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={getAgentBadgeColor(response.agentName)}
                    >
                      {response.agentName}
                    </Badge>
                    <div className="flex items-center gap-1 text-slate-400 text-xs">
                      <Zap className="h-3 w-3" />
                      {response.executionTime}ms
                    </div>
                  </div>
                  <div className="text-slate-400 text-xs">
                    Confidence: {(response.confidence * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-slate-700 p-3 rounded-lg text-slate-200 text-sm">
                  {response.response}
                </div>
                {responseIndex < result.responses.length - 1 && (
                  <Separator className="my-3 bg-slate-600" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {queryResults.length === 0 && currentUser && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="text-center py-8">
            <Bot className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">
              Ask a question to see responses from multiple specialized agents!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};