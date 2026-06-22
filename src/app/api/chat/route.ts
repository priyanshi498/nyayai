import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const { problem, history = [], message, userApiKey } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message content is required.' },
        { status: 400 }
      );
    }

    const effectiveKey = userApiKey || process.env.GEMINI_API_KEY;
    if (!effectiveKey) {
      return NextResponse.json(
        { error: 'API key is missing. Please configure a Gemini API key.' },
        { status: 401 }
      );
    }

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(effectiveKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Format chat history for prompt grounding
    const formattedHistory = history.map((msg: any) => {
      return `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`;
    }).join('\n');

    const systemPrompt = `
      You are the Legal Chat Assistant of NyayAI, an AI-powered educational legal aid assistant in India.
      You are helping a user who has submitted this legal issue:
      "${problem}"

      Here is the conversation history so far:
      ${formattedHistory || '(No previous messages)'}

      User's new question: "${message}"

      Your task:
      1. Provide a helpful, clear, and legally grounded response under Indian Law (such as IPC/BNS, Rent Control, Consumer Protection Act, etc.).
      2. Keep the tone professional, empathetic, and simple to understand for a layperson. Avoid dense legalese.
      3. Clearly state that your advice is for educational purposes and is NOT a substitute for a professional lawyer.
      4. Answer in the same language style the user asked in (e.g. English, Hindi, or Hinglish).
      5. Output ONLY your direct response to the user.
    `;

    const response = await model.generateContent(systemPrompt);
    const replyText = response.response.text();

    return NextResponse.json({ reply: replyText });

  } catch (error: any) {
    console.error('Error in chat API route:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during the chat session.' },
      { status: 500 }
    );
  }
}
