"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChatApp from "@/components/ChatApp";
import api from "@/app/_utils/axios";
import type { Conversation } from "@/app/_types";

interface PageProps {
  params: Promise<{ uid: string }>;
}

export default function ConversationPage({ params }: PageProps) {
  const { uid } = use(params);
  const router = useRouter();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchConversation() {
      try {
        const { data } = await api.get<Conversation>(`/conversations/${uid}`);
        if (isMounted) {
          if (!data) {
            router.replace("/");
            return;
          }
          setConversation(data);
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          router.replace("/");
        }
      }
    }

    fetchConversation();
    return () => {
      isMounted = false;
    };
  }, [uid, router]);

  if (loading || !conversation) {
    return <div className="h-svh bg-[#fbfaf8] dark:bg-[#1b1a19]" />;
  }

  return (
    <ChatApp
      key={conversation.id}
      initialConversationId={conversation.id}
      initialMessages={conversation.messages || []}
      initialTitle={conversation.title || "Conversation"}
    />
  );
}
