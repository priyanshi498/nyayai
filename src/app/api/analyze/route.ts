import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { retrieveRelevantContext } from '@/data/rag-helper';

export async function POST(request: Request) {
  try {
    const { problem, language = 'en', userApiKey, personalDetails } = await request.json();

    if (!problem || !problem.trim()) {
      return NextResponse.json(
        { error: 'Problem description is required.' },
        { status: 400 }
      );
    }

    const effectiveKey = userApiKey || process.env.GEMINI_API_KEY;
    if (!effectiveKey) {
      return NextResponse.json(
        { error: 'API key is missing. Please configure a Gemini API key in settings or backend.' },
        { status: 401 }
      );
    }

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(effectiveKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Step 1: Agent 1 - Classifier
    console.log('Running Classifier Agent...');
    const classificationPrompt = `
      You are the Classifier Agent of NyayAI, an AI Legal Aid system for India.
      Analyze the following legal issue described by the user (which may be in English, Hindi, or Hinglish):
      
      User Issue: "${problem}"
      
      Classify this issue into one of these specific domains:
      - Tenant (rent, deposit, eviction, landlord issues)
      - Consumer (defective products, service deficiency, scams, billing)
      - Labor (wage delay, illegal firing, harassment, overtime)
      - Police Procedures (FIR registration, police refusal, basic rights, harassment)
      - Family (marriage, divorce, maintenance, custody)
      - Other (for general/other civil/criminal matters)

      Analyze the severity of the case ("Low", "Medium", "High"), extract key entities (like company names, landlord name, values, dates), and write a 1-sentence plain summary.

      You MUST respond ONLY with a JSON object in this exact format (no markdown formatting, no backticks, no wrap):
      {
        "domain": "Domain Name",
        "severity": "Low/Medium/High",
        "keyEntities": ["Entity 1", "Entity 2"],
        "summary": "Concise summary of the problem."
      }
    `;

    let classificationResult;
    try {
      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: classificationPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
        }
      });
      const text = response.response.text();
      classificationResult = JSON.parse(text);
    } catch (err) {
      console.error('Classifier parse failed, falling back to manual parsing', err);
      // Fallback manual classification if JSON fails
      classificationResult = {
        domain: 'Other',
        severity: 'Medium',
        keyEntities: [],
        summary: 'Legal issue submitted by user.'
      };
    }

    // Step 2: RAG Context Retrieval
    console.log('Running RAG Context Retrieval...');
    const retrievedContext = await retrieveRelevantContext(problem, effectiveKey, 3);

    // Step 3: Agent 2 - Rights Explainer
    console.log('Running Rights Explainer Agent...');
    const langInstructions = language === 'hi' 
      ? 'Provide explanations predominantly in Hindi (using Devanagari script) with legal terms in English parentheticals where necessary.' 
      : language === 'hinglish'
      ? 'Provide explanations in Hinglish (Hindi written in Latin script), keeping it highly conversational and easy to understand for a common citizen.'
      : 'Provide explanations in clear, simple English, avoiding overly dense legalese.';

    const explainerPrompt = `
      You are the Rights Explainer Agent of NyayAI.
      The user is facing this issue: "${problem}"
      Legal Domain: ${classificationResult.domain}
      
      Here is the retrieved legal knowledge base context (laws/statutes in India):
      ${retrievedContext}
      
      Using your knowledge of Indian Law (IPC/BNS, Rent Control, Consumer Protection Act, Labor laws, etc.) and the retrieved context, explain the user's rights.
      
      Instructions:
      1. Reference specific Indian Acts, laws, or section numbers (e.g., Consumer Protection Act 2019, Section 154 CrPC / Section 173 BNSS).
      2. Tell them what the law says about their specific issue in a clear, bulleted list.
      3. Keep the tone empathetic and reassuring.
      4. Language: ${langInstructions}
      
      Respond with a formatted markdown document explaining their rights.
    `;

    const explainerResponse = await model.generateContent(explainerPrompt);
    const rightsExplanation = explainerResponse.response.text();

    // Step 4: Agent 3 - Action Planner
    console.log('Running Action Planner Agent...');
    const plannerPrompt = `
      You are the Action Planner Agent of NyayAI.
      User Issue: "${problem}"
      Legal Domain: ${classificationResult.domain}
      Explained Rights: ${rightsExplanation}
      
      Create a step-by-step practical action plan for the user to resolve this issue in India.
      Include:
      1. Immediate next steps (e.g., gathering evidence like chats, invoices).
      2. Where to complain (name of portal, authority, office, or helpline number like National Consumer Helpline 1915).
      3. Estimated cost (court fees, filing fees, or if it is free).
      4. Estimated timeline for resolution.
      5. Tips for safety and legal compliance.
      
      Language: ${langInstructions}
      
      Respond with a formatted markdown checklist or step-by-step action guide.
    `;

    const plannerResponse = await model.generateContent(plannerPrompt);
    const actionPlan = plannerResponse.response.text();

    // Step 5: Agent 4 - Document Drafter
    console.log('Running Document Drafter Agent...');
    const detailsText = personalDetails 
      ? `Use these specific details in the notice/letter:
         - Sender Name: ${personalDetails.senderName || '[Your Name]'}
         - Sender Address: ${personalDetails.senderAddress || '[Your Address]'}
         - Opposite Party Name: ${personalDetails.oppositeName || '[Opposite Party Name]'}
         - Opposite Party Address: ${personalDetails.oppositeAddress || '[Opposite Party Address]'}
         - Transaction Date/Details: ${personalDetails.dateDetails || '[Date/Details]'}
         - Specific Demand: ${personalDetails.demand || '[Amount to be refunded / action to be taken]'}`
      : 'Use professional bracketed placeholders like [Your Name], [Opposite Party Name], [Address], [Date] for any details not specified.';

    const drafterPrompt = `
      You are the Document Drafter Agent of NyayAI.
      User Issue: "${problem}"
      Legal Domain: ${classificationResult.domain}
      Explained Rights: ${rightsExplanation}
      Action Plan: ${actionPlan}
      
      ${detailsText}
      
      Draft a formal legal document in English (the standard language for notices/complaints in Indian legal practice). Depending on the domain, create:
      - **Tenant**: A formal Legal Notice to the landlord demanding the refund of the security deposit or addressing lease violation.
      - **Consumer**: A formal Legal Notice to the vendor/company demanding replacement/refund or a Consumer Complaint draft.
      - **Labor**: A formal Demand Notice to the employer for outstanding salary or wrongful termination.
      - **Police Procedures**: A formal Written Complaint Letter to the Superintendent of Police (SP) or Station House Officer (SHO) explaining the offense and requesting registration of an FIR.
      - **Other**: A formal Legal Notice or general Complaint Letter suitable for the issue.

      Requirements:
      1. Make it professional, following standard legal notice formatting in India (including Subject line, Facts, Legal grounds, and specific 15-day Demand/Action clause).
      2. Keep it fully detailed. Do not summarize or use short summaries; write the full body of the letter.
      3. Output ONLY the drafted document text. Do not add introductory conversational chat like "Here is your notice...". Start directly with the notice text.
    `;

    const drafterResponse = await model.generateContent(drafterPrompt);
    const draftedDocument = drafterResponse.response.text();

    return NextResponse.json({
      classification: classificationResult,
      rights: rightsExplanation,
      actionPlan: actionPlan,
      document: draftedDocument,
      context: retrievedContext
    });

  } catch (error: any) {
    console.error('Error in analyze API route:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during analysis.' },
      { status: 500 }
    );
  }
}
