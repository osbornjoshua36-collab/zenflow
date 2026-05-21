import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Leads() {
  const [messages, setMessages] = useState([]);
  const [customers, setCustomers] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const msgs = await base44.entities.Message.list('-created_date', 50);
        const customersData = await base44.entities.Customer.list('-created_date', 100);
        
        const customersMap = {};
        customersData.forEach(c => {
          customersMap[c.id] = c;
        });

        setMessages(msgs);
        setCustomers(customersMap);
      } catch (error) {
        console.error('Error fetching leads:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const inboundMessages = messages.filter(m => m.direction === 'Inbound');
  const aiDrafted = messages.filter(m => m.ai_drafted && !m.approved_by);
  const responded = messages.filter(m => m.direction === 'Outbound');

  return (
    <div className="space-y-6">
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Leads ({inboundMessages.length})</TabsTrigger>
          <TabsTrigger value="draft">AI Drafts ({aiDrafted.length})</TabsTrigger>
          <TabsTrigger value="responded">Responded ({responded.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {inboundMessages.map((msg) => (
            <Card
              key={msg.id}
              className="cursor-pointer hover:border-blue-300 transition-colors"
              onClick={() => setSelectedMessage(msg)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">
                      {customers[msg.customer_id]?.name || 'Unknown Customer'}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">{msg.content}</p>
                    <div className="flex gap-2 mt-3">
                      <Badge variant={msg.ai_drafted ? 'default' : 'outline'}>
                        {msg.ai_drafted ? 'AI Drafted' : 'Inbound'}
                      </Badge>
                      <Badge variant="outline">{msg.channel}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 ml-4">
                    {new Date(msg.created_date).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="draft" className="space-y-4">
          {aiDrafted.map((msg) => (
            <Card key={msg.id} className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  AI-Drafted Response
                  <Badge variant="outline">Pending Approval</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-slate-600 font-semibold mb-1">Draft Message:</p>
                  <p className="text-slate-900 p-3 bg-white rounded border">{msg.content}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700">
                    Approve
                  </Button>
                  <Button size="sm" variant="outline">
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="responded" className="space-y-4">
          {responded.map((msg) => (
            <Card key={msg.id}>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-600">{msg.content}</p>
                <p className="text-xs text-slate-500 mt-2">
                  Sent to {customers[msg.customer_id]?.name || 'customer'}
                </p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {selectedMessage && (
        <Card className="border-2 border-blue-300">
          <CardHeader>
            <CardTitle>Conversation Thread</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-100 p-4 rounded">
              <p className="font-semibold text-sm">{selectedMessage.sender}</p>
              <p className="text-slate-900 mt-2">{selectedMessage.content}</p>
              <p className="text-xs text-slate-500 mt-2">
                {new Date(selectedMessage.created_date).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}