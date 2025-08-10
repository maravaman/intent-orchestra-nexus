import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Bot, Clock, Zap, Users, History, Shield, Database, Search, Trash2, Download } from 'lucide-react';
import { agentService } from '@/services/agentService';
import { userService } from '@/services/userService';
import { memoryService } from '@/services/memoryService';
import { QueryResult, User as UserType, MemoryEntry } from '@/types/agent';

export const MultiAgentQueryInterface = () => {
  const [query, setQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [conversationHistory, setConversationHistory] = useState<QueryResult[]>([]);
  const [memoryStats, setMemoryStats] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<MemoryEntry[]>([]);

  useEffect(() => {
    // Create a default user on component mount
    initializeUser();
  }, []);

  const initializeUser = async () => {
    const user = await userService.createUser('Demo User');
    setCurrentUser(user);
    await loadUserData(user.id);
  };

  const loadUserData = async (userId: string) => {
    const history = await memoryService.getUserConversationHistory(userId, 10);
    setConversationHistory(history);
    
    const stats = await userService.getUserStats(userId);
    setMemoryStats(stats?.memory);
  };

  const handleCreateUser = async () => {
    const user = await userService.createUser(userName || undefined, userEmail || undefined);
    setCurrentUser(user);
    setUserName('');
    setUserEmail('');
    await loadUserData(user.id);
  };

  const handleQuerySubmit = async () => {
    if (!query.trim() || !currentUser || isProcessing) return;

    setIsProcessing(true);
    
    try {
      const result = await agentService.processQuery(query, currentUser.id, currentUser.sessionId);
      setQueryResults(prev => [result, ...prev.slice(0, 4)]); // Keep last 5 results
      setQuery('');
      
      // Refresh user data
      await loadUserData(currentUser.id);
    } catch (error) {
      console.error('Error processing query:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSearchHistory = async () => {
    if (!searchTerm.trim() || !currentUser) return;
    
    const results = await memoryService.searchUserHistory(currentUser.id, searchTerm);
    setSearchResults(results);
  };

  const handleDeleteUserData = async () => {
    if (!currentUser) return;
    
    if (confirm('Are you sure you want to delete all your data? This action cannot be undone.')) {
      await userService.deleteUser(currentUser.id);
      setCurrentUser(null);
      setQueryResults([]);
      setConversationHistory([]);
      setMemoryStats(null);
      alert('All user data has been deleted.');
    }
  };

  const handleExportData = async () => {
    if (!currentUser) return;
    
    const exportData = await userService.exportUserData(currentUser.id);
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-data-${currentUser.id}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="query" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-slate-800 border-slate-700">
          <TabsTrigger value="query" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            Query Interface
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            Conversation History
          </TabsTrigger>
          <TabsTrigger value="memory" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            Memory Dashboard
          </TabsTrigger>
          <TabsTrigger value="privacy" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            Privacy & Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="query" className="space-y-6">
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
                      <div className="text-slate-400 text-xs">Session: {currentUser.sessionId}</div>
                      {currentUser.email && (
                        <div className="text-slate-400 text-xs">Email: {currentUser.email}</div>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="border-green-500 text-green-400">
                    Active
                  </Badge>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name (optional)"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <Input
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="Enter your email (optional)"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                  <Button onClick={handleCreateUser} className="w-full bg-cyan-600 hover:bg-cyan-500">
                    Create User Account
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
                  onClick={() => setQuery('Find rivers near mountains for adventure activities')}
                >
                  Rivers near mountains
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-slate-600 text-slate-400 hover:text-white hover:border-slate-500"
                  onClick={() => setQuery('Parks with playgrounds and family facilities')}
                >
                  Family-friendly parks
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-slate-600 text-slate-400 hover:text-white hover:border-slate-500"
                  onClick={() => setQuery('Show me my past scenic conversations')}
                >
                  My past conversations
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
                  {formatTimestamp(result.timestamp)} • {result.responses.length} agents responded
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
                        <div className="text-slate-400 text-xs">
                          Relevance: {response.relevanceScore}/10
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
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <History className="h-5 w-5 text-cyan-400" />
                Conversation History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {conversationHistory.length > 0 ? (
                <div className="space-y-4">
                  {conversationHistory.map((conversation, index) => (
                    <div key={conversation.queryId} className="bg-slate-700 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-white font-medium">"{conversation.query}"</div>
                        <div className="text-slate-400 text-sm">
                          {formatTimestamp(conversation.timestamp)}
                        </div>
                      </div>
                      <div className="text-slate-400 text-sm">
                        {conversation.responses.length} agents responded • {conversation.totalExecutionTime}ms total
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {conversation.responses.map((response, idx) => (
                          <Badge 
                            key={idx}
                            variant="outline" 
                            className={`text-xs ${getAgentBadgeColor(response.agentName)}`}
                          >
                            {response.agentName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">No conversation history yet. Start asking questions!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search History */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Search className="h-5 w-5 text-cyan-400" />
                Search Your History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search your conversation history..."
                  className="bg-slate-700 border-slate-600 text-white"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchHistory()}
                />
                <Button onClick={handleSearchHistory} className="bg-cyan-600 hover:bg-cyan-500">
                  Search
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <div className="text-white font-medium">Found {searchResults.length} results:</div>
                  {searchResults.slice(0, 10).map((result, index) => (
                    <div key={result.id} className="bg-slate-700 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-xs">
                          {result.type}
                        </Badge>
                        <div className="text-slate-400 text-xs">
                          {formatTimestamp(result.timestamp)}
                        </div>
                      </div>
                      <div className="text-slate-200 text-sm">{result.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="memory" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Database className="h-5 w-5 text-cyan-400" />
                Memory Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {memoryStats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-700 p-4 rounded-lg">
                    <div className="text-cyan-400 font-medium mb-2">Short-Term Memory (STM)</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Entries:</span>
                        <span className="text-white">{memoryStats.stm.totalEntries}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Queries:</span>
                        <span className="text-white">{memoryStats.stm.queries}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Responses:</span>
                        <span className="text-white">{memoryStats.stm.responses}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-2">
                        Retention: 7 days
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-700 p-4 rounded-lg">
                    <div className="text-purple-400 font-medium mb-2">Long-Term Memory (LTM)</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Entries:</span>
                        <span className="text-white">{memoryStats.ltm.totalEntries}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Queries:</span>
                        <span className="text-white">{memoryStats.ltm.queries}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Responses:</span>
                        <span className="text-white">{memoryStats.ltm.responses}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-2">
                        Retention: Permanent
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">No memory data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-cyan-400" />
                Privacy & Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-slate-700 p-4 rounded-lg">
                <div className="text-white font-medium mb-2">Your Data Privacy</div>
                <div className="text-slate-400 text-sm space-y-2">
                  <p>• Your conversations are stored securely with unique user identification</p>
                  <p>• Short-term memory (STM) automatically expires after 7 days</p>
                  <p>• Long-term memory (LTM) preserves your conversation history permanently</p>
                  <p>• You have full control over your data with export and deletion options</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleExportData}
                  disabled={!currentUser}
                  className="bg-blue-600 hover:bg-blue-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export My Data
                </Button>
                <Button 
                  onClick={handleDeleteUserData}
                  disabled={!currentUser}
                  variant="destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All Data
                </Button>
              </div>

              {currentUser && (
                <div className="bg-slate-700 p-4 rounded-lg">
                  <div className="text-white font-medium mb-2">Account Information</div>
                  <div className="text-slate-400 text-sm space-y-1">
                    <p>User ID: {currentUser.id}</p>
                    <p>Session ID: {currentUser.sessionId}</p>
                    <p>Created: {formatTimestamp(currentUser.createdAt)}</p>
                    <p>Last Active: {formatTimestamp(currentUser.lastActiveAt)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};