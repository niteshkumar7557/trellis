import ChatApp from "@/components/ChatApp";

// The home IS the chat. Kero is the interface.
// Users tell Kero everything — new goals, what they studied, what bounced,
// what to do next. The backend LLM categorises messages and acts accordingly.
export default function Home() {
  return <ChatApp />;
}
