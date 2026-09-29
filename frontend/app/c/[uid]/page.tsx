// /c/[uid] — Individual conversation with Kero.
// Pre-populates ChatApp with the conversation's messages and title.
// Real messages will come from the backend/DB in the future.

import { notFound } from "next/navigation";
import ChatApp from "@/components/ChatApp";
import { DUMMY_CONVERSATIONS } from "@/lib/dummy-data";

interface PageProps {
  params: Promise<{ uid: string }>;
}

export default async function ConversationPage({ params }: PageProps) {
  const { uid } = await params;
  const conversation = DUMMY_CONVERSATIONS.find((c) => c.uid === uid);

  if (!conversation) {
    notFound();
  }

  return (
    <ChatApp
      initialMessages={conversation.messages}
      initialTitle={conversation.title}
    />
  );
}

export function generateStaticParams() {
  return DUMMY_CONVERSATIONS.map((c) => ({ uid: c.uid }));
}
