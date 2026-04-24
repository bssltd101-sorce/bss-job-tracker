import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Send, Lock, MessageSquare } from "lucide-react";
import { formatDateTime, timeAgo } from "@/lib/utils";

interface MessageThreadProps {
  threadType: "job" | "cleaning";
  threadId: number;
  clientId: number;
}

type Message = {
  id: number;
  threadType: string;
  threadId: number;
  authorId: number;
  authorName: string;
  authorRole: string;
  message: string;
  isInternal: number;
  messageType: string;
  createdAt: string;
};

const MESSAGE_TYPES = [
  { value: "message", label: "Message" },
  { value: "question", label: "Question" },
  { value: "issue", label: "Issue" },
  { value: "additional_works", label: "Additional Works" },
  { value: "update_request", label: "Update Request" },
];

function messageTypeBadge(type: string) {
  const labels: Record<string, string> = {
    message: "Message",
    question: "Question",
    issue: "Issue",
    additional_works: "Additional Works",
    update_request: "Update Request",
  };
  return labels[type] ?? type;
}

export function MessageThread({ threadType, threadId, clientId }: MessageThreadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAdmin = user?.role === "admin";

  const [text, setText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [messageType, setMessageType] = useState("message");

  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: [`/api/messages/${threadType}/${threadId}`],
  });

  const send = useMutation({
    mutationFn: (data: { message: string; isInternal: boolean; messageType: string }) =>
      apiRequest("POST", `/api/messages/${threadType}/${threadId}`, data).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/messages/${threadType}/${threadId}`] });
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      setText("");
      toast({ title: "Message sent" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to send message" }),
  });

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    send.mutate({ message: text.trim(), isInternal, messageType });
  }

  const isCurrentUser = (msg: Message) => msg.authorId === user?.id;

  return (
    <div className="space-y-4">
      {/* Messages */}
      {isLoading ? (
        <div className="text-center py-6 text-muted-foreground text-sm">Loading messages…</div>
      ) : !messages || messages.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No messages yet. Start the conversation.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {messages.map((msg) => {
            const isMine = isCurrentUser(msg);
            const isInternalMsg = msg.isInternal === 1;

            if (isInternalMsg && !isAdmin) return null;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
              >
                {isInternalMsg && (
                  <div className="flex items-center gap-1 mb-0.5 text-xs text-muted-foreground">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Internal Note</span>
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    isInternalMsg
                      ? "bg-muted/50 border border-border text-muted-foreground"
                      : isMine
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border"
                  }`}
                >
                  {msg.message}
                </div>
                <div className="flex items-center gap-2 mt-0.5 px-1">
                  <span className="text-[10px] text-muted-foreground font-medium">{msg.authorName}</span>
                  {msg.messageType && msg.messageType !== "message" && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                      {messageTypeBadge(msg.messageType)}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground" title={formatDateTime(msg.createdAt)}>
                    {timeAgo(msg.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Separator />

      {/* Compose */}
      <form onSubmit={handleSend} className="space-y-2">
        <Textarea
          placeholder={isAdmin ? "Reply to client or leave an internal note…" : "Send a message to the BSS team…"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="text-sm min-h-[80px] resize-none"
        />
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            {!isAdmin && (
              <Select value={messageType} onValueChange={setMessageType}>
                <SelectTrigger className="h-7 text-xs w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESSAGE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {isAdmin && (
              <>
                <Select value={messageType} onValueChange={setMessageType}>
                  <SelectTrigger className="h-7 text-xs w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESSAGE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Switch
                    checked={isInternal}
                    onCheckedChange={setIsInternal}
                    id={`internal-${threadType}-${threadId}`}
                    className="scale-75"
                  />
                  <Label htmlFor={`internal-${threadType}-${threadId}`} className="cursor-pointer text-xs flex items-center gap-0.5">
                    <Lock className="w-3 h-3" /> Internal only
                  </Label>
                </div>
              </>
            )}
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={!text.trim() || send.isPending}
            className="gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            {send.isPending ? "Sending…" : "Send"}
          </Button>
        </div>
      </form>
    </div>
  );
}
