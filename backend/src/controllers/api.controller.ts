import type { Request, Response } from "express";

const DUMMY_CONVERSATIONS = [
	{
		id: "conv-001",
		uid: "conv-001",
		title: "DNS finally clicked",
		preview:
			"I read through the DNS resolver flow today and it actually makes sense now.",
		time: "2h ago",
		updatedAt: "Today",
		messages: [
			{
				id: "msg-1",
				role: "user",
				content:
					"I read through the DNS resolver flow today and it actually makes sense now. The recursive vs iterative lookup was the part that confused me before.",
				time: "2h ago",
			},
			{
				id: "msg-2",
				role: "assistant",
				content:
					"That's great progress! The recursive/iterative distinction trips up a lot of people. Quick check — can you explain why a stub resolver typically uses recursive queries while nameservers use iterative ones?",
				time: "2h ago",
			},
			{
				id: "msg-3",
				role: "user",
				content:
					"I think it's because the client just wants an answer and doesn't want to chase referrals itself? The nameserver does the chasing.",
				time: "2h ago",
			},
			{
				id: "msg-4",
				role: "assistant",
				content:
					"Exactly right. The stub resolver delegates the work. Tomorrow, try tracing a real DNS query with `dig +trace example.com` — it'll make the iterative chain concrete. One concept at a time.",
				time: "2h ago",
			},
		],
	},
	{
		id: "conv-002",
		uid: "conv-002",
		title: "Congestion control confusion",
		preview: "Tried TCP congestion control, didn't really get slow-start.",
		time: "Yesterday",
		updatedAt: "Yesterday",
		messages: [
			{
				id: "msg-5",
				role: "user",
				content:
					"Tried TCP congestion control today. I sort of get the idea but slow-start is confusing — why does it start slow if it's growing exponentially?",
				time: "Yesterday",
			},
			{
				id: "msg-6",
				role: "assistant",
				content:
					"Great question — the name is misleading! 'Slow-start' refers to starting from a *small* window (1-2 segments), not to growing slowly. The window doubles every RTT, so it's actually quite aggressive. It's 'slow' compared to just blasting at full link speed from the start.",
				time: "Yesterday",
			},
			{
				id: "msg-7",
				role: "user",
				content:
					"Oh okay, that makes more sense. So when does it stop doubling?",
				time: "Yesterday",
			},
			{
				id: "msg-8",
				role: "assistant",
				content:
					"It stops doubling when the congestion window hits the *ssthresh* (slow-start threshold). After that, it switches to congestion avoidance — linear growth of +1 segment per RTT. If a packet is lost, ssthresh is halved, and it restarts. Try drawing the sawtooth graph — it'll click.",
				time: "Yesterday",
			},
		],
	},
];

export async function sendCoversations(req: Request, res: Response) {
	return res.status(200).json(DUMMY_CONVERSATIONS);
}

export async function sendCoversationsById(req: Request, res: Response) {
	const id = req.params.id;
	return res
	.status(200)
	.json(
		DUMMY_CONVERSATIONS.find((c) => c.id === id || c.uid === id) ||
		null,
	);
}

export async function handleChatRecieve(req: Request, res: Response) {
	const messages = req.body.message
	const title = req.body.title
	return res.status(201).end("Saved the messages, title:", title);
}
